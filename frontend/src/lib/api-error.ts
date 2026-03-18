import { isAxiosError } from "axios";

interface ApiValidationDetail {
  path?: string;
  message?: string;
}

interface ApiErrorPayload {
  message?: string;
  error?: string;
  details?: ApiValidationDetail[];
}

export const getApiErrorMessage = (
  error: unknown,
  fallback: string,
): string => {
  if (!isAxiosError<ApiErrorPayload>(error)) {
    return fallback;
  }

  const payload = error.response?.data;
  if (!payload) {
    return fallback;
  }

  if (payload.message) {
    return payload.message;
  }

  if (payload.error) {
    return payload.error;
  }

  if (payload.details && payload.details.length > 0) {
    return payload.details.map((detail) => detail.message || "").join(", ");
  }

  return fallback;
};
