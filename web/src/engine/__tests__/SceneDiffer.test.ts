/**
 * @fileoverview Tests for SceneDiffer.
 *
 * The SceneDiffer matches primitives between two scenes by ID and classifies
 * each as stable, entering, or exiting. This is the foundation for smooth
 * animated transitions between algorithm steps.
 */

import { describe, it, expect } from "vitest";
import { diffScenes } from "../animation/SceneDiffer";
import type { PrimitiveScene, ElementPrimitive } from "../types";

describe("diffScenes", () => {
  describe("empty scenes", () => {
    it("returns zero transitions for empty-to-empty", () => {
      const source: PrimitiveScene = { primitives: [] };
      const target: PrimitiveScene = { primitives: [] };

      const plan = diffScenes(source, target);

      expect(plan.transitions).toEqual([]);
    });
  });

  describe("all entering", () => {
    it("marks all primitives as entering when source is empty", () => {
      const source: PrimitiveScene = { primitives: [] };

      const elem1: ElementPrimitive = {
        kind: "element",
        id: "cell-0",
        x: 100,
        y: 100,
        width: 50,
        height: 50,
        shape: "rect",
        cornerRadius: 0,
        fillColor: "#ff0000",
        strokeColor: "#000",
        strokeWidth: 1,
        label: "A",
        labelFontSize: 12,
        labelColor: "#fff",
        subLabel: "",
        subLabelFontSize: 10,
        subLabelColor: "#666",
        rotation: 0,
        opacity: 1,
        zIndex: 10,
      };

      const elem2: ElementPrimitive = {
        ...elem1,
        id: "cell-1",
        x: 200,
        label: "B",
      };

      const target: PrimitiveScene = { primitives: [elem1, elem2] };

      const plan = diffScenes(source, target);

      expect(plan.transitions.length).toBe(2);

      const trans0 = plan.transitions.find(t => t.id === "cell-0");
      const trans1 = plan.transitions.find(t => t.id === "cell-1");

      expect(trans0?.state).toBe("entering");
      expect(trans0?.from).toBeNull();
      expect(trans0?.to).toBe(elem1);

      expect(trans1?.state).toBe("entering");
      expect(trans1?.from).toBeNull();
      expect(trans1?.to).toBe(elem2);
    });
  });

  describe("all exiting", () => {
    it("marks all primitives as exiting when target is empty", () => {
      const elem1: ElementPrimitive = {
        kind: "element",
        id: "cell-0",
        x: 100,
        y: 100,
        width: 50,
        height: 50,
        shape: "rect",
        cornerRadius: 0,
        fillColor: "#ff0000",
        strokeColor: "#000",
        strokeWidth: 1,
        label: "A",
        labelFontSize: 12,
        labelColor: "#fff",
        subLabel: "",
        subLabelFontSize: 10,
        subLabelColor: "#666",
        rotation: 0,
        opacity: 1,
        zIndex: 10,
      };

      const elem2: ElementPrimitive = {
        ...elem1,
        id: "cell-1",
        x: 200,
        label: "B",
      };

      const source: PrimitiveScene = { primitives: [elem1, elem2] };
      const target: PrimitiveScene = { primitives: [] };

      const plan = diffScenes(source, target);

      expect(plan.transitions.length).toBe(2);

      const trans0 = plan.transitions.find(t => t.id === "cell-0");
      const trans1 = plan.transitions.find(t => t.id === "cell-1");

      expect(trans0?.state).toBe("exiting");
      expect(trans0?.from).toBe(elem1);
      expect(trans0?.to).toBeNull();

      expect(trans1?.state).toBe("exiting");
      expect(trans1?.from).toBe(elem2);
      expect(trans1?.to).toBeNull();
    });
  });

  describe("all stable", () => {
    it("marks primitives as stable when same IDs appear in both scenes", () => {
      const elem1Source: ElementPrimitive = {
        kind: "element",
        id: "cell-0",
        x: 100,
        y: 100,
        width: 50,
        height: 50,
        shape: "rect",
        cornerRadius: 0,
        fillColor: "#ff0000",
        strokeColor: "#000",
        strokeWidth: 1,
        label: "A",
        labelFontSize: 12,
        labelColor: "#fff",
        subLabel: "",
        subLabelFontSize: 10,
        subLabelColor: "#666",
        rotation: 0,
        opacity: 1,
        zIndex: 10,
      };

      const elem2Source: ElementPrimitive = {
        ...elem1Source,
        id: "cell-1",
        x: 200,
        label: "B",
      };

      // Target has the same IDs but potentially different properties
      const elem1Target: ElementPrimitive = {
        ...elem1Source,
        x: 150, // Changed position
        fillColor: "#00ff00", // Changed color
      };

      const elem2Target: ElementPrimitive = {
        ...elem2Source,
        x: 250, // Changed position
      };

      const source: PrimitiveScene = { primitives: [elem1Source, elem2Source] };
      const target: PrimitiveScene = { primitives: [elem1Target, elem2Target] };

      const plan = diffScenes(source, target);

      expect(plan.transitions.length).toBe(2);

      const trans0 = plan.transitions.find(t => t.id === "cell-0");
      const trans1 = plan.transitions.find(t => t.id === "cell-1");

      expect(trans0?.state).toBe("stable");
      expect(trans0?.from).toBe(elem1Source);
      expect(trans0?.to).toBe(elem1Target);

      expect(trans1?.state).toBe("stable");
      expect(trans1?.from).toBe(elem2Source);
      expect(trans1?.to).toBe(elem2Target);
    });
  });

  describe("mixed transitions", () => {
    it("correctly classifies A=exiting, B=stable, C=entering", () => {
      const elemA: ElementPrimitive = {
        kind: "element",
        id: "A",
        x: 100,
        y: 100,
        width: 50,
        height: 50,
        shape: "rect",
        cornerRadius: 0,
        fillColor: "#ff0000",
        strokeColor: "#000",
        strokeWidth: 1,
        label: "A",
        labelFontSize: 12,
        labelColor: "#fff",
        subLabel: "",
        subLabelFontSize: 10,
        subLabelColor: "#666",
        rotation: 0,
        opacity: 1,
        zIndex: 10,
      };

      const elemBSource: ElementPrimitive = {
        ...elemA,
        id: "B",
        x: 200,
        label: "B",
      };

      const elemBTarget: ElementPrimitive = {
        ...elemBSource,
        fillColor: "#00ff00", // Changed color
      };

      const elemC: ElementPrimitive = {
        ...elemA,
        id: "C",
        x: 300,
        label: "C",
      };

      // Source has A and B
      const source: PrimitiveScene = { primitives: [elemA, elemBSource] };

      // Target has B and C
      const target: PrimitiveScene = { primitives: [elemBTarget, elemC] };

      const plan = diffScenes(source, target);

      expect(plan.transitions.length).toBe(3);

      const transA = plan.transitions.find(t => t.id === "A");
      const transB = plan.transitions.find(t => t.id === "B");
      const transC = plan.transitions.find(t => t.id === "C");

      // A is only in source → exiting
      expect(transA?.state).toBe("exiting");
      expect(transA?.from).toBe(elemA);
      expect(transA?.to).toBeNull();

      // B is in both → stable
      expect(transB?.state).toBe("stable");
      expect(transB?.from).toBe(elemBSource);
      expect(transB?.to).toBe(elemBTarget);

      // C is only in target → entering
      expect(transC?.state).toBe("entering");
      expect(transC?.from).toBeNull();
      expect(transC?.to).toBe(elemC);
    });
  });
});
