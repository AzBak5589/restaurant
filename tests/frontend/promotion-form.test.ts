import { describe, expect, it } from "vitest";
import { validatePromotionForm } from "../../frontend/src/lib/promotion-form";

describe("frontend promotion form validation", () => {
  it("rejects missing required fields", () => {
    const result = validatePromotionForm({
      code: "",
      name: "",
      discountValue: "",
      startDate: "",
      endDate: "",
    });
    expect(result).toBe("promotions.error.requiredFields");
  });

  it("rejects invalid date range", () => {
    const result = validatePromotionForm({
      code: "",
      name: "Promo",
      discountValue: "10",
      startDate: "2026-03-20",
      endDate: "2026-03-10",
    });
    expect(result).toBe("promotions.error.invalidDateRange");
  });

  it("rejects invalid promo code format", () => {
    const result = validatePromotionForm({
      code: "ab",
      name: "Promo",
      discountValue: "10",
      startDate: "2026-03-10",
      endDate: "2026-03-20",
    });
    expect(result).toBe("promotions.error.invalidCode");
  });

  it("accepts valid payload", () => {
    const result = validatePromotionForm({
      code: "WELCOME_10",
      name: "Promo",
      discountValue: "10",
      startDate: "2026-03-10",
      endDate: "2026-03-20",
    });
    expect(result).toBeNull();
  });
});
