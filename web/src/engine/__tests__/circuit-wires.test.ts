/**
 * @fileoverview Tests for circuit-wires layout.
 *
 * These tests verify that the circuit-wires layout produces the correct
 * quantum circuit diagram structure, including horizontal qubit wires,
 * gate boxes, control-target connections for multi-qubit gates (CNOT),
 * qubit labels, and active gate highlighting. Tests also verify stable
 * IDs and coordinate validity for smooth animation.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { getLayout } from "../layouts/registry";
import type {
  Step,
  CanvasSize,
  LayoutFunction,
  ElementPrimitive,
  ConnectionPrimitive,
  AnnotationPrimitive,
  ContainerPrimitive,
} from "../types";

// Import the layout module to trigger self-registration.
import "../layouts/circuit-wires";

const mockCanvasSize: CanvasSize = { width: 800, height: 600 };

describe("circuit-wires layout", () => {
  let layout: LayoutFunction;

  beforeEach(() => {
    layout = getLayout("circuit-wires")!;
    expect(layout).toBeDefined();
  });

  describe("registration", () => {
    it("is registered and retrievable by name", () => {
      const fn = getLayout("circuit-wires");
      expect(fn).toBeDefined();
      expect(typeof fn).toBe("function");
    });
  });

  describe("basic rendering", () => {
    it("renders qubit wires and a single-qubit gate (H on qubit 0)", () => {
      const step: Step = {
        index: 0,
        id: "step-1",
        title: "Apply Hadamard",
        explanation: "Applying H gate to qubit 0.",
        state: {
          numQubits: 2,
          gates: [{ gate: "H", qubits: [0], column: 0 }],
          currentGateIndex: 0,
        },
        visualActions: [{ type: "applyGate", gate: "H", qubits: [0] }],
        codeHighlight: { language: "pseudocode", lines: [] },
        isTerminal: false,
      };

      const scene = layout(step, mockCanvasSize, {});

      // Scene should produce primitives.
      expect(scene.primitives.length).toBeGreaterThan(0);

      // Verify qubit wires exist for both qubits.
      const wire0 = scene.primitives.find((p) => p.id === "qubit-wire-0") as ConnectionPrimitive;
      const wire1 = scene.primitives.find((p) => p.id === "qubit-wire-1") as ConnectionPrimitive;
      expect(wire0).toBeDefined();
      expect(wire1).toBeDefined();
      expect(wire0.kind).toBe("connection");
      expect(wire1.kind).toBe("connection");

      // Verify qubit labels exist.
      const label0 = scene.primitives.find((p) => p.id === "qubit-label-0") as AnnotationPrimitive;
      const label1 = scene.primitives.find((p) => p.id === "qubit-label-1") as AnnotationPrimitive;
      expect(label0).toBeDefined();
      expect(label0.text).toBe("|q0\u27E9");
      expect(label1).toBeDefined();
      expect(label1.text).toBe("|q1\u27E9");

      // Verify gate box exists for the H gate (index 0).
      const gateBox = scene.primitives.find((p) => p.id === "gate-box-0") as ContainerPrimitive;
      expect(gateBox).toBeDefined();
      expect(gateBox.kind).toBe("container");

      // Verify gate label annotation exists.
      const gateLabel = scene.primitives.find(
        (p) => p.id === "gate-label-0",
      ) as AnnotationPrimitive;
      expect(gateLabel).toBeDefined();
      expect(gateLabel.text).toBe("H");
    });

    it("highlights the active gate with a different stroke color", () => {
      const step: Step = {
        index: 0,
        id: "step-1",
        title: "Active Gate",
        explanation: "The first gate should be highlighted as active.",
        state: {
          numQubits: 2,
          gates: [
            { gate: "H", qubits: [0], column: 0 },
            { gate: "X", qubits: [1], column: 1 },
          ],
          currentGateIndex: 0,
        },
        visualActions: [],
        codeHighlight: { language: "pseudocode", lines: [] },
        isTerminal: false,
      };

      const scene = layout(step, mockCanvasSize, {});

      // Active gate box (index 0) should have the active fill/stroke.
      const activeGateBox = scene.primitives.find(
        (p) => p.id === "gate-box-0",
      ) as ContainerPrimitive;
      expect(activeGateBox).toBeDefined();
      expect(activeGateBox.strokeWidth).toBe(2);

      // Non-active gate box (index 1) should have the default stroke.
      const futureGateBox = scene.primitives.find(
        (p) => p.id === "gate-box-1",
      ) as ContainerPrimitive;
      expect(futureGateBox).toBeDefined();
      expect(futureGateBox.strokeWidth).toBe(1);

      // Active and future gates should have different fill colors.
      expect(activeGateBox.fillColor).not.toBe(futureGateBox.fillColor);
    });

    it("renders the correct number of qubit wires", () => {
      const step: Step = {
        index: 0,
        id: "step-1",
        title: "Three Qubits",
        explanation: "Circuit with three qubit wires.",
        state: {
          numQubits: 3,
          gates: [],
          currentGateIndex: -1,
        },
        visualActions: [],
        codeHighlight: { language: "pseudocode", lines: [] },
        isTerminal: false,
      };

      const scene = layout(step, mockCanvasSize, {});

      const wires = scene.primitives.filter(
        (p) => p.kind === "connection" && p.id.startsWith("qubit-wire-"),
      );
      expect(wires.length).toBe(3);

      const labels = scene.primitives.filter(
        (p) => p.kind === "annotation" && p.id.startsWith("qubit-label-"),
      );
      expect(labels.length).toBe(3);
    });
  });

  describe("multi-qubit gates", () => {
    it("renders CNOT gate with control dot and target circle", () => {
      const step: Step = {
        index: 0,
        id: "step-1",
        title: "Apply CNOT",
        explanation: "Applying CNOT gate with control on qubit 0 and target on qubit 1.",
        state: {
          numQubits: 2,
          gates: [{ gate: "CNOT", qubits: [0, 1], column: 0 }],
          currentGateIndex: 0,
        },
        visualActions: [{ type: "applyGate", gate: "CNOT", qubits: [0, 1] }],
        codeHighlight: { language: "pseudocode", lines: [] },
        isTerminal: false,
      };

      const scene = layout(step, mockCanvasSize, {});

      // CNOT should produce a control dot on qubit 0.
      const controlDot = scene.primitives.find(
        (p) => p.id === "gate-ctrl-dot-0-0",
      ) as ElementPrimitive;
      expect(controlDot).toBeDefined();
      expect(controlDot.kind).toBe("element");
      expect(controlDot.shape).toBe("circle");

      // CNOT should produce a target symbol (circle with XOR) on qubit 1.
      const targetCircle = scene.primitives.find(
        (p) => p.id === "gate-target-0",
      ) as ElementPrimitive;
      expect(targetCircle).toBeDefined();
      expect(targetCircle.kind).toBe("element");
      expect(targetCircle.shape).toBe("circle");
      expect(targetCircle.label).toBe("\u2295"); // XOR symbol

      // Vertical connecting line between control and target.
      const controlLine = scene.primitives.find(
        (p) => p.id === "gate-ctrl-line-0",
      ) as ConnectionPrimitive;
      expect(controlLine).toBeDefined();
      expect(controlLine.kind).toBe("connection");
    });

    it("renders CZ gate with two control dots (no XOR target)", () => {
      const step: Step = {
        index: 0,
        id: "step-1",
        title: "Apply CZ",
        explanation: "Applying CZ gate between qubit 0 and qubit 1.",
        state: {
          numQubits: 2,
          gates: [{ gate: "CZ", qubits: [0, 1], column: 0 }],
          currentGateIndex: 0,
        },
        visualActions: [],
        codeHighlight: { language: "pseudocode", lines: [] },
        isTerminal: false,
      };

      const scene = layout(step, mockCanvasSize, {});

      // CZ has a control dot on qubit 0.
      const controlDot = scene.primitives.find(
        (p) => p.id === "gate-ctrl-dot-0-0",
      ) as ElementPrimitive;
      expect(controlDot).toBeDefined();
      expect(controlDot.shape).toBe("circle");

      // CZ target is also a filled dot (not a circle with XOR).
      const targetDot = scene.primitives.find((p) => p.id === "gate-target-0") as ElementPrimitive;
      expect(targetDot).toBeDefined();
      expect(targetDot.shape).toBe("circle");
      // CZ target should be filled (not transparent).
      expect(targetDot.fillColor).not.toBe("transparent");
    });

    it("renders SWAP gate with two X marks and a connecting line", () => {
      const step: Step = {
        index: 0,
        id: "step-1",
        title: "Apply SWAP",
        explanation: "Applying SWAP gate between qubit 0 and qubit 1.",
        state: {
          numQubits: 2,
          gates: [{ gate: "SWAP", qubits: [0, 1], column: 0 }],
          currentGateIndex: 0,
        },
        visualActions: [],
        codeHighlight: { language: "pseudocode", lines: [] },
        isTerminal: false,
      };

      const scene = layout(step, mockCanvasSize, {});

      // SWAP should produce two X marks.
      const swapX0 = scene.primitives.find((p) => p.id === "gate-swap-x-0-0") as ElementPrimitive;
      const swapX1 = scene.primitives.find((p) => p.id === "gate-swap-x-0-1") as ElementPrimitive;
      expect(swapX0).toBeDefined();
      expect(swapX1).toBeDefined();

      // Vertical connecting line.
      const swapLine = scene.primitives.find(
        (p) => p.id === "gate-swap-line-0",
      ) as ConnectionPrimitive;
      expect(swapLine).toBeDefined();
    });
  });

  describe("multiple gates", () => {
    it("renders multiple gates in sequence at different columns", () => {
      const step: Step = {
        index: 1,
        id: "step-2",
        title: "Two Gates",
        explanation: "Circuit with H on qubit 0 and X on qubit 1.",
        state: {
          numQubits: 2,
          gates: [
            { gate: "H", qubits: [0], column: 0 },
            { gate: "X", qubits: [1], column: 1 },
          ],
          currentGateIndex: 1,
        },
        visualActions: [],
        codeHighlight: { language: "pseudocode", lines: [] },
        isTerminal: false,
      };

      const scene = layout(step, mockCanvasSize, {});

      // Both gate boxes should exist.
      const gateBox0 = scene.primitives.find((p) => p.id === "gate-box-0") as ContainerPrimitive;
      const gateBox1 = scene.primitives.find((p) => p.id === "gate-box-1") as ContainerPrimitive;
      expect(gateBox0).toBeDefined();
      expect(gateBox1).toBeDefined();

      // Gate labels should match.
      const gateLabel0 = scene.primitives.find(
        (p) => p.id === "gate-label-0",
      ) as AnnotationPrimitive;
      const gateLabel1 = scene.primitives.find(
        (p) => p.id === "gate-label-1",
      ) as AnnotationPrimitive;
      expect(gateLabel0).toBeDefined();
      expect(gateLabel0.text).toBe("H");
      expect(gateLabel1).toBeDefined();
      expect(gateLabel1.text).toBe("X");
    });
  });

  describe("classical wire rendering", () => {
    it("renders classical wire and measurement gate when classicalBits are present", () => {
      const step: Step = {
        index: 0,
        id: "step-1",
        title: "Measurement",
        explanation: "Measuring qubit 0 into classical register.",
        state: {
          numQubits: 1,
          gates: [{ gate: "M", qubits: [0], column: 0 }],
          currentGateIndex: 0,
          classicalBits: [1],
        },
        visualActions: [],
        codeHighlight: { language: "pseudocode", lines: [] },
        isTerminal: true,
      };

      const scene = layout(step, mockCanvasSize, {});

      // Measurement gate box should exist with label "M".
      const mGateBox = scene.primitives.find((p) => p.id === "gate-box-0") as ContainerPrimitive;
      expect(mGateBox).toBeDefined();
      expect(mGateBox.label).toBe("M");

      // Classical wire (double line) should exist.
      const classicalWireTop = scene.primitives.find(
        (p) => p.id === "classical-wire-top",
      ) as ConnectionPrimitive;
      const classicalWireBottom = scene.primitives.find(
        (p) => p.id === "classical-wire-bottom",
      ) as ConnectionPrimitive;
      expect(classicalWireTop).toBeDefined();
      expect(classicalWireBottom).toBeDefined();

      // Classical register label.
      const classicalLabel = scene.primitives.find(
        (p) => p.id === "classical-label",
      ) as AnnotationPrimitive;
      expect(classicalLabel).toBeDefined();
      expect(classicalLabel.text).toBe("c");

      // Classical bit value badge.
      const bitBadge = scene.primitives.find(
        (p) => p.id === "classical-bit-0",
      ) as AnnotationPrimitive;
      expect(bitBadge).toBeDefined();
      expect(bitBadge.text).toBe("1");
      expect(bitBadge.form).toBe("badge");
    });
  });

  describe("edge cases", () => {
    it("renders an empty circuit with just qubit wires and labels", () => {
      const step: Step = {
        index: 0,
        id: "step-1",
        title: "Empty Circuit",
        explanation: "No gates in the circuit.",
        state: {
          numQubits: 2,
          gates: [],
          currentGateIndex: -1,
        },
        visualActions: [],
        codeHighlight: { language: "pseudocode", lines: [] },
        isTerminal: true,
      };

      const scene = layout(step, mockCanvasSize, {});

      // Should still produce qubit wires and labels.
      const wires = scene.primitives.filter(
        (p) => p.kind === "connection" && p.id.startsWith("qubit-wire-"),
      );
      expect(wires.length).toBe(2);

      // No gate boxes should exist.
      const gateBoxes = scene.primitives.filter((p) => p.id.startsWith("gate-box-"));
      expect(gateBoxes.length).toBe(0);
    });

    it("silently ignores unknown visual action types", () => {
      const step: Step = {
        index: 0,
        id: "step-1",
        title: "Unknown Action",
        explanation: "Step with unknown action type.",
        state: {
          numQubits: 2,
          gates: [{ gate: "H", qubits: [0], column: 0 }],
          currentGateIndex: 0,
        },
        visualActions: [{ type: "unknownQuantumAction", payload: "test" }],
        codeHighlight: { language: "pseudocode", lines: [] },
        isTerminal: false,
      };

      // Should not throw.
      const scene = layout(step, mockCanvasSize, {});
      expect(scene.primitives.length).toBeGreaterThan(0);
    });
  });

  describe("ID uniqueness and coordinate validity", () => {
    it("all primitive IDs are unique within a scene", () => {
      const step: Step = {
        index: 0,
        id: "step-1",
        title: "Unique IDs",
        explanation: "Checking all IDs are unique in a complex circuit.",
        state: {
          numQubits: 3,
          gates: [
            { gate: "H", qubits: [0], column: 0 },
            { gate: "CNOT", qubits: [0, 1], column: 1 },
            { gate: "X", qubits: [2], column: 1 },
            { gate: "M", qubits: [0], column: 2 },
          ],
          currentGateIndex: 1,
          classicalBits: [null],
        },
        visualActions: [],
        codeHighlight: { language: "pseudocode", lines: [] },
        isTerminal: false,
      };

      const scene = layout(step, mockCanvasSize, {});
      const ids = scene.primitives.map((p) => p.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it("all primitives have finite coordinates", () => {
      const step: Step = {
        index: 0,
        id: "step-1",
        title: "Finite Coords",
        explanation: "All coordinates should be finite numbers.",
        state: {
          numQubits: 2,
          gates: [
            { gate: "H", qubits: [0], column: 0 },
            { gate: "CNOT", qubits: [0, 1], column: 1 },
          ],
          currentGateIndex: 0,
        },
        visualActions: [],
        codeHighlight: { language: "pseudocode", lines: [] },
        isTerminal: false,
      };

      const scene = layout(step, mockCanvasSize, {});

      for (const prim of scene.primitives) {
        if (prim.kind === "element") {
          const el = prim as ElementPrimitive;
          expect(Number.isFinite(el.x)).toBe(true);
          expect(Number.isFinite(el.y)).toBe(true);
          expect(Number.isFinite(el.width)).toBe(true);
          expect(Number.isFinite(el.height)).toBe(true);
        } else if (prim.kind === "annotation") {
          const ann = prim as AnnotationPrimitive;
          expect(Number.isFinite(ann.x)).toBe(true);
          expect(Number.isFinite(ann.y)).toBe(true);
        } else if (prim.kind === "connection") {
          const conn = prim as ConnectionPrimitive;
          expect(Number.isFinite(conn.x1)).toBe(true);
          expect(Number.isFinite(conn.y1)).toBe(true);
          expect(Number.isFinite(conn.x2)).toBe(true);
          expect(Number.isFinite(conn.y2)).toBe(true);
        } else if (prim.kind === "container") {
          const cont = prim as ContainerPrimitive;
          expect(Number.isFinite(cont.x)).toBe(true);
          expect(Number.isFinite(cont.y)).toBe(true);
          expect(Number.isFinite(cont.width)).toBe(true);
          expect(Number.isFinite(cont.height)).toBe(true);
        }
      }
    });

    it("produces stable IDs across identical steps", () => {
      const step: Step = {
        index: 0,
        id: "step-1",
        title: "Stable IDs",
        explanation: "Same step should produce the same IDs.",
        state: {
          numQubits: 2,
          gates: [{ gate: "H", qubits: [0], column: 0 }],
          currentGateIndex: 0,
        },
        visualActions: [],
        codeHighlight: { language: "pseudocode", lines: [] },
        isTerminal: false,
      };

      const scene1 = layout(step, mockCanvasSize, {});
      const scene2 = layout(step, mockCanvasSize, {});

      const ids1 = scene1.primitives.map((p) => p.id).sort();
      const ids2 = scene2.primitives.map((p) => p.id).sort();

      expect(ids1).toEqual(ids2);
    });
  });
});
