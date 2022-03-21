export const cleanPersonFields = (person) => {
  const allowedPersonKeys = [
    "id",
    "salutation",
    "title",
    "first_name",
    "last_name",
    "address",
    "contact_address",
    "email",
    "mobile_number",
    "birth_name",
    "birth_date",
    "birth_city",
    "birth_country",
    "nationality",
    "employment_status",
    "job_title",
    "tax_information",
    "fatca_relevant",
    "fatca_crs_confirmed_at",
    "business_purpose",
    "industry",
    "industry_key",
    "terms_conditions_signed_at",
    "own_economic_interest_signed_at",
    "aml_follow_up_date",
    "aml_confirmed_on",
    "flagged_by_compliance",
    "expected_monthly_revenue_cents",
    "vat_number",
    "website_social_media",
    "business_trading_name",
    "nace_code",
    "business_address_line_1",
    "business_address_line_2",
    "business_postal_code",
    "business_city",
    "business_country",
    "screening_progress",
    "risk_classification_status",
    "customer_vetting_status",
    "annual_income_range",
    "data_terms_signed_at",
  ];

  const newPerson = {} as any;

  Object.keys(person).forEach((key) => {
    if (!allowedPersonKeys.includes(key)) {
      return;
    }

    newPerson[key] = person[key];
  });

  allowedPersonKeys.forEach((key) => {
    if (newPerson[key] === undefined) {
      newPerson[key] = null;
    }
  });

  newPerson.contact_address = {
    line_1: null,
    line_2: null,
    postal_code: null,
    city: null,
    country: null,
    state: null,
  };

  newPerson.tax_information = {
    tax_assessment: null,
    marital_status: "UNKNOWN",
  };

  return newPerson;
};
