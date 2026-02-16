export {
  registerLayout,
  getLayout,
  getRegisteredLayoutNames,
  clearLayoutRegistry,
} from "./registry";

// Import layout modules so they self-register on load.
// Phase 4: First layout.
import "./array-with-pointers";

// Phase 6: Classical algorithms layouts.
import "./array-comparison";
import "./graph-network";

// Phase 8: Generative AI layouts.
import "./token-sequence";
import "./attention-heatmap";
import "./layer-diagram";

// Phase 9: Deep Learning layouts.
import "./neuron-diagram";
import "./layer-network";
import "./convolution-grid";
import "./loss-landscape";
