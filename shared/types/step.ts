/**
 * @fileoverview Eigenvue Step Format — TypeScript Definitions
 *
 * This file defines the universal contract between algorithm generators
 * and the rendering engine. Every generator (TypeScript or Python) produces
 * an array of Step objects conforming to these interfaces. Every renderer
 * consumes Step objects without knowing which generator produced them.
 *
 * VERSION: 1.0.0
 *
 * RULES:
 * - All types must be JSON-serializable (no functions, no classes, no circular refs).
 * - Field names use camelCase in TypeScript and snake_case in Python.
 *   The JSON wire format uses camelCase (TypeScript convention).
 * - Visual action types are an open string vocabulary, NOT a closed enum.
 *   Renderers ignore action types they don't recognize.
 * - Step indices are 0-based and contiguous (no gaps).
 * - The last step in any sequence MUST have isTerminal === true.
 *
 * @module @eigenvue/step-format
 * @version 1.0.0
 */

// ─────────────────────────────────────────────────────────────────────────────
// STEP FORMAT VERSION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The current major version of the step format.
 * Increment this ONLY when making breaking changes to the Step interface.
 * Renderers should check this and refuse to render incompatible versions.
 */
export const STEP_FORMAT_VERSION = 1;

// ─────────────────────────────────────────────────────────────────────────────
// CODE HIGHLIGHT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Identifies which lines of source code correspond to the current step.
 * The visualizer's code panel uses this to highlight active lines.
 */
export interface CodeHighlight {
  /**
   * Which language tab to highlight in the code panel.
   * Must be one of the keys in the algorithm's `code.implementations` map
   * from its meta.json (e.g., "pseudocode", "python", "javascript").
   */
  readonly language: string;

  /**
   * 1-indexed line numbers to highlight.
   * - Must be a non-empty array of positive integers.
   * - Lines are 1-indexed to match editor conventions (line 1 = first line).
   * - Order does not matter; the renderer highlights all listed lines.
   *
   * @example [5, 6]       — highlight lines 5 and 6
   * @example [2, 3, 8]    — highlight lines 2, 3, and 8 (non-contiguous is fine)
   */
  readonly lines: readonly number[];
}

// ─────────────────────────────────────────────────────────────────────────────
// VISUAL ACTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A single instruction telling the renderer what to display for this step.
 *
 * Visual actions are an OPEN vocabulary — the `type` field is a plain string,
 * not a closed enum. Renderers MUST silently ignore action types they do not
 * recognize. This allows new action types (e.g., for quantum computing) to be
 * defined in generators before renderer support exists.
 *
 * Each action type has its own parameter shape. The base interface captures the
 * shared structure; specific action interfaces below provide type-safe
 * constructors for known action types.
 *
 * All parameter values MUST be JSON-serializable.
 */
export interface VisualAction {
  /**
   * The action type identifier.
   * - Use camelCase (e.g., "highlightElement", "movePointer").
   * - Must be a non-empty string.
   * - Renderers silently ignore unrecognized types.
   */
  readonly type: string;

  /**
   * Action-specific parameters.
   * Every key-value pair must be JSON-serializable.
   * Specific known action interfaces (below) define the expected shape
   * for each action type.
   */
  readonly [key: string]: unknown;
}

// ── Known Visual Action Types ────────────────────────────────────────────────
// These interfaces provide type safety for the initial action vocabulary.
// They all extend the base VisualAction shape. Generators should use these
// typed constructors where possible. The renderer checks `type` at runtime.

/** Highlight a single element (e.g., an array cell, a graph node). */
export interface HighlightElementAction extends VisualAction {
  readonly type: "highlightElement";
  /** 0-based index of the element to highlight. */
  readonly index: number;
  /**
   * Semantic color name. Renderers map these to actual colors.
   * Common values: "highlight", "compare", "found", "active", "inactive".
   * @default "highlight"
   */
  readonly color?: string;
}

/** Move a named pointer to a new position (e.g., left/right/mid pointers). */
export interface MovePointerAction extends VisualAction {
  readonly type: "movePointer";
  /** Unique identifier for this pointer (e.g., "left", "right", "mid"). */
  readonly id: string;
  /** 0-based index the pointer should point to. */
  readonly to: number;
}

/** Highlight a contiguous range of elements. */
export interface HighlightRangeAction extends VisualAction {
  readonly type: "highlightRange";
  /** 0-based start index (inclusive). Must satisfy: from <= to. */
  readonly from: number;
  /** 0-based end index (inclusive). Must satisfy: to >= from. */
  readonly to: number;
  /** @default "highlight" */
  readonly color?: string;
}

/** Dim (visually de-emphasize) a contiguous range of elements. */
export interface DimRangeAction extends VisualAction {
  readonly type: "dimRange";
  /** 0-based start index (inclusive). Must satisfy: from <= to. */
  readonly from: number;
  /** 0-based end index (inclusive). Must satisfy: to >= from. */
  readonly to: number;
}

/** Swap two elements (used in sorting visualizations). */
export interface SwapElementsAction extends VisualAction {
  readonly type: "swapElements";
  /** 0-based index of the first element. */
  readonly i: number;
  /** 0-based index of the second element. */
  readonly j: number;
}

/** Visually compare two elements and show the result. */
export interface CompareElementsAction extends VisualAction {
  readonly type: "compareElements";
  /** 0-based index of the first element. */
  readonly i: number;
  /** 0-based index of the second element. */
  readonly j: number;
  /**
   * Comparison result:
   * - "less"    → element[i] < element[j]
   * - "greater" → element[i] > element[j]
   * - "equal"   → element[i] === element[j]
   */
  readonly result: "less" | "greater" | "equal";
}

/** Mark an element as the found/target element. */
export interface MarkFoundAction extends VisualAction {
  readonly type: "markFound";
  /** 0-based index of the found element. */
  readonly index: number;
}

/** Indicate that the target was not found (no specific index). */
export interface MarkNotFoundAction extends VisualAction {
  readonly type: "markNotFound";
}

/** Display a transient text message on the visualization. */
export interface ShowMessageAction extends VisualAction {
  readonly type: "showMessage";
  /** The message text to display. */
  readonly text: string;
  /**
   * Message severity / style.
   * - "info"    → neutral informational message
   * - "success" → positive outcome (e.g., "Found!")
   * - "warning" → caution or edge case
   * - "error"   → failure or problem
   */
  readonly messageType: "info" | "success" | "warning" | "error";
}

// ── Graph Actions ────────────────────────────────────────────────────────────

/** Mark a graph node as visited. */
export interface VisitNodeAction extends VisualAction {
  readonly type: "visitNode";
  /** Unique identifier of the node within the graph. */
  readonly nodeId: string;
  /** @default "visited" */
  readonly color?: string;
}

/** Highlight an edge in the graph. */
export interface HighlightEdgeAction extends VisualAction {
  readonly type: "highlightEdge";
  /** Node ID of the edge source. */
  readonly from: string;
  /** Node ID of the edge target. */
  readonly to: string;
  /** @default "highlight" */
  readonly color?: string;
}

/** Update the displayed value of a graph node (e.g., distance in Dijkstra). */
export interface UpdateNodeValueAction extends VisualAction {
  readonly type: "updateNodeValue";
  /** Unique identifier of the node. */
  readonly nodeId: string;
  /** New value to display. Can be a number, string, or null (to clear). */
  readonly value: number | string | null;
}

// ── Neural Network Actions ───────────────────────────────────────────────────

/** Activate (light up) a neuron in a network layer. */
export interface ActivateNeuronAction extends VisualAction {
  readonly type: "activateNeuron";
  /** 0-based layer index in the network. */
  readonly layer: number;
  /** 0-based neuron index within the layer. */
  readonly index: number;
  /** Activation value (typically between 0 and 1, but not constrained). */
  readonly value: number;
}

/** Show signal propagating from one layer to another. */
export interface PropagateSignalAction extends VisualAction {
  readonly type: "propagateSignal";
  /** 0-based index of the source layer. */
  readonly fromLayer: number;
  /** 0-based index of the target layer. */
  readonly toLayer: number;
}

/** Display gradient values for a layer (used in backpropagation). */
export interface ShowGradientAction extends VisualAction {
  readonly type: "showGradient";
  /** 0-based layer index. */
  readonly layer: number;
  /** Array of gradient values, one per neuron in the layer. */
  readonly values: readonly number[];
}

// ── Deep Learning / Phase 9 Actions ─────────────────────────────────────────

/**
 * Show weight values on connections between two layers.
 * Used to display the weight matrix visually on the connections.
 */
export interface ShowWeightsAction extends VisualAction {
  readonly type: "showWeights";
  /** Source layer index. */
  readonly fromLayer: number;
  /** Target layer index. */
  readonly toLayer: number;
  /**
   * 2D weight matrix. Shape: [toLayerSize, fromLayerSize].
   * weights[j][i] is the weight from neuron i in fromLayer
   * to neuron j in toLayer.
   *
   * NOTE: W[toNeuron][fromNeuron] — standard ML convention.
   */
  readonly weights: readonly (readonly number[])[];
}

/**
 * Show weight gradient values on connections during backpropagation.
 * These are the partial derivatives of the loss with respect to each weight.
 */
export interface ShowWeightGradientsAction extends VisualAction {
  readonly type: "showWeightGradients";
  /** Source layer index. */
  readonly fromLayer: number;
  /** Target layer index. */
  readonly toLayer: number;
  /**
   * 2D gradient matrix. Shape: [toLayerSize, fromLayerSize].
   * gradients[j][i] = ∂Loss/∂w_ji = δ_j * a_i
   */
  readonly gradients: readonly (readonly number[])[];
}

/**
 * Show the bias gradient values for a layer.
 */
export interface ShowBiasGradientsAction extends VisualAction {
  readonly type: "showBiasGradients";
  /** Layer index. */
  readonly layer: number;
  /**
   * Bias gradient for each neuron.
   * biasGradients[j] = ∂Loss/∂b_j = δ_j
   */
  readonly biasGradients: readonly number[];
}

/**
 * Update weights after a gradient descent step.
 * Shows the old and new weight values.
 */
export interface UpdateWeightsAction extends VisualAction {
  readonly type: "updateWeights";
  /** Source layer index. */
  readonly fromLayer: number;
  /** Target layer index. */
  readonly toLayer: number;
  /** Weight matrix BEFORE update. Shape: [toLayerSize, fromLayerSize]. */
  readonly oldWeights: readonly (readonly number[])[];
  /** Weight matrix AFTER update. Shape: [toLayerSize, fromLayerSize]. */
  readonly newWeights: readonly (readonly number[])[];
  /**
   * Learning rate used for this update.
   * newWeights[j][i] = oldWeights[j][i] - learningRate * ∂Loss/∂w_ji
   */
  readonly learningRate: number;
}

/**
 * Show the pre-activation (weighted sum) value at a neuron.
 * Visualizes z = Σ(w_i * x_i) + b before the activation function is applied.
 */
export interface ShowPreActivationAction extends VisualAction {
  readonly type: "showPreActivation";
  /** Layer index. */
  readonly layer: number;
  /** Neuron index within the layer. */
  readonly index: number;
  /** The pre-activation value z = Σ(w_i * x_i) + b. */
  readonly z: number;
  /** The individual weighted input terms (w_i * x_i) for each input. */
  readonly weightedInputs: readonly number[];
  /** The bias value added to the weighted sum. */
  readonly bias: number;
}

/**
 * Show the activation function being applied.
 * Visualizes the transformation from pre-activation z to output a.
 */
export interface ShowActivationFunctionAction extends VisualAction {
  readonly type: "showActivationFunction";
  /** Layer index. */
  readonly layer: number;
  /** Neuron index within the layer. */
  readonly index: number;
  /** Name of the activation function. */
  readonly functionName: "sigmoid" | "relu" | "tanh" | "step";
  /** Input value (z = pre-activation). */
  readonly input: number;
  /** Output value (a = activation_fn(z)). */
  readonly output: number;
}

/**
 * Show the loss value computed from predictions and targets.
 */
export interface ShowLossAction extends VisualAction {
  readonly type: "showLoss";
  /** The loss value. */
  readonly loss: number;
  /** Loss function used. */
  readonly lossFunction: "mse" | "binary-cross-entropy";
  /** Predicted values (network outputs). */
  readonly predictions: readonly number[];
  /** Target/expected values. */
  readonly targets: readonly number[];
}

// ── Convolution Actions ─────────────────────────────────────────────────────

/**
 * Highlight the current position of the convolution kernel on the input grid.
 */
export interface HighlightKernelPositionAction extends VisualAction {
  readonly type: "highlightKernelPosition";
  /** Top-left row index of the kernel window on the input. */
  readonly row: number;
  /** Top-left column index of the kernel window on the input. */
  readonly col: number;
  /** Kernel height. */
  readonly kernelHeight: number;
  /** Kernel width. */
  readonly kernelWidth: number;
}

/**
 * Show the element-wise multiplication between the kernel and
 * the overlapping input patch at the current position.
 */
export interface ShowConvolutionProductsAction extends VisualAction {
  readonly type: "showConvolutionProducts";
  /** Row of kernel position (top-left corner on input). */
  readonly row: number;
  /** Column of kernel position (top-left corner on input). */
  readonly col: number;
  /**
   * 2D array of element-wise products.
   * products[kr][kc] = input[row + kr][col + kc] * kernel[kr][kc]
   */
  readonly products: readonly (readonly number[])[];
  /** The sum of all products — this becomes the output value. */
  readonly sum: number;
}

/**
 * Write a computed value into the output feature map.
 */
export interface WriteOutputCellAction extends VisualAction {
  readonly type: "writeOutputCell";
  /** Row in the output feature map. */
  readonly row: number;
  /** Column in the output feature map. */
  readonly col: number;
  /** The computed value to write. */
  readonly value: number;
}

// ── Gradient Descent Actions ────────────────────────────────────────────────

/**
 * Show the current position on the loss landscape.
 */
export interface ShowLandscapePositionAction extends VisualAction {
  readonly type: "showLandscapePosition";
  /** Current parameter values (coordinates on the landscape). */
  readonly parameters: readonly number[];
  /** Loss value at this position. */
  readonly loss: number;
  /** Gradient vector at this position. */
  readonly gradient: readonly number[];
}

/**
 * Show a gradient descent step: from current position to new position.
 */
export interface ShowDescentStepAction extends VisualAction {
  readonly type: "showDescentStep";
  /** Parameters before the step. */
  readonly fromParameters: readonly number[];
  /** Parameters after the step. */
  readonly toParameters: readonly number[];
  /** Loss before the step. */
  readonly fromLoss: number;
  /** Loss after the step. */
  readonly toLoss: number;
  /** Optimizer name. */
  readonly optimizer: "sgd" | "momentum" | "adam";
  /** Learning rate used for this step. */
  readonly learningRate: number;
}

/**
 * Show the trajectory of all visited positions on the loss landscape.
 */
export interface ShowTrajectoryAction extends VisualAction {
  readonly type: "showTrajectory";
  /** Array of visited positions with their loss values. */
  readonly trajectory: readonly {
    readonly parameters: readonly number[];
    readonly loss: number;
  }[];
  /** Optimizer that produced this trajectory. */
  readonly optimizer: "sgd" | "momentum" | "adam";
}

/**
 * Show momentum or velocity vector at the current position.
 * Used by momentum and Adam optimizers.
 */
export interface ShowMomentumAction extends VisualAction {
  readonly type: "showMomentum";
  /** Velocity/momentum vector. */
  readonly velocity: readonly number[];
  /** Second moment estimate (Adam only). Omit for plain momentum. */
  readonly secondMoment?: readonly number[];
}

// ── GenAI / Attention Actions ────────────────────────────────────────────────

/**
 * Show attention weights from a single query token to all key tokens.
 * Used in self-attention and multi-head attention visualizations.
 */
export interface ShowAttentionWeightsAction extends VisualAction {
  readonly type: "showAttentionWeights";
  /** 0-based index of the query token. */
  readonly queryIdx: number;
  /**
   * Attention weight for each key token position.
   * - Length must equal the number of tokens in the sequence.
   * - Each value must be in [0, 1].
   * - The array MUST sum to 1.0 (within floating-point tolerance of ±1e-6).
   *
   * MATHEMATICAL INVARIANT:
   * Math.abs(weights.reduce((a, b) => a + b, 0) - 1.0) <= 1e-6
   */
  readonly weights: readonly number[];
}

/** Highlight a token in a token sequence. */
export interface HighlightTokenAction extends VisualAction {
  readonly type: "highlightToken";
  /** 0-based index of the token. */
  readonly index: number;
  /** @default "highlight" */
  readonly color?: string;
}

/** Update a bar chart visualization (e.g., for probability distributions). */
export interface UpdateBarChartAction extends VisualAction {
  readonly type: "updateBarChart";
  /** Array of numeric values, one per bar. */
  readonly values: readonly number[];
  /** Optional labels for each bar. Length must match `values` if provided. */
  readonly labels?: readonly string[];
}

// ── GenAI / Tokenization Actions ─────────────────────────────────────────────

/**
 * Highlight a span of characters in the source text during tokenization.
 * Used to show which characters are being merged in BPE.
 */
export interface HighlightTextSpanAction extends VisualAction {
  readonly type: "highlightTextSpan";
  /** 0-based start character index (inclusive). */
  readonly start: number;
  /** 0-based end character index (exclusive). */
  readonly end: number;
  /** @default "highlight" */
  readonly color?: string;
}

/**
 * Show a merge operation in BPE tokenization — two adjacent tokens
 * being combined into one.
 */
export interface MergeTokensAction extends VisualAction {
  readonly type: "mergeTokens";
  /** 0-based index of the left token being merged. */
  readonly leftIndex: number;
  /** 0-based index of the right token being merged. */
  readonly rightIndex: number;
  /** The resulting merged token string. */
  readonly result: string;
}

/**
 * Display an embedding vector for a token. Used in the token-embeddings
 * visualization to show the numerical vector representation.
 */
export interface ShowEmbeddingAction extends VisualAction {
  readonly type: "showEmbedding";
  /** 0-based index of the token whose embedding is being shown. */
  readonly tokenIndex: number;
  /**
   * The embedding vector values.
   * Length equals the embedding dimension (d_model).
   */
  readonly values: readonly number[];
}

/**
 * Show a similarity score between two token embeddings.
 */
export interface ShowSimilarityAction extends VisualAction {
  readonly type: "showSimilarity";
  /** 0-based index of the first token. */
  readonly tokenA: number;
  /** 0-based index of the second token. */
  readonly tokenB: number;
  /**
   * Cosine similarity score in [-1, 1].
   *
   * MATHEMATICAL DEFINITION:
   * similarity = (A · B) / (||A|| × ||B||)
   *
   * Where A · B is the dot product and ||X|| is the L2 norm.
   */
  readonly score: number;
}

/**
 * Show the Q, K, or V matrix computed from input embeddings.
 * Used in self-attention to show the linear projection step.
 */
export interface ShowProjectionMatrixAction extends VisualAction {
  readonly type: "showProjectionMatrix";
  /** Which projection this is: "Q" (query), "K" (key), or "V" (value). */
  readonly projectionType: "Q" | "K" | "V";
  /**
   * 2D matrix values. Shape: [seqLen, d_k].
   * projectionMatrix[i][j] is the j-th dimension of the i-th token's projection.
   */
  readonly matrix: readonly (readonly number[])[];
}

/**
 * Show the raw attention score matrix before softmax.
 * Shape: [seqLen, seqLen]. scores[i][j] = Q[i] · K[j]^T / sqrt(d_k).
 */
export interface ShowAttentionScoresAction extends VisualAction {
  readonly type: "showAttentionScores";
  /**
   * 2D matrix of raw (pre-softmax) attention scores.
   * Shape: [seqLen, seqLen].
   *
   * MATHEMATICAL DEFINITION:
   * scores[i][j] = (Q[i] · K[j]) / sqrt(d_k)
   *
   * Where Q[i] is the query vector for token i,
   * K[j] is the key vector for token j,
   * d_k is the key dimension.
   */
  readonly scores: readonly (readonly number[])[];
}

/**
 * Show the full attention weight matrix after softmax.
 * Each row sums to 1.0 (within floating-point tolerance).
 */
export interface ShowFullAttentionMatrixAction extends VisualAction {
  readonly type: "showFullAttentionMatrix";
  /**
   * 2D matrix of attention weights after softmax.
   * Shape: [seqLen, seqLen].
   *
   * MATHEMATICAL INVARIANT:
   * For each row i: Math.abs(sum(weights[i]) - 1.0) <= 1e-6
   */
  readonly weights: readonly (readonly number[])[];
}

/**
 * Show the weighted value vectors (attention output) for a specific query.
 */
export interface ShowWeightedValuesAction extends VisualAction {
  readonly type: "showWeightedValues";
  /** 0-based query token index. */
  readonly queryIdx: number;
  /**
   * The resulting context vector: sum of attention_weight[i] * V[i] for all i.
   * Length: d_v (value dimension).
   */
  readonly contextVector: readonly number[];
}

/**
 * Activate a specific attention head in multi-head attention.
 * Used to highlight which head is currently being shown.
 */
export interface ActivateHeadAction extends VisualAction {
  readonly type: "activateHead";
  /** 0-based head index. */
  readonly headIndex: number;
  /** Total number of heads (for UI layout). */
  readonly totalHeads: number;
}

/**
 * Show the concatenated multi-head output before final projection.
 */
export interface ShowConcatenatedHeadsAction extends VisualAction {
  readonly type: "showConcatenatedHeads";
  /**
   * 2D matrix: [seqLen, numHeads * d_v].
   * Row i is the concatenation of all head outputs for token i.
   */
  readonly matrix: readonly (readonly number[])[];
}

/**
 * Show data flowing through a named sublayer in the transformer block.
 * Used in the layer-diagram layout.
 */
export interface ActivateSublayerAction extends VisualAction {
  readonly type: "activateSublayer";
  /**
   * Identifier for the sublayer:
   * "self-attention", "add-norm-1", "ffn", "add-norm-2"
   */
  readonly sublayerId: string;
  /** Human-readable label for the sublayer. */
  readonly label: string;
}

/**
 * Show a residual connection being added.
 */
export interface ShowResidualConnectionAction extends VisualAction {
  readonly type: "showResidualConnection";
  /** The input vector before the sublayer. Length: d_model. */
  readonly input: readonly number[];
  /** The sublayer output. Length: d_model. */
  readonly sublayerOutput: readonly number[];
  /**
   * The result after adding the residual: input + sublayerOutput.
   * Length: d_model.
   *
   * MATHEMATICAL INVARIANT:
   * For each dimension j:
   *   Math.abs(result[j] - (input[j] + sublayerOutput[j])) <= 1e-9
   */
  readonly result: readonly number[];
}

/**
 * Show layer normalization being applied.
 */
export interface ShowLayerNormAction extends VisualAction {
  readonly type: "showLayerNorm";
  /** The input vector (before normalization). Length: d_model. */
  readonly input: readonly number[];
  /**
   * The output vector (after normalization). Length: d_model.
   *
   * MATHEMATICAL DEFINITION (simplified — no learnable gamma/beta):
   *   mean = (1/d) * sum(input)
   *   variance = (1/d) * sum((input[i] - mean)^2)
   *   output[i] = (input[i] - mean) / sqrt(variance + epsilon)
   *
   * With epsilon = 1e-5.
   *
   * MATHEMATICAL INVARIANT (post-normalization, without gamma/beta):
   *   Math.abs(mean(output)) <= 1e-6
   *   Math.abs(variance(output) - 1.0) <= 1e-4
   */
  readonly output: readonly number[];
}

// ── Quantum Actions ─────────────────────────────────────────────────────────

/**
 * A complex number represented as a 2-element tuple: [real, imaginary].
 *
 * CONVENTION:
 *   complex(a, b) is stored as [a, b] and represents a + bi
 *   where i = sqrt(-1).
 */
export type Complex = readonly [number, number];

/**
 * Apply a quantum gate to one or more qubits in a circuit diagram.
 * The layout draws the gate symbol on the appropriate wire(s).
 */
export interface ApplyGateAction extends VisualAction {
  readonly type: "applyGate";

  /**
   * Standard gate name. Must be one of the recognized gate identifiers:
   *   Single-qubit: "X", "Y", "Z", "H", "S", "T", "Rz", "Rx", "Ry", "I"
   *   Multi-qubit:  "CNOT", "CZ", "SWAP", "Toffoli" (CCNOT)
   *   Measurement:  "M"
   */
  readonly gate: string;

  /**
   * 0-based indices of the target qubit(s).
   * - Single-qubit gates: [targetQubit]
   * - CNOT: [controlQubit, targetQubit]
   * - Toffoli: [control1, control2, targetQubit]
   * - SWAP: [qubit1, qubit2]
   */
  readonly qubits: readonly number[];

  /**
   * Optional rotation angle in radians for parameterized gates (Rx, Ry, Rz).
   */
  readonly angle?: number;
}

/**
 * Display the full state vector of the quantum system.
 * Each amplitude is a complex number. The number of amplitudes is 2^n
 * where n is the number of qubits.
 *
 * MATHEMATICAL INVARIANT:
 * Σ |amplitude_i|² = 1.0 within tolerance ±1e-9
 */
export interface ShowStateVectorAction extends VisualAction {
  readonly type: "showStateVector";

  /**
   * Array of complex amplitudes in computational basis order (big-endian).
   * For n qubits, this array has 2^n elements.
   */
  readonly amplitudes: readonly Complex[];

  /** Number of qubits in the system. Must satisfy: amplitudes.length === 2 ** numQubits. */
  readonly numQubits: number;
}

/**
 * Show a point on the Bloch sphere representing a single-qubit pure state.
 *
 * MATHEMATICAL DEFINITION:
 *   |ψ⟩ = cos(θ/2)|0⟩ + e^{iφ}sin(θ/2)|1⟩
 *
 * Bloch vector coordinates:
 *   x = sin(θ) × cos(φ), y = sin(θ) × sin(φ), z = cos(θ)
 */
export interface RotateBlochSphereAction extends VisualAction {
  readonly type: "rotateBlochSphere";

  /** Polar angle θ (theta) in radians, range [0, π]. */
  readonly theta: number;

  /** Azimuthal angle φ (phi) in radians, range [0, 2π). */
  readonly phi: number;

  /** Optional label for the state (e.g., "|ψ⟩", "|+⟩"). */
  readonly label?: string;
}

/**
 * Show measurement probabilities for each computational basis state.
 *
 * MATHEMATICAL INVARIANT:
 * Σ probabilities[i] = 1.0 within tolerance ±1e-9
 */
export interface ShowProbabilitiesAction extends VisualAction {
  readonly type: "showProbabilities";

  /** Probability of measuring each basis state. Each value is |amplitude_i|². */
  readonly probabilities: readonly number[];

  /** Labels for each basis state (e.g., ["|00⟩", "|01⟩", "|10⟩", "|11⟩"]). */
  readonly labels: readonly string[];
}

/**
 * Collapse the quantum state by performing a measurement.
 */
export interface CollapseStateAction extends VisualAction {
  readonly type: "collapseState";

  /** 0-based index of the qubit being measured. */
  readonly qubit: number;

  /** The measurement outcome: 0 or 1. */
  readonly result: 0 | 1;

  /** Probability that this specific outcome would occur. */
  readonly probability: number;
}

/**
 * Show entanglement between two qubits with a visual connection.
 */
export interface ShowEntanglementAction extends VisualAction {
  readonly type: "showEntanglement";

  /** 0-based index of the first entangled qubit. */
  readonly qubit1: number;

  /** 0-based index of the second entangled qubit. */
  readonly qubit2: number;

  /** Type of entangled state for educational labeling. */
  readonly bellState?:
    | "bell-phi-plus"
    | "bell-phi-minus"
    | "bell-psi-plus"
    | "bell-psi-minus"
    | "other";
}

/**
 * Highlight a specific qubit wire in the circuit diagram.
 */
export interface HighlightQubitWireAction extends VisualAction {
  readonly type: "highlightQubitWire";

  /** 0-based index of the qubit wire to highlight. */
  readonly qubitIndex: number;

  /** Highlight color. @default "#00ffc8" (quantum accent) */
  readonly color?: string;
}

/**
 * Show classical bits resulting from measurement, displayed below the circuit.
 */
export interface ShowClassicalBitsAction extends VisualAction {
  readonly type: "showClassicalBits";

  /** Array of classical bit values. Each is 0, 1, or null (unmeasured). */
  readonly bits: readonly (0 | 1 | null)[];
}

/**
 * Show the unitary matrix of a gate being applied.
 */
export interface ShowGateMatrixAction extends VisualAction {
  readonly type: "showGateMatrix";

  /** Gate identifier (e.g., "H", "CNOT"). */
  readonly gate: string;

  /**
   * The unitary matrix as a 2D array of complex numbers.
   *
   * MATHEMATICAL INVARIANT (unitarity):
   *   U × U† = I  (within tolerance ±1e-9 per element)
   */
  readonly matrix: readonly (readonly Complex[])[];
}

// ── Union of All Known Action Types ──────────────────────────────────────────

/**
 * Discriminated union of all known visual action types.
 * Use this for exhaustive switch statements in renderers.
 * Note: renderers must ALSO handle unknown types gracefully (no-op).
 */
export type KnownVisualAction =
  | HighlightElementAction
  | MovePointerAction
  | HighlightRangeAction
  | DimRangeAction
  | SwapElementsAction
  | CompareElementsAction
  | MarkFoundAction
  | MarkNotFoundAction
  | ShowMessageAction
  | VisitNodeAction
  | HighlightEdgeAction
  | UpdateNodeValueAction
  | ActivateNeuronAction
  | PropagateSignalAction
  | ShowGradientAction
  | ShowAttentionWeightsAction
  | HighlightTokenAction
  | UpdateBarChartAction
  // Phase 8 additions:
  | HighlightTextSpanAction
  | MergeTokensAction
  | ShowEmbeddingAction
  | ShowSimilarityAction
  | ShowProjectionMatrixAction
  | ShowAttentionScoresAction
  | ShowFullAttentionMatrixAction
  | ShowWeightedValuesAction
  | ActivateHeadAction
  | ShowConcatenatedHeadsAction
  | ActivateSublayerAction
  | ShowResidualConnectionAction
  | ShowLayerNormAction
  // Phase 9 additions — Neural Networks:
  | ShowWeightsAction
  | ShowWeightGradientsAction
  | ShowBiasGradientsAction
  | UpdateWeightsAction
  | ShowPreActivationAction
  | ShowActivationFunctionAction
  | ShowLossAction
  // Phase 9 additions — Convolution:
  | HighlightKernelPositionAction
  | ShowConvolutionProductsAction
  | WriteOutputCellAction
  // Phase 9 additions — Gradient Descent:
  | ShowLandscapePositionAction
  | ShowDescentStepAction
  | ShowTrajectoryAction
  | ShowMomentumAction
  // Phase 14 additions — Quantum:
  | ApplyGateAction
  | ShowStateVectorAction
  | RotateBlochSphereAction
  | ShowProbabilitiesAction
  | CollapseStateAction
  | ShowEntanglementAction
  | HighlightQubitWireAction
  | ShowClassicalBitsAction
  | ShowGateMatrixAction;

// ─────────────────────────────────────────────────────────────────────────────
// STEP
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A single step in an algorithm's execution trace.
 *
 * Steps are the atomic unit of the Eigenvue platform. A generator produces
 * an ordered array of steps. The renderer displays one step at a time.
 * The user navigates between steps with playback controls.
 *
 * INVARIANTS (enforced by validation, tested by CI):
 *
 * 1. `index` is 0-based and matches the step's position in the array.
 *    steps[i].index === i for all i.
 *
 * 2. `id` is a non-empty, URL-safe string (lowercase alphanumeric + hyphens + underscores).
 *    The same `id` may appear multiple times in a sequence (e.g., "compare_mid"
 *    appears once per loop iteration). `id` is a template identifier, not unique.
 *
 * 3. `title` is a short, human-readable label (≤80 characters recommended).
 *
 * 4. `explanation` is a plain-language narration of what is happening at this step.
 *    It may reference concrete values (e.g., "Comparing array[3]=7 with target 5").
 *
 * 5. `state` is a snapshot of ALL algorithm variables at this point in execution.
 *    It must be a flat or nested JSON-serializable object. No functions, no
 *    undefined values, no circular references.
 *
 * 6. `visualActions` is an ordered array of rendering instructions. The renderer
 *    processes them in order. An empty array is valid (step has no visual effect).
 *
 * 7. `codeHighlight` maps this step to source code lines. It is required.
 *
 * 8. `isTerminal` MUST be true on the last step and ONLY on the last step.
 *    Exactly one step in the array has isTerminal === true.
 *
 * 9. `phase` is an optional grouping label (e.g., "initialization", "search",
 *    "result"). Used by the UI to show phase transitions. Consecutive steps
 *    with the same phase are grouped together.
 */
export interface Step {
  // ── Identity ──

  /**
   * 0-based position of this step in the sequence.
   * INVARIANT: steps[i].index === i
   */
  readonly index: number;

  /**
   * Template identifier for this step type (e.g., "compare_mid", "found").
   * - Must be a non-empty string.
   * - Should be URL-safe: lowercase letters, digits, hyphens, underscores.
   * - NOT unique within a sequence (the same id may recur in a loop).
   * - Used for analytics, bookmarking, and debugging.
   *
   * @pattern ^[a-z0-9][a-z0-9_-]*$
   */
  readonly id: string;

  // ── Content ──

  /**
   * Short, human-readable title for this step.
   * Shown as the step heading in the UI.
   * Recommended max length: 80 characters.
   *
   * @example "Compare Middle Element"
   * @example "Target Found!"
   * @example "Adjust Left Pointer"
   */
  readonly title: string;

  /**
   * Plain-language explanation of what is happening at this step.
   * Should be complete enough that a learner understands the logic
   * without looking at the code.
   *
   * @example "mid = floor((0 + 6) / 2) = 3. Checking array[3] = 7. Since 7 < 23, the target must be in the right half."
   */
  readonly explanation: string;

  // ── Algorithm State ──

  /**
   * Snapshot of all algorithm variables at this point.
   * This is the complete, serializable state of the algorithm.
   *
   * Must be a plain object where:
   * - Keys are variable names (strings).
   * - Values are JSON-serializable: number, string, boolean, null,
   *   array of these, or nested object of these.
   * - No `undefined`, no functions, no class instances, no symbols.
   *
   * @example { array: [1, 3, 5, 7, 9], target: 7, left: 0, right: 4, mid: 2 }
   */
  readonly state: Readonly<Record<string, unknown>>;

  // ── Visual Instructions ──

  /**
   * Ordered array of visual actions the renderer should execute for this step.
   * The renderer processes actions in array order.
   * An empty array is valid (the step has state/code changes but no visual effect).
   */
  readonly visualActions: readonly VisualAction[];

  // ── Code Mapping ──

  /**
   * Identifies which source code lines correspond to this step.
   * The code panel highlights these lines when this step is active.
   */
  readonly codeHighlight: CodeHighlight;

  // ── Flow Control ──

  /**
   * True if and only if this is the final step in the sequence.
   *
   * INVARIANT: Exactly one step in the array has isTerminal === true,
   * and it is the last element (steps[steps.length - 1]).
   */
  readonly isTerminal: boolean;

  /**
   * Optional grouping label for UI phase indicators.
   * Consecutive steps with the same phase are visually grouped.
   *
   * @example "initialization"
   * @example "search"
   * @example "result"
   */
  readonly phase?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP SEQUENCE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A complete, validated sequence of steps produced by a generator.
 * This is the top-level structure that flows from generators to renderers.
 */
export interface StepSequence {
  /**
   * Step format version. Must equal STEP_FORMAT_VERSION.
   * Renderers should check this before attempting to render.
   */
  readonly formatVersion: number;

  /**
   * The algorithm ID this sequence was generated for.
   * Must match the algorithm's `meta.json` id field.
   *
   * @pattern ^[a-z0-9][a-z0-9-]*$
   */
  readonly algorithmId: string;

  /**
   * The input parameters that produced this sequence.
   * Stored so the sequence can be reproduced.
   */
  readonly inputs: Readonly<Record<string, unknown>>;

  /**
   * The ordered array of steps.
   * - Must contain at least 1 step.
   * - steps[i].index === i for all i.
   * - steps[steps.length - 1].isTerminal === true.
   * - No other step has isTerminal === true.
   */
  readonly steps: readonly Step[];

  /**
   * ISO 8601 timestamp of when this sequence was generated.
   * Used for cache busting and debugging.
   *
   * @example "2026-02-14T10:30:00.000Z"
   */
  readonly generatedAt: string;

  /**
   * Which generator produced this sequence.
   * - "typescript" for the web generator.
   * - "python" for the Python package generator.
   * - "precomputed" for build-time pre-generated sequences.
   */
  readonly generatedBy: "typescript" | "python" | "precomputed";
}

// ─────────────────────────────────────────────────────────────────────────────
// ALGORITHM METADATA (meta.json type)
// ─────────────────────────────────────────────────────────────────────────────

/** Algorithm category identifier. */
export type AlgorithmCategory =
  | "classical"
  | "deep-learning"
  | "generative-ai"
  | "quantum";

/** Difficulty level. */
export type DifficultyLevel =
  | "beginner"
  | "intermediate"
  | "advanced"
  | "expert";

/** A key concept or common pitfall entry in the education section. */
export interface EducationEntry {
  readonly title: string;
  readonly description: string;
}

/** A quiz question for self-assessment. */
export interface QuizQuestion {
  readonly question: string;
  /** Array of answer option strings. Minimum 2, maximum 6. */
  readonly options: readonly string[];
  /**
   * 0-based index of the correct option in the `options` array.
   * INVARIANT: 0 <= correctIndex < options.length
   */
  readonly correctIndex: number;
  /** Explanation shown after the user answers. */
  readonly explanation: string;
}

/** An external learning resource link. */
export interface ResourceLink {
  readonly title: string;
  readonly url: string;
  /** Type of resource for icon selection. */
  readonly type: "article" | "video" | "paper" | "course" | "documentation" | "interactive";
}

/** A named input preset that users can load. */
export interface InputExample {
  /** Display name for this preset (e.g., "Large Sorted Array"). */
  readonly name: string;
  /** Parameter values for this preset. Shape must match inputs.schema. */
  readonly values: Readonly<Record<string, unknown>>;
}

/**
 * Complete algorithm metadata. One meta.json file per algorithm.
 *
 * This is everything that is genuinely data (not logic):
 * display info, educational content, visual configuration, SEO keywords,
 * input schema, code samples for display, and relationships to other algorithms.
 */
export interface AlgorithmMeta {
  /**
   * URL-safe unique identifier for this algorithm.
   * Used in URLs, file paths, and cross-references.
   *
   * @pattern ^[a-z0-9][a-z0-9-]*$
   * @example "binary-search"
   * @example "self-attention"
   */
  readonly id: string;

  /** Human-readable display name. */
  readonly name: string;

  /** Which domain category this algorithm belongs to. */
  readonly category: AlgorithmCategory;

  readonly description: {
    /** Short description for cards and meta tags. Maximum 80 characters. */
    readonly short: string;
    /** Full description. Supports markdown. */
    readonly long: string;
  };

  readonly complexity: {
    /** Time complexity in Big-O notation (e.g., "O(log n)"). */
    readonly time: string;
    /** Space complexity in Big-O notation (e.g., "O(1)"). */
    readonly space: string;
    /** Difficulty level for this algorithm. */
    readonly level: DifficultyLevel;
  };

  readonly visual: {
    /**
     * Name of the layout to use for rendering.
     * Must be a registered layout in the rendering engine.
     *
     * @example "array-with-pointers"
     * @example "graph-network"
     * @example "attention-heatmap"
     */
    readonly layout: string;

    readonly theme?: {
      /** Primary accent color override (hex). */
      readonly primary?: string;
      /** Secondary accent color override (hex). */
      readonly secondary?: string;
    };

    /**
     * Layout-specific configuration.
     * Shape depends on the layout. The layout reads this at init time.
     *
     * @example { pointers: ["left", "right", "mid"] }  // for array-with-pointers
     */
    readonly components?: Readonly<Record<string, unknown>>;
  };

  readonly inputs: {
    /**
     * JSON Schema object defining the algorithm's input parameters.
     * Used to generate the input editor UI and validate user-provided inputs.
     */
    readonly schema: Readonly<Record<string, unknown>>;

    /** Default parameter values for initial load. */
    readonly defaults: Readonly<Record<string, unknown>>;

    /** Named presets users can load from a dropdown. */
    readonly examples: readonly InputExample[];
  };

  readonly code: {
    /**
     * Display-only code shown in the code panel.
     * These are NOT the generators — they are clean, readable
     * implementations meant for educational display.
     *
     * At minimum, "pseudocode" must be present.
     */
    readonly implementations: {
      readonly pseudocode: string;
      readonly python?: string;
      readonly javascript?: string;
      readonly [key: string]: string | undefined;
    };

    /** Which language tab to show by default in the code panel. */
    readonly defaultLanguage: string;
  };

  readonly education: {
    /** Key concepts the learner should understand. Minimum 1. */
    readonly keyConcepts: readonly EducationEntry[];
    /** Common mistakes and misconceptions. */
    readonly pitfalls: readonly EducationEntry[];
    /** Self-assessment quiz questions. */
    readonly quiz: readonly QuizQuestion[];
    /** External learning resources. */
    readonly resources: readonly ResourceLink[];
  };

  readonly seo: {
    /** Search engine keywords for this algorithm. */
    readonly keywords: readonly string[];
    /** Open Graph description override (≤160 chars). */
    readonly ogDescription: string;
  };

  /**
   * IDs of algorithms that should be understood before this one.
   * Used for "Prerequisites" section and internal linking.
   *
   * @example ["binary-search"] for quicksort (understanding divide-and-conquer)
   */
  readonly prerequisites: readonly string[];

  /**
   * IDs of related algorithms. Used for "Related" section and internal linking.
   *
   * @example ["bubble-sort", "merge-sort"] for quicksort
   */
  readonly related: readonly string[];

  /** GitHub username of the primary author/contributor. */
  readonly author: string;

  /** Semantic version string (e.g., "1.0.0"). */
  readonly version: string;
}
