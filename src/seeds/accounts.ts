/* tslint-disable */

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
});

export const seedAccounts = (length: number, personId: string) =>
  Array.from({ length }).map(() => seedAccount(personId));
