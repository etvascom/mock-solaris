export enum ReservationType {
  CARD_AUTHORIZATION = "CARD_AUTHORIZATION"
}

export enum ReservationStatus {
  OPEN = "OPEN",
  RESOLVED = "RESOLVED"
}

export enum TransactionType {
  PURCHASE = "PURCHASE",
  CASH_ATM = "CASH_ATM",
  CASH_MANUAL = "CASH_MANUAL",
  CREDIT_PRESENTMENT = "CREDIT_PRESENTMENT"
}

export enum CardStatus {
  PROCESSING = "PROCESSING",
  INACTIVE = "INACTIVE",
  ACTIVE = "ACTIVE",
  BLOCKED = "BLOCKED",
  BLOCKED_BY_SOLARIS = "BLOCKED_BY_SOLARIS",
  ACTIVATION_BLOCKED_BY_SOLARIS = "ACTIVATION_BLOCKED_BY_SOLARIS",
  CLOSED = "CLOSED",
  CLOSED_BY_SOLARIS = "CLOSED_BY_SOLARIS"
}

export enum ActionType {
  BOOK = "BOOK",
  CANCEL = "CANCEL",
  EXPIRE = "EXPIRE"
}

export enum FxRate {
  EUR = 1.0,
  USD = 0.904697
}