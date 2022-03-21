interface FilterConfigRange {
  [key: string]: {
    min?: number | string;
    max?: number | string;
  };
}

interface FilterConfigEqual {
  [key: string]: string | number;
}

const normalize = (obj) => {
  if (typeof obj !== "object") {
    return { eq: obj, min: null, max: null };
  }

  return {
    min: obj.min === undefined ? null : obj.min,
    max: obj.max === undefined ? null : obj.max,
    eq: null,
  };
};

const isInFilter = (filter, value) => {
  if (filter.eq !== null) {
    return value[filter.key] === filter.eq;
  }

  if (filter.min !== null && value[filter.key] < filter.min) {
    return false;
  }

  if (filter.max !== null && value[filter.key] > filter.max) {
    return false;
  }

  return true;
};

export const filterData = (
  data: any[],
  filterConfig?: FilterConfigRange | FilterConfigEqual
): any[] => {
  if (!filterConfig || !Object.keys(filterConfig).length) {
    return data;
  }

  const filters = Object.keys(filterConfig).map((key) => ({
    key,
    ...normalize(filterConfig[key]),
  }));

  return data.filter((value) =>
    filters.every((filter) => isInFilter(filter, value))
  );
};
