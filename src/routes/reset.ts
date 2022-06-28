import { resetData } from "../db";

export const reset = async (req, res) => {
  await resetData();
  return res.status(200).send("done");
};
