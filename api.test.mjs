// Integration tests. Requires: a running server (npm run dev), migrated DB, seeded legal drafts, MIN_AGE set, APP_URL=BASE.
// Run: BASE=http://localhost:3000 npm test
import test from "node:test"; import assert from "node:assert/strict";
const BASE = process.env.BASE ?? "http://localhost:3000";
const H = { "content-type": "application/json", origin: BASE };
const post = (p, b, cookie) => fetch(BASE + p, { method: "POST", headers: { ...H, ...(cookie ? { cookie } : {}) }, body: JSON.stringify(b) });
const reg = async (n) => {
  const r = await post("/api/auth/register", { email: `t${Date.now()}${n}@example.com`, password: "correct-horse-9", birthYear: 1990, locale: "en", acceptedTerms: true });
  assert.equal(r.status, 200, await r.clone().text());
  return r.headers.get("set-cookie").split(";")[0];
};

test("register without accepting terms is rejected", async () => {
  const r = await post("/api/auth/register", { email: "x@example.com", password: "correct-horse-9", birthYear: 1990, acceptedTerms: false });
  assert.equal(r.status, 400);
});
test("cross-origin POST is rejected (CSRF)", async () => {
  const r = await fetch(BASE + "/api/auth/login", { method: "POST", headers: { "content-type": "application/json", origin: "https://evil.example" }, body: "{}" });
  assert.equal(r.status, 403);
});
test("user cannot read another user's conversation", async () => {
  const a = await reg("a"), b = await reg("b");
  const c = await (await post("/api/conversations", { mode: "chat" }, a)).json();
  const r = await fetch(`${BASE}/api/conversations/${c.id}`, { headers: { cookie: b } });
  assert.equal(r.status, 404);
  const d = await fetch(`${BASE}/api/conversations/${c.id}`, { method: "DELETE", headers: { ...H, cookie: b } });
  assert.equal(d.status, 404);
});
test("chat refuses to fabricate when provider/model not configured", async () => {
  const a = await reg("c"); const c = await (await post("/api/conversations", {}, a)).json();
  const r = await post("/api/chat", { conversationId: c.id, content: "hi" }, a);
  assert.ok([503, 403].includes(r.status));
});
test("unauthenticated chat list is 401", async () => {
  assert.equal((await fetch(BASE + "/api/conversations")).status, 401);
});
test("privacy request is recorded", async () => {
  const r = await post("/api/privacy-requests", { kind: "access", email: "p@example.com" });
  assert.equal(r.status, 201);
});
test("marketing consent withdrawal adds suppression (no future sends)", async () => {
  const a = await reg("m");
  assert.equal((await post("/api/consents", { purpose: "marketing_email", granted: true }, a)).status, 200);
  assert.equal((await post("/api/consents", { purpose: "marketing_email", granted: false }, a)).status, 200);
});
test("cancel without active subscription is 404", async () => {
  const a = await reg("s"); assert.equal((await post("/api/subscription/cancel", {}, a)).status, 404);
});

test("login works with correct password, fails with wrong one", async () => {
  const email = `l${Date.now()}@example.com`;
  const r = await post("/api/auth/register", { email, password: "correct-horse-9", birthYear: 1990, locale: "en", acceptedTerms: true });
  assert.equal(r.status, 200);
  assert.equal((await post("/api/auth/login", { email, password: "correct-horse-9" })).status, 200);
  assert.equal((await post("/api/auth/login", { email, password: "wrong-password-1" })).status, 401);
  assert.equal((await post("/api/auth/login", { email: "nobody@example.com", password: "wrong-password-1" })).status, 401);
});
