import chai, { expect } from "chai";
import assert from "assert";

import * as personsAPI from "../../src/routes/persons";
import { migrate } from "../../src/db";

describe("persons routes", () => {
  describe("list persons", () => {
    beforeEach(migrate);

    xit("should return a valid response", async () => {
      // arrange
      const req = {
        params: {
          person_id: "mockpersonkontistgmbh",
        },
      };
      const called = [];
      const res = {} as any;

      res.send = async (payload) => {
        called.push("send");

        assert.deepStrictEqual(payload, {
          foo: "bar",
        });
      };

      res.status = () => {
        called.push("status");
        return res;
      };

      // act
      await personsAPI.showPerson(req, res);

      // assert
      assert.deepStrictEqual(called, ["status", "send"]);
    });
  });
});
