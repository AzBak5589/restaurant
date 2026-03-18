import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  deductStockForOrder,
  restoreStockForOrder,
} from "../src/services/inventory.service";

const mocks = vi.hoisted(() => ({
  emit: vi.fn(),
  to: vi.fn(),
  getIO: vi.fn(),
  loggerWarn: vi.fn(),
}));

vi.mock("../src/config/socket", () => ({
  getIO: mocks.getIO,
}));

vi.mock("../src/config/logger", () => ({
  default: {
    warn: mocks.loggerWarn,
  },
}));

describe("inventory service - stock alignment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.to.mockImplementation(() => ({ emit: mocks.emit }));
    mocks.getIO.mockImplementation(() => ({ to: mocks.to }));
  });

  it("deducts stock and creates OUT movement", async () => {
    const tx = {
      recipe: {
        findUnique: vi.fn().mockResolvedValue({
          portionSize: 1,
          ingredients: [
            {
              quantity: 2,
              item: {
                id: "item-1",
                isActive: true,
                currentStock: 10,
                minStock: 3,
                unitCost: 4,
                name: "Tomato",
                unit: "kg",
                sku: "SKU-TOM",
              },
            },
          ],
        }),
      },
      inventoryItem: {
        update: vi.fn().mockResolvedValue({}),
      },
      inventoryMovement: {
        create: vi.fn().mockResolvedValue({}),
      },
    } as any;

    await deductStockForOrder(
      "resto-1",
      [{ menuItemId: "menu-1", quantity: 3 }],
      "user-1",
      "ORD-001000",
      tx,
    );

    expect(tx.inventoryItem.update).toHaveBeenCalledWith({
      where: { id: "item-1" },
      data: { currentStock: 4 },
    });
    expect(tx.inventoryMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        restaurantId: "resto-1",
        itemId: "item-1",
        type: "OUT",
        quantity: 6,
        reference: "ORDER:ORD-001000",
      }),
    });
    expect(mocks.emit).not.toHaveBeenCalled();
  });

  it("emits low stock alert when threshold is reached", async () => {
    const tx = {
      recipe: {
        findUnique: vi.fn().mockResolvedValue({
          portionSize: 1,
          ingredients: [
            {
              quantity: 2,
              item: {
                id: "item-2",
                isActive: true,
                currentStock: 7,
                minStock: 3,
                unitCost: 2,
                name: "Cheese",
                unit: "kg",
                sku: "SKU-CHS",
              },
            },
          ],
        }),
      },
      inventoryItem: {
        update: vi.fn().mockResolvedValue({}),
      },
      inventoryMovement: {
        create: vi.fn().mockResolvedValue({}),
      },
    } as any;

    await deductStockForOrder(
      "resto-1",
      [{ menuItemId: "menu-2", quantity: 2 }],
      "user-1",
      "ORD-001001",
      tx,
    );

    expect(mocks.loggerWarn).toHaveBeenCalled();
    expect(mocks.to).toHaveBeenCalledWith("restaurant:resto-1");
    expect(mocks.emit).toHaveBeenCalledWith(
      "inventory:lowStock",
      expect.objectContaining({
        item: expect.objectContaining({ id: "item-2" }),
        currentStock: 3,
        minStock: 3,
      }),
    );
  });

  it("restores stock and creates RETURN movement on cancellation", async () => {
    const tx = {
      orderItem: {
        findMany: vi.fn().mockResolvedValue([{ menuItemId: "menu-9", quantity: 2 }]),
      },
      recipe: {
        findUnique: vi.fn().mockResolvedValue({
          portionSize: 2,
          ingredients: [
            {
              quantity: 1.5,
              item: {
                id: "item-9",
                unitCost: 3,
              },
            },
          ],
        }),
      },
      inventoryItem: {
        update: vi.fn().mockResolvedValue({}),
      },
      inventoryMovement: {
        create: vi.fn().mockResolvedValue({}),
      },
    } as any;

    await restoreStockForOrder("resto-1", "order-9", "user-9", "ORD-009999", tx);

    expect(tx.inventoryItem.update).toHaveBeenCalledWith({
      where: { id: "item-9" },
      data: { currentStock: { increment: 6 } },
    });
    expect(tx.inventoryMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        restaurantId: "resto-1",
        itemId: "item-9",
        type: "RETURN",
        quantity: 6,
        reference: "CANCEL:ORD-009999",
      }),
    });
  });
});

