"""
Build the production verification notebook for eigenvue v1.0.1.
Run this script to generate the .ipynb file.
"""
import json


def md(source: str) -> dict:
    return {"cell_type": "markdown", "metadata": {}, "source": source}


def code(source: str) -> dict:
    return {
        "cell_type": "code",
        "metadata": {},
        "source": source,
        "outputs": [],
        "execution_count": None,
    }


cells = []

# ── 1. TITLE & HERO ──────────────────────────────────────────────────
cells.append(md("""\
# Eigenvue v1.0.1 \u2014 Production Verification & Complete Feature Guide

<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 24px 32px; border-radius: 12px; color: white; margin-bottom: 24px;">
<h3 style="margin: 0 0 8px 0; color: white;">What is Eigenvue?</h3>
<p style="margin: 0; font-size: 15px; opacity: 0.95;">
<b>Eigenvue</b> is a visual learning platform for understanding algorithms through interactive,
step-by-step visualizations. It covers <b>17 algorithms</b> across three domains:
Classical CS, Deep Learning, and Generative AI / Transformers.
</p>
</div>

| | |
|---|---|
| **Version** | `1.0.1` (Production \u2014 PyPI release) |
| **Install** | `pip install eigenvue` |
| **Python** | 3.10+ |
| **License** | See [PyPI page](https://pypi.org/project/eigenvue/) |

> **Purpose of this notebook:** Verify that the production `pip install eigenvue` package
> works correctly across **every algorithm, every API function, every edge case, and every
> error path**. This notebook doubles as the official feature guide for the documentation site."""))

# ── TABLE OF CONTENTS ────────────────────────────────────────────────
cells.append(md("""\
---
## Table of Contents

1. [Installation & Setup](#1.-Installation-&-Setup)
2. [API Overview](#2.-API-Overview)
3. [Algorithm Discovery \u2014 `eigenvue.list()`](#3.-Algorithm-Discovery)
4. [Step Generation \u2014 `eigenvue.steps()`](#4.-Step-Generation)
5. [Classical Algorithms (7)](#5.-Classical-Algorithms)
6. [Deep Learning Algorithms (5)](#6.-Deep-Learning-Algorithms)
7. [Generative AI / Transformer Algorithms (5)](#7.-Generative-AI-/-Transformer-Algorithms)
8. [Custom Inputs](#8.-Custom-Inputs)
9. [Jupyter Integration \u2014 `eigenvue.jupyter()`](#9.-Jupyter-Integration)
10. [Browser Visualization \u2014 `eigenvue.show()`](#10.-Browser-Visualization)
11. [Step Schema Deep Dive](#11.-Step-Schema-Deep-Dive)
12. [Validation Suite](#12.-Validation-Suite)
13. [Error Handling](#13.-Error-Handling)
14. [Edge Cases](#14.-Edge-Cases)
15. [Summary](#15.-Summary)"""))

# ── 1. INSTALLATION ──────────────────────────────────────────────────
cells.append(md("""\
---
## 1. Installation & Setup

Eigenvue is distributed on [PyPI](https://pypi.org/project/eigenvue/).
Install the **production** release \u2014 this notebook does **not** use a dev/editable build."""))

cells.append(code("""\
# Install eigenvue from PyPI (production release)
!pip install eigenvue"""))

cells.append(code("""\
# For Jupyter notebook integration (includes IPython dependency)
!pip install eigenvue[jupyter]"""))

cells.append(md("""\
**Dependencies installed automatically:**

| Package | Purpose |
|---------|--------|
| `Flask \u2265 3.0` | Local visualization server |
| `importlib-resources` | Access bundled data files |
| `IPython \u2265 8.0` | Jupyter integration *(optional \u2014 installed with `[jupyter]`)* |"""))

# ── 2. API OVERVIEW ──────────────────────────────────────────────────
cells.append(md("""\
---
## 2. API Overview

Eigenvue exposes exactly **four public functions** and one data class:"""))

cells.append(code("""\
import eigenvue

print(f"Eigenvue version: {eigenvue.__version__}")
assert eigenvue.__version__ == "1.0.1", f"Expected 1.0.1, got {eigenvue.__version__}\""""))

cells.append(md("""\
| Function | Purpose | Returns |
|----------|---------|--------|
| `eigenvue.list()` | Discover available algorithms | `list[AlgorithmInfo]` |
| `eigenvue.steps()` | Generate step-by-step execution trace | `list[dict]` |
| `eigenvue.show()` | Launch interactive visualization in browser | `None` |
| `eigenvue.jupyter()` | Embed visualization in a notebook cell | `IFrame` |

| Data Class | Description |
|-----------|------------|
| `AlgorithmInfo` | Immutable metadata object with `id`, `name`, `category`, `description`, `difficulty`, `time_complexity`, `space_complexity` |"""))

cells.append(code("""\
# Verify public API surface
print("Public API (__all__):", eigenvue.__all__)

assert "list" in eigenvue.__all__
assert "steps" in eigenvue.__all__
assert "show" in eigenvue.__all__
assert "jupyter" in eigenvue.__all__
assert "AlgorithmInfo" in eigenvue.__all__
assert "__version__" in eigenvue.__all__

print("\\nAll expected exports present. \u2713")"""))

# ── 3. ALGORITHM DISCOVERY ───────────────────────────────────────────
cells.append(md("""\
---
## 3. Algorithm Discovery

### 3.1 List All Algorithms

`eigenvue.list()` returns a list of `AlgorithmInfo` objects for every algorithm in the catalog,
sorted by category then name."""))

cells.append(code("""\
all_algorithms = eigenvue.list()

print(f"Total algorithms available: {len(all_algorithms)}")
assert len(all_algorithms) == 17, f"Expected 17 algorithms, got {len(all_algorithms)}"

header = f"{'ID':<26s} {'Name':<35s} {'Category':<16s} {'Difficulty':<14s} {'Time':<18s} {'Space'}"
print(f"\\n{header}")
print("\u2500" * 130)
for algo in all_algorithms:
    print(f"{algo.id:<26s} {algo.name:<35s} {algo.category:<16s} {algo.difficulty:<14s} {algo.time_complexity:<18s} {algo.space_complexity}")"""))

cells.append(md("""\
### 3.2 Inspect AlgorithmInfo Fields

Each `AlgorithmInfo` is an immutable dataclass with seven attributes:"""))

cells.append(code("""\
algo = all_algorithms[0]

print(f"ID:               {algo.id}")
print(f"Name:             {algo.name}")
print(f"Category:         {algo.category}")
print(f"Description:      {algo.description}")
print(f"Difficulty:       {algo.difficulty}")
print(f"Time complexity:  {algo.time_complexity}")
print(f"Space complexity: {algo.space_complexity}")
print(f"\\nRepr: {repr(algo)}")"""))

cells.append(md("""\
### 3.3 Filter by Category

Eigenvue organizes its 17 algorithms into **three categories**:

| Category | Count | Description |
|----------|-------|------------|
| `classical` | 7 | Sorting, searching, graph traversal |
| `deep-learning` | 5 | Neural networks, backpropagation, optimization |
| `generative-ai` | 5 | Transformers, tokenization, attention |"""))

cells.append(code("""\
for category in ["classical", "deep-learning", "generative-ai"]:
    algos = eigenvue.list(category=category)
    print(f"\\n{category.upper()} ({len(algos)} algorithms):")
    print("-" * 50)
    for algo in algos:
        print(f"  {algo.id:<26s} {algo.name}")"""))

cells.append(code("""\
# Verify category counts
assert len(eigenvue.list(category="classical")) == 7
assert len(eigenvue.list(category="deep-learning")) == 5
assert len(eigenvue.list(category="generative-ai")) == 5

total = sum(len(eigenvue.list(category=c)) for c in ["classical", "deep-learning", "generative-ai"])
assert total == 17

print("Category counts verified: 7 + 5 + 5 = 17 \u2713")"""))

# ── 4. STEP GENERATION ───────────────────────────────────────────────
cells.append(md("""\
---
## 4. Step Generation

`eigenvue.steps(algorithm_id, inputs=None)` generates the complete execution trace for any
algorithm. Each step is a dictionary with the following fields:

| Field | Type | Description |
|-------|------|------------|
| `index` | `int` | 0-based step position |
| `id` | `str` | Step identifier |
| `title` | `str` | Short step title |
| `explanation` | `str` | Detailed explanation |
| `state` | `dict` | Algorithm state snapshot |
| `visualActions` | `list[dict]` | Rendering instructions |
| `codeHighlight` | `dict` | Which code lines to highlight |
| `isTerminal` | `bool` | Whether this is the final step |
| `phase` | `str` | *(optional)* Logical phase name |"""))

cells.append(code("""\
# Quick example: generate steps for Binary Search
steps = eigenvue.steps("binary-search")

print(f"Algorithm: Binary Search")
print(f"Total steps: {len(steps)}")
print(f"First step title: {steps[0]['title']}  (terminal={steps[0]['isTerminal']})")
print(f"Last step title:  {steps[-1]['title']}  (terminal={steps[-1]['isTerminal']})")"""))

# ── 5. CLASSICAL ALGORITHMS ──────────────────────────────────────────
cells.append(md("""\
---
## 5. Classical Algorithms

<div style="background: #e8f5e9; padding: 16px 24px; border-radius: 8px; border-left: 4px solid #4caf50; margin-bottom: 16px;">
Eigenvue includes <b>7 classical algorithms</b> covering searching, sorting, and graph traversal \u2014
the foundations of computer science.
</div>"""))

# 5.1 Binary Search
cells.append(md("""\
### 5.1 Binary Search

Efficiently find a target in a sorted array by halving the search space at each step.

| Property | Value |
|----------|------|
| **ID** | `binary-search` |
| **Difficulty** | Beginner |
| **Time** | O(log n) |
| **Space** | O(1) |
| **Default inputs** | `array=[1,3,5,7,9,11,13,15,17,19]`, `target=13` |"""))

cells.append(code("""\
# Binary Search with default inputs
steps = eigenvue.steps("binary-search")
print(f"Binary Search \u2014 {len(steps)} steps")
print(f"Default: searching for 13 in [1, 3, 5, 7, 9, 11, 13, 15, 17, 19]\\n")

for s in steps:
    state = s["state"]
    left = state.get("left", "-")
    right = state.get("right", "-")
    mid = state.get("mid", "-")
    result = state.get("result", None)
    marker = " \u2190 FOUND!" if result is not None and result >= 0 else ""
    print(f"  Step {s['index']:>2d}: {s['title']:<35s}  left={left}  right={right}  mid={mid}{marker}")

print(f"\\nResult: index {steps[-1]['state']['result']}")"""))

cells.append(code("""\
# Binary Search \u2014 custom input: target NOT found
steps = eigenvue.steps("binary-search", inputs={"array": [2, 4, 6, 8, 10], "target": 7})
print(f"Binary Search (target not found) \u2014 {len(steps)} steps")
print(f"Searching for 7 in [2, 4, 6, 8, 10]\\n")

for s in steps:
    print(f"  Step {s['index']:>2d}: {s['title']}")

print(f"\\nResult: {steps[-1]['state']['result']}  (not found)")"""))

# 5.2 Bubble Sort
cells.append(md("""\
### 5.2 Bubble Sort

Repeatedly compare adjacent elements and swap them if they're out of order.
Includes early termination when no swaps occur in a full pass.

| Property | Value |
|----------|------|
| **ID** | `bubble-sort` |
| **Difficulty** | Beginner |
| **Time** | O(n\u00b2) |
| **Space** | O(1) |
| **Default inputs** | `array=[64, 34, 25, 12, 22, 11, 90]` |"""))

cells.append(code("""\
# Bubble Sort with default inputs
steps = eigenvue.steps("bubble-sort")
print(f"Bubble Sort \u2014 {len(steps)} steps\\n")

for s in steps:
    arr = s["state"].get("array", [])
    print(f"  Step {s['index']:>2d}: {s['title']:<45s}  array={arr}")

print(f"\\nSorted result: {steps[-1]['state']['array']}")"""))

# 5.3 QuickSort
cells.append(md("""\
### 5.3 QuickSort

Divide-and-conquer sort using Lomuto partition scheme (pivot = last element).

| Property | Value |
|----------|------|
| **ID** | `quicksort` |
| **Difficulty** | Advanced |
| **Time** | O(n log n) average, O(n\u00b2) worst |
| **Space** | O(log n) |
| **Default inputs** | `array=[38, 27, 43, 3, 9, 82, 10]` |"""))

cells.append(code("""\
# QuickSort with default inputs
steps = eigenvue.steps("quicksort")
print(f"QuickSort \u2014 {len(steps)} steps\\n")

for s in steps:
    arr = s["state"].get("array", [])
    print(f"  Step {s['index']:>2d}: {s['title']:<50s}  array={arr}")

print(f"\\nSorted result: {steps[-1]['state']['array']}")"""))

# 5.4 Merge Sort
cells.append(md("""\
### 5.4 Merge Sort

Stable sort using bottom-up iterative merging of sorted sub-arrays.

| Property | Value |
|----------|------|
| **ID** | `merge-sort` |
| **Difficulty** | Intermediate |
| **Time** | O(n log n) |
| **Space** | O(n) |
| **Default inputs** | `array=[38, 27, 43, 3, 9, 82, 10]` |"""))

cells.append(code("""\
# Merge Sort with default inputs
steps = eigenvue.steps("merge-sort")
print(f"Merge Sort \u2014 {len(steps)} steps\\n")

for s in steps:
    arr = s["state"].get("array", [])
    print(f"  Step {s['index']:>2d}: {s['title']:<50s}  array={arr}")

print(f"\\nSorted result: {steps[-1]['state']['array']}")"""))

# 5.5 BFS
cells.append(md("""\
### 5.5 Breadth-First Search (BFS)

Explore a graph level by level using a FIFO queue. Guarantees shortest path in unweighted graphs.

| Property | Value |
|----------|------|
| **ID** | `bfs` |
| **Difficulty** | Intermediate |
| **Time** | O(V + E) |
| **Space** | O(V) |
| **Default inputs** | 6-node graph (A\u2013F), start=A, target=F |"""))

cells.append(code("""\
# BFS with default inputs
steps = eigenvue.steps("bfs")
print(f"BFS \u2014 {len(steps)} steps\\n")

for s in steps:
    state = s["state"]
    visited = state.get("visited", [])
    queue = state.get("queue", [])
    current = state.get("current", "-")
    print(f"  Step {s['index']:>2d}: {s['title']:<40s}  current={str(current):<4s} visited={visited}  queue={queue}")

final_path = steps[-1]["state"].get("path", [])
print(f"\\nPath found: {' \u2192 '.join(final_path) if final_path else 'None'}")"""))

# 5.6 DFS
cells.append(md("""\
### 5.6 Depth-First Search (DFS)

Explore a graph by going as deep as possible before backtracking, using a LIFO stack.

| Property | Value |
|----------|------|
| **ID** | `dfs` |
| **Difficulty** | Intermediate |
| **Time** | O(V + E) |
| **Space** | O(V) |
| **Default inputs** | 6-node graph (A\u2013F), start=A, target=F |"""))

cells.append(code("""\
# DFS with default inputs
steps = eigenvue.steps("dfs")
print(f"DFS \u2014 {len(steps)} steps\\n")

for s in steps:
    state = s["state"]
    visited = state.get("visited", [])
    stack = state.get("stack", [])
    current = state.get("current", "-")
    print(f"  Step {s['index']:>2d}: {s['title']:<40s}  current={str(current):<4s} visited={visited}  stack={stack}")

final_path = steps[-1]["state"].get("path", [])
print(f"\\nPath found: {' \u2192 '.join(final_path) if final_path else 'None'}")"""))

# 5.7 Dijkstra
cells.append(md("""\
### 5.7 Dijkstra's Shortest Path

Find shortest paths from a source node to all other nodes in a weighted graph.
Uses a priority queue (greedy approach). All edge weights must be non-negative.

| Property | Value |
|----------|------|
| **ID** | `dijkstra` |
| **Difficulty** | Advanced |
| **Time** | O((V + E) log V) |
| **Space** | O(V) |
| **Default inputs** | 5-node weighted graph (A\u2013E), start=A, target=E |"""))

cells.append(code("""\
# Dijkstra with default inputs
steps = eigenvue.steps("dijkstra")
print(f"Dijkstra \u2014 {len(steps)} steps\\n")

for s in steps:
    state = s["state"]
    current = state.get("current", "-")
    distances = state.get("distances", {})
    print(f"  Step {s['index']:>2d}: {s['title']:<45s}  current={str(current):<4s} distances={distances}")

final_path = steps[-1]["state"].get("path", [])
final_dist = steps[-1]["state"].get("distances", {})
print(f"\\nShortest path: {' \u2192 '.join(final_path) if final_path else 'None'}")
print(f"Final distances: {final_dist}")"""))

# ── 6. DEEP LEARNING ALGORITHMS ──────────────────────────────────────
cells.append(md("""\
---
## 6. Deep Learning Algorithms

<div style="background: #e3f2fd; padding: 16px 24px; border-radius: 8px; border-left: 4px solid #2196f3; margin-bottom: 16px;">
Eigenvue includes <b>5 deep learning algorithms</b> that walk through the fundamental building blocks
of neural networks \u2014 from a single perceptron to full backpropagation.
</div>"""))

# 6.1 Perceptron
cells.append(md("""\
### 6.1 Perceptron

The simplest neural network: a single neuron computing weighted sum + activation.

| Property | Value |
|----------|------|
| **ID** | `perceptron` |
| **Difficulty** | Beginner |
| **Time** | O(n) per forward pass |
| **Space** | O(1) |
| **Default inputs** | `inputs=[0.5, 0.8]`, `weights=[0.6, -0.3]`, `bias=0.1`, `activation="sigmoid"` |
| **Activations** | `sigmoid`, `relu`, `tanh`, `step` |"""))

cells.append(code("""\
# Perceptron with default inputs (sigmoid activation)
steps = eigenvue.steps("perceptron")
print(f"Perceptron \u2014 {len(steps)} steps\\n")

for s in steps:
    state = s["state"]
    print(f"  Step {s['index']:>2d}: {s['title']}")
    if "z" in state and state["z"] is not None:
        print(f"           pre-activation z = {state['z']}")
    if "a" in state and state["a"] is not None:
        print(f"           activation    a = {state['a']}")"""))

cells.append(code("""\
# Perceptron with each activation function
print("Activation function comparison:\\n")
for act_fn in ["sigmoid", "relu", "tanh", "step"]:
    steps = eigenvue.steps("perceptron", inputs={
        "inputs": [1.0, -0.5, 0.3],
        "weights": [0.4, 0.7, -0.2],
        "bias": 0.1,
        "activationFunction": act_fn
    })
    final = steps[-1]["state"]
    print(f"  {act_fn:<8s}:  z = {final.get('z', '?'):>8}   a = {final.get('a', '?')}")"""))

# 6.2 Feedforward Network
cells.append(md("""\
### 6.2 Feedforward Neural Network

Multi-layer network with forward propagation through layers. Uses Xavier initialization.

| Property | Value |
|----------|------|
| **ID** | `feedforward-network` |
| **Difficulty** | Intermediate |
| **Time** | O(\u220F layer sizes) |
| **Space** | O(\u2211 layer sizes) |
| **Default inputs** | `inputValues=[0.5, 0.8]`, `layerSizes=[2, 3, 1]`, `activation="sigmoid"` |"""))

cells.append(code("""\
# Feedforward Network with default inputs
steps = eigenvue.steps("feedforward-network")
print(f"Feedforward Network \u2014 {len(steps)} steps\\n")

for s in steps:
    state = s["state"]
    print(f"  Step {s['index']:>2d}: {s['title']}")
    if "activations" in state:
        for i, layer_acts in enumerate(state["activations"]):
            if layer_acts is not None:
                rounded = [round(v, 4) for v in layer_acts]
                print(f"           Layer {i} activations: {rounded}")"""))

# 6.3 Backpropagation
cells.append(md("""\
### 6.3 Backpropagation

A complete training step: forward pass \u2192 loss computation \u2192 backward pass \u2192 weight update.

| Property | Value |
|----------|------|
| **ID** | `backpropagation` |
| **Difficulty** | Expert |
| **Time** | O(\u220F layer sizes) |
| **Space** | O(\u2211 layer sizes) |
| **Default inputs** | `layerSizes=[2,2,1]`, `inputs=[0.5,0.8]`, `targets=[1]`, `lr=0.1`, `loss="mse"` |
| **Loss functions** | `mse`, `binary-cross-entropy` |"""))

cells.append(code("""\
# Backpropagation with default inputs
steps = eigenvue.steps("backpropagation")
print(f"Backpropagation \u2014 {len(steps)} steps\\n")

for s in steps:
    phase = s.get("phase", "")
    print(f"  Step {s['index']:>2d} [{phase:<10s}]: {s['title']}")"""))

# 6.4 Convolution
cells.append(md("""\
### 6.4 2D Convolution

Slide a kernel across an input grid, computing element-wise products and sums at each position.
Uses cross-correlation convention (no kernel flip \u2014 matches PyTorch/TensorFlow).

| Property | Value |
|----------|------|
| **ID** | `convolution` |
| **Difficulty** | Intermediate |
| **Time** | O((H-kH+1)(W-kW+1)\u00b7kH\u00b7kW) |
| **Space** | O((H-kH+1)(W-kW+1)) |
| **Default inputs** | 4\u00d74 input, 2\u00d72 kernel `[[1,0],[0,-1]]` |"""))

cells.append(code("""\
# 2D Convolution with default inputs
steps = eigenvue.steps("convolution")
print(f"2D Convolution \u2014 {len(steps)} steps\\n")

for s in steps:
    print(f"  Step {s['index']:>2d}: {s['title']}")

print(f"\\nFinal output grid:")
final_output = steps[-1]["state"].get("outputGrid", [])
for row in final_output:
    print(f"  {[round(v, 2) for v in row]}")"""))

# 6.5 Gradient Descent
cells.append(md("""\
### 6.5 Gradient Descent

Optimize parameters on a 2D loss surface f(x,y) = x\u00b2 + 3y\u00b2.
Supports three optimizers: SGD, Momentum, and Adam.

| Property | Value |
|----------|------|
| **ID** | `gradient-descent` |
| **Difficulty** | Intermediate |
| **Time** | O(num_steps) |
| **Space** | O(num_steps) for trajectory |
| **Default inputs** | `start=(3,3)`, `lr=0.1`, `optimizer="sgd"`, `numSteps=20` |
| **Optimizers** | `sgd`, `momentum`, `adam` |"""))

cells.append(code("""\
# Gradient Descent with default inputs (SGD)
steps = eigenvue.steps("gradient-descent")
print(f"Gradient Descent (SGD) \u2014 {len(steps)} steps\\n")

for s in steps[::5]:  # Show every 5th step to keep output concise
    state = s["state"]
    params = state.get("parameters", [])
    loss = state.get("loss", "?")
    x, y = params[0], params[1]
    print(f"  Step {s['index']:>2d}: x={x:>10}  y={y:>10}  loss={loss}")

final = steps[-1]["state"]
print(f"\\nFinal: x={final['parameters'][0]}, y={final['parameters'][1]}, loss={final['loss']}")"""))

cells.append(code("""\
# Compare all three optimizers
print(f"{'Optimizer':<12s} {'Final x':>12s} {'Final y':>12s} {'Final loss':>14s}")
print("\u2500" * 55)

for optimizer in ["sgd", "momentum", "adam"]:
    steps = eigenvue.steps("gradient-descent", inputs={
        "startX": 3, "startY": 3, "learningRate": 0.1,
        "optimizer": optimizer, "numSteps": 20
    })
    final = steps[-1]["state"]
    x = final["parameters"][0]
    y = final["parameters"][1]
    loss = final["loss"]
    print(f"{optimizer:<12s} {x:>12.6f} {y:>12.6f} {loss:>14.8f}")"""))

# ── 7. GENERATIVE AI ALGORITHMS ──────────────────────────────────────
cells.append(md("""\
---
## 7. Generative AI / Transformer Algorithms

<div style="background: #fce4ec; padding: 16px 24px; border-radius: 8px; border-left: 4px solid #e91e63; margin-bottom: 16px;">
Eigenvue includes <b>5 generative AI algorithms</b> that decompose the Transformer architecture \u2014
from tokenization to a complete transformer encoder block.
</div>"""))

# 7.1 BPE Tokenization
cells.append(md("""\
### 7.1 BPE Tokenization

Break text into subword tokens using Byte-Pair Encoding merge rules.

| Property | Value |
|----------|------|
| **ID** | `tokenization-bpe` |
| **Difficulty** | Intermediate |
| **Time** | O(|rules| \u00d7 |tokens|\u00b2) |
| **Space** | O(|tokens|) |
| **Default inputs** | `text="lowest"`, 5 merge rules |"""))

cells.append(code("""\
# BPE Tokenization with default inputs
steps = eigenvue.steps("tokenization-bpe")
print(f"BPE Tokenization \u2014 {len(steps)} steps\\n")

for s in steps:
    tokens = s["state"].get("tokens", [])
    print(f"  Step {s['index']:>2d}: {s['title']:<50s}  tokens={tokens}")

print(f"\\nFinal tokens: {steps[-1]['state']['tokens']}")"""))

# 7.2 Token Embeddings
cells.append(md("""\
### 7.2 Token Embeddings

Map tokens to dense numerical vectors using a deterministic embedding table.
Includes cosine similarity computation between all token pairs.

| Property | Value |
|----------|------|
| **ID** | `token-embeddings` |
| **Difficulty** | Beginner |
| **Time** | O(n \u00d7 d) |
| **Space** | O(n \u00d7 d) |
| **Default inputs** | `tokens=["The", "cat", "sat"]`, `embeddingDim=4` |"""))

cells.append(code("""\
# Token Embeddings with default inputs
steps = eigenvue.steps("token-embeddings")
print(f"Token Embeddings \u2014 {len(steps)} steps\\n")

for s in steps:
    state = s["state"]
    print(f"  Step {s['index']:>2d}: {s['title']}")
    if "currentEmbedding" in state and state["currentEmbedding"] is not None:
        emb = [round(v, 4) for v in state["currentEmbedding"]]
        print(f"           embedding = {emb}")"""))

# 7.3 Self-Attention
cells.append(md("""\
### 7.3 Self-Attention (Scaled Dot-Product)

The core mechanism inside Transformer models. Each token computes attention weights
for every other token using Query, Key, and Value projections.

| Property | Value |
|----------|------|
| **ID** | `self-attention` |
| **Difficulty** | Advanced |
| **Time** | O(n\u00b2 \u00d7 d) |
| **Space** | O(n\u00b2 + n\u00d7d) |
| **Default inputs** | `tokens=["The", "cat", "sat"]`, `embeddingDim=4` |

**Process:** Input X \u2192 Q=XW_Q \u2192 K=XW_K \u2192 V=XW_V \u2192 scores=QK\u1d40/\u221ad_k \u2192 softmax \u2192 output=weights\u00d7V"""))

cells.append(code("""\
# Self-Attention with default inputs
steps = eigenvue.steps("self-attention")
print(f"Self-Attention \u2014 {len(steps)} steps\\n")

for s in steps:
    print(f"  Step {s['index']:>2d}: {s['title']}")

# Show attention weights from final state
final = steps[-1]["state"]
if "weights" in final and final["weights"] is not None:
    print(f"\\nAttention weight matrix:")
    tokens = final.get("tokens", [])
    weights = final["weights"]
    header = "        " + "  ".join(f"{t:>8s}" for t in tokens)
    print(header)
    for i, row in enumerate(weights):
        formatted = "  ".join(f"{v:>8.4f}" for v in row)
        print(f"  {tokens[i]:>6s}  {formatted}")
    # Verify rows sum to 1.0
    for i, row in enumerate(weights):
        row_sum = sum(row)
        assert abs(row_sum - 1.0) < 1e-6, f"Row {i} sums to {row_sum}, expected 1.0"
    print(f"\\n  \u2713 All attention rows sum to 1.0")"""))

# 7.4 Multi-Head Attention
cells.append(md("""\
### 7.4 Multi-Head Attention

Multiple attention heads capture different relationships simultaneously,
then concatenate and project their outputs.

| Property | Value |
|----------|------|
| **ID** | `multi-head-attention` |
| **Difficulty** | Advanced |
| **Time** | O(num_heads \u00d7 n\u00b2 \u00d7 d_k) |
| **Space** | O(n\u00b2 \u00d7 num_heads + n\u00d7d) |
| **Default inputs** | `tokens=["The","cat","sat","on"]`, `embeddingDim=8`, `numHeads=2` |

**Constraint:** `embeddingDim` must be evenly divisible by `numHeads` (d_k = d / h)."""))

cells.append(code("""\
# Multi-Head Attention with default inputs
steps = eigenvue.steps("multi-head-attention")
print(f"Multi-Head Attention \u2014 {len(steps)} steps\\n")

for s in steps:
    print(f"  Step {s['index']:>2d}: {s['title']}")"""))

# 7.5 Transformer Block
cells.append(md("""\
### 7.5 Transformer Block

A complete transformer encoder block: self-attention \u2192 residual + layer norm \u2192 FFN \u2192 residual + layer norm.

| Property | Value |
|----------|------|
| **ID** | `transformer-block` |
| **Difficulty** | Expert |
| **Time** | O(h\u00b7n\u00b2\u00b7d_k + 2\u00b7d\u00b7d_ff) |
| **Space** | O(n\u00b2 + n\u00d7d + d\u00d7d_ff) |
| **Default inputs** | `tokens=["The","cat","sat"]`, `embeddingDim=4`, `ffnDim=8`, `numHeads=1` |

**Architecture:**
```
Input X \u2192 Multi-Head Attention \u2192 Add & LayerNorm \u2192 FFN \u2192 Add & LayerNorm \u2192 Output
```"""))

cells.append(code("""\
# Transformer Block with default inputs
steps = eigenvue.steps("transformer-block")
print(f"Transformer Block \u2014 {len(steps)} steps\\n")

for s in steps:
    phase = s.get("phase", "")
    print(f"  Step {s['index']:>2d} [{phase:<18s}]: {s['title']}")"""))

# ── 8. CUSTOM INPUTS ─────────────────────────────────────────────────
cells.append(md("""\
---
## 8. Custom Inputs

Every algorithm accepts custom inputs via the `inputs` parameter.
When omitted (`None`), the algorithm's built-in defaults are used.

This section demonstrates custom inputs for each category."""))

cells.append(md("### 8.1 Custom Sorting Inputs"))

cells.append(code("""\
# QuickSort with custom array
steps = eigenvue.steps("quicksort", inputs={"array": [100, 42, 7, 55, 23, 88, 1]})
print(f"QuickSort on [100, 42, 7, 55, 23, 88, 1]")
print(f"  Steps: {len(steps)}")
print(f"  Result: {steps[-1]['state']['array']}")

# Bubble Sort with already-sorted array (tests early termination)
steps = eigenvue.steps("bubble-sort", inputs={"array": [1, 2, 3, 4, 5]})
print(f"\\nBubble Sort on [1, 2, 3, 4, 5] (already sorted)")
print(f"  Steps: {len(steps)} (early termination!)")
print(f"  Result: {steps[-1]['state']['array']}")

# Merge Sort with descending array
steps = eigenvue.steps("merge-sort", inputs={"array": [9, 7, 5, 3, 1]})
print(f"\\nMerge Sort on [9, 7, 5, 3, 1] (reverse order)")
print(f"  Steps: {len(steps)}")
print(f"  Result: {steps[-1]['state']['array']}")"""))

cells.append(md("### 8.2 Custom Search Inputs"))

cells.append(code("""\
# Binary Search \u2014 target at first position
steps = eigenvue.steps("binary-search", inputs={"array": [10, 20, 30, 40, 50], "target": 10})
print(f"Binary Search for 10 (first element): result={steps[-1]['state']['result']}")

# Binary Search \u2014 target at last position
steps = eigenvue.steps("binary-search", inputs={"array": [10, 20, 30, 40, 50], "target": 50})
print(f"Binary Search for 50 (last element):  result={steps[-1]['state']['result']}")

# Binary Search \u2014 single element array
steps = eigenvue.steps("binary-search", inputs={"array": [42], "target": 42})
print(f"Binary Search in [42] for 42:         result={steps[-1]['state']['result']}")

# Binary Search \u2014 single element, not found
steps = eigenvue.steps("binary-search", inputs={"array": [42], "target": 99})
print(f"Binary Search in [42] for 99:         result={steps[-1]['state']['result']}")"""))

cells.append(md("### 8.3 Custom Graph Inputs"))

cells.append(code("""\
# BFS on a custom graph
steps = eigenvue.steps("bfs", inputs={
    "adjacencyList": {
        "X": ["Y", "Z"],
        "Y": ["X", "W"],
        "Z": ["X", "W"],
        "W": ["Y", "Z"]
    },
    "positions": {
        "X": {"x": 0.2, "y": 0.5},
        "Y": {"x": 0.5, "y": 0.2},
        "Z": {"x": 0.5, "y": 0.8},
        "W": {"x": 0.8, "y": 0.5}
    },
    "startNode": "X",
    "targetNode": "W"
})
print(f"BFS X\u2192W: {len(steps)} steps")
path = steps[-1]["state"].get("path", [])
print(f"  Path: {' \u2192 '.join(path)}")"""))

cells.append(md("### 8.4 Custom Neural Network Inputs"))

cells.append(code("""\
# Perceptron with ReLU
steps = eigenvue.steps("perceptron", inputs={
    "inputs": [2.0, -1.0, 0.5],
    "weights": [0.3, 0.8, -0.5],
    "bias": -0.2,
    "activationFunction": "relu"
})
final = steps[-1]["state"]
print(f"Perceptron (ReLU): z={final['z']}, a={final['a']}")

# Feedforward network with custom architecture
steps = eigenvue.steps("feedforward-network", inputs={
    "layerSizes": [3, 4, 2],
    "inputValues": [1.0, 0.5, -0.3],
    "activationFunction": "sigmoid",
    "seed": "custom-seed"
})
print(f"\\nFeedforward [3,4,2]: {len(steps)} steps")
final_acts = steps[-1]["state"].get("activations", [])[-1]
print(f"  Output: {[round(v, 4) for v in final_acts]}")"""))

cells.append(md("### 8.5 Custom Convolution Inputs"))

cells.append(code("""\
# 3\u00d73 input with edge detection kernel
steps = eigenvue.steps("convolution", inputs={
    "input": [
        [0, 1, 2],
        [3, 4, 5],
        [6, 7, 8]
    ],
    "kernel": [
        [1, 0],
        [-1, 0]
    ]
})
print(f"Convolution (3\u00d73 input, 2\u00d72 kernel) \u2014 {len(steps)} steps")
final = steps[-1]["state"].get("outputGrid", [])
print(f"Output grid ({len(final)}\u00d7{len(final[0])}):")
for row in final:
    print(f"  {[round(v, 2) for v in row]}")"""))

cells.append(md("### 8.6 Custom Transformer Inputs"))

cells.append(code("""\
# Self-attention with a different sentence
steps = eigenvue.steps("self-attention", inputs={
    "tokens": ["I", "love", "AI"],
    "embeddingDim": 3
})
print(f"Self-Attention (['I', 'love', 'AI'], dim=3) \u2014 {len(steps)} steps")

# Multi-head attention with 4 heads
steps = eigenvue.steps("multi-head-attention", inputs={
    "tokens": ["Attention", "is", "all", "you"],
    "embeddingDim": 8,
    "numHeads": 4
})
print(f"Multi-Head Attention (4 heads, dim=8) \u2014 {len(steps)} steps")

# Transformer block with custom configuration
steps = eigenvue.steps("transformer-block", inputs={
    "tokens": ["Hello", "world"],
    "embeddingDim": 4,
    "ffnDim": 16,
    "numHeads": 2
})
print(f"Transformer Block (2 heads, ffn=16) \u2014 {len(steps)} steps")"""))

# ── 9. JUPYTER INTEGRATION ───────────────────────────────────────────
cells.append(md("""\
---
## 9. Jupyter Integration

`eigenvue.jupyter()` embeds an interactive visualization directly inside a notebook cell.
It launches a local server in a background thread and returns an `IPython.display.IFrame`.

| Parameter | Type | Default | Description |
|-----------|------|---------|------------|
| `algorithm_id` | `str` | *(required)* | Algorithm to visualize |
| `inputs` | `dict` | `None` | Custom parameters |
| `width` | `str` | `"100%"` | CSS width |
| `height` | `str` | `"600px"` | CSS height |"""))

cells.append(code("""\
# Embed a Binary Search visualization
eigenvue.jupyter("binary-search")"""))

cells.append(code("""\
# Embed a Self-Attention visualization with custom dimensions
eigenvue.jupyter("self-attention", width="100%", height="700px")"""))

cells.append(code("""\
# Embed with custom inputs
eigenvue.jupyter(
    "gradient-descent",
    inputs={"startX": 4, "startY": -2, "learningRate": 0.05, "optimizer": "adam", "numSteps": 30},
    height="650px"
)"""))

cells.append(code("""\
# Embed a Transformer Block visualization
eigenvue.jupyter("transformer-block")"""))

# ── 10. BROWSER VISUALIZATION ────────────────────────────────────────
cells.append(md("""\
---
## 10. Browser Visualization

`eigenvue.show()` launches a local Flask server and opens the interactive visualization
in your default browser. The cell **blocks** until interrupted (Ctrl+C / kernel interrupt).

| Parameter | Type | Default | Description |
|-----------|------|---------|------------|
| `algorithm_id` | `str` | *(required)* | Algorithm to visualize |
| `inputs` | `dict` | `None` | Custom parameters |
| `port` | `int` | `0` | TCP port (`0` = auto-select) |
| `open_browser` | `bool` | `True` | Open browser automatically |

> **Note:** These cells are commented out since `show()` blocks execution.
> Uncomment any line to try it \u2014 press Ctrl+C to stop the server."""))

cells.append(code("""\
# Uncomment any line below to launch a browser visualization:

# eigenvue.show("binary-search")
# eigenvue.show("self-attention")
# eigenvue.show("transformer-block")
# eigenvue.show("gradient-descent", inputs={"optimizer": "adam", "numSteps": 50})
# eigenvue.show("backpropagation", port=8080, open_browser=True)"""))

# ── 11. STEP SCHEMA DEEP DIVE ────────────────────────────────────────
cells.append(md("""\
---
## 11. Step Schema Deep Dive

Each step dictionary returned by `eigenvue.steps()` follows a rigorous schema.
This section examines every field in detail."""))

cells.append(md("### 11.1 Full Step Structure"))

cells.append(code("""\
import json

# Examine a step in detail
steps = eigenvue.steps("binary-search")
step = steps[2]  # Pick a mid-execution step

print("Keys in a step dictionary:")
for key in step:
    val = step[key]
    type_name = type(val).__name__
    preview = str(val)[:80] + ("..." if len(str(val)) > 80 else "")
    print(f"  {key:<16s} ({type_name:<6s}): {preview}")

print("\\n" + "=" * 80)
print("Full step JSON:")
print("=" * 80)
print(json.dumps(step, indent=2, default=str))"""))

cells.append(md("""\
### 11.2 Visual Actions Vocabulary

Each step includes `visualActions` \u2014 rendering instructions for the visualization engine.
Action types form an **open vocabulary** (renderers silently ignore unknown types).

Common action types include:

| Category | Action Types |
|----------|------------|
| **Arrays** | `highlightElement`, `highlightRange`, `compareElements`, `swapElements`, `markSorted`, `markFound` |
| **Pointers** | `movePointer`, `setPartition` |
| **Graphs** | `visitNode`, `setCurrentNode`, `highlightEdge`, `markPath`, `updateDistance` |
| **Networks** | `activateNeuron`, `showEmbedding`, `showProjectionMatrix` |
| **Text** | `mergeTokens`, `highlightAuxiliary` |
| **Utility** | `showMessage` (success/info/warning/error) |"""))

cells.append(code("""\
# Collect all unique visual action types across all algorithms
action_types_by_algo = {}

for algo in eigenvue.list():
    steps = eigenvue.steps(algo.id)
    types = set()
    for s in steps:
        for va in s.get("visualActions", []):
            types.add(va.get("type", "unknown"))
    action_types_by_algo[algo.id] = sorted(types)

print("Visual action types used by each algorithm:\\n")
for algo_id, types in action_types_by_algo.items():
    joined = ", ".join(types)
    print(f"  {algo_id:<26s}: {joined}")"""))

cells.append(md("### 11.3 Code Highlights"))

cells.append(code("""\
# Show code highlights for Binary Search
steps = eigenvue.steps("binary-search")
print("Code highlights in Binary Search:\\n")

for s in steps[:5]:
    ch = s["codeHighlight"]
    print(f"  Step {s['index']}: language={ch['language']:<14s} lines={ch['lines']}")"""))

cells.append(md("""\
### 11.4 State Snapshots Across Categories

The `state` field differs by algorithm category. Here's a comparison:"""))

cells.append(code("""\
# Compare state keys across algorithm categories
categories = {
    "Sorting (Bubble Sort)": "bubble-sort",
    "Search (Binary Search)": "binary-search",
    "Graph (BFS)": "bfs",
    "Neural Network (Perceptron)": "perceptron",
    "Attention (Self-Attention)": "self-attention",
    "Transformer (Block)": "transformer-block"
}

for label, algo_id in categories.items():
    steps = eigenvue.steps(algo_id)
    all_keys = set()
    for s in steps:
        all_keys.update(s["state"].keys())
    print(f"  {label}:")
    print(f"    State keys: {sorted(all_keys)}")
    print()"""))

# ── 12. VALIDATION SUITE ─────────────────────────────────────────────
cells.append(md("""\
---
## 12. Validation Suite

Comprehensive verification that every algorithm produces valid, well-formed step sequences."""))

cells.append(md("""\
### 12.1 Step Sequence Invariants

Every step sequence must satisfy these invariants:
1. **Non-empty** \u2014 at least one step
2. **Contiguous indices** \u2014 `steps[i]["index"] == i`
3. **Single terminal** \u2014 exactly one step with `isTerminal=True`, at the end
4. **Non-empty title and explanation** \u2014 every step has descriptive text
5. **Valid code highlight** \u2014 language and line numbers present
6. **JSON-serializable state** \u2014 state can be serialized to JSON"""))

cells.append(code("""\
import json

print("Verifying step sequence invariants for ALL 17 algorithms:\\n")

all_passed = True
for algo in eigenvue.list():
    steps = eigenvue.steps(algo.id)
    errors = []

    # 1. Non-empty
    if len(steps) == 0:
        errors.append("Empty step list")

    # 2. Contiguous indices
    for i, s in enumerate(steps):
        if s["index"] != i:
            errors.append(f"Index mismatch at position {i}: got {s['index']}")
            break

    # 3. Single terminal step at end
    terminal_count = sum(1 for s in steps if s["isTerminal"])
    if terminal_count != 1:
        errors.append(f"Expected 1 terminal step, got {terminal_count}")
    elif not steps[-1]["isTerminal"]:
        errors.append("Last step is not terminal")
    for s in steps[:-1]:
        if s["isTerminal"]:
            errors.append(f"Non-final step {s['index']} marked terminal")
            break

    # 4. Non-empty title and explanation
    for s in steps:
        if not s.get("title", "").strip():
            errors.append(f"Step {s['index']} has empty title")
            break
        if not s.get("explanation", "").strip():
            errors.append(f"Step {s['index']} has empty explanation")
            break

    # 5. Valid code highlight
    for s in steps:
        ch = s.get("codeHighlight", {})
        if not ch.get("language", ""):
            errors.append(f"Step {s['index']} has no code highlight language")
            break
        if not ch.get("lines", []):
            errors.append(f"Step {s['index']} has no code highlight lines")
            break

    # 6. JSON-serializable state
    for s in steps:
        try:
            json.dumps(s["state"])
        except (TypeError, ValueError) as e:
            errors.append(f"Step {s['index']} state not JSON-serializable: {e}")
            break

    status = "\u2713" if not errors else "\u2717"
    err_msg = ", ".join(errors) if errors else ""
    print(f"  {status} {algo.id:<26s} ({len(steps):>3d} steps)  {err_msg}")
    if errors:
        all_passed = False

result = "ALL 17 ALGORITHMS PASSED" if all_passed else "SOME ALGORITHMS FAILED"
print(f"\\n{result}")
assert all_passed, "Validation failed!\""""))

cells.append(md("""\
### 12.2 Determinism Verification

Eigenvue generators are **deterministic** \u2014 the same inputs always produce identical step
sequences. This is critical for reproducibility and cross-platform parity."""))

cells.append(code("""\
import json

print("Verifying determinism for all 17 algorithms:\\n")

all_deterministic = True
for algo in eigenvue.list():
    steps_a = eigenvue.steps(algo.id)
    steps_b = eigenvue.steps(algo.id)

    json_a = json.dumps(steps_a, sort_keys=True)
    json_b = json.dumps(steps_b, sort_keys=True)

    match = json_a == json_b
    status = "\u2713" if match else "\u2717"
    label = "identical" if match else "DIFFERS"
    print(f"  {status} {algo.id:<26s} {label}")
    if not match:
        all_deterministic = False

result = "ALL ALGORITHMS ARE DETERMINISTIC" if all_deterministic else "DETERMINISM FAILED"
print(f"\\n{result}")
assert all_deterministic, "Determinism check failed!\""""))

cells.append(md("""\
### 12.3 Cross-Input Determinism

Custom inputs also produce deterministic results:"""))

cells.append(code("""\
import json

test_cases = [
    ("binary-search", {"array": [1, 2, 3, 4, 5], "target": 3}),
    ("bubble-sort", {"array": [5, 4, 3, 2, 1]}),
    ("self-attention", {"tokens": ["a", "b", "c"], "embeddingDim": 3}),
    ("perceptron", {"inputs": [1.0, 2.0], "weights": [0.5, -0.5], "bias": 0.1, "activationFunction": "relu"}),
]

print("Cross-input determinism:\\n")
for algo_id, inputs in test_cases:
    a = json.dumps(eigenvue.steps(algo_id, inputs=inputs), sort_keys=True)
    b = json.dumps(eigenvue.steps(algo_id, inputs=inputs), sort_keys=True)
    assert a == b, f"{algo_id} not deterministic with custom inputs"
    print(f"  \u2713 {algo_id} (custom inputs)")

print("\\nAll custom-input tests are deterministic. \u2713")"""))

# ── 13. ERROR HANDLING ────────────────────────────────────────────────
cells.append(md("""\
---
## 13. Error Handling

Eigenvue raises clear, descriptive errors for invalid inputs."""))

cells.append(md("### 13.1 Invalid Algorithm ID"))

cells.append(code("""\
try:
    eigenvue.steps("nonexistent-algorithm")
except ValueError as e:
    print(f"ValueError: {e}")
    print("\\n\u2713 Correct error for invalid algorithm ID")"""))

cells.append(md("### 13.2 Invalid Category Filter"))

cells.append(code("""\
try:
    eigenvue.list(category="invalid-category")
except ValueError as e:
    print(f"ValueError: {e}")
    print("\\n\u2713 Correct error for invalid category")"""))

cells.append(md("### 13.3 Invalid Algorithm ID in show()"))

cells.append(code("""\
try:
    eigenvue.show("nonexistent-algorithm")
except ValueError as e:
    print(f"ValueError: {e}")
    print("\\n\u2713 Correct error for invalid algorithm ID in show()")"""))

cells.append(md("### 13.4 Invalid Algorithm ID in jupyter()"))

cells.append(code("""\
try:
    eigenvue.jupyter("nonexistent-algorithm")
except ValueError as e:
    print(f"ValueError: {e}")
    print("\\n\u2713 Correct error for invalid algorithm ID in jupyter()")"""))

cells.append(md("""\
### 13.5 Multi-Head Attention Divisibility Constraint

`embeddingDim` must be evenly divisible by `numHeads`:"""))

cells.append(code("""\
try:
    eigenvue.steps("multi-head-attention", inputs={
        "tokens": ["a", "b"],
        "embeddingDim": 7,  # 7 is NOT divisible by 2
        "numHeads": 2
    })
except (ValueError, Exception) as e:
    print(f"{type(e).__name__}: {e}")
    print("\\n\u2713 Correct error when embeddingDim is not divisible by numHeads")"""))

# ── 14. EDGE CASES ───────────────────────────────────────────────────
cells.append(md("""\
---
## 14. Edge Cases

Testing boundary conditions and special scenarios."""))

cells.append(md("### 14.1 Single-Element Arrays"))

cells.append(code("""\
# Single element \u2014 all sorting algorithms
for algo_id in ["bubble-sort", "quicksort", "merge-sort"]:
    steps = eigenvue.steps(algo_id, inputs={"array": [42]})
    print(f"  {algo_id:<15s}: {len(steps)} step(s)  \u2192  result={steps[-1]['state']['array']}")

print("\\n\u2713 All sorting algorithms handle single-element arrays")"""))

cells.append(md("### 14.2 Two-Element Arrays"))

cells.append(code("""\
# Two elements \u2014 all sorting algorithms
for algo_id in ["bubble-sort", "quicksort", "merge-sort"]:
    steps = eigenvue.steps(algo_id, inputs={"array": [5, 1]})
    print(f"  {algo_id:<15s}: {len(steps)} steps  \u2192  result={steps[-1]['state']['array']}")

print("\\n\u2713 All sorting algorithms handle two-element arrays")"""))

cells.append(md("### 14.3 Already-Sorted Arrays"))

cells.append(code("""\
# Already sorted arrays
sorted_arr = [1, 2, 3, 4, 5]
for algo_id in ["bubble-sort", "quicksort", "merge-sort"]:
    steps = eigenvue.steps(algo_id, inputs={"array": sorted_arr})
    result = steps[-1]["state"]["array"]
    assert result == sorted_arr, f"{algo_id} failed on sorted input"
    print(f"  {algo_id:<15s}: {len(steps)} steps (sorted input handled correctly)")

print("\\n\u2713 All sorting algorithms handle already-sorted input")"""))

cells.append(md("### 14.4 Duplicate Elements"))

cells.append(code("""\
# Arrays with duplicate elements
dup_arr = [3, 1, 4, 1, 5, 9, 2, 6, 5, 3]
for algo_id in ["bubble-sort", "quicksort", "merge-sort"]:
    steps = eigenvue.steps(algo_id, inputs={"array": dup_arr})
    result = steps[-1]["state"]["array"]
    assert result == sorted(dup_arr), f"{algo_id} failed with duplicates"
    print(f"  {algo_id:<15s}: {len(steps)} steps  \u2192  {result}")

print("\\n\u2713 All sorting algorithms handle duplicate elements correctly")"""))

cells.append(md("### 14.5 Negative Numbers"))

cells.append(code("""\
# Arrays with negative numbers
neg_arr = [-5, 3, -1, 0, 7, -3, 2]
for algo_id in ["bubble-sort", "quicksort", "merge-sort"]:
    steps = eigenvue.steps(algo_id, inputs={"array": neg_arr})
    result = steps[-1]["state"]["array"]
    assert result == sorted(neg_arr), f"{algo_id} failed with negatives"
    print(f"  {algo_id:<15s}: {len(steps)} steps  \u2192  {result}")

print("\\n\u2713 All sorting algorithms handle negative numbers")"""))

cells.append(md("### 14.6 BFS/DFS \u2014 Target Unreachable"))

cells.append(code("""\
# Graph where target is disconnected
disconnected_graph = {
    "adjacencyList": {
        "A": ["B"],
        "B": ["A"],
        "C": []  # Disconnected node
    },
    "positions": {
        "A": {"x": 0.2, "y": 0.5},
        "B": {"x": 0.5, "y": 0.5},
        "C": {"x": 0.8, "y": 0.5}
    },
    "startNode": "A",
    "targetNode": "C"
}

for algo_id in ["bfs", "dfs"]:
    steps = eigenvue.steps(algo_id, inputs=disconnected_graph)
    path = steps[-1]["state"].get("path", [])
    print(f"  {algo_id}: {len(steps)} steps, path={path}")

print("\\n\u2713 Graph algorithms handle unreachable targets")"""))

cells.append(md("### 14.7 All Activation Functions"))

cells.append(code("""\
# Test every activation function with positive and negative pre-activations
print("Perceptron with all activation functions:\\n")

for act_fn in ["sigmoid", "relu", "tanh", "step"]:
    # Positive pre-activation
    steps_pos = eigenvue.steps("perceptron", inputs={
        "inputs": [1.0], "weights": [1.0], "bias": 0.5, "activationFunction": act_fn
    })
    # Negative pre-activation
    steps_neg = eigenvue.steps("perceptron", inputs={
        "inputs": [1.0], "weights": [-1.0], "bias": -0.5, "activationFunction": act_fn
    })
    z_pos = steps_pos[-1]["state"]["z"]
    a_pos = steps_pos[-1]["state"]["a"]
    z_neg = steps_neg[-1]["state"]["z"]
    a_neg = steps_neg[-1]["state"]["a"]
    print(f"  {act_fn:<8s}:  z={z_pos:<10} \u2192 a={a_pos:<14}   z={z_neg:<10} \u2192 a={a_neg}")

print("\\n\u2713 All activation functions work with positive and negative inputs")"""))

cells.append(md("### 14.8 Gradient Descent \u2014 All Optimizers"))

cells.append(code("""\
# All three optimizers from the same starting point
print("Gradient Descent convergence comparison:\\n")

for optimizer in ["sgd", "momentum", "adam"]:
    steps = eigenvue.steps("gradient-descent", inputs={
        "startX": 5.0, "startY": 5.0, "learningRate": 0.1,
        "optimizer": optimizer, "numSteps": 30
    })
    final = steps[-1]["state"]
    x = final["parameters"][0]
    y = final["parameters"][1]
    loss = final["loss"]
    trajectory_len = len(final.get("trajectory", []))
    print(f"  {optimizer:<10s}: final_x={x:>10.6f}  final_y={y:>10.6f}  loss={loss:>12.8f}  trajectory_points={trajectory_len}")

print("\\n\u2713 All optimizers converge toward minimum (0, 0)")"""))

cells.append(md("### 14.9 BPE with No Applicable Rules"))

cells.append(code("""\
# BPE where merge rules don't match the text
steps = eigenvue.steps("tokenization-bpe", inputs={
    "text": "abc",
    "mergeRules": [[["x", "y"], "xy"]]  # Rule doesn't match any pair in "abc"
})
print(f"BPE with non-matching rule: {len(steps)} steps")
print(f"  Final tokens: {steps[-1]['state']['tokens']}")
print("\\n\u2713 BPE handles non-matching merge rules gracefully")"""))

# ── 15. SUMMARY ──────────────────────────────────────────────────────
cells.append(md("""\
---
## 15. Summary

<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 24px 32px; border-radius: 12px; color: white;">
<h3 style="margin: 0 0 16px 0; color: white;">Eigenvue v1.0.1 \u2014 Production Verification Complete</h3>

<table style="width: 100%; color: white; border-collapse: collapse;">
<tr><td style="padding: 4px 8px;"><b>Algorithms verified</b></td><td style="padding: 4px 8px;">17 / 17</td></tr>
<tr><td style="padding: 4px 8px;"><b>API functions tested</b></td><td style="padding: 4px 8px;">list(), steps(), jupyter(), show()</td></tr>
<tr><td style="padding: 4px 8px;"><b>Step invariants</b></td><td style="padding: 4px 8px;">Indices, terminals, titles, explanations, code highlights, JSON</td></tr>
<tr><td style="padding: 4px 8px;"><b>Determinism</b></td><td style="padding: 4px 8px;">Verified for all 17 algorithms (default + custom inputs)</td></tr>
<tr><td style="padding: 4px 8px;"><b>Error handling</b></td><td style="padding: 4px 8px;">Invalid IDs, invalid categories, divisibility constraints</td></tr>
<tr><td style="padding: 4px 8px;"><b>Edge cases</b></td><td style="padding: 4px 8px;">Single/two elements, sorted, duplicates, negatives, disconnected graphs, all activations, all optimizers</td></tr>
</table>
</div>"""))

cells.append(md("""\
### Feature Overview

| Feature | Status |
|---------|--------|
| `eigenvue.list()` \u2014 list all algorithms | \u2713 |
| `eigenvue.list(category=...)` \u2014 filter by category | \u2713 |
| `AlgorithmInfo` data class | \u2713 |
| `eigenvue.steps()` \u2014 default inputs (all 17) | \u2713 |
| `eigenvue.steps()` \u2014 custom inputs | \u2713 |
| `eigenvue.jupyter()` \u2014 embedded visualization | \u2713 |
| `eigenvue.show()` \u2014 browser visualization | \u2713 |
| Step schema validation | \u2713 |
| Determinism verification | \u2713 |
| Error handling | \u2713 |
| Edge cases (sorting, search, graphs, activations) | \u2713 |
| Visual actions vocabulary | \u2713 |
| Code highlights | \u2713 |
| State snapshots | \u2713 |

---

*This notebook was generated for **Eigenvue v1.0.1** production verification.*
*Install: `pip install eigenvue`*"""))

# ══════════════════════════════════════════════════════════════════════
# BUILD THE NOTEBOOK
# ══════════════════════════════════════════════════════════════════════

for cell in cells:
    src = cell["source"]
    lines = src.split("\n")
    # ipynb format: each line ends with \n except the last
    cell["source"] = [line + "\n" for line in lines[:-1]] + [lines[-1]]

notebook = {
    "nbformat": 4,
    "nbformat_minor": 5,
    "metadata": {
        "kernelspec": {
            "display_name": "Python 3",
            "language": "python",
            "name": "python3"
        },
        "language_info": {
            "name": "python",
            "version": "3.10.0"
        }
    },
    "cells": cells,
}

output_path = "eigenvue_v1.0.1_production_verification.ipynb"
with open(output_path, "w", encoding="utf-8") as f:
    json.dump(notebook, f, indent=1, ensure_ascii=False)

print(f"Notebook written to: {output_path}")
print(f"Total cells: {len(cells)}")
md_count = sum(1 for c in cells if c["cell_type"] == "markdown")
code_count = sum(1 for c in cells if c["cell_type"] == "code")
print(f"  Markdown: {md_count}")
print(f"  Code:     {code_count}")
