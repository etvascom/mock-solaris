import * as falso from "@ngneat/falso";

export const seedAccount = (personId: string) => ({
  id: falso.randUuid(),
  iban: falso.randIban(),
  bic: "SOBKDEB2XXX",
  type: "CHECKING_PERSONAL",
  purpose: null,
  locking_status: "NO_BLOCK",
  locking_reasons: [],
  person_id: personId,
  account_limit: {
    value: falso.randNumber(),
  },
  available_balance: {
    value: falso.randNumber(),
  },
  balance: {
    value: falso.randNumber(),
  },
  overdraftInterest: falso.randNumber(),
});

export const seedAccounts = (length: number, personId: string) =>
  Array.from({ length }).map(() => seedAccount(personId));
