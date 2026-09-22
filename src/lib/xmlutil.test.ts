import { describe, expect, it } from "vitest";
import { findTag, unescapeXmlText } from "./xmlutil";

describe("findTag", () => {
  it("finds local names with or without a namespace prefix", () => {
    expect(findTag("<a><SII:ESTADO>SOK</SII:ESTADO></a>", "ESTADO")).toBe("SOK");
    expect(findTag("<a><ESTADO>SOK</ESTADO></a>", "ESTADO")).toBe("SOK");
    expect(findTag("<a><ns1:getSeedReturn>x</ns1:getSeedReturn></a>", "getSeedReturn")).toBe(
      "x",
    );
  });

  it("returns the raw inner text (entities intact) or null", () => {
    expect(findTag("<a>&lt;xml/&gt;</a>", "a")).toBe("&lt;xml/&gt;");
    expect(findTag("<a><b>1</b><c>2</c></a>", "c")).toBe("2");
    expect(findTag("<a/>", "a")).toBeNull();
  });
});

describe("unescapeXmlText", () => {
  it("decodes the predefined entities in a single pass", () => {
    expect(unescapeXmlText("&lt;b&gt; &amp; &quot;q&quot; &apos;x&apos;")).toBe(
      `<b> & "q" 'x'`,
    );
    // Single pass: an escaped entity reference stays half-decoded, as a
    // real XML parser would produce.
    expect(unescapeXmlText("&amp;lt;")).toBe("&lt;");
  });

  it("decodes numeric character references", () => {
    expect(unescapeXmlText("&#65;&#x42;")).toBe("AB");
    expect(unescapeXmlText("&#xD;")).toBe("\r");
  });
});
