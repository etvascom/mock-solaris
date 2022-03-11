import { filterData } from "./filterData";
import { sortData } from "./sortData";
import { paginateData } from "./paginateData";

export const transformData = (data: any[], config) => {
  const { filter, sort, page, sortAccepted } = config;

  const filtered = filterData(data, filter);
  const sorted = sortData(filtered, sort, sortAccepted);
  return paginateData(sorted, page);
};
