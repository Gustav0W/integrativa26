import { describe, expect, it } from "vitest";
import { rateLimit } from "./rate-limit";

const from = (ip: string) => new Request("http://localhost/api/x", { headers: { "x-forwarded-for": ip } });

describe("rateLimit", () => {
  it("bloqueia depois do limite e libera quando a janela acaba", () => {
    const start = 1_000_000;
    for (let i = 0; i < 20; i++) expect(rateLimit(from("1.1.1.1"), start)).toBeNull();
    const blocked = rateLimit(from("1.1.1.1"), start);
    expect(blocked?.status).toBe(429);
    expect(blocked?.headers.get("Retry-After")).toBeTruthy();
    expect(rateLimit(from("2.2.2.2"), start)).toBeNull();
    expect(rateLimit(from("1.1.1.1"), start + 11 * 60 * 1000)).toBeNull();
  });
});
