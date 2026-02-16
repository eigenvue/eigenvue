"""
BPE Tokenization — Step Generator (Python mirror of generator.ts).

Implements the Byte-Pair Encoding tokenization algorithm as a step-by-step
visualization. Starting from individual characters, iteratively applies
merge rules to combine adjacent token pairs.

INVARIANT: After all merge rules are applied, the final token sequence
is deterministic — the same input text and merge rules always produce
the same output tokens in the same order.

CROSS-LANGUAGE PARITY: Must produce identical steps to the TypeScript version.
"""

from __future__ import annotations

from typing import Any

from eigenvue._step_types import CodeHighlight, Step, VisualAction


def generate(inputs: dict[str, Any]) -> list[Step]:
    """Generate BPE tokenization visualization steps."""
    text: str = inputs["text"]
    merge_rules: list[list[Any]] = inputs["mergeRules"]

    steps: list[Step] = []
    idx = 0

    # Step 0: Character Splitting
    tokens: list[str] = list(text)

    quoted = ", ".join(f'"{t}"' for t in tokens)
    steps.append(
        Step(
            index=idx,
            id="character-split",
            title="Split Into Characters",
            explanation=(
                f'Starting with the text "{text}". Split into {len(tokens)} individual characters: '
                f"[{quoted}]."
            ),
            state={
                "tokens": list(tokens),
                "sourceText": text,
                "mergeRulesRemaining": len(merge_rules),
                "currentMergeIndex": -1,
            },
            visual_actions=tuple(
                VisualAction(type="highlightToken", params={"index": i, "color": "highlight"})
                for i in range(len(tokens))
            ),
            code_highlight=CodeHighlight(language="pseudocode", lines=(2,)),
            is_terminal=False,
            phase="initialization",
        )
    )
    idx += 1

    # Steps 1..N: Apply Merge Rules
    for rule_idx, rule in enumerate(merge_rules):
        pair, replacement = rule[0], rule[1]
        left_tok: str = pair[0]
        right_tok: str = pair[1]

        pair_exists = False
        for i in range(len(tokens) - 1):
            if tokens[i] == left_tok and tokens[i + 1] == right_tok:
                pair_exists = True
                break

        if not pair_exists:
            steps.append(
                Step(
                    index=idx,
                    id="merge-skip",
                    title=f"Merge Rule {rule_idx + 1}: No Match",
                    explanation=(
                        f'Checking merge rule: ("{left_tok}", "{right_tok}") \u2192 "{replacement}". '
                        f"This pair does not appear in the current token sequence. Skipping."
                    ),
                    state={
                        "tokens": list(tokens),
                        "sourceText": text,
                        "mergeRulesRemaining": len(merge_rules) - rule_idx - 1,
                        "currentMergeIndex": rule_idx,
                        "currentRule": {
                            "left": left_tok,
                            "right": right_tok,
                            "replacement": replacement,
                        },
                    },
                    visual_actions=(
                        VisualAction(
                            type="showMessage",
                            params={
                                "text": f'Rule {rule_idx + 1}: ("{left_tok}" + "{right_tok}") \u2192 "{replacement}" \u2014 no match',
                                "messageType": "info",
                            },
                        ),
                    ),
                    code_highlight=CodeHighlight(language="pseudocode", lines=(3, 4)),
                    is_terminal=False,
                    phase="merging",
                )
            )
            idx += 1
            continue

        merge_count = 0
        i = 0
        while i < len(tokens) - 1:
            if tokens[i] == left_tok and tokens[i + 1] == right_tok:
                steps.append(
                    Step(
                        index=idx,
                        id="merge-apply",
                        title=f'Merge: "{left_tok}" + "{right_tok}" \u2192 "{replacement}"',
                        explanation=(
                            f'Found pair ("{left_tok}", "{right_tok}") at positions {i} and {i + 1}. '
                            f'Merging into "{replacement}". '
                            "Tokens before: [" + ", ".join(f'"{t}"' for t in tokens) + "]."
                        ),
                        state={
                            "tokens": list(tokens),
                            "sourceText": text,
                            "mergeRulesRemaining": len(merge_rules) - rule_idx - 1,
                            "currentMergeIndex": rule_idx,
                            "currentRule": {
                                "left": left_tok,
                                "right": right_tok,
                                "replacement": replacement,
                            },
                            "mergePosition": i,
                        },
                        visual_actions=(
                            VisualAction(
                                type="mergeTokens",
                                params={"leftIndex": i, "rightIndex": i + 1, "result": replacement},
                            ),
                            VisualAction(
                                type="highlightToken", params={"index": i, "color": "active"}
                            ),
                        ),
                        code_highlight=CodeHighlight(language="pseudocode", lines=(5, 6)),
                        is_terminal=False,
                        phase="merging",
                    )
                )
                idx += 1

                tokens = [*tokens[:i], replacement, *tokens[i + 2 :]]
                merge_count += 1

                steps.append(
                    Step(
                        index=idx,
                        id="merge-result",
                        title=f"After Merge {merge_count}",
                        explanation=(
                            "Tokens after merge: ["
                            + ", ".join(f'"{t}"' for t in tokens)
                            + "]. "
                            + f"Sequence length is now {len(tokens)}."
                        ),
                        state={
                            "tokens": list(tokens),
                            "sourceText": text,
                            "mergeRulesRemaining": len(merge_rules) - rule_idx - 1,
                            "currentMergeIndex": rule_idx,
                            "mergeCount": merge_count,
                        },
                        visual_actions=(
                            VisualAction(
                                type="highlightToken", params={"index": i, "color": "active"}
                            ),
                        ),
                        code_highlight=CodeHighlight(language="pseudocode", lines=(6,)),
                        is_terminal=False,
                        phase="merging",
                    )
                )
                idx += 1
            else:
                i += 1

    # Final Step
    steps.append(
        Step(
            index=idx,
            id="complete",
            title="Tokenization Complete",
            explanation=(
                f"All merge rules applied. Final token sequence ({len(tokens)} tokens): "
                + "["
                + ", ".join(f'"{t}"' for t in tokens)
                + "]. "
                + f'The original text "{text}" ({len(text)} characters) is now represented as '
                + f"{len(tokens)} token"
                + ("s" if len(tokens) != 1 else "")
                + "."
            ),
            state={
                "tokens": list(tokens),
                "sourceText": text,
                "mergeRulesRemaining": 0,
                "currentMergeIndex": len(merge_rules),
                "finalTokenCount": len(tokens),
            },
            visual_actions=tuple(
                VisualAction(type="highlightToken", params={"index": i, "color": "highlight"})
                for i in range(len(tokens))
            ),
            code_highlight=CodeHighlight(language="pseudocode", lines=(7,)),
            is_terminal=True,
            phase="result",
        )
    )

    return steps
