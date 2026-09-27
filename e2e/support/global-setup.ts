import { createE2EAccounts } from "./accounts";

export default async function globalSetup() {
  await createE2EAccounts();
}
