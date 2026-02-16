/**
 * @fileoverview BPE Tokenization Step Generator
 *
 * Implements the Byte-Pair Encoding tokenization algorithm as a step-by-step
 * visualization. Starting from individual characters, iteratively applies
 * merge rules to combine adjacent token pairs.
 *
 * Mathematical basis: Section 4.10 of the Phase 8 specification.
 *
 * INVARIANT: After all merge rules are applied, the final token sequence
 * is deterministic — the same input text and merge rules always produce
 * the same output tokens in the same order.
 */

import { createGenerator } from "@/engine/generator";
import type { VisualAction } from "@/engine/generator";

interface TokenizationBPEInputs extends Record<string, unknown> {
  text: string;
  mergeRules: [[string, string], string][];
}

export default createGenerator<TokenizationBPEInputs>({
  id: "tokenization-bpe",

  *generate(inputs, step) {
    const { text, mergeRules } = inputs;

    // Step 0: Character Splitting
    let tokens: string[] = [...text];

    yield step({
      id: "character-split",
      title: "Split Into Characters",
      explanation:
        `Starting with the text "${text}". Split into ${tokens.length} individual characters: ` +
        `[${tokens.map((t) => `"${t}"`).join(", ")}].`,
      state: {
        tokens: [...tokens],
        sourceText: text,
        mergeRulesRemaining: mergeRules.length,
        currentMergeIndex: -1,
      },
      visualActions: tokens.map((_, i) => ({
        type: "highlightToken" as const,
        index: i,
        color: "highlight",
      })),
      codeHighlight: { language: "pseudocode", lines: [2] },
      phase: "initialization",
    });

    // Steps 1..N: Apply Merge Rules
    for (let ruleIdx = 0; ruleIdx < mergeRules.length; ruleIdx++) {
      const [[left, right], replacement] = mergeRules[ruleIdx]!;

      let pairExists = false;
      for (let i = 0; i < tokens.length - 1; i++) {
        if (tokens[i] === left && tokens[i + 1] === right) {
          pairExists = true;
          break;
        }
      }

      if (!pairExists) {
        yield step({
          id: "merge-skip",
          title: `Merge Rule ${ruleIdx + 1}: No Match`,
          explanation:
            `Checking merge rule: ("${left}", "${right}") → "${replacement}". ` +
            `This pair does not appear in the current token sequence. Skipping.`,
          state: {
            tokens: [...tokens],
            sourceText: text,
            mergeRulesRemaining: mergeRules.length - ruleIdx - 1,
            currentMergeIndex: ruleIdx,
            currentRule: { left, right, replacement },
          },
          visualActions: [
            {
              type: "showMessage" as const,
              text: `Rule ${ruleIdx + 1}: ("${left}" + "${right}") → "${replacement}" — no match`,
              messageType: "info" as const,
            },
          ],
          codeHighlight: { language: "pseudocode", lines: [3, 4] },
          phase: "merging",
        });
        continue;
      }

      let mergeCount = 0;
      let i = 0;
      while (i < tokens.length - 1) {
        if (tokens[i] === left && tokens[i + 1] === right) {
          const mergeActions: VisualAction[] = [
            { type: "mergeTokens", leftIndex: i, rightIndex: i + 1, result: replacement },
            { type: "highlightToken", index: i, color: "active" },
          ];

          yield step({
            id: "merge-apply",
            title: `Merge: "${left}" + "${right}" → "${replacement}"`,
            explanation:
              `Found pair ("${left}", "${right}") at positions ${i} and ${i + 1}. ` +
              `Merging into "${replacement}". ` +
              `Tokens before: [${tokens.map((t) => `"${t}"`).join(", ")}].`,
            state: {
              tokens: [...tokens],
              sourceText: text,
              mergeRulesRemaining: mergeRules.length - ruleIdx - 1,
              currentMergeIndex: ruleIdx,
              currentRule: { left, right, replacement },
              mergePosition: i,
            },
            visualActions: mergeActions,
            codeHighlight: { language: "pseudocode", lines: [5, 6] },
            phase: "merging",
          });

          tokens = [
            ...tokens.slice(0, i),
            replacement,
            ...tokens.slice(i + 2),
          ];
          mergeCount++;

          yield step({
            id: "merge-result",
            title: `After Merge ${mergeCount}`,
            explanation:
              `Tokens after merge: [${tokens.map((t) => `"${t}"`).join(", ")}]. ` +
              `Sequence length is now ${tokens.length}.`,
            state: {
              tokens: [...tokens],
              sourceText: text,
              mergeRulesRemaining: mergeRules.length - ruleIdx - 1,
              currentMergeIndex: ruleIdx,
              mergeCount,
            },
            visualActions: [
              { type: "highlightToken", index: i, color: "active" },
            ],
            codeHighlight: { language: "pseudocode", lines: [6] },
            phase: "merging",
          });
        } else {
          i++;
        }
      }
    }

    // Final Step
    yield step({
      id: "complete",
      title: "Tokenization Complete",
      explanation:
        `All merge rules applied. Final token sequence (${tokens.length} tokens): ` +
        `[${tokens.map((t) => `"${t}"`).join(", ")}]. ` +
        `The original text "${text}" (${text.length} characters) is now represented as ` +
        `${tokens.length} token${tokens.length === 1 ? "" : "s"}.`,
      state: {
        tokens: [...tokens],
        sourceText: text,
        mergeRulesRemaining: 0,
        currentMergeIndex: mergeRules.length,
        finalTokenCount: tokens.length,
      },
      visualActions: tokens.map((_, idx) => ({
        type: "highlightToken" as const,
        index: idx,
        color: "highlight",
      })),
      codeHighlight: { language: "pseudocode", lines: [7] },
      isTerminal: true,
      phase: "result",
    });
  },
});
