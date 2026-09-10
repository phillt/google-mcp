import { describe, it, expect } from "bun:test";
import { encodeHeaderWord } from "../utils/gmail";

/**
 * RFC 2047 header encoding.
 *
 * The bug this fixes: `Subject: ${subject}` wrote raw UTF-8 into a header, and
 * RFC 5322 requires US-ASCII there. A plain em dash sent through that path came
 * back from Gmail as `Ã¢Â€Â”` — two UTF-8-to-CP1252 round trips, one per hop —
 * and a thread sent and read back repeatedly accumulated four generations of it.
 */

const decodeWords = (encoded: string): string =>
  encoded
    .split(" ")
    .map((w) => {
      const m = /^=\?UTF-8\?B\?(.*)\?=$/.exec(w);
      return m ? Buffer.from(m[1], "base64").toString("utf8") : w;
    })
    .join("");

describe("encodeHeaderWord", () => {
  it("leaves ASCII completely alone", () => {
    // Deliberate: an encoded-word is unreadable in transit and in logs, and
    // nearly every subject is ASCII.
    expect(encodeHeaderWord("Daily Blaze - Wed 9/9")).toBe("Daily Blaze - Wed 9/9");
  });

  it("encodes an em dash so it survives the trip", () => {
    const subject = "Daily Blaze — Wed 9/9";
    const encoded = encodeHeaderWord(subject);
    expect(encoded).not.toBe(subject);
    expect(encoded.startsWith("=?UTF-8?B?")).toBe(true);
    expect(decodeWords(encoded)).toBe(subject);
  });

  it("round-trips accents, CJK and emoji", () => {
    for (const s of ["José Álvarez", "日本語の件名", "🎉 done", "Prix: 25 €"]) {
      expect(decodeWords(encodeHeaderWord(s))).toBe(s);
    }
  });

  it("splits long values into words of at most 75 characters", () => {
    // RFC 2047 s.2. A single over-long encoded-word is a spec violation some
    // servers reject outright.
    const long = "Réunion trimestrielle — " + "é".repeat(200);
    const encoded = encodeHeaderWord(long);
    const words = encoded.split(" ");
    expect(words.length).toBeGreaterThan(1);
    for (const w of words) expect(w.length).toBeLessThanOrEqual(75);
    expect(decodeWords(encoded)).toBe(long);
  });

  it("never splits a multi-byte character across two words", () => {
    // A split mid-sequence would reintroduce exactly the corruption this
    // prevents, so each word must decode cleanly on its own.
    const encoded = encodeHeaderWord("日".repeat(120));
    for (const w of encoded.split(" ")) {
      const m = /^=\?UTF-8\?B\?(.*)\?=$/.exec(w);
      expect(m).not.toBeNull();
      expect(Buffer.from(m![1], "base64").toString("utf8")).not.toContain("�");
    }
    expect(decodeWords(encoded)).toBe("日".repeat(120));
  });
});
