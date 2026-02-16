/**
 * @fileoverview Gradient Descent Step Generator
 *
 * Runs an optimizer on a 2D loss surface for a fixed number of iterations,
 * visualizing the trajectory:
 *   1. Show initial position on loss landscape
 *   2. At each step: compute gradient -> apply optimizer -> show new position
 *   3. Track full trajectory of visited positions
 *
 * Mathematical basis: Section 4.6 of the Phase 9 specification.
 *
 * Supports three optimizers:
 *   - SGD: theta_{t+1} = theta_t - eta * grad_f(theta_t)
 *   - Momentum (Sutskever): v_{t+1} = beta * v_t + g_t; theta_{t+1} = theta_t - eta * v_{t+1}
 *   - Adam: bias-corrected adaptive moments, t starting at 1
 *
 * Loss surface: f(x, y) = x^2 + 3y^2 (elongated bowl -- reveals optimizer differences)
 * Gradient: grad_f = [2x, 6y]
 * Minimum at (0, 0).
 *
 * INVARIANTS:
 *   - Adam t starts at 1 (never 0)
 *   - Loss decreases over trajectory for convex surface
 *   - All three optimizers converge toward (0, 0)
 */

import { createGenerator } from "@/engine/generator";
import { sgdStep, momentumStep, adamStep } from "@/engine/utils/dl-math";

interface GradientDescentInputs extends Record<string, unknown> {
  /** Starting x parameter value. */
  startX: number;
  /** Starting y parameter value. */
  startY: number;
  /** Step size for gradient updates. */
  learningRate: number;
  /** Optimization algorithm. */
  optimizer: "sgd" | "momentum" | "adam";
  /** Number of optimization steps. */
  numSteps: number;
}

/**
 * Loss surface: f(x, y) = x^2 + 3y^2
 * An elongated quadratic bowl -- minimum at (0, 0).
 * The asymmetry (3y^2 vs x^2) reveals how different optimizers
 * handle ill-conditioned surfaces.
 */
function lossFn(x: number, y: number): number {
  // f(x, y) = x^2 + 3y^2 -- Section 4.6 example surface
  return x * x + 3 * y * y;
}

/**
 * Analytical gradient: grad_f = [2x, 6y]
 */
function gradientFn(x: number, y: number): [number, number] {
  // grad_f = [df/dx, df/dy] = [2x, 6y]
  return [2 * x, 6 * y];
}

export default createGenerator<GradientDescentInputs>({
  id: "gradient-descent",

  *generate(inputs, step) {
    const { startX, startY, learningRate: lr, optimizer, numSteps } = inputs;

    let params = [startX, startY];
    const trajectory: { parameters: number[]; loss: number }[] = [];

    // Optimizer state
    let velocity = [0, 0]; // for momentum
    let m = [0, 0]; // Adam first moment
    let v = [0, 0]; // Adam second moment

    // -- Step: Initial Position --
    const initialLoss = lossFn(params[0]!, params[1]!);
    const initialGrad = gradientFn(params[0]!, params[1]!);
    trajectory.push({ parameters: [...params], loss: initialLoss });

    yield step({
      id: "initial",
      title: "Initial Position",
      explanation:
        `Starting at (${params[0]!.toFixed(4)}, ${params[1]!.toFixed(4)}) with loss = ${initialLoss.toFixed(4)}. ` +
        `Using ${optimizer} optimizer with learning rate eta = ${lr}. ` +
        `Loss surface: f(x, y) = x^2 + 3y^2. Minimum at origin (0, 0).`,
      state: {
        parameters: [...params],
        loss: initialLoss,
        gradient: [...initialGrad],
        optimizer,
        learningRate: lr,
        stepNumber: 0,
        trajectory: trajectory.map(t => ({ parameters: [...t.parameters], loss: t.loss })),
      },
      visualActions: [
        {
          type: "showLandscapePosition" as const,
          parameters: [...params],
          loss: initialLoss,
          gradient: [...initialGrad],
        },
        {
          type: "showTrajectory" as const,
          trajectory: trajectory.map(t => ({ parameters: [...t.parameters], loss: t.loss })),
          optimizer,
        },
      ],
      codeHighlight: { language: "pseudocode", lines: [1, 2] },
      phase: "initialization",
    });

    // -- Steps: Optimization Loop --
    for (let i = 0; i < numSteps; i++) {
      const grad = gradientFn(params[0]!, params[1]!);
      const fromParams = [...params];
      const fromLoss = lossFn(params[0]!, params[1]!);

      // Apply optimizer
      switch (optimizer) {
        case "sgd": {
          params = sgdStep(params, grad, lr);
          break;
        }
        case "momentum": {
          const result = momentumStep(params, grad, velocity, lr);
          params = result.params;
          velocity = result.velocity;
          break;
        }
        case "adam": {
          // CRITICAL: t = i + 1 (starts at 1, never 0)
          const result = adamStep(params, grad, m, v, lr, i + 1);
          params = result.params;
          m = result.m;
          v = result.v;
          break;
        }
      }

      const toLoss = lossFn(params[0]!, params[1]!);
      const newGrad = gradientFn(params[0]!, params[1]!);
      trajectory.push({ parameters: [...params], loss: toLoss });

      const isLast = i === numSteps - 1;

      yield step({
        id: `step-${i + 1}`,
        title: `Step ${i + 1}: Loss = ${toLoss.toFixed(4)}`,
        explanation:
          `${optimizer.toUpperCase()} step ${i + 1}/${numSteps}. ` +
          `Moved from (${fromParams[0]!.toFixed(4)}, ${fromParams[1]!.toFixed(4)}) to (${params[0]!.toFixed(4)}, ${params[1]!.toFixed(4)}). ` +
          `Loss: ${fromLoss.toFixed(4)} -> ${toLoss.toFixed(4)}.` +
          (isLast ? ` Final position reached after ${numSteps} steps.` : ""),
        state: {
          parameters: [...params],
          loss: toLoss,
          gradient: [...newGrad],
          optimizer,
          learningRate: lr,
          stepNumber: i + 1,
          trajectory: trajectory.map(t => ({ parameters: [...t.parameters], loss: t.loss })),
          ...(optimizer === "momentum" ? { velocity: [...velocity] } : {}),
          ...(optimizer === "adam" ? { firstMoment: [...m], secondMoment: [...v] } : {}),
        },
        visualActions: [
          {
            type: "showDescentStep" as const,
            fromParameters: [...fromParams],
            toParameters: [...params],
            fromLoss,
            toLoss,
            optimizer,
            learningRate: lr,
          },
          {
            type: "showLandscapePosition" as const,
            parameters: [...params],
            loss: toLoss,
            gradient: [...newGrad],
          },
          {
            type: "showTrajectory" as const,
            trajectory: trajectory.map(t => ({ parameters: [...t.parameters], loss: t.loss })),
            optimizer,
          },
        ],
        codeHighlight: { language: "pseudocode", lines: [5, 6] },
        isTerminal: isLast,
        phase: "optimization",
      });
    }
  },
});
