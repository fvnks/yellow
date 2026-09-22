import { describe, expect, it } from "vitest";
import { formatRut, formatRutDv, isValidRut, normalizeRut, parseRut, rutCheckDigit } from "./rut";

describe("normalizeRut", () => {
  it("removes dots, hyphens and spaces, uppercases the DV", () => {
    expect(normalizeRut(" 12.345.678-k ")).toBe("12345678K");
    expect(normalizeRut("12345678-5")).toBe("123456785");
  });
});

describe("rutCheckDigit / isValidRut", () => {
  it("computes known check digits (modulo 11)", () => {
    expect(rutCheckDigit("12345678")).toBe("5");
    expect(rutCheckDigit("76543210")).toBe("3");
    expect(rutCheckDigit("11111111")).toBe("1");
  });

  it("accepts valid RUTs with any presentation format", () => {
    expect(isValidRut("76.543.210-3")).toBe(true);
    expect(isValidRut("76543210-3")).toBe(true);
    expect(isValidRut("765432103")).toBe(true);
    expect(isValidRut("1-9")).toBe(true); // 1 → DV 9
  });

  it("rejects wrong DV, letters in the body and garbage", () => {
    expect(isValidRut("76.543.210-0")).toBe(false);
    expect(isValidRut("76543210-K")).toBe(false); // correct DV is 3
    expect(isValidRut("12A45678-5")).toBe(false);
    expect(isValidRut("")).toBe(false);
    expect(isValidRut("abc")).toBe(false);
  });
});

describe("parseRut", () => {
  it("returns the normalized RUT when valid, null otherwise", () => {
    expect(parseRut("76.543.210-3")).toBe("765432103");
    expect(parseRut("no-es-rut")).toBeNull();
  });
});

describe("formatRut / formatRutDv", () => {
  it("formats with dots and hyphen", () => {
    expect(formatRut("765432103")).toBe("76.543.210-3");
    expect(formatRut("123456785")).toBe("12.345.678-5");
  });

  it("emits the plain hyphenated form used in DTE XML", () => {
    expect(formatRutDv("76.543.210-3")).toBe("76543210-3");
    expect(formatRutDv("123456785")).toBe("12345678-5");
  });
});
