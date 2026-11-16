import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
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

test("Guardian greeting opt-in keys are isolated and legacy global settings are not inherited", () => {
  const base = "staarwardd.guardian.proactive-greeting.v2";
  assert.notEqual(accountStorageKey(base, "user-a"), accountStorageKey(base, "user-b"));
  const source = readFileSync(new URL("../components/staarwardd/world-hub.tsx", import.meta.url), "utf8");
  assert.match(source, /accountStorageKey\('staarwardd\.guardian\.proactive-greeting\.v2', user\.user_id\)/);
  assert.match(source, /user && !user\.is_demo/);
  assert.match(source, /setPreferenceReady\(false\)/);
  assert.match(source, /setGreetingEnabled\(false\)/);
  assert.match(source, /if \(alive\) \{ setGreetingEnabled\(value === 'enabled'\); setPreferenceReady\(true\); \}/);
  assert.match(source, /disabled=\{!greetingKey \|\| !preferenceReady \|\| !serverConsentReady \|\| savingGreeting\}/);
  assert.match(source, /if \(activeGreetingKey\.current !== savedFor\) return/);
  assert.doesNotMatch(source, /AsyncStorage\.getItem\('staarwardd\.guardian\.proactive-greeting\.v1'\)/);
  assert.doesNotMatch(source, /AsyncStorage\.setItem\('staarwardd\.guardian\.proactive-greeting\.v1'/);
});

test("Guardian automatic speech requires verified server consent and privacy gates", () => {
  const source = readFileSync(new URL("../components/staarwardd/world-hub.tsx", import.meta.url), "utf8");
  assert.match(source, /api\('\/api\/guardian\/life-map\/overview'/);
  assert.match(source, /api\('\/api\/guardian\/core\/workflows\/rsf-fabric-sourcing\/proactive-consent'/);
  assert.match(source, /state\.consent\?\.greetings === true/);
  assert.match(source, /setServerConsentReady\(false\)/);
  assert.match(source, /setServerGreetingConsent\(false\)/);
  assert.match(source, /!serverConsentReady \|\| !serverGreetingConsent \|\| serverPrivate \|\| serverSpeechQuiet/);
  assert.match(source, /!serverConsentReady \|\| savingGreeting/);
  assert.match(source, /greetings: enabled, check_ins: serverCheckIns/);
  assert.match(source, /if \(!response\.ok\) throw new Error\('Guardian consent could not be saved'\)/);
  assert.match(source, /if \(activeGreetingKey\.current !== savedFor\) return/);
  assert.match(source, /Automatic greeting remains off/);
  assert.match(source, /setSavingGreeting\(false\)/);
});
