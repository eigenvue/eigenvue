/**
 * Static data constants for the landing page.
 *
 * All display text, category definitions, features, and other
 * content that appears on the landing page lives here. This makes
 * it easy to audit, update, and eventually localize.
 */

export type CategoryId = "classical" | "deeplearning" | "genai" | "quantum";

export interface CategoryDefinition {
  id: CategoryId;
  name: string;
  tagline: string;
  description: string;
  accentColor: string;
  /** Topics shown as pills/tags on the card */
  topics: string[];
  /** Algorithm count for this category at launch */
  algorithmCount: number;
  /** Icon identifier — maps to an SVG or icon component */
  icon: string;
  /** Whether this category is available in v1 */
  available: boolean;
}

export const CATEGORIES: CategoryDefinition[] = [
  {
    id: "classical",
    name: "Classical Algorithms",
    tagline: "The foundations of computer science",
    description:
      "Binary search, sorting, graph traversal, and shortest paths — visualized step by step with full code synchronization.",
    accentColor: "#38bdf8",
    topics: ["Binary Search", "QuickSort", "Merge Sort", "BFS", "DFS", "Dijkstra"],
    algorithmCount: 7,
    icon: "binary-tree",
    available: true,
  },
  {
    id: "deeplearning",
    name: "Deep Learning",
    tagline: "Neural networks from neuron to network",
    description:
      "Watch signals propagate through neurons, see backpropagation compute gradients, and understand convolution at the pixel level.",
    accentColor: "#8b5cf6",
    topics: ["Perceptron", "Feedforward", "Backprop", "Convolution", "Gradient Descent"],
    algorithmCount: 5,
    icon: "network",
    available: true,
  },
  {
    id: "genai",
    name: "Generative AI",
    tagline: "Transformers and attention, demystified",
    description:
      "See how text becomes tokens, tokens become embeddings, and attention computes which words matter to each other.",
    accentColor: "#f472b6",
    topics: ["Tokenization", "Embeddings", "Self-Attention", "Multi-Head", "Transformer"],
    algorithmCount: 5,
    icon: "sparkles",
    available: true,
  },
  {
    id: "quantum",
    name: "Quantum Computing",
    tagline: "Qubits, gates, and superposition",
    description:
      "Bloch spheres, quantum gates, and algorithms like Grover's search — visualized in ways that build real intuition.",
    accentColor: "#00ffc8",
    topics: ["Bloch Sphere", "Quantum Gates", "Grover's Search", "Teleportation"],
    algorithmCount: 0,
    icon: "atom",
    available: false,
  },
];

export interface FeatureDefinition {
  title: string;
  description: string;
  icon: string;
}

export const FEATURES: FeatureDefinition[] = [
  {
    title: "Step-by-Step Playback",
    description:
      "Play, pause, step forward, step backward, and scrub through any algorithm at your own pace.",
    icon: "play-circle",
  },
  {
    title: "Synchronized Code",
    description:
      "Every step highlights the exact line of code being executed. See the connection between logic and visualization.",
    icon: "code",
  },
  {
    title: "Plain-Language Explanations",
    description:
      "Each step includes a human-readable explanation of what just happened and why it matters.",
    icon: "message-circle",
  },
  {
    title: "Custom Inputs",
    description:
      "Modify the input data and parameters to see how the algorithm behaves differently. Real understanding comes from experimentation.",
    icon: "sliders",
  },
  {
    title: "Shareable Links",
    description:
      "Every visualization state has a unique URL. Share the exact step you're looking at with anyone.",
    icon: "link",
  },
  {
    title: "Python Integration",
    description:
      "pip install eigenvue — use the same visualizations in Jupyter notebooks and Python scripts.",
    icon: "terminal",
  },
];
