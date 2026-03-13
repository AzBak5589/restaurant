export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export const parsePagination = (
  pageValue: unknown,
  limitValue: unknown,
  maxLimit: number = 100,
  defaultLimit: number = 20,
): PaginationParams => {
  const parsedPage = Number.parseInt(String(pageValue ?? "1"), 10);
  const parsedLimit = Number.parseInt(String(limitValue ?? defaultLimit), 10);

  const page = Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;
  const rawLimit =
    Number.isNaN(parsedLimit) || parsedLimit < 1 ? defaultLimit : parsedLimit;
  const limit = Math.min(rawLimit, maxLimit);

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
};
