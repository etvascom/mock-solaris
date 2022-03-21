interface PaginationConfig {
  number?: number;
  size?: number;
}

export const paginateData = (
  data: any[],
  paginationConfig?: PaginationConfig
): any[] => {
  const size = Math.min(Math.abs(paginationConfig?.size) || 10, 1000);
  const number = Math.max(paginationConfig?.number || 1, 1);

  return data.slice((number - 1) * size, number * size);
};
