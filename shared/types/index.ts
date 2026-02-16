/**
 * @fileoverview Barrel export for all Eigenvue shared types.
 * Import from this file rather than from individual modules.
 *
 * @example
 * import { Step, VisualAction, AlgorithmMeta } from "@eigenvue/shared/types";
 */

export {
  // Version constant
  STEP_FORMAT_VERSION,

  // Core step types
  type CodeHighlight,
  type VisualAction,
  type Step,
  type StepSequence,

  // Known visual action types
  type HighlightElementAction,
  type MovePointerAction,
  type HighlightRangeAction,
  type DimRangeAction,
  type SwapElementsAction,
  type CompareElementsAction,
  type MarkFoundAction,
  type MarkNotFoundAction,
  type ShowMessageAction,
  type VisitNodeAction,
  type HighlightEdgeAction,
  type UpdateNodeValueAction,
  type ActivateNeuronAction,
  type PropagateSignalAction,
  type ShowGradientAction,
  type ShowAttentionWeightsAction,
  type HighlightTokenAction,
  type UpdateBarChartAction,
  type KnownVisualAction,

  // Metadata types
  type AlgorithmCategory,
  type DifficultyLevel,
  type EducationEntry,
  type QuizQuestion,
  type ResourceLink,
  type InputExample,
  type AlgorithmMeta,
} from "./step";
