import { resetData, resetPersonData } from "../db";

export const reset = async (req, res) => {
  await resetData();
  return res.status(200).send("done");
};

export const resetPerson = async (req, res) => {
  const { person_id: personId } = req.params;

  await resetPersonData(personId);
  return res.status(200).send("done");
};
