import { describe, expect, it } from "vitest";

import { DEFAULT_ACCESS_TOKEN_DURATION_MS } from "../src/index.js";

import { resolveAccessTokenDurationMs } from "../src/token/AccessTokenConfiguration.js";

describe("Access token yapılandırması", () => {
  it("varsayılan olarak 15 dakika kullanmalıdır", () => {
    expect(resolveAccessTokenDurationMs(undefined)).toBe(15 * 60 * 1000);

    expect(DEFAULT_ACCESS_TOKEN_DURATION_MS).toBe(15 * 60 * 1000);
  });

  it("özel access token süresini kabul etmelidir", () => {
    expect(resolveAccessTokenDurationMs(5 * 60 * 1000)).toBe(5 * 60 * 1000);
  });

  it("sıfır veya negatif süreyi reddetmelidir", () => {
    expect(() => {
      resolveAccessTokenDurationMs(0);
    }).toThrow(TypeError);

    expect(() => {
      resolveAccessTokenDurationMs(-1);
    }).toThrow(TypeError);
  });

  it("ondalıklı ve sonlu olmayan süreleri reddetmelidir", () => {
    expect(() => {
      resolveAccessTokenDurationMs(1000.5);
    }).toThrow(TypeError);

    expect(() => {
      resolveAccessTokenDurationMs(Number.NaN);
    }).toThrow(TypeError);

    expect(() => {
      resolveAccessTokenDurationMs(Number.POSITIVE_INFINITY);
    }).toThrow(TypeError);
  });
});
