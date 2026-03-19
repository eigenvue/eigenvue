/**
 * @fileoverview Editor URL State Serialization Tests
 *
 * Verifies that encode/decode round-trips are lossless for all valid
 * UTF-8 strings, including ASCII, Unicode, large code, and edge cases.
 */

import { describe, it, expect } from "vitest";
import { encodeEditorState, decodeEditorState, stringToBase64Url } from "../editor-url-state";

describe("editor-url-state", () => {
  describe("encode → decode round-trip", () => {
    it("round-trips simple ASCII code", () => {
      const code = 'console.log("hello world");';
      const layoutId = "array-with-pointers";

      const params = encodeEditorState(code, layoutId);
      const result = decodeEditorState(params);

      expect(result).not.toBeNull();
      expect(result!.code).toBe(code);
      expect(result!.layoutId).toBe(layoutId);
    });

    it("round-trips Unicode code (emojis, CJK)", () => {
      const code = '// 你好世界 🌍\nconst x = "日本語";';
      const layoutId = "graph-network";

      const params = encodeEditorState(code, layoutId);
      const result = decodeEditorState(params);

      expect(result).not.toBeNull();
      expect(result!.code).toBe(code);
      expect(result!.layoutId).toBe(layoutId);
    });

    it("round-trips empty string", () => {
      const params = encodeEditorState("", "array-with-pointers");
      const result = decodeEditorState(params);

      expect(result).not.toBeNull();
      expect(result!.code).toBe("");
    });

    it("round-trips large code (>2000 chars) using compression", () => {
      // Generate code that exceeds the compression threshold.
      const code = `// Large algorithm\n${"const x = 42;\n".repeat(200)}`;
      const layoutId = "layer-network";

      const params = encodeEditorState(code, layoutId);

      // Verify v=2 (compressed) is used.
      expect(params.get("v")).toBe("2");

      const result = decodeEditorState(params);
      expect(result).not.toBeNull();
      expect(result!.code).toBe(code);
      expect(result!.layoutId).toBe(layoutId);
    });

    it("round-trips code with special characters", () => {
      const code = 'const regex = /[a-z]+\\d+/g;\nconst str = "hello+world/foo=bar";';
      const params = encodeEditorState(code, "array-with-pointers");
      const result = decodeEditorState(params);

      expect(result!.code).toBe(code);
    });

    it("round-trips code with template literals and backticks", () => {
      const code = "const msg = `Hello ${name}, you have ${count} items`;";
      const params = encodeEditorState(code, "array-with-pointers");
      const result = decodeEditorState(params);

      expect(result!.code).toBe(code);
    });
  });

  describe("decodeEditorState edge cases", () => {
    it("returns null for missing code param", () => {
      const params = new URLSearchParams("layout=array-with-pointers");
      expect(decodeEditorState(params)).toBeNull();
    });

    it("returns null for corrupted Base64", () => {
      const params = new URLSearchParams("code=!!!invalid!!!&layout=foo");
      expect(decodeEditorState(params)).toBeNull();
    });

    it("defaults layout to array-with-pointers when missing", () => {
      const params = encodeEditorState("test", "array-with-pointers");
      // Remove the layout param.
      params.delete("layout");
      const result = decodeEditorState(params);

      expect(result).not.toBeNull();
      expect(result!.layoutId).toBe("array-with-pointers");
    });
  });

  describe("compression", () => {
    it("v=1 is used for short code", () => {
      const code = 'console.log("hi");';
      const params = encodeEditorState(code, "array-with-pointers");
      expect(params.get("v")).toBe("1");
    });

    it("compression reduces URL length for large repetitive code", () => {
      const code = "const x = 42;\n".repeat(200);

      const paramsV1 = new URLSearchParams();
      const plainBase64 = stringToBase64Url(code);
      paramsV1.set("code", plainBase64);

      const paramsV2 = encodeEditorState(code, "array-with-pointers");
      const compressedCode = paramsV2.get("code")!;

      // Compressed should be shorter than plain for repetitive data.
      expect(compressedCode.length).toBeLessThan(plainBase64.length);
    });
  });

  describe("encodeEditorState", () => {
    it("includes layout ID in params", () => {
      const params = encodeEditorState("test", "graph-network");
      expect(params.get("layout")).toBe("graph-network");
    });
  });
});
