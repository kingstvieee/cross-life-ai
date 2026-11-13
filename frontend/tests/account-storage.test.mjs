import assert from "node:assert/strict";
import test from "node:test";
import { accountStorageKey } from "../src/account-storage.ts";

test("different accounts cannot inherit the same private storage", () => {
  const base = "staarwardd.v13.preference-memory";
  assert.notEqual(accountStorageKey(base, "user-a"), accountStorageKey(base, "user-b"));
  assert.notEqual(accountStorageKey(base, "user-a"), base);
  assert.equal(accountStorageKey(base, "user-a"), accountStorageKey(base, "user-a"));
});
test("guest and missing identities cannot create private storage keys", () => {
  for (const id of [undefined, "", "demo_fixture"]) {
    assert.throws(() => accountStorageKey("memory", id), /real account/);
  }
});
