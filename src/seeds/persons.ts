import { seedAccount } from "./accounts";
import { seedTransactions } from "./transactions";
import _ from "lodash";

const PERSON_COUNT = _.clamp(
  parseInt(process.env.PERSON_COUNT ?? "100", 10),
  100
);

const createNewPerson = (personId: string) => {
  const accounts = [{ ...seedAccount(personId) }];

  return {
    salutation: "MR",
    first_name: personId,
    last_name: "GmbH",
    birth_date: "1998-01-01T00:00:00.000Z",
    birth_city: "Copenhagen",
    nationality: "DE",
    employment_status: "FREELANCER",
    birth_country: "DE",
    address: {
      line_1: "Torstraße 177",
      postal_code: "10155",
      city: "Berlin",
      country: "DE",
    },
    fatca_relevant: true,
    email: `${personId}@email.com`,
    mobile_number: "+49123123223",
    id: personId,
    identifications: {
      "identify-mock691f4e49fc43b913bd8ede668e187e9a-1509032370615": {
        id: "identify-mock691f4e49fc43b913bd8ede668e187e9a-1509032370615",
        reference: null,
        url:
          "https://go.test.idnow.de/kontist/identifications/identify-mock691f4e49fc43b913bd8ede668e187e9a-1509032370615",
        status: "successful",
        completed_at: null,
        method: "idnow",
        identificationLinkCreatedAt: "2017-10-26T15:39:31.327Z",
        person_id: "mock691f4e49fc43b913bd8ede668e187e9a",
        startUrl:
          "https://api.test.idnow.de/api/v1/kontist/identifications/identify-mock691f4e49fc43b913bd8ede668e187e9a-1509032370615/start",
        email: "i1@kontist.com",
      },
      "identify-mock691f4e49fc43b913bd8ede668e187e9a-1509032371343": {
        id: "identify-mock691f4e49fc43b913bd8ede668e187e9a-1509032371343",
        reference: null,
        url: null,
        status: "created",
        completed_at: null,
        method: "idnow",
      },
    },
    screening_progress: null,
    transactions: _.flatten(accounts.map(({ id }) => seedTransactions(5, id))),
    account: accounts[0],
    accounts,
    billing_account: {
      id: process.env.SOLARIS_KONTIST_BILLING_ACCOUNT_ID,
      iban: "DE58110101002263909949",
      bic: process.env.SOLARIS_BIC,
      type: "CHECKING_BUSINESS",
      person_id: personId,
      balance: {
        value: 100,
      },
      sender_name: "unknown",
      locking_status: "",
      available_balance: {
        value: 100,
      },
    },
  };
};

type PersistPersonFunc = (person: any) => Promise<void>;

export const seedPersons = async (savePerson: PersistPersonFunc) => {
  _.range(0, PERSON_COUNT)
    .map((number) => `demo`.concat(number.toString().padStart(2, "0")))
    .forEach((id) =>
      savePerson({
        ...createNewPerson(id),
      })
    );
};
