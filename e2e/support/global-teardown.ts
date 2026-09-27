import { deleteE2EAccounts } from "./accounts";

export default async function globalTeardown() {
  await deleteE2EAccounts();
}
