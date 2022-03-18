import * as falso from "@ngneat/falso";

const correctRandomIBAN = () => {
  const ibans = [
    "DE38500105173355343971",
    "DE65500105178448517538",
    "DE57500105176286851924",
    "DE77500105176696415537",
    "DE90500105176283817461",
  ];

  return ibans[Math.floor(Math.random() * 4)];
};

export const seedAccount = (personId: string) => ({
  id: falso.randUuid(),
  iban: correctRandomIBAN(),
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
    unit: "cents",
    currency: "EUR",
  },
  balance: {
    value: falso.randNumber({ min: 1_000_000 }),
    unit: "cents",
    currency: "EUR",
  },
  overdraftInterest: falso.randNumber(),
});

export const seedAccounts = (length: number, personId: string) =>
  Array.from({ length }).map(() => seedAccount(personId));
