import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "../src/middlewares/error.middleware";
import { cancelOrder, createOrder } from "../src/controllers/order.controller";

const mocks = vi.hoisted(() => ({
  prismaOrderFindFirst: vi.fn(),
  prismaTransaction: vi.fn(),
  txOrderUpdate: vi.fn(),
  txOrderCount: vi.fn(),
  txTableUpdate: vi.fn(),
  createOrderTransactional: vi.fn(),
  addItemsToOrderTransactional: vi.fn(),
  applyPromotionToOrderTransactional: vi.fn(),
  restoreStockForOrder: vi.fn(),
  emit: vi.fn(),
  to: vi.fn(),
  getIO: vi.fn(),
}));

vi.mock("../src/config/database", () => ({
  default: {
    order: {
      findFirst: mocks.prismaOrderFindFirst,
    },
    $transaction: mocks.prismaTransaction,
  },
}));

vi.mock("../src/config/socket", () => ({
  getIO: mocks.getIO,
}));

vi.mock("../src/services/order.service", () => ({
  createOrderTransactional: mocks.createOrderTransactional,
  addItemsToOrderTransactional: mocks.addItemsToOrderTransactional,
  applyPromotionToOrderTransactional: mocks.applyPromotionToOrderTransactional,
}));

vi.mock("../src/services/inventory.service", () => ({
  restoreStockForOrder: mocks.restoreStockForOrder,
}));

const createMockResponse = () => {
  const response = {
    status: vi.fn(),
    json: vi.fn(),
  };
  response.status.mockReturnValue(response);
  return response;
};

describe("order controller - create/cancel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.to.mockImplementation(() => ({ emit: mocks.emit }));
    mocks.getIO.mockImplementation(() => ({ to: mocks.to }));
    mocks.prismaTransaction.mockImplementation(async (cb: any) =>
      cb({
        order: {
          update: mocks.txOrderUpdate,
          count: mocks.txOrderCount,
        },
        table: {
          update: mocks.txTableUpdate,
        },
      }),
    );
  });

  it("creates order via service and emits order:created", async () => {
    const createdOrder = { id: "order-1", orderNumber: "ORD-000123" };
    mocks.createOrderTransactional.mockResolvedValue(createdOrder);

    const req = {
      user: { id: "user-1", restaurantId: "resto-1" },
      body: {
        tableId: "table-1",
        guestCount: 2,
        notes: "No onions",
        items: [{ menuItemId: "menu-1", quantity: 1 }],
      },
    } as any;
    const res = createMockResponse() as any;

    await createOrder(req, res);

    expect(mocks.createOrderTransactional).toHaveBeenCalledWith({
      restaurantId: "resto-1",
      userId: "user-1",
      tableId: "table-1",
      items: [{ menuItemId: "menu-1", quantity: 1 }],
      guestCount: 2,
      notes: "No onions",
    });
    expect(mocks.to).toHaveBeenCalledWith("restaurant:resto-1");
    expect(mocks.emit).toHaveBeenCalledWith("order:created", createdOrder);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(createdOrder);
  });

  it("rejects cancel for paid/served orders", async () => {
    mocks.prismaOrderFindFirst.mockResolvedValue({
      id: "order-1",
      status: "PAID",
      tableId: "table-1",
      orderNumber: "ORD-000001",
    });

    const req = {
      params: { id: "order-1" },
      user: { id: "user-1", restaurantId: "resto-1" },
    } as any;
    const res = createMockResponse() as any;

    await expect(cancelOrder(req, res)).rejects.toMatchObject<AppError>({
      message: "Cannot cancel completed order",
      statusCode: 400,
    });
    expect(mocks.prismaTransaction).not.toHaveBeenCalled();
    expect(mocks.restoreStockForOrder).not.toHaveBeenCalled();
  });

  it("cancels order, restores stock, updates table, and emits event", async () => {
    mocks.prismaOrderFindFirst.mockResolvedValue({
      id: "order-1",
      status: "PENDING",
      tableId: "table-1",
      orderNumber: "ORD-000045",
    });
    mocks.txOrderUpdate.mockResolvedValue({
      id: "order-1",
      status: "CANCELLED",
    });
    mocks.txOrderCount.mockResolvedValue(0);
    mocks.txTableUpdate.mockResolvedValue({});
    mocks.restoreStockForOrder.mockResolvedValue(undefined);

    const req = {
      params: { id: "order-1" },
      user: { id: "user-2", restaurantId: "resto-1" },
    } as any;
    const res = createMockResponse() as any;

    await cancelOrder(req, res);

    expect(mocks.prismaTransaction).toHaveBeenCalled();
    expect(mocks.txOrderUpdate).toHaveBeenCalledWith({
      where: { id: "order-1" },
      data: { status: "CANCELLED" },
    });
    expect(mocks.txOrderCount).toHaveBeenCalledWith({
      where: {
        tableId: "table-1",
        status: { notIn: ["CANCELLED", "PAID"] },
      },
    });
    expect(mocks.txTableUpdate).toHaveBeenCalledWith({
      where: { id: "table-1" },
      data: { status: "AVAILABLE" },
    });
    expect(mocks.restoreStockForOrder).toHaveBeenCalledWith(
      "resto-1",
      "order-1",
      "user-2",
      "ORD-000045",
      expect.anything(),
    );
    expect(mocks.emit).toHaveBeenCalledWith(
      "order:cancelled",
      expect.objectContaining({ id: "order-1", status: "CANCELLED" }),
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ id: "order-1", status: "CANCELLED" }),
    );
  });
});

