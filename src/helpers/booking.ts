export const cleanBookingFields = (booking) => {
  const allowedBookingKeys = [
    "id",
    "creation_date",
    "valuta_date",
    "booking_date",
    "booking_type",
    "amount",
    "description",
    "recipient_bic",
    "recipient_iban",
    "recipient_name",
    "sender_bic",
    "sender_iban",
    "sender_name",
    "end_to_end_id",
    "creditor_identifier",
    "mandate_reference",
    "transaction_id",
    "return_transaction_id",
    "sepa_return_code",
    "sepa_return_reason",
    "sepa_return_reason_definition",
    "meta_info",
    "recorded_at",
    "reconciliation_id",
  ];

  const newBooking = {} as any;

  Object.keys(booking).forEach((key) => {
    if (!allowedBookingKeys.includes(key)) {
      return;
    }

    newBooking[key] = booking[key];
  });

  return newBooking;
};
