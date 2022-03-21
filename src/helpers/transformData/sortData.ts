interface SortConfig {
  dir: number;
  key: string;
}

const getSortConfigs = (
  value: string,
  allowedValues?: string[]
): SortConfig[] => {
  if (!value?.trim()) {
    return [];
  }

  const options = value.split(",");
  const sortConfigs: SortConfig[] = [];

  options.forEach((option) => {
    const val = option.trim();

    if (!val) {
      return;
    }

    const dir = option.startsWith("-") ? -1 : 1;
    const key = option.replace("-", "").replace("+", "");

    if (allowedValues && allowedValues.length && !allowedValues.includes(key)) {
      return;
    }

    sortConfigs.push({ key, dir });
  });

  return sortConfigs;
};

const getDiff = (a: any, b: any): number => {
  if (typeof a === "string") {
    return a.localeCompare(b);
  }

  return a - b;
};

export const sortData = (
  data: any[],
  value: string,
  allowedValues?: string[]
): any[] => {
  const sortConfigs = getSortConfigs(value, allowedValues);

  if (!sortConfigs.length) {
    return data;
  }

  return [...data].sort((a: any, b: any): number => {
    for (const sortConfig of sortConfigs) {
      const diff = getDiff(a[sortConfig.key], b[sortConfig.key]);

      if (diff !== 0) {
        return diff * sortConfig.dir;
      }
    }

    return 0;
  });
};
