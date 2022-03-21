import { expect } from "chai";
import { sortData } from "../../src/helpers/transformData/sortData";

describe("Sort", () => {
  const initialData = [
    { name: "John", age: 35 },
    { name: "Mark", age: 21 },
    { name: "John", age: 20 },
  ];

  it("should not sort if no value was given", () => {
    const data = [...initialData];
    const result = sortData(data, "");
    expect(result).to.deep.equal(data);
  });

  it("should sort if a value was given", () => {
    const data = [...initialData];
    const result = sortData(data, "age");
    expect(result[0].age).to.equal(data[2].age);
  });

  it("should not sort if sort value is not in allowed values", () => {
    const data = [...initialData];
    const result = sortData(data, "-name", ["age"]);
    expect(result[0].name).to.equal(data[0].name);
  });

  it("should sort if sort value is in allowed values", () => {
    const data = [...initialData];
    const result = sortData(data, "-name", ["name"]);
    expect(result[0].name).to.equal(data[1].name);
  });

  it("should sort with multiple values", () => {
    const data = [...initialData];
    const result = sortData(data, "-name,age", ["name", "age"]);
    expect(result[1].age).to.equal(data[2].age);
  });

  it("should sort with multiple values only for allowed values", () => {
    const data = [...initialData];
    const result = sortData(data, "-name,age", ["name"]);
    expect(result[0].name).to.equal(data[1].name);
  });
});
