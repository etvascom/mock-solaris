import { CountryCode, IBAN } from "ibankit";
import _ from "lodash";
import uuid from "node-uuid";
import { findPersonByAccountId, getPerson, savePerson } from "../db";

import moment from "moment";
import { cleanBookingFields } from "../helpers/booking";
import { transformData } from "../helpers/transformData";

const ACCOUNT_SNAPSHOT_SOURCE = "SOLARISBANK";

const DEFAULT_ACCOUNT = {
  id: "df478cbe801e30550f7cea9340783e6bcacc",
  iban: "DE87110101001000022513",
  bic: "SOBKDEBBXXX",
  type: "CHECKING_PERSONAL",
  balance: {
    value: 0,
    unit: "cents",
    currency: "EUR",
  },
  available_balance: {
    value: 0,
    unit: "cents",
    currency: "EUR",
  },
  locking_status: "NO_BLOCK",
  locking_reasons: [],
  account_limit: {
    value: 0,
    unit: "cents",
    currency: "EUR",
  },
  person_id: "66a692fdddc32c05ebe1c1f1c3145a3bcper",
  status: "ACTIVE",
  closure_reasons: null,
};

const requestAccountFields = [
  "id",
  "iban",
  "bic",
  "type",
  "balance",
  "available_balance",
  "locking_status",
  "locking_reasons",
  "account_limit",
  "person_id",
  "status",
  "closure_reasons",
];

export const showAccountBookings = async (req, res) => {
  const { account_id: accountId } = req.params;

  const person = await findPersonByAccountId(accountId);

  const transactions = _.get(person, "transactions", []).filter(
    ({ account_id }) => account_id === accountId
  );

  const sortAccepted = ["id", "booking_date", "valuta_date", "recorded_at"];

  return res.status(200).send(
    transformData(transactions, {
      ...req.query,
      sort: req.query.sort || "booking_date",
      sortAccepted,
    }).map(cleanBookingFields)
  );
};

export const createAccountBooking = async (req, res) => {
  const { account_id: accountId } = req.params;

  const person = await findPersonByAccountId(accountId);
  const accountOfPerson = person.accounts.find(
    (account) => account.id === accountId
  );

  const newPerson = {
    ...person,
    transactions: [
      ...person.transactions,
      {
        ...req.body,
        account_id: accountId,
        recipient_iban: accountOfPerson.iban,
      },
    ],
  };

  await savePerson(newPerson);

  return res.status(200).json({ success: true });
};

export const showAccountReservations = async (req, res) => {
  const { account_id: accountId } = req.params;
  const person = await findPersonByAccountId(accountId);

  const reservations = _.get(person.account, "reservations", []);

  res.status(200).send(reservations);
};

export const showPersonAccount = async (req, res) => {
  const { person_id: personId, id } = req.params;

  const person = await getPerson(personId);

  const account = person.accounts.find((acc) => acc.id === id);

  if (!account) {
    return res.status(404).send({});
  }

  const _account = _.pick(account, requestAccountFields);

  res.status(200).send(_account);
};

export const showPersonAccounts = async (req, res) => {
  const { person_id: personId } = req.params;
  const person = await getPerson(personId);

  const accounts = person.accounts.map((account) =>
    _.pick(account, requestAccountFields)
  );

  res.status(200).send(accounts);
};

let counter = 0;

export const createAccount = async (personId, data) => {
  const person = await getPerson(personId);
  person.account = {
    ...DEFAULT_ACCOUNT,
    ...person.account,
    ...data,
  };

  await savePerson(person);

  return person.account;
};

export const createAccountRequestHandler = async (req, res) => {
  const { person_id: personId } = req.params;

  counter++;

  const accountId = personId.split("").reverse().join("");

  const iban = IBAN.random(CountryCode.DE).toString();

  const account = await createAccount(personId, {
    ...DEFAULT_ACCOUNT,
    id: accountId,
    iban,
    type: "CHECKING_BUSINESS",
    person_id: personId,
    balance: {
      value: 0, // new accounts have no money
    },
    available_balance: {
      value: 0, // new accounts have no money
    },
    sender_name: `bank-mock-${counter}`,
    locking_status: "NO_BLOCK",
  });

  res.status(201).send(account);
};

export const createAccountSnapshot = async (req, res) => {
  const {
    body: { account_id: accountId, source },
  } = req;

  const person = await findPersonByAccountId(accountId);

  if (!person) {
    return res.status(404).send({
      id: uuid.v4(),
      status: 404,
      code: "not_found",
      title: "Not Found",
      detail: `Value: ${accountId} for field: 'account_id' not found`,
      source: {
        message: "not found",
        field: "account_id",
      },
    });
  }

  if (source !== ACCOUNT_SNAPSHOT_SOURCE) {
    return res.status(400).send({
      id: uuid.v4(),
      status: 400,
      code: "bad_request",
      title: "Bad Request",
      detail: `/source: Invalid value for enum`,
      source: {
        message: "Invalid value for enum",
        field: "/source",
      },
    });
  }

  const snapshot = {
    status: "available",
    provider: ACCOUNT_SNAPSHOT_SOURCE,
    id: uuid.v4(),
    iban: person.account.iban,
    account_id: accountId,
  };

  person.account.snapshot = snapshot;
  await savePerson(person);

  return res.status(201).send({
    id: snapshot.id,
    account_id: accountId,
  });
};

export const showAccountBalance = async (req, res) => {
  const { account_id: accountId } = req.params;
  const person = await findPersonByAccountId(accountId);

  if (!person) {
    return res
      .status(404)
      .json({ error: true, message: "Cannot find account owner" });
  }

  const account = person.accounts.find((acc) => acc.id === accountId);

  const balance = _.pick(account, ["balance", "available_balance"]);

  return res.status(200).send(balance);
};

export const showAccount = async (req, res) => {
  const { account_id: accountId } = req.params;

  const person = await findPersonByAccountId(accountId);

  if (!person) {
    return res
      .status(404)
      .json({ error: true, message: "Cannot find account owner" });
  }

  const account = person.accounts.find((acc) => acc.id === accountId);

  return res.status(200).send(account);
};
