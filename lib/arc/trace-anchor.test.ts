import { describe, expect, test } from "bun:test";
import { hashTrace } from "./trace-anchor";

describe("hashTrace", () => {
  test("returns 0x-prefixed 64-hex (bytes32)", () => {
    const h = hashTrace({ goal: "balanced", regime: "risk_on" });
    expect(h).toMatch(/^0x[0-9a-f]{64}$/);
  });

  test("identical inputs produce identical hashes", () => {
    const a = hashTrace({ x: 1, y: "two" });
    const b = hashTrace({ x: 1, y: "two" });
    expect(a).toBe(b);
  });

  test("different inputs diverge", () => {
    const a = hashTrace({ x: 1 });
    const b = hashTrace({ x: 2 });
    expect(a).not.toBe(b);
  });

  test("key ordering in objects matters (JSON.stringify is order-dependent)", () => {
    // This documents existing behaviour — if you ever want canonical
    // hashing, switch to a JSON-canonical serializer.
    const a = hashTrace({ a: 1, b: 2 });
    const b = hashTrace({ b: 2, a: 1 });
    expect(a).not.toBe(b);
  });

  test("known hash for a fixed payload (regression guard)", () => {
    const h = hashTrace({ hello: "world" });
    // sha256(JSON.stringify({hello:"world"}))
    expect(h).toBe(
      "0x93a23971a914e5eacbf0a8d25154cda309c3c1c72fbb9914d47c60f3cb681588",
    );
  });
});
