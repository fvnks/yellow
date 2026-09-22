import { describe, expect, it } from "vitest";
import {
  assertTransition,
  canEmitir,
  canTransition,
  InvalidTransitionError,
} from "./state";

describe("canTransition", () => {
  it("walks the happy path BORRADOR → FIRMADO → ENVIADO → ACEPTADO → ANULADO", () => {
    expect(canTransition("BORRADOR", "FIRMADO")).toBe(true);
    expect(canTransition("FIRMADO", "ENVIADO")).toBe(true);
    expect(canTransition("ENVIADO", "ACEPTADO")).toBe(true);
    expect(canTransition("ACEPTADO", "ANULADO")).toBe(true);
  });

  it("allows rejection after sending", () => {
    expect(canTransition("ENVIADO", "RECHAZADO")).toBe(true);
  });

  it("denies skipping steps and terminal states", () => {
    expect(canTransition("BORRADOR", "ENVIADO")).toBe(false);
    expect(canTransition("BORRADOR", "ACEPTADO")).toBe(false);
    expect(canTransition("RECHAZADO", "ENVIADO")).toBe(false);
    expect(canTransition("ANULADO", "FIRMADO")).toBe(false);
    expect(canTransition("ACEPTADO", "BORRADOR")).toBe(false);
  });
});

describe("assertTransition", () => {
  it("throws InvalidTransitionError with the offending pair", () => {
    expect(() => assertTransition("BORRADOR", "ACEPTADO")).toThrow(
      InvalidTransitionError,
    );
    expect(() => assertTransition("BORRADOR", "FIRMADO")).not.toThrow();
    try {
      assertTransition("RECHAZADO", "ENVIADO");
    } catch (err) {
      expect((err as InvalidTransitionError).from).toBe("RECHAZADO");
      expect((err as InvalidTransitionError).to).toBe("ENVIADO");
    }
  });
});

describe("canEmitir", () => {
  it("starts or resumes only from BORRADOR/FIRMADO", () => {
    expect(canEmitir("BORRADOR")).toBe(true);
    expect(canEmitir("FIRMADO")).toBe(true);
    expect(canEmitir("ENVIADO")).toBe(false);
    expect(canEmitir("ACEPTADO")).toBe(false);
    expect(canEmitir("ANULADO")).toBe(false);
  });
});
