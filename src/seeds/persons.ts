import { seedAccount } from "./accounts";
import { seedTransactions } from "./transactions";

export const seedPersons = async (basePerson, savePerson: (person) => {}) => {
  return Promise.all(
    Array.from({ length: 100 }).map((__, index) => {
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
