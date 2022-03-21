import { expect } from "chai";
import { filterData } from "../../src/helpers/transformData/filterData";

describe("Filter", () => {
  const initialData = [
    { name: "John", age: 35, credit: 1000 },
    { name: "Mark", age: 21, credit: 350 },
    { name: "Will", age: 20, credit: 25000 },
  ];

  it("should not filter if no filter config was given", () => {
    const data = [...initialData];
    const result = filterData(data);
    expect(result).to.deep.equal(initialData);
  });

  it("should filter if a min filter config was given", () => {
    const data = [...initialData];
    const result = filterData(data, {
      age: {
        min: 21,
      },
    });
    expect(result.length).to.equal(2);
  });

  it("should filter if a max filter config was given", () => {
    const data = [...initialData];
    const result = filterData(data, {
      age: {
        max: 20,
      },
    });
    expect(result.length).to.equal(1);
  });

  it("should filter if both a max and min filter config were given", () => {
    const data = [...initialData];
    const result = filterData(data, {
      age: {
        max: 30,
        min: 21,
      },
    });
    expect(result.length).to.equal(1);
  });

  it("should filter for multiple filter configs", () => {
    const data = [...initialData];
    const result = filterData(data, {
      age: {
        max: 30,
        min: 20,
      },
      credit: {
        max: 1000,
      },
    });
    expect(result.length).to.equal(1);
  });

  it("should filter equal", () => {
    const data = [...initialData];
    const result = filterData(data, {
      age: 21,
    });
    expect(result.length).to.equal(1);
  });
});
