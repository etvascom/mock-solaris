import { seedAccount } from "./accounts";
import { seedTransactions } from "./transactions";

const PERSON_COUNT = parseInt(process.env.PERSON_COUNT, 10) || 100;

export const seedPersons = async (basePerson, savePerson: (person) => {}) => {
  return Promise.all(
    Array.from({ length: PERSON_COUNT }).map((__, index) => {
      const formattedIndex = ("0" + index).slice(-2);

      const id = `demo${formattedIndex}`;
      const email = `demo+${formattedIndex}@${process.env.EMAIL_DOMAIN}`;
      const firstName = id;

      const acc = seedAccount(id);

      return savePerson({
        ...basePerson,
        id,
        email,
        first_name: firstName,
        last_name: "Demo",
        transactions: seedTransactions(1, acc.id),
        accounts: [acc],
        account: acc,
      });
    })
  );
};
