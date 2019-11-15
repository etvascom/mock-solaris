import _ from "lodash";
import Promise from "bluebird";

import * as log from "./logger";

let redis;

if (process.env.MOCKSOLARIS_REDIS_SERVER) {
  log.info(`using redis server at ${process.env.MOCKSOLARIS_REDIS_SERVER}`);
  redis = require("redis");
  Promise.promisifyAll(redis.RedisClient.prototype);
  Promise.promisifyAll(redis.Multi.prototype);
} else {
  log.info("using memory for not very persistent persistence");
  redis = Promise.promisifyAll(require("redis-mock"));
}

const redisClient = redis.createClient(process.env.MOCKSOLARIS_REDIS_SERVER);

redisClient.on("error", function(err) {
  log.error("Error " + err);
});

export const migrate = async () => {
  try {
    await getPerson("mockpersonkontistgmbh");
    throw new Error("during development, we create it every time");
  } catch (error) {
    log.warn("kontistGmbHAccount not found, creating");

    await savePerson({
      salutation: "MR",
      first_name: "Kontist",
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
        country: "DE"
      },
      tax_information: {
        properties: {
          marital_status: "SINGLE"
        }
      },
      fatca_relevant: true,
      email: "kontistgmbh@mocksolaris.example.com",
      mobile_number: "+49123123223",
      id: "mockpersonkontistgmbh",
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
          email: "i1@kontist.com"
        },
        "identify-mock691f4e49fc43b913bd8ede668e187e9a-1509032371343": {
          id: "identify-mock691f4e49fc43b913bd8ede668e187e9a-1509032371343",
          reference: null,
          url: null,
          status: "created",
          completed_at: null,
          method: "idnow"
        }
      },
      transactions: [
        {
          id: "e0492abb-87fd-42a2-9303-708026b90c8e",
          amount: {
            value: 100,
            currency: "EUR"
          },
          valuta_date: "2017-12-24",
          description: "kauf dir was",
          booking_date: "2017-09-25",
          name: "topping up the dunning account",
          recipient_bic: process.env.SOLARIS_BIC,
          recipient_iban: "ES0254451416043911355892",
          recipient_name: "Kontist GmbH",
          sender_bic: process.env.SOLARIS_BIC,
          sender_iban: "DE00000000002901",
          sender_name: "Alexander Baatz Retirement Fund"
        }
      ],
      account: {
        id: process.env.SOLARIS_KONTIST_ACCOUNT_ID,
        iban: "DE58110101002263909949",
        bic: process.env.SOLARIS_BIC,
        type: "CHECKING_BUSINESS",
        person_id: "mockpersonkontistgmbh",
        balance: {
          value: 100
        },
        sender_name: "unknown",
        locking_status: "",
        available_balance: {
          value: 100
        }
      },
      billing_account: {
        id: process.env.SOLARIS_KONTIST_BILLING_ACCOUNT_ID,
        iban: "DE58110101002263909949",
        bic: process.env.SOLARIS_BIC,
        type: "CHECKING_BUSINESS",
        person_id: "mockpersonkontistgmbh",
        balance: {
          value: 100
        },
        sender_name: "unknown",
        locking_status: "",
        available_balance: {
          value: 100
        }
      }
    });
  }
};

const jsonToPerson = value => {
  if (!value) {
    throw new Error("did not find person");
  }

  const person = JSON.parse(value);
  person.transactions = person.transactions || [];
  return person;
};

export const getPerson = async personId => {
  const person = await redisClient
    .getAsync(`${process.env.MOCKSOLARIS_REDIS_PREFIX}:person:${personId}`)
    .then(jsonToPerson);

  person.timedOrders = person.timedOrders || [];
  person.transactions = person.transactions || [];

  if (person.account) {
    person.account.reservations = person.account.reservations || [];
  }

  return person;
};

export const getTechnicalUserPerson = () => getPerson("mockpersonkontistgmbh");

const addAmountValues = (a, b) => a + b.amount.value;

export const savePerson = async person => {
  person.address = person.address || { country: null };

  const account = person.account;

  if (account) {
    const transactions = person.transactions || [];
    const queuedBookings = person.queuedBookings || [];
    const reservations = person.account.reservations || [];
    const now = new Date().getTime();
    const transactionsBalance = transactions
      .filter(transaction => new Date(transaction.valuta_date).getTime() < now)
      .reduce(addAmountValues, 0);
    const confirmedTransfersBalance = queuedBookings
      .filter(booking => booking.status === "accepted")
      .reduce(addAmountValues, 0);
    const reservationsBalance = reservations.reduce(addAmountValues, 0);

    account.balance = {
      value: transactionsBalance
    };

    account.available_balance = {
      // Confirmed transfers amounts are negative
      value:
        transactionsBalance + confirmedTransfersBalance - reservationsBalance
    };

    person.account = account;
    person.timedOrders = person.timedOrders || [];
  }

  const response = await redisClient.setAsync(
    `${process.env.MOCKSOLARIS_REDIS_PREFIX}:person:${person.id}`,
    JSON.stringify(person, undefined, 2)
  );

  return response;
};

export const getTaxIdentifications = async personId =>
  JSON.parse(
    (await redisClient.getAsync(
      `${process.env.MOCKSOLARIS_REDIS_PREFIX}:taxIdentifications:${personId}`
    )) || "[]"
  );

export const saveTaxIdentifications = async (personId, data) =>
  redisClient.setAsync(
    `${process.env.MOCKSOLARIS_REDIS_PREFIX}:taxIdentifications:${personId}`,
    JSON.stringify(data, undefined, 2)
  );

export const getMobileNumber = async personId =>
  JSON.parse(
    await redisClient.getAsync(
      `${process.env.MOCKSOLARIS_REDIS_PREFIX}:mobileNumber:${personId}`
    )
  );

export const saveMobileNumber = async (personId, data) =>
  redisClient.setAsync(
    `${process.env.MOCKSOLARIS_REDIS_PREFIX}:mobileNumber:${personId}`,
    JSON.stringify(data, undefined, 2)
  );

export const deleteMobileNumber = async personId =>
  redisClient.delAsync(
    `${process.env.MOCKSOLARIS_REDIS_PREFIX}:mobileNumber:${personId}`
  );

export const getDevice = async deviceId =>
  JSON.parse(
    await redisClient.getAsync(
      `${process.env.MOCKSOLARIS_REDIS_PREFIX}:device:${deviceId}`
    )
  );

export const getAllDevices = () =>
  redisClient
    .keysAsync(`${process.env.MOCKSOLARIS_REDIS_PREFIX}:device:*`)
    .then(keys => {
      if (keys.length < 1) {
        return [];
      }
      return redisClient.mgetAsync(keys);
    })
    .then(values => values.map(value => JSON.parse(value)));

export const getDevicesByPersonId = personId =>
  getAllDevices().then(devices =>
    devices.filter(device => device.person_id === personId)
  );

export const saveDevice = async device =>
  redisClient.setAsync(
    `${process.env.MOCKSOLARIS_REDIS_PREFIX}:device:${device.id}`,
    JSON.stringify(device, undefined, 2)
  );

export const getDeviceChallenge = async challengeId =>
  JSON.parse(
    await redisClient.getAsync(
      `${process.env.MOCKSOLARIS_REDIS_PREFIX}:deviceChallenge:${challengeId}`
    )
  );

export const deleteDeviceChallenge = async challengeId =>
  redisClient.delAsync(
    `${process.env.MOCKSOLARIS_REDIS_PREFIX}:deviceChallenge:${challengeId}`
  );

export const saveDeviceChallenge = async challenge =>
  redisClient.setAsync(
    `${process.env.MOCKSOLARIS_REDIS_PREFIX}:deviceChallenge:${challenge.id}`,
    JSON.stringify(challenge, undefined, 2)
  );

export const saveBooking = (accountId, booking) => {
  return findPersonByAccountId(accountId)
    .then(person => {
      person.transactions.push(booking);
      return person;
    })
    .then(savePerson);
};

export const getAllPersons = () => {
  return redisClient
    .keysAsync(`${process.env.MOCKSOLARIS_REDIS_PREFIX}:person:*`)
    .then(keys => {
      if (keys.length < 1) {
        return [];
      }
      return redisClient.mgetAsync(keys);
    })
    .then(values => values.map(jsonToPerson))
    .then(values =>
      values.sort((p1, p2) => {
        if (!p1.createdAt && p2.createdAt) return 1;
        if (p1.createdAt && !p2.createdAt) return -1;
        if (!p1.createdAt && !p2.createdAt) return 0;
        return p1.createdAt > p2.createdAt ? -1 : 1;
      })
    )
    .then(results =>
      results.map(person => ({
        ...person,
        timedOrders: person.timedOrders || [],
        queuedBookings: person.queuedBookings || []
      }))
    );
};

export const getAllIdentifications = () => {
  return getAllPersons().then(persons => {
    return _.flattenDeep(
      persons.map(person => {
        const identification = Object.values(person.identifications || {});
        identification.person = person;
        return identification;
      })
    );
  });
};

export const findPersonByAccountField = async findBy => {
  const persons = await getAllPersons();
  return persons.filter(person => person.account).find(findBy);
};

export const findPersonByAccountId = accountId =>
  findPersonByAccountField(
    person =>
      person.account.id === accountId ||
      (person.billing_account || {}).id === accountId
  );

export const findPersonByAccountIBAN = iban =>
  findPersonByAccountField(person => person.account.iban === iban);

export const findPersonByEmail = email => {
  return getAllPersons().then(persons => {
    return persons.find(person => person.email === email);
  });
};

export const getWebhooks = () => {
  return redisClient
    .keysAsync(`${process.env.MOCKSOLARIS_REDIS_PREFIX}:webhook:*`)
    .then(keys => {
      if (keys.length < 1) {
        return [];
      }
      return redisClient.mgetAsync(keys);
    })
    .then(values => values.map(JSON.parse));
};

export const getWebhookByType = async type =>
  (await getWebhooks()).find(webhook => webhook.event_type === type);

export const getSepaDirectDebitReturns = async () => {
  const sepaDirectDebitReturns = JSON.parse(
    (await redisClient.getAsync(
      `${process.env.MOCKSOLARIS_REDIS_PREFIX}:sepa_direct_debit_returns`
    )) || "[]"
  );

  return sepaDirectDebitReturns;
};

export const saveSepaDirectDebitReturn = async sepaDirectDebitReturn => {
  const sepaDirectDebitReturns = await getSepaDirectDebitReturns();
  sepaDirectDebitReturns.push(sepaDirectDebitReturn);

  log.info(
    "(mockSolaris/saveSepaDirectDebitReturn) Saving Sepa Direct Debit Return",
    sepaDirectDebitReturn
  );

  await redisClient.setAsync(
    `${process.env.MOCKSOLARIS_REDIS_PREFIX}:sepa_direct_debit_returns`,
    JSON.stringify(sepaDirectDebitReturns)
  );
};

export const saveWebhook = webhook => {
  return redisClient.setAsync(
    `${process.env.MOCKSOLARIS_REDIS_PREFIX}:webhook:${webhook.url}`,
    JSON.stringify(webhook, undefined, 2)
  );
};

export const flushDb = () => {
  return redisClient.flushdbAsync();
};

const fillMissingCurrencyForLegacyBooking = booking => ({
  ...booking,
  amount: {
    ...booking.amount,
    currency: booking.amount.currency || "EUR"
  }
});

export const getPersonBookings = person => {
  return (person.transactions || []).map(fillMissingCurrencyForLegacyBooking);
};

export const getSmsToken = async (personId: string) => {
  const person = await getPerson(personId);
  return _.get(person, "changeRequest.token", null);
};

export const getCardReferences = async () =>
  JSON.parse(
    (await redisClient.getAsync(
      `${process.env.MOCKSOLARIS_REDIS_PREFIX}:cardReferences`
    )) || "[]"
  );

export const hasCardReference = async cardRef => {
  const cardReferences = await getCardReferences();
  return cardReferences.includes(cardRef);
};

export const saveCardReference = async cardRef => {
  if (await hasCardReference(cardRef)) {
    return false;
  }

  const cardReferences = await getCardReferences();
  cardReferences.push(cardRef);
  await redisClient.setAsync(
    `${process.env.MOCKSOLARIS_REDIS_PREFIX}:cardReferences`,
    JSON.stringify(cardReferences)
  );

  return true;
};

export const getCard = async cardId => {
  const persons = await getAllPersons();
  const card = _(persons)
    .map(person =>
      _.get(person, "account.cards", []).map(cardData => cardData.card)
    )
    .flatten()
    .value()
    .find(card => card.id === cardId);

  return card;
};
