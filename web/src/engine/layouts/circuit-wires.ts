// =============================================================================
// web/src/engine/layouts/circuit-wires.ts
//
// Layout for rendering a quantum circuit diagram. Draws horizontal qubit wires,
// gate boxes, control dots, target symbols, measurement symbols, classical wires,
// and highlights the currently active gate.
//
// State fields:
//   - numQubits: number
//   - gates: Array<{gate: string, qubits: number[], column: number, angle?: number}>
//   - currentGateIndex: number  (which gate is active)
//   - classicalBits: (0|1|null)[]
//
// Self-registers with the layout registry on module load.
// =============================================================================

import type {
  Step,
  CanvasSize,
  PrimitiveScene,
  RenderPrimitive,
  ElementPrimitive,
  ConnectionPrimitive,
  AnnotationPrimitive,
  ContainerPrimitive,
} from "../types";

import { LAYOUT_PADDING, Z_INDEX } from "../types";
import { registerLayout } from "./registry";

// -- Constants ----------------------------------------------------------------

const DEFAULT_WIRE_SPACING = 60;
const DEFAULT_GATE_SPACING = 80;
const DEFAULT_GATE_SIZE = 40;
const DEFAULT_MARGIN_LEFT = 60;
const DEFAULT_MARGIN_TOP = 40;

const THEME = {
  wireColor: "#4a5568",
  wireActiveColor: "#00ffc8",
  gateBoxFill: "#1e293b",
  gateBoxStroke: "#64748b",
  gateBoxLabel: "#e2e8f0",
  gateActiveStroke: "#00ffc8",
  gateActiveFill: "#0f3d33",
  gateFutureFill: "#1e293b",
  controlDotColor: "#e2e8f0",
  controlActiveColor: "#00ffc8",
  targetCircleStroke: "#e2e8f0",
  targetActiveStroke: "#00ffc8",
  measurementFill: "#1e293b",
  measurementStroke: "#64748b",
  measurementLabel: "#e2e8f0",
  classicalWireColor: "#94a3b8",
  classicalBitColor: "#e2e8f0",
  qubitLabelColor: "#94a3b8",
  dimOpacity: 0.4,
  verticalLineColor: "#94a3b8",
} as const;

// Gate types that use control-target rendering
const CONTROLLED_GATES = new Set(["CNOT", "CZ", "Toffoli"]);
const SWAP_GATE = "SWAP";
const MEASUREMENT_GATE = "M";

// -- Helpers ------------------------------------------------------------------

interface GateEntry {
  gate: string;
  qubits: number[];
  column: number;
  angle?: number;
}

// -- Layout Function ----------------------------------------------------------

/**
 * The circuit-wires layout function.
 *
 * Renders a quantum circuit diagram with horizontal qubit wires, gate boxes,
 * multi-qubit gate connections, measurement symbols, and classical wires.
 */
function circuitWiresLayout(
  step: Step,
  canvasSize: CanvasSize,
  _config: Record<string, unknown>,
): PrimitiveScene {
  const primitives: RenderPrimitive[] = [];
  const state = step.state as Record<string, unknown>;

  // -- Read state -------------------------------------------------------------

  const numQubits = (state.numQubits as number) ?? 2;
  const gates = (state.gates as GateEntry[]) ?? [];
  const currentGateIndex = (state.currentGateIndex as number) ?? -1;
  const classicalBits = (state.classicalBits as (0 | 1 | null)[]) ?? [];

  // -- Read config with defaults ----------------------------------------------

  const wireSpacing = DEFAULT_WIRE_SPACING;
  const gateSpacing = DEFAULT_GATE_SPACING;
  const gateSize = DEFAULT_GATE_SIZE;
  const marginLeft = DEFAULT_MARGIN_LEFT;
  const marginTop = DEFAULT_MARGIN_TOP;

  // -- Compute geometry -------------------------------------------------------

  const _usableWidth = canvasSize.width - 2 * LAYOUT_PADDING;
  const _usableHeight = canvasSize.height - 2 * LAYOUT_PADDING;

  const circuitLeft = LAYOUT_PADDING + marginLeft;
  const circuitTop = LAYOUT_PADDING + marginTop;

  // Find the maximum column index for wire length
  let maxColumn = 0;
  for (const g of gates) {
    if (g.column > maxColumn) maxColumn = g.column;
  }
  const wireEndX = circuitLeft + (maxColumn + 2) * gateSpacing;
  const clampedWireEndX = Math.min(wireEndX, canvasSize.width - LAYOUT_PADDING);

  // Classical wire Y position (below all qubit wires)
  const classicalWireY = circuitTop + numQubits * wireSpacing + 20;

  // -- 1. Qubit labels (|q0>, |q1>, ...) --------------------------------------

  for (let q = 0; q < numQubits; q++) {
    const wireY = circuitTop + q * wireSpacing;

    const qubitLabel: AnnotationPrimitive = {
      kind: "annotation",
      id: `qubit-label-${q}`,
      form: "label",
      x: LAYOUT_PADDING + marginLeft / 2,
      y: wireY,
      text: `|q${q}\u27E9`,
      fontSize: 13,
      textColor: THEME.qubitLabelColor,
      color: THEME.qubitLabelColor,
      pointerHeight: 0,
      pointerWidth: 0,
      bracketWidth: 0,
      bracketTickHeight: 0,
      badgePaddingX: 0,
      badgePaddingY: 0,
      opacity: 1,
      zIndex: Z_INDEX.ANNOTATION,
    };
    primitives.push(qubitLabel);
  }

  // -- 2. Horizontal qubit wires ----------------------------------------------

  for (let q = 0; q < numQubits; q++) {
    const wireY = circuitTop + q * wireSpacing;

    const wire: ConnectionPrimitive = {
      kind: "connection",
      id: `qubit-wire-${q}`,
      x1: circuitLeft,
      y1: wireY,
      x2: clampedWireEndX,
      y2: wireY,
      curveOffset: 0,
      color: THEME.wireColor,
      lineWidth: 1.5,
      dashPattern: [],
      arrowHead: "none",
      arrowSize: 0,
      label: "",
      labelFontSize: 0,
      labelColor: "transparent",
      opacity: 1,
      zIndex: Z_INDEX.CONNECTION,
    };
    primitives.push(wire);
  }

  // -- 3. Gate rendering ------------------------------------------------------

  for (let gi = 0; gi < gates.length; gi++) {
    const g = gates[gi]!;
    const isActive = gi === currentGateIndex;
    const isFuture = gi > currentGateIndex && currentGateIndex >= 0;
    const gateX = circuitLeft + (g.column + 1) * gateSpacing;
    const baseOpacity = isFuture ? THEME.dimOpacity : 1;

    if (g.gate === MEASUREMENT_GATE) {
      // -- Measurement gate: container box with "M" label -------------------

      const qubitIdx = g.qubits[0] ?? 0;
      const wireY = circuitTop + qubitIdx * wireSpacing;

      const mBox: ContainerPrimitive = {
        kind: "container",
        id: `gate-box-${gi}`,
        x: gateX,
        y: wireY,
        width: gateSize,
        height: gateSize,
        cornerRadius: 4,
        fillColor: isActive ? THEME.gateActiveFill : THEME.measurementFill,
        strokeColor: isActive ? THEME.gateActiveStroke : THEME.measurementStroke,
        strokeWidth: isActive ? 2 : 1,
        dashPattern: [],
        label: "M",
        labelFontSize: 16,
        labelColor: THEME.measurementLabel,
        opacity: baseOpacity,
        zIndex: Z_INDEX.CONTAINER + 2,
      };
      primitives.push(mBox);

      // Classical wire from measurement to classical register
      if (classicalBits.length > 0) {
        const classicalLine: ConnectionPrimitive = {
          kind: "connection",
          id: `meas-classical-${gi}`,
          x1: gateX,
          y1: wireY + gateSize / 2,
          x2: gateX,
          y2: classicalWireY,
          curveOffset: 0,
          color: THEME.classicalWireColor,
          lineWidth: 1,
          dashPattern: [3, 3],
          arrowHead: "end",
          arrowSize: 5,
          label: "",
          labelFontSize: 0,
          labelColor: "transparent",
          opacity: baseOpacity,
          zIndex: Z_INDEX.CONNECTION + 1,
        };
        primitives.push(classicalLine);
      }
    } else if (g.gate === SWAP_GATE) {
      // -- SWAP gate: two X marks connected by a vertical line ----------------

      const q0 = g.qubits[0] ?? 0;
      const q1 = g.qubits[1] ?? 1;
      const y0 = circuitTop + q0 * wireSpacing;
      const y1 = circuitTop + q1 * wireSpacing;
      const swapMarkSize = 8;

      // Vertical connecting line
      const swapLine: ConnectionPrimitive = {
        kind: "connection",
        id: `gate-swap-line-${gi}`,
        x1: gateX,
        y1: y0,
        x2: gateX,
        y2: y1,
        curveOffset: 0,
        color: isActive ? THEME.controlActiveColor : THEME.verticalLineColor,
        lineWidth: 1.5,
        dashPattern: [],
        arrowHead: "none",
        arrowSize: 0,
        label: "",
        labelFontSize: 0,
        labelColor: "transparent",
        opacity: baseOpacity,
        zIndex: Z_INDEX.CONNECTION + 1,
      };
      primitives.push(swapLine);

      // SWAP cross marks (X shapes rendered as two diamonds)
      for (let si = 0; si < 2; si++) {
        const sy = si === 0 ? y0 : y1;

        const swapMark: ElementPrimitive = {
          kind: "element",
          id: `gate-swap-x-${gi}-${si}`,
          x: gateX,
          y: sy,
          width: swapMarkSize * 2,
          height: swapMarkSize * 2,
          shape: "diamond",
          cornerRadius: 0,
          fillColor: "transparent",
          strokeColor: isActive ? THEME.controlActiveColor : THEME.targetCircleStroke,
          strokeWidth: 2,
          label: "\u00D7",
          labelFontSize: 14,
          labelColor: isActive ? THEME.controlActiveColor : THEME.targetCircleStroke,
          subLabel: "",
          subLabelFontSize: 0,
          subLabelColor: "transparent",
          rotation: 0,
          opacity: baseOpacity,
          zIndex: Z_INDEX.ELEMENT + 1,
        };
        primitives.push(swapMark);
      }
    } else if (CONTROLLED_GATES.has(g.gate)) {
      // -- Controlled gates (CNOT, CZ, Toffoli) --------------------------------

      // Last qubit is target; all others are controls
      const controlQubits = g.qubits.slice(0, -1);
      const targetQubit = g.qubits[g.qubits.length - 1] ?? 0;

      const allQubits = g.qubits;
      const minQubit = Math.min(...allQubits);
      const maxQubit = Math.max(...allQubits);
      const yMin = circuitTop + minQubit * wireSpacing;
      const yMax = circuitTop + maxQubit * wireSpacing;

      // Vertical connecting line between control and target
      const controlLine: ConnectionPrimitive = {
        kind: "connection",
        id: `gate-ctrl-line-${gi}`,
        x1: gateX,
        y1: yMin,
        x2: gateX,
        y2: yMax,
        curveOffset: 0,
        color: isActive ? THEME.controlActiveColor : THEME.verticalLineColor,
        lineWidth: 1.5,
        dashPattern: [],
        arrowHead: "none",
        arrowSize: 0,
        label: "",
        labelFontSize: 0,
        labelColor: "transparent",
        opacity: baseOpacity,
        zIndex: Z_INDEX.CONNECTION + 1,
      };
      primitives.push(controlLine);

      // Control dots (filled circles)
      for (let ci = 0; ci < controlQubits.length; ci++) {
        const cq = controlQubits[ci]!;
        const cy = circuitTop + cq * wireSpacing;

        const controlDot: ElementPrimitive = {
          kind: "element",
          id: `gate-ctrl-dot-${gi}-${ci}`,
          x: gateX,
          y: cy,
          width: 10,
          height: 10,
          shape: "circle",
          cornerRadius: 0,
          fillColor: isActive ? THEME.controlActiveColor : THEME.controlDotColor,
          strokeColor: "transparent",
          strokeWidth: 0,
          label: "",
          labelFontSize: 0,
          labelColor: "transparent",
          subLabel: "",
          subLabelFontSize: 0,
          subLabelColor: "transparent",
          rotation: 0,
          opacity: baseOpacity,
          zIndex: Z_INDEX.ELEMENT + 2,
        };
        primitives.push(controlDot);
      }

      // Target symbol
      const targetY = circuitTop + targetQubit * wireSpacing;

      if (g.gate === "CZ") {
        // CZ: control dot on target too
        const czDot: ElementPrimitive = {
          kind: "element",
          id: `gate-target-${gi}`,
          x: gateX,
          y: targetY,
          width: 10,
          height: 10,
          shape: "circle",
          cornerRadius: 0,
          fillColor: isActive ? THEME.controlActiveColor : THEME.controlDotColor,
          strokeColor: "transparent",
          strokeWidth: 0,
          label: "",
          labelFontSize: 0,
          labelColor: "transparent",
          subLabel: "",
          subLabelFontSize: 0,
          subLabelColor: "transparent",
          rotation: 0,
          opacity: baseOpacity,
          zIndex: Z_INDEX.ELEMENT + 2,
        };
        primitives.push(czDot);
      } else {
        // CNOT / Toffoli: target circle with cross (XOR symbol)
        const targetCircle: ElementPrimitive = {
          kind: "element",
          id: `gate-target-${gi}`,
          x: gateX,
          y: targetY,
          width: gateSize * 0.7,
          height: gateSize * 0.7,
          shape: "circle",
          cornerRadius: 0,
          fillColor: "transparent",
          strokeColor: isActive ? THEME.targetActiveStroke : THEME.targetCircleStroke,
          strokeWidth: 2,
          label: "\u2295",
          labelFontSize: 18,
          labelColor: isActive ? THEME.targetActiveStroke : THEME.targetCircleStroke,
          subLabel: "",
          subLabelFontSize: 0,
          subLabelColor: "transparent",
          rotation: 0,
          opacity: baseOpacity,
          zIndex: Z_INDEX.ELEMENT + 2,
        };
        primitives.push(targetCircle);
      }
    } else {
      // -- Standard single-qubit (or generic) gate box -------------------------

      const qubitIdx = g.qubits[0] ?? 0;
      const wireY = circuitTop + qubitIdx * wireSpacing;

      // Gate label: include angle for rotation gates
      let gateLabel = g.gate;
      if (g.angle !== undefined && (g.gate === "Rx" || g.gate === "Ry" || g.gate === "Rz")) {
        // Display angle as fraction of pi if it's a nice fraction
        const piRatio = g.angle / Math.PI;
        if (Math.abs(piRatio - Math.round(piRatio)) < 0.01 && Math.round(piRatio) !== 0) {
          gateLabel = `${g.gate}(${Math.round(piRatio)}\u03C0)`;
        } else if (Math.abs(piRatio * 2 - Math.round(piRatio * 2)) < 0.01) {
          gateLabel = `${g.gate}(\u03C0/${Math.round(2 / piRatio)})`;
        } else {
          gateLabel = `${g.gate}(${g.angle.toFixed(2)})`;
        }
      }

      const gateBox: ContainerPrimitive = {
        kind: "container",
        id: `gate-box-${gi}`,
        x: gateX,
        y: wireY,
        width: gateSize,
        height: gateSize,
        cornerRadius: 4,
        fillColor: isActive ? THEME.gateActiveFill : THEME.gateBoxFill,
        strokeColor: isActive ? THEME.gateActiveStroke : THEME.gateBoxStroke,
        strokeWidth: isActive ? 2 : 1,
        dashPattern: [],
        label: "",
        labelFontSize: 0,
        labelColor: "transparent",
        opacity: baseOpacity,
        zIndex: Z_INDEX.CONTAINER + 2,
      };
      primitives.push(gateBox);

      // Gate label annotation (drawn on top of the box)
      const gateLabelAnn: AnnotationPrimitive = {
        kind: "annotation",
        id: `gate-label-${gi}`,
        form: "label",
        x: gateX,
        y: wireY,
        text: gateLabel,
        fontSize: gateLabel.length > 4 ? 11 : 14,
        textColor: isActive ? THEME.gateActiveStroke : THEME.gateBoxLabel,
        color: isActive ? THEME.gateActiveStroke : THEME.gateBoxLabel,
        pointerHeight: 0,
        pointerWidth: 0,
        bracketWidth: 0,
        bracketTickHeight: 0,
        badgePaddingX: 0,
        badgePaddingY: 0,
        opacity: baseOpacity,
        zIndex: Z_INDEX.ANNOTATION + 1,
      };
      primitives.push(gateLabelAnn);
    }
  }

  // -- 4. Classical wire (double line) ----------------------------------------

  if (classicalBits.length > 0) {
    // Top classical wire
    const classicalWireTop: ConnectionPrimitive = {
      kind: "connection",
      id: "classical-wire-top",
      x1: circuitLeft,
      y1: classicalWireY - 1.5,
      x2: clampedWireEndX,
      y2: classicalWireY - 1.5,
      curveOffset: 0,
      color: THEME.classicalWireColor,
      lineWidth: 1,
      dashPattern: [],
      arrowHead: "none",
      arrowSize: 0,
      label: "",
      labelFontSize: 0,
      labelColor: "transparent",
      opacity: 0.7,
      zIndex: Z_INDEX.CONNECTION,
    };
    primitives.push(classicalWireTop);

    // Bottom classical wire
    const classicalWireBottom: ConnectionPrimitive = {
      kind: "connection",
      id: "classical-wire-bottom",
      x1: circuitLeft,
      y1: classicalWireY + 1.5,
      x2: clampedWireEndX,
      y2: classicalWireY + 1.5,
      curveOffset: 0,
      color: THEME.classicalWireColor,
      lineWidth: 1,
      dashPattern: [],
      arrowHead: "none",
      arrowSize: 0,
      label: "",
      labelFontSize: 0,
      labelColor: "transparent",
      opacity: 0.7,
      zIndex: Z_INDEX.CONNECTION,
    };
    primitives.push(classicalWireBottom);

    // Classical register label
    const classicalLabel: AnnotationPrimitive = {
      kind: "annotation",
      id: "classical-label",
      form: "label",
      x: LAYOUT_PADDING + marginLeft / 2,
      y: classicalWireY,
      text: "c",
      fontSize: 13,
      textColor: THEME.classicalWireColor,
      color: THEME.classicalWireColor,
      pointerHeight: 0,
      pointerWidth: 0,
      bracketWidth: 0,
      bracketTickHeight: 0,
      badgePaddingX: 0,
      badgePaddingY: 0,
      opacity: 0.7,
      zIndex: Z_INDEX.ANNOTATION,
    };
    primitives.push(classicalLabel);

    // -- 5. Classical bit value display ----------------------------------------

    for (let bi = 0; bi < classicalBits.length; bi++) {
      const bitVal = classicalBits[bi];
      if (bitVal !== null && bitVal !== undefined) {
        const bitX = clampedWireEndX + 20 + bi * 25;

        const bitLabel: AnnotationPrimitive = {
          kind: "annotation",
          id: `classical-bit-${bi}`,
          form: "badge",
          x: bitX,
          y: classicalWireY,
          text: String(bitVal),
          fontSize: 12,
          textColor: THEME.classicalBitColor,
          color: THEME.classicalWireColor,
          pointerHeight: 0,
          pointerWidth: 0,
          bracketWidth: 0,
          bracketTickHeight: 0,
          badgePaddingX: 6,
          badgePaddingY: 3,
          opacity: 1,
          zIndex: Z_INDEX.ANNOTATION,
        };
        primitives.push(bitLabel);
      }
    }
  }

  return { primitives };
}

// -- Registration -------------------------------------------------------------

registerLayout({
  name: "circuit-wires",
  description:
    "Quantum circuit diagram with horizontal qubit wires, gate boxes, " +
    "control-target connections, measurements, and classical register.",
  layout: circuitWiresLayout,
});
