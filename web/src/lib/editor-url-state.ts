/**
 * @fileoverview Editor URL State — Encode/Decode Editor State to/from URL
 *
 * The editor supports sharing custom algorithms via URL. The URL encodes
 * the user's code and selected layout so that opening the URL restores
 * the exact editor state.
 *
 * URL FORMAT:
 *   /editor?code=BASE64URL&layout=LAYOUT_ID&v=1
 *   /editor?code=BASE64URL&layout=LAYOUT_ID&v=2  (LZ-String compressed)
 *   /editor?template=TEMPLATE_ID
 *
 * ENCODING STRATEGY:
 * User code is encoded as Base64url (RFC 4648 §5) — a URL-safe variant
 * of Base64 that uses `-` and `_` instead of `+` and `/`, and omits
 * trailing `=` padding.
 *
 * For code longer than 2000 characters (after Base64 encoding), LZ-String
 * compression is applied before Base64url encoding. The `v=2` parameter
 * indicates compressed encoding.
 *
 * MATHEMATICAL INVARIANT:
 *   decode(encode(code)) === code  for all valid UTF-8 strings
 *
 * @module editor-url-state
 */

import lzString from "lz-string";

/** The threshold (in Base64url-encoded characters) above which we compress. */
const COMPRESSION_THRESHOLD = 2000;

/**
 * Encode editor state into URL search params.
 *
 * @param code - The user's JavaScript code.
 * @param layoutId - The selected layout ID.
 * @returns A URLSearchParams object ready to be appended to the URL.
 */
export function encodeEditorState(code: string, layoutId: string): URLSearchParams {
  const params = new URLSearchParams();
  params.set("layout", layoutId);

  const base64Plain = stringToBase64Url(code);
  if (base64Plain.length <= COMPRESSION_THRESHOLD) {
    params.set("v", "1");
    params.set("code", base64Plain);
  } else {
    const compressed = lzString.compressToUint8Array(code);
    const base64Compressed = uint8ArrayToBase64Url(compressed);
    params.set("v", "2");
    params.set("code", base64Compressed);
  }

  return params;
}

/**
 * Decode editor state from URL search params.
 *
 * @param params - The URL search params.
 * @returns The decoded state, or null if the params are invalid or missing.
 */
export function decodeEditorState(
  params: URLSearchParams,
): { code: string; layoutId: string } | null {
  const codeParam = params.get("code");
  const layoutId = params.get("layout");
  const version = params.get("v") ?? "1";

  if (codeParam === null) return null;

  try {
    let code: string;
    if (version === "2") {
      const compressed = base64UrlToUint8Array(codeParam);
      code = lzString.decompressFromUint8Array(compressed) ?? "";
    } else {
      code = base64UrlToString(codeParam);
    }
    return { code, layoutId: layoutId ?? "array-with-pointers" };
  } catch {
    return null;
  }
}

// ─── Base64url Encoding Utilities ─────────────────────────────────────

/**
 * Encode a UTF-8 string to Base64url.
 * Base64url replaces '+' with '-', '/' with '_', and strips '=' padding.
 */
export function stringToBase64Url(str: string): string {
  const bytes = new TextEncoder().encode(str);
  return uint8ArrayToBase64Url(bytes);
}

/**
 * Decode a Base64url string to a UTF-8 string.
 */
export function base64UrlToString(base64url: string): string {
  const bytes = base64UrlToUint8Array(base64url);
  return new TextDecoder().decode(bytes);
}

/**
 * Encode a Uint8Array to Base64url.
 */
export function uint8ArrayToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Decode a Base64url string to a Uint8Array.
 */
export function base64UrlToUint8Array(base64url: string): Uint8Array {
  let base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4 !== 0) {
    base64 += "=";
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
