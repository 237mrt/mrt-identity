import {
  runLoginAttemptAdapterContractTests,
  runSessionAdapterContractTests,
  runUserAdapterContractTests,
} from "@mrt-identity/adapter-testkit";

import { MemoryAdapter } from "../src/index.ts";

const createMemoryAdapter = () => {
  return new MemoryAdapter();
};

runUserAdapterContractTests("MemoryAdapter", createMemoryAdapter);

runSessionAdapterContractTests("MemoryAdapter", createMemoryAdapter);

runLoginAttemptAdapterContractTests("MemoryAdapter", createMemoryAdapter);
