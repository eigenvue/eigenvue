"""
Gradient Descent — Step Generator (Python mirror of generator.ts).

Runs an optimizer on a 2D loss surface for a fixed number of iterations,
visualizing the trajectory.

Supports three optimizers:
  - SGD: theta_{t+1} = theta_t - eta * grad_f(theta_t)
  - Momentum (Sutskever): v_{t+1} = beta * v_t + g_t; theta_{t+1} = theta_t - eta * v_{t+1}
  - Adam: bias-corrected adaptive moments, t starting at 1

Loss surface: f(x, y) = x^2 + 3y^2 (elongated bowl -- reveals optimizer differences)
Gradient: grad_f = [2x, 6y]
Minimum at (0, 0).

INVARIANTS:
  - Adam t starts at 1 (never 0)
  - Loss decreases over trajectory for convex surface
  - All three optimizers converge toward (0, 0)

CROSS-LANGUAGE PARITY: Must produce identical steps to the TypeScript version.
"""

from __future__ import annotations

from typing import Any

from eigenvue._step_types import CodeHighlight, Step, VisualAction
from eigenvue.math_utils.dl_math import adam_step, momentum_step, sgd_step


def _loss_fn(x: float, y: float) -> float:
    """Loss surface: f(x, y) = x^2 + 3y^2."""
    return x * x + 3 * y * y


def _gradient_fn(x: float, y: float) -> list[float]:
    """Analytical gradient: grad_f = [2x, 6y]."""
    return [2.0 * x, 6.0 * y]


def generate(inputs: dict[str, Any]) -> list[Step]:
    """Generate gradient descent visualization steps."""
    start_x: float = inputs["startX"]
    start_y: float = inputs["startY"]
    lr: float = inputs["learningRate"]
    optimizer: str = inputs["optimizer"]
    num_steps: int = inputs["numSteps"]

    params = [start_x, start_y]
    trajectory: list[dict[str, Any]] = []

    # Optimizer state
    velocity = [0.0, 0.0]
    m_state = [0.0, 0.0]  # Adam first moment
    v_state = [0.0, 0.0]  # Adam second moment

    steps: list[Step] = []
    idx = 0

    # Step: Initial Position
    initial_loss = _loss_fn(params[0], params[1])
    initial_grad = _gradient_fn(params[0], params[1])
    trajectory.append({"parameters": list(params), "loss": initial_loss})

    steps.append(
        Step(
            index=idx,
            id="initial",
            title="Initial Position",
            explanation=(
                f"Starting at ({params[0]:.4f}, {params[1]:.4f}) with loss = {initial_loss:.4f}. "
                f"Using {optimizer} optimizer with learning rate eta = {lr}. "
                f"Loss surface: f(x, y) = x\u00b2 + 3y\u00b2. Minimum at origin (0, 0)."
            ),
            state={
                "parameters": list(params),
                "loss": initial_loss,
                "gradient": list(initial_grad),
                "optimizer": optimizer,
                "learningRate": lr,
                "stepNumber": 0,
                "trajectory": [
                    {"parameters": list(t["parameters"]), "loss": t["loss"]} for t in trajectory
                ],
            },
            visual_actions=(
                VisualAction(
                    type="showLandscapePosition",
                    params={
                        "parameters": list(params),
                        "loss": initial_loss,
                        "gradient": list(initial_grad),
                    },
                ),
                VisualAction(
                    type="showTrajectory",
                    params={
                        "trajectory": [
                            {"parameters": list(t["parameters"]), "loss": t["loss"]}
                            for t in trajectory
                        ],
                        "optimizer": optimizer,
                    },
                ),
            ),
            code_highlight=CodeHighlight(language="pseudocode", lines=(1, 2)),
            is_terminal=False,
            phase="initialization",
        )
    )
    idx += 1

    # Steps: Optimization Loop
    for i in range(num_steps):
        grad = _gradient_fn(params[0], params[1])
        from_params = list(params)
        from_loss = _loss_fn(params[0], params[1])

        # Apply optimizer
        if optimizer == "sgd":
            params = sgd_step(params, grad, lr)
        elif optimizer == "momentum":
            params, velocity = momentum_step(params, grad, velocity, lr)
        elif optimizer == "adam":
            # CRITICAL: t = i + 1 (starts at 1, never 0)
            params, m_state, v_state = adam_step(params, grad, m_state, v_state, lr, i + 1)

        to_loss = _loss_fn(params[0], params[1])
        new_grad = _gradient_fn(params[0], params[1])
        trajectory.append({"parameters": list(params), "loss": to_loss})

        is_last = i == num_steps - 1

        extra_state: dict[str, Any] = {}
        if optimizer == "momentum":
            extra_state["velocity"] = list(velocity)
        elif optimizer == "adam":
            extra_state["firstMoment"] = list(m_state)
            extra_state["secondMoment"] = list(v_state)

        steps.append(
            Step(
                index=idx,
                id=f"step-{i + 1}",
                title=f"Step {i + 1}: Loss = {to_loss:.4f}",
                explanation=(
                    f"{optimizer.upper()} step {i + 1}/{num_steps}. "
                    f"Moved from ({from_params[0]:.4f}, {from_params[1]:.4f}) to ({params[0]:.4f}, {params[1]:.4f}). "
                    f"Loss: {from_loss:.4f} -> {to_loss:.4f}."
                    + (f" Final position reached after {num_steps} steps." if is_last else "")
                ),
                state={
                    "parameters": list(params),
                    "loss": to_loss,
                    "gradient": list(new_grad),
                    "optimizer": optimizer,
                    "learningRate": lr,
                    "stepNumber": i + 1,
                    "trajectory": [
                        {"parameters": list(t["parameters"]), "loss": t["loss"]} for t in trajectory
                    ],
                    **extra_state,
                },
                visual_actions=(
                    VisualAction(
                        type="showDescentStep",
                        params={
                            "fromParameters": list(from_params),
                            "toParameters": list(params),
                            "fromLoss": from_loss,
                            "toLoss": to_loss,
                            "optimizer": optimizer,
                            "learningRate": lr,
                        },
                    ),
                    VisualAction(
                        type="showLandscapePosition",
                        params={
                            "parameters": list(params),
                            "loss": to_loss,
                            "gradient": list(new_grad),
                        },
                    ),
                    VisualAction(
                        type="showTrajectory",
                        params={
                            "trajectory": [
                                {"parameters": list(t["parameters"]), "loss": t["loss"]}
                                for t in trajectory
                            ],
                            "optimizer": optimizer,
                        },
                    ),
                ),
                code_highlight=CodeHighlight(language="pseudocode", lines=(5, 6)),
                is_terminal=is_last,
                phase="optimization",
            )
        )
        idx += 1

    return steps
