import { describe, expect, it } from "vitest";
import { slugify, uniqueSlug } from "./slug";

describe("slugify", () => {
  it("lowercases and dashes", () => {
    expect(slugify("Mi Empresa SpA")).toBe("mi-empresa-spa");
  });

  it("strips accents", () => {
    expect(slugify("Gestión Tributaria Ñuñoa")).toBe("gestion-tributaria-nunoa");
  });

  it("removes leading/trailing dashes and collapses separators", () => {
    expect(slugify("  --Hola   Mundo--  ")).toBe("hola-mundo");
  });

  it("falls back to empty string for symbol-only input", () => {
    expect(slugify("!!!")).toBe("");
  });
});

describe("uniqueSlug", () => {
  it("appends a random hex suffix", () => {
    expect(uniqueSlug("Mi Empresa")).toMatch(/^mi-empresa-[0-9a-f]{6}$/);
    expect(uniqueSlug("Mi Empresa")).toMatch(/^mi-empresa-[0-9a-f]{6}$/);
  });

  it("falls back to 'tenant' base when input slugifies to nothing", () => {
    expect(uniqueSlug("###")).toMatch(/^tenant-[0-9a-f]{6}$/);
  });
});
