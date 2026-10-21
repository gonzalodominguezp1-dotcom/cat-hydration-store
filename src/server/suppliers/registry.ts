import { MockSupplierAdapter } from "./mock-adapter";
import type { SupplierAdapter } from "./types";

const adapters = new Map<string, SupplierAdapter>();

export function registerSupplierAdapter(adapter: SupplierAdapter) {
  adapters.set(adapter.key, adapter);
}

export function getSupplierAdapter(key: string): SupplierAdapter {
  if (!adapters.has("mock")) registerSupplierAdapter(new MockSupplierAdapter());
  const adapter = adapters.get(key);
  if (!adapter) throw new Error(`No supplier adapter registered for "${key}"`);
  return adapter;
}

/** Only for tests. */
export function resetSupplierAdapters() {
  adapters.clear();
}
