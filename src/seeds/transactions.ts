import { Booking } from "../helpers/types";
import moment from "moment";
import * as falso from "@ngneat/falso";

export const seedTransaction = (): Booking => ({
  id: falso.randUuid(),
  creation_date: moment(falso.randPastDate()).format("YYYY-MM-DD"),
  valuta_date: moment(falso.randPastDate()).format("YYYY-MM-DD"),
  booking_date: moment(falso.randPastDate()).format("YYYY-MM-DD"),
  booking_type: "DIRECT_DEBIT",
  amount: {
    value: falso.randNumber(),
    unit: "cents",
    currency: "EUR",
  },
  description: falso.randSentence(),
  recipient_bic: "COBADEFFXXX",
  recipient_iban: falso.randIban(),
  recipient_name: falso.randFullName(),
  sender_bic: "SOLADEBEXXX",
  sender_iban: falso.randIban(),
  sender_name: falso.randFullName(),
  end_to_end_id: "END2ENDREJ",
  creditor_identifier: "DE98ZZZ09999999999",
  mandate_reference: "1",
  transaction_id: falso.randUuid(),
  return_transaction_id: falso.randUuid(),
  meta_info: null,
});

export const seedTransactions = (length: number): Booking[] =>
  Array.from({ length }).map(seedTransaction);
