import { createHash } from "node:crypto";

// A tag also becomes a directory in the static build, including on Windows.
export function tagSegment(name: string) {
  const reserved = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i;
  const unsafe = /[<>:"/\\|?*#%\p{Cc}]|^[.~]|[. ]$/u;
  // Only the canonical spelling uses the readable path on case-insensitive volumes.
  const canonical = name.normalize("NFC").toUpperCase().toLowerCase();
  return name !== canonical || unsafe.test(name) || reserved.test(name) || Buffer.byteLength(name) > 240
    ? "~" + createHash("sha256").update(name).digest("hex")
    : name;
}
