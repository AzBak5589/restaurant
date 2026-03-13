import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "../src/middlewares/error.middleware";
import {
  processPayment,
  refundPayment,
} from "../src/controllers/payment.controller";

const mocks = vi.hoisted(() => ({
  txOrderFindFirst: vi.fn(),
  txOrderUpdate: vi.fn(),
  txPaymentFindFirst: vi.fn(),
  txPaymentCreate: vi.fn(),
  prismaTransaction: vi.fn(),
  prismaPaymentFindUnique: vi.fn(),
  prismaPaymentCreate: vi.fn(),
  prismaPaymentFindMany: vi.fn(),
  prismaOrderUpdate: vi.fn(),
  emit: vi.fn(),
  to: vi.fn(),
  getIO: vi.fn(),
}));

vi.mock("../src/config/database", () => ({
  default: {
    $transaction: mocks.prismaTransaction,
    payment: {
      findUnique: mocks.prismaPaymentFindUnique,
      create: mocks.prismaPaymentCreate,
      findMany: mocks.prismaPaymentFindMany,
    },
    order: {
      update: mocks.prismaOrderUpdate,
    },
  },
}));

vi.mock("../src/config/socket", () => ({
  getIO: mocks.getIO,
}));

const createMockResponse = () => {
  const response = {
    status: vi.fn(),
    json: vi.fn(),
  };
  response.status.mockReturnValue(response);
  return response;
};

describe("payment controller - processPayment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.to.mockImplementation(() => ({ emit: mocks.emit }));
    mocks.getIO.mockImplementation(() => ({ to: mocks.to }));
    mocks.prismaTransaction.mockImplementation(async (cb: any) =>
      cb({
        order: {
          findFirst: mocks.txOrderFindFirst,
          update: mocks.txOrderUpdate,
        },
        payment: {
          findFirst: mocks.txPaymentFindFirst,
          create: mocks.txPaymentCreate,
        },
      }),
    );
  });

  it("returns existing payment when idempotency key already used", async () => {
    mocks.txOrderFindFirst.mockResolvedValue({
      id: "order-1",
      total: 100,
      status: "PENDING",
      paymentStatus: "PARTIAL",
      payments: [{ amount: 20 }],
    });
    mocks.txPaymentFindFirst.mockResolvedValue({
      id: "payment-existing",
      amount: 20,
      method: "CASH",
    });

    const req = {
      user: { restaurantId: "resto-1" },
      body: { orderId: "order-1", amount: 80, method: "CASH" },
      headers: { "x-idempotency-key": "idem-key-1" },
    } as any;
    const res = createMockResponse() as any;

    await processPayment(req, res);

    expect(mocks.txPaymentCreate).not.toHaveBeenCalled();
    expect(mocks.txOrderUpdate).not.toHaveBeenCalled();
    expect(mocks.emit).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        payment: expect.objectContaining({ id: "payment-existing" }),
        paymentStatus: "PARTIAL",
      }),
    );
  });

  it("creates payment, updates order status, and emits socket event", async () => {
    mocks.txOrderFindFirst.mockResolvedValue({
      id: "order-1",
      total: 100,
      status: "PENDING",
      paymentStatus: "PENDING",
      payments: [{ amount: 20 }],
    });
    mocks.txPaymentFindFirst.mockResolvedValue(null);
    mocks.txPaymentCreate.mockResolvedValue({
      id: "payment-new",
      amount: 80,
      method: "CASH",
    });
    mocks.txOrderUpdate.mockResolvedValue({});

    const req = {
      user: { restaurantId: "resto-1" },
      body: { orderId: "order-1", amount: 80, method: "CASH" },
      headers: {},
    } as any;
    const res = createMockResponse() as any;

    await processPayment(req, res);

    expect(mocks.txPaymentCreate).toHaveBeenCalled();
    expect(mocks.txOrderUpdate).toHaveBeenCalledWith({
      where: { id: "order-1" },
      data: expect.objectContaining({
        paymentStatus: "PAID",
        paymentMethod: "CASH",
        status: "PAID",
      }),
    });
    expect(mocks.getIO).toHaveBeenCalled();
    expect(mocks.to).toHaveBeenCalledWith("restaurant:resto-1");
    expect(mocks.emit).toHaveBeenCalledWith(
      "order:paid",
      expect.objectContaining({
        orderId: "order-1",
        paymentStatus: "PAID",
      }),
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        payment: expect.objectContaining({ id: "payment-new" }),
        paymentStatus: "PAID",
        remaining: 0,
      }),
    );
  });
});

describe("payment controller - refundPayment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects refund when payment is missing", async () => {
    mocks.prismaPaymentFindUnique.mockResolvedValue(null);

    const req = {
      user: { restaurantId: "resto-1" },
      params: { paymentId: "pay-missing" },
      body: {},
    } as any;
    const res = createMockResponse() as any;

    await expect(refundPayment(req, res)).rejects.toMatchObject<AppError>({
      message: "Payment not found",
      statusCode: 404,
    });
    expect(mocks.prismaPaymentCreate).not.toHaveBeenCalled();
    expect(mocks.prismaOrderUpdate).not.toHaveBeenCalled();
  });

  it("creates refund and marks order as refunded when net paid is zero", async () => {
    mocks.prismaPaymentFindUnique.mockResolvedValue({
      id: "pay-1",
      orderId: "order-1",
      amount: 100,
      method: "CARD",
      order: { restaurantId: "resto-1" },
    });
    mocks.prismaPaymentCreate.mockResolvedValue({
      id: "refund-1",
      orderId: "order-1",
      amount: -100,
      method: "CARD",
      reference: "REFUND:pay-1",
    });
    mocks.prismaPaymentFindMany.mockResolvedValue([
      { amount: 100 },
      { amount: -100 },
    ]);
    mocks.prismaOrderUpdate.mockResolvedValue({});

    const req = {
      user: { restaurantId: "resto-1" },
      params: { paymentId: "pay-1" },
      body: { notes: "Customer complaint" },
    } as any;
    const res = createMockResponse() as any;

    await refundPayment(req, res);

    expect(mocks.prismaPaymentCreate).toHaveBeenCalledWith({
      data: {
        orderId: "order-1",
        amount: -100,
        method: "CARD",
        reference: "REFUND:pay-1",
        notes: "Customer complaint",
      },
    });
    expect(mocks.prismaOrderUpdate).toHaveBeenCalledWith({
      where: { id: "order-1" },
      data: {
        paymentStatus: "REFUNDED",
      },
    });
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ id: "refund-1", amount: -100 }),
    );
  });
});

