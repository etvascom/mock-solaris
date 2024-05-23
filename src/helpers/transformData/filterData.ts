import moment from "moment";

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

  if (filter.min !== null) {
    const minDate = moment(filter.min);
    if (minDate.isValid()) {
      return moment(value[filter.key]).isSameOrAfter(minDate);
    }

    return value[filter.key] >= filter.min;
  }

  if (filter.max !== null) {
    const maxDate = moment(filter.max);
    if (maxDate.isValid()) {
      return moment(value[filter.key]).isSameOrBefore(maxDate);
    }

    return value[filter.key] <= filter.max;
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
