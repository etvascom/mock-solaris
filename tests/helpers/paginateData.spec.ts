import { expect } from "chai";
import { paginateData } from "../../src/helpers/transformData/paginateData";

describe("Paginate", () => {
  const initialData = Array.from({ length: 1500 }).map((_, i) => ({ idx: i }));

  it("should paginate with default values if no pagination config was given", () => {
    const data = [...initialData];
    const result = paginateData(data);
    expect(result.length).to.equal(10);
    expect(result[0]).to.deep.equal({ idx: 0 });
  });

  it("should paginate with if given size in pagination config", () => {
    const data = [...initialData];
    const result = paginateData(data, { size: 20 });
    expect(result.length).to.equal(20);
    expect(result[0]).to.deep.equal({ idx: 0 });
  });

  it("should paginate with if given number in pagination config", () => {
    const data = [...initialData];
    const result = paginateData(data, { number: 2 });
    expect(result.length).to.equal(10);
    expect(result[0]).to.deep.equal({ idx: 10 });
  });

  it("should paginate with if given both number and size in pagination config", () => {
    const data = [...initialData];
    const result = paginateData(data, { number: 5, size: 30 });
    expect(result.length).to.equal(30);
    expect(result[0]).to.deep.equal({ idx: 120 });
  });
});
