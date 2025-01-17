/* eslint-disable @typescript-eslint/camelcase */

import uuid from "node-uuid";
import * as db from "../db";
import moment from "moment";

import { creteBookingFromReservation } from "../routes/transactions";
import { triggerWebhook } from "./webhooks";
import { triggerBookingsWebhook } from "../routes/backoffice";

import {
  ReservationType,
  ReservationStatus,
  TransactionType,
  CardStatus,
  ActionType,
  FxRate,
  Reservation,
  CardWebhookEvent,
  CardAuthorizationDeclineReason,
  CardDetails,
  MockPerson,
  BookingType,
  POSEntryMode,
  Booking,
  CardTransaction,
  CardAuthorizationDeclinedStatus,
  FraudCase,
} from "./types";
import getFraudWatchdog from "./fraudWatchdog";
import { proceedWithSCAChallenge } from "./scaChallenge";
import _ from "lodash";

const fraudSuspected = (reason: CardAuthorizationDeclineReason) =>
  reason === CardAuthorizationDeclineReason.FRAUD_SUSPECTED;

const triggerCardFraudWebhook = async (
  cardAuthorizationDeclined,
  fraudCase
) => {
  await triggerWebhook(CardWebhookEvent.CARD_FRAUD_CASE_PENDING, {
    id: fraudCase.id,
    resolution: "PENDING",
    respond_until: moment(fraudCase.reservationExpiresAt).toISOString(),
    whitelisted_until: "null",
    card_transaction: cardAuthorizationDeclined,
  });
};

const triggerCardDeclinedWebhook = async (
  cardAuthorizationDeclined: CardTransaction,
  reason: CardAuthorizationDeclineReason
) => {
  await triggerWebhook(CardWebhookEvent.CARD_AUTHORIZATION_DECLINE, {
    id: uuid.v4(),
    reason,
    card_transaction: cardAuthorizationDeclined,
  });
};

export const markReservationAsFraud = async (
  reservation: Reservation,
  cardId: string,
  person: MockPerson
): Promise<FraudCase> => {
  const id = uuid.v4();
  const fraudCase = {
    id,
    reservationId: reservation.id,
    reservationExpiresAt: new Date().getTime() + 1800000,
    cardId,
  };
  person.account.fraudReservations.push(reservation);
  person.fraudCases.push(fraudCase);
  await db.savePerson(person);
  // Wait for response from customer.
  // If response does not arrive
  // within 30 minutes, block the card.
  getFraudWatchdog().watch(fraudCase);
  return fraudCase;
};

export const generateMetaInfo = ({
  originalAmount,
  originalCurrency,
  sender,
  senderIBAN,
  cardId,
  date,
  type,
  incoming,
  posEntryMode,
  merchantId,
  categoryCode,
  countryCode,
}: {
  originalAmount: number;
  originalCurrency: string;
  sender: string;
  senderIBAN: string;
  cardId: string;
  date: Date;
  type: TransactionType;
  incoming?: boolean;
  posEntryMode: POSEntryMode;
  merchantId?: string;
  categoryCode?: string;
  countryCode?: string;
}) => {
  return JSON.stringify({
    cards: {
      card_id: cardId,
      merchant: {
        country_code: countryCode,
        category_code: categoryCode,
        name: sender,
        iban: senderIBAN,
        town: "Berlin",
        id: merchantId || undefined,
      },
      original_amount: {
        currency: originalCurrency,
        value: originalAmount,
        fx_rate: FxRate[originalCurrency],
      },
      pos_entry_mode: posEntryMode,
      trace_id: incoming ? null : uuid.v4(),
      transaction_date: moment(date).format("YYYY-MM-DD"),
      transaction_time: incoming ? null : moment(date).toDate(),
      transaction_type: type,
    },
  });
};

const mapDataToReservation = ({
  amount,
  originalAmount,
  originalCurrency,
  type,
  sender,
  senderIBAN,
  cardId,
  posEntryMode,
  accountId,
  iban,
  description,
  merchantId,
  categoryCode,
  countryCode,
}: {
  amount: number;
  originalAmount: number;
  originalCurrency: string;
  type: TransactionType;
  sender: string;
  senderIBAN?: string;
  cardId: string;
  posEntryMode: POSEntryMode;
  accountId: string;
  iban: string;
  description: string;
  merchantId?: string;
  categoryCode?: string;
  countryCode?: string;
}): Reservation => {
  const date = moment().toDate();

  return {
    id: uuid.v4(),
    account_id: accountId,
    amount: {
      value: amount,
      unit: "cents",
      currency: "EUR",
    },
    reservation_type: ReservationType.CARD_AUTHORIZATION,
    reference: uuid.v4(),
    status: ReservationStatus.OPEN,
    meta_info: generateMetaInfo({
      originalAmount,
      originalCurrency,
      sender,
      senderIBAN,
      cardId,
      date,
      type,
      posEntryMode,
      merchantId,
      categoryCode,
      countryCode,
    }),
    expires_at: null,
    expired_at: null,
    resolved_at: null,
    created_at: moment().toISOString(),
    description,
    iban,
  };
};

const mapDataToCardAuthorizationDeclined = ({
  amount,
  originalAmount,
  originalCurrency,
  type,
  sender,
  senderIBAN,
  cardId,
  posEntryMode,
}: {
  amount: number;
  originalAmount: number;
  originalCurrency: string;
  type: TransactionType;
  sender: string;
  senderIBAN?: string;
  cardId: string;
  posEntryMode: POSEntryMode;
}): CardTransaction => {
  return {
    card_id: cardId,
    type,
    status: CardAuthorizationDeclinedStatus.DECLINED,
    attempted_at: moment().toDate(),
    pos_entry_mode: posEntryMode,
    merchant: {
      country_code: "DE",
      category_code: "5999",
      name: sender,
      iban: senderIBAN,
    },
    amount: {
      currency: "EUR",
      value: amount,
      unit: "cents",
    },
    original_amount: {
      currency: originalCurrency,
      value: originalAmount,
      unit: "cents",
    },
  };
};

const computeCardUsage = (person: MockPerson) => {
  const startOfToday = moment().startOf("day").toDate();
  const endOfToday = moment().endOf("day").toDate();
  const startOfMonth = moment().startOf("month").toDate();
  const endOfMonth = moment().endOf("month").toDate();

  const cardReservations = person.account.reservations.filter(
    ({ reservation_type: reservationType }) =>
      reservationType === ReservationType.CARD_AUTHORIZATION
  );
  const cardBookings = person.transactions.filter(
    ({ booking_type: bookingType }) =>
      bookingType === BookingType.CARD_TRANSACTION
  );

  const isBetween = (
    entry: Booking | Reservation,
    startDate: Date,
    endDate: Date
  ) => {
    return moment(JSON.parse(entry.meta_info).cards.transaction_date).isBetween(
      startDate,
      endDate,
      undefined,
      "[]"
    );
  };

  const todayReservations = cardReservations.filter((entry) =>
    isBetween(entry, startOfToday, endOfToday)
  );

  const filterByCardNotPresent = (reservation) =>
    JSON.parse(reservation.meta_info).cards.pos_entry_mode ===
    POSEntryMode.CARD_NOT_PRESENT;

  const filterByCardPresent = (reservation) =>
    JSON.parse(reservation.meta_info).cards.pos_entry_mode !==
    POSEntryMode.CARD_NOT_PRESENT;

  const sumAmount = (total: number, entry: Booking | Reservation) => {
    return total + entry.amount.value;
  };

  const todayBookings = cardBookings.filter((entry) =>
    isBetween(entry, startOfToday, endOfToday)
  );

  const todayCardNotPresent = [...todayReservations, ...todayBookings].filter(
    filterByCardNotPresent
  );

  const todayCardPresent = [...todayReservations, ...todayBookings].filter(
    filterByCardPresent
  );

  const thisMonthReservations = cardReservations.filter((entry) =>
    isBetween(entry, startOfMonth, endOfMonth)
  );

  const thisMonthBookings = cardBookings.filter((entry) =>
    isBetween(entry, startOfMonth, endOfMonth)
  );

  const thisMonthCardNotPresent = [
    ...thisMonthReservations,
    ...thisMonthBookings,
  ].filter(filterByCardNotPresent);

  const thisMonthCardPresent = [
    ...thisMonthReservations,
    ...thisMonthBookings,
  ].filter(filterByCardPresent);

  return {
    cardPresent: {
      daily: {
        transactions: todayCardPresent.length,
        amount: todayCardPresent.reduce(sumAmount, 0),
      },
      monthly: {
        transactions: thisMonthCardPresent.length,
        amount: thisMonthCardPresent.reduce(sumAmount, 0),
      },
    },
    cardNotPresent: {
      daily: {
        transactions: todayCardNotPresent.length,
        amount: todayCardNotPresent.reduce(sumAmount, 0),
      },
      monthly: {
        transactions: thisMonthCardNotPresent.length,
        amount: thisMonthCardNotPresent.reduce(sumAmount, 0),
      },
    },
  };
};

export const validateCardLimits = async (
  currentCardUsage,
  cardDetails: CardDetails,
  cardAuthorizationDeclined: CardTransaction
) => {
  const isCardNotPresentAuthorization =
    cardAuthorizationDeclined.pos_entry_mode === POSEntryMode.CARD_NOT_PRESENT;

  if (isCardNotPresentAuthorization) {
    const dailyLimitAfterAuthorization =
      currentCardUsage.cardNotPresent.daily.amount;
    const monthlyLimitAfterAuthorization =
      currentCardUsage.cardNotPresent.monthly.amount;

    if (
      dailyLimitAfterAuthorization >
      cardDetails.cardNotPresentLimits.daily.max_amount_cents
    ) {
      await triggerCardDeclinedWebhook(
        cardAuthorizationDeclined,
        CardAuthorizationDeclineReason.CARD_NOT_PRESENT_AMOUNT_LIMIT_REACHED_DAILY
      );
      throw new Error(
        `Daily card_not_present amount limit exceeded (${dailyLimitAfterAuthorization} > ${cardDetails.cardNotPresentLimits.daily.max_amount_cents})`
      );
    }

    if (
      currentCardUsage.cardNotPresent.daily.transactions >
      cardDetails.cardNotPresentLimits.daily.max_transactions
    ) {
      await triggerCardDeclinedWebhook(
        cardAuthorizationDeclined,
        CardAuthorizationDeclineReason.CARD_NOT_PRESENT_USE_LIMIT_REACHED_DAILY
      );
      throw new Error(
        "Daily card_not_present transaction number limit exceeded"
      );
    }

    if (
      monthlyLimitAfterAuthorization >
      cardDetails.cardNotPresentLimits.monthly.max_amount_cents
    ) {
      await triggerCardDeclinedWebhook(
        cardAuthorizationDeclined,
        CardAuthorizationDeclineReason.CARD_NOT_PRESENT_AMOUNT_LIMIT_REACHED_MONTHLY
      );
      throw new Error(
        `Monthly card_not_present amount limit exceeded (${monthlyLimitAfterAuthorization} > ${cardDetails.cardNotPresentLimits.monthly.max_amount_cents})`
      );
    }

    if (
      currentCardUsage.cardNotPresent.monthly.transactions >
      cardDetails.cardNotPresentLimits.monthly.max_transactions
    ) {
      await triggerCardDeclinedWebhook(
        cardAuthorizationDeclined,
        CardAuthorizationDeclineReason.CARD_NOT_PRESENT_USE_LIMIT_REACHED_MONTHLY
      );
      throw new Error(
        "Monthly card_not_present transaction number limit exceeded"
      );
    }
  } else {
    const dailyLimitAfterAuthorization =
      currentCardUsage.cardPresent.daily.amount;
    const monthlyLimitAfterAuthorization =
      currentCardUsage.cardPresent.monthly.amount;

    if (
      dailyLimitAfterAuthorization >
      cardDetails.cardPresentLimits.daily.max_amount_cents
    ) {
      await triggerCardDeclinedWebhook(
        cardAuthorizationDeclined,
        CardAuthorizationDeclineReason.CARD_PRESENT_AMOUNT_LIMIT_REACHED_DAILY
      );
      throw new Error(
        `Daily card_present amount limit exceeded (${dailyLimitAfterAuthorization} > ${cardDetails.cardPresentLimits.daily.max_amount_cents})`
      );
    }

    if (
      currentCardUsage.cardPresent.daily.transactions >
      cardDetails.cardPresentLimits.daily.max_transactions
    ) {
      await triggerCardDeclinedWebhook(
        cardAuthorizationDeclined,
        CardAuthorizationDeclineReason.CARD_PRESENT_USE_LIMIT_REACHED_DAILY
      );
      throw new Error("Daily card_present transaction number limit exceeded");
    }

    if (
      monthlyLimitAfterAuthorization >
      cardDetails.cardPresentLimits.monthly.max_amount_cents
    ) {
      await triggerCardDeclinedWebhook(
        cardAuthorizationDeclined,
        CardAuthorizationDeclineReason.CARD_PRESENT_AMOUNT_LIMIT_REACHED_MONTHLY
      );
      throw new Error(
        `Monthly card_present amount limit exceeded (${monthlyLimitAfterAuthorization} > ${cardDetails.cardPresentLimits.monthly.max_amount_cents})`
      );
    }

    if (
      currentCardUsage.cardPresent.monthly.transactions >
      cardDetails.cardPresentLimits.monthly.max_transactions
    ) {
      await triggerCardDeclinedWebhook(
        cardAuthorizationDeclined,
        CardAuthorizationDeclineReason.CARD_PRESENT_USE_LIMIT_REACHED_MONTHLY
      );
      throw new Error("Monthly card_present transaction number limit exceeded");
    }
  }
};

export const createReservation = async ({
  personId,
  cardId,
  amount,
  currency,
  type,
  sender,
  senderIBAN,
  declineReason,
  posEntryMode = POSEntryMode.CONTACTLESS,
  iban = "DE89370400440532013000",
  description = "Transaction made",
  categoryCode = "3058",
  countryCode = "DE",
  merchantId,
}: {
  personId: string;
  cardId: string;
  amount: string;
  currency: string;
  type: TransactionType;
  sender: string;
  declineReason?: CardAuthorizationDeclineReason;
  posEntryMode?: POSEntryMode;
  senderIBAN?: string;
  iban?: string;
  description?: string;
  categoryCode?: string;
  countryCode?: string;
  merchantId?: string;
}) => {
  const person = await db.getPerson(personId);
  const cardData = person.account.cards.find(({ card }) => card.id === cardId);
  const cardAccountId = cardData.card.account_id;
  const convertedAmount = Math.abs(parseInt(amount, 10));
  const cardAuthorizationPayload = {
    amount: Math.round(convertedAmount * FxRate[currency]),
    originalAmount: convertedAmount,
    originalCurrency: currency,
    type,
    sender,
    senderIBAN,
    cardId,
    posEntryMode,
    accountId: cardAccountId,
    iban,
    description,
    merchantId,
    categoryCode,
    countryCode,
  };

  const reservation = mapDataToReservation(cardAuthorizationPayload);
  const cardAuthorizationDeclined = mapDataToCardAuthorizationDeclined(
    cardAuthorizationPayload
  );

  if (!cardData) {
    throw new Error("Card not found");
  }

  if (
    [CardStatus.BLOCKED, CardStatus.BLOCKED_BY_SOLARIS].includes(
      cardData.card.status
    )
  ) {
    await triggerCardDeclinedWebhook(
      cardAuthorizationDeclined,
      CardAuthorizationDeclineReason.CARD_BLOCKED
    );
    throw new Error("Your card is blocked");
  }

  if (cardData.card.status === CardStatus.INACTIVE) {
    await triggerCardDeclinedWebhook(
      cardAuthorizationDeclined,
      CardAuthorizationDeclineReason.CARD_INACTIVE
    );
    throw new Error("Your card is in inactive status");
  }

  if (cardData.card.status !== CardStatus.ACTIVE) {
    throw new Error("Your card is not in active status");
  }

  if (
    [POSEntryMode.CONTACTLESS, POSEntryMode.PHONE].includes(posEntryMode) &&
    !cardData.cardDetails.settings.contactless_enabled
  ) {
    throw new Error(`Card has contactless transactions disabled`);
  }

  if (person.account.available_balance.value < amount) {
    await triggerCardDeclinedWebhook(
      cardAuthorizationDeclined,
      CardAuthorizationDeclineReason.INSUFFICIENT_FUNDS
    );
    throw new Error("There were insufficient funds to complete this action.");
  }

  if (declineReason) {
    if (fraudSuspected(declineReason)) {
      const fraudCase = await markReservationAsFraud(
        reservation,
        cardId,
        person
      );
      return triggerCardFraudWebhook(cardAuthorizationDeclined, fraudCase);
    } else {
      return triggerCardDeclinedWebhook(
        cardAuthorizationDeclined,
        declineReason
      );
    }
  }

  if (posEntryMode === POSEntryMode.CARD_NOT_PRESENT) {
    return proceedWithSCAChallenge(person, reservation);
  }

  person.account.reservations.push(reservation);

  const currentCardUsages = computeCardUsage(person);
  await validateCardLimits(
    currentCardUsages,
    cardData.cardDetails,
    cardAuthorizationDeclined
  );

  await db.savePerson(person);

  await triggerWebhook(CardWebhookEvent.CARD_AUTHORIZATION, reservation);

  return reservation;
};

const resolveReservation = async (person, reservation) => {
  person.account.reservations = person.account.reservations.map((res) => {
    if (res.id === reservation.id) {
      return {
        ...res,
        status: ReservationStatus.RESOLVED,
        resolved_at: moment().toDate(),
      };
    }
    return res;
  });

  reservation.status = ReservationStatus.RESOLVED;

  await db.savePerson(person);

  await triggerWebhook(
    CardWebhookEvent.CARD_AUTHORIZATION_RESOLUTION,
    reservation
  );
};

const bookReservation = async (
  person,
  reservation,
  increaseAmount,
  decreaseAmount
) => {
  let additionalAmount = 0;

  const amountModPercentage = 50 / 100;

  if (increaseAmount) {
    additionalAmount = Math.floor(
      reservation.amount.value * amountModPercentage
    );
  }

  if (decreaseAmount) {
    additionalAmount =
      -1 * Math.floor(reservation.amount.value * amountModPercentage);
  }

  const booking = creteBookingFromReservation(person, {
    ...reservation,
    amount: {
      ...reservation.amount,
      value: reservation.amount.value + additionalAmount,
    },
  });

  person.transactions.push(booking);

  person.account.reservations = person.account.reservations.map((item) =>
    item.id !== reservation.id
      ? item
      : {
          ...item,
          status: "RESOLVED",
          resolved_at: moment().utc().toISOString(),
        }
  );

  await db.savePerson(person);

  await resolveReservation(person, reservation);

  await triggerBookingsWebhook(booking);
};

const expireReservation = async (person, reservation) => {
  person.account.reservations = person.account.reservations.map((res) => {
    if (res.id === reservation.id) {
      return {
        ...res,
        status: "EXPIRED",
        resolved_at: moment().utc().toISOString(),
        expired_at: moment().utc().toISOString(),
      };
    }
    return res;
  });

  reservation.status = ReservationStatus.EXPIRED;

  await db.savePerson(person);

  await triggerWebhook(
    CardWebhookEvent.CARD_AUTHORIZATION_RESOLUTION,
    reservation
  );
};

export const updateReservation = async ({
  personId,
  reservationId,
  action,
  increaseAmount,
  decreaseAmount,
}: {
  personId: string;
  reservationId: string;
  action: ActionType;
  increaseAmount?: boolean;
  decreaseAmount?: boolean;
}) => {
  const person = await db.getPerson(personId);

  const reservation = person.account.reservations.find(
    (r) => r.id === reservationId
  );

  if (!reservation) {
    throw new Error("Reservation not found");
  }

  switch (action) {
    case ActionType.RESOLVE: {
      return resolveReservation(person, reservation);
    }
    case ActionType.BOOK: {
      return bookReservation(
        person,
        reservation,
        increaseAmount,
        decreaseAmount
      );
    }
    case ActionType.EXPIRE: {
      return expireReservation(person, reservation);
    }
    default:
      throw new Error("Unknown action type");
  }
};

type GetAccountReservationsArgs = {
  filter?: {
    id?: string[];
    status?: string[];
    reservation_type?: string[];
  };
  page?: number;
  sort?: {
    key?: string;
    direction?: "asc" | "desc";
  };
};

const RESERVATIONS_PAGE_SIZE = 10;

export const arrayIncludesOrIgnoreIfUndefined = (
  array: string[] | undefined,
  value: string
) => {
  if (!array) {
    return true;
  }

  return array.includes(value);
};

export const getAccountReservations = async (
  accountId: string,
  { filter, page = 1, sort }: GetAccountReservationsArgs
) => {
  const person = await db.findPersonByAccountId(accountId);

  const reservations = _.get(
    person.account,
    "reservations",
    []
  ) as Reservation[];

  const statusFilter = [
    ...filter.status,
    ...(filter.status?.includes("RESOLVED") ? ["EXPIRED"] : []),
  ];

  const filteredReservations = _.filter(
    reservations,
    (reservation) =>
      arrayIncludesOrIgnoreIfUndefined(filter.id, reservation.id) &&
      arrayIncludesOrIgnoreIfUndefined(statusFilter, reservation.status) &&
      arrayIncludesOrIgnoreIfUndefined(
        filter.reservation_type,
        reservation.reservation_type
      )
  );

  const sortedReservations = sort
    ? _.orderBy(filteredReservations, sort.key, sort.direction)
    : filteredReservations;

  const paginatedReservations = _.chunk(
    sortedReservations,
    RESERVATIONS_PAGE_SIZE
  );

  return paginatedReservations[page - 1] ?? [];
};
