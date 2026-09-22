import { MockDteSigner, MockSiiClient } from "./mock";
import type { DteSigner, SiiClient } from "./types";

export type { DteSigner, EstadoEnvio, SiiClient } from "./types";

// TODO(certificación): return the real adapters here when the emisor has
// a .p12 certificate and OAuth credentials for api.sii.cl.
export function createSiiClient(): SiiClient {
  return new MockSiiClient();
}

export function createDteSigner(): DteSigner {
  return new MockDteSigner();
}
