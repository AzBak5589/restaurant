export interface PromotionFormCandidate {
  code: string;
  name: string;
  discountValue: string;
  startDate: string;
  endDate: string;
}

export type PromotionValidationErrorKey =
  | "promotions.error.requiredFields"
  | "promotions.error.invalidDateRange"
  | "promotions.error.invalidCode";

export const validatePromotionForm = (
  candidate: PromotionFormCandidate,
): PromotionValidationErrorKey | null => {
  if (
    !candidate.name.trim() ||
    !candidate.discountValue ||
    !candidate.startDate ||
    !candidate.endDate
  ) {
    return "promotions.error.requiredFields";
  }

  if (new Date(candidate.endDate) < new Date(candidate.startDate)) {
    return "promotions.error.invalidDateRange";
  }

  if (candidate.code && !/^[A-Z0-9_-]{3,30}$/.test(candidate.code.toUpperCase())) {
    return "promotions.error.invalidCode";
  }

  return null;
};
