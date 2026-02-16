// Eigenvue — Minimal Step Visualizer
(function () {
  "use strict";

  let steps = [];
  let currentIndex = 0;
  let playInterval = null;

  const $ = (id) => document.getElementById(id);

  function render() {
    const step = steps[currentIndex];
    if (!step) return;

    $("step-title").textContent = step.title;
    $("step-explanation").textContent = step.explanation;
    $("state-display").textContent = JSON.stringify(step.state, null, 2);
    $("step-counter").textContent = `${currentIndex + 1} / ${steps.length}`;

    $("btn-first").disabled = currentIndex === 0;
    $("btn-prev").disabled = currentIndex === 0;
    $("btn-next").disabled = currentIndex === steps.length - 1;
    $("btn-last").disabled = currentIndex === steps.length - 1;

    document.querySelectorAll(".step-chip").forEach((chip, i) => {
      chip.classList.toggle("active", i === currentIndex);
    });
  }

  function goTo(index) {
    if (index < 0 || index >= steps.length) return;
    currentIndex = index;
    render();
  }

  function togglePlay() {
    if (playInterval) {
      clearInterval(playInterval);
      playInterval = null;
      $("btn-play").innerHTML = "&#9654;";
    } else {
      $("btn-play").innerHTML = "&#9646;&#9646;";
      playInterval = setInterval(() => {
        if (currentIndex >= steps.length - 1) {
          clearInterval(playInterval);
          playInterval = null;
          $("btn-play").innerHTML = "&#9654;";
          return;
        }
        goTo(currentIndex + 1);
      }, 800);
    }
  }

  function buildStepChips() {
    const container = $("step-id-list");
    container.innerHTML = "";
    steps.forEach((step, i) => {
      const chip = document.createElement("span");
      chip.className = "step-chip" + (step.isTerminal ? " terminal" : "");
      chip.textContent = step.id;
      chip.title = step.title;
      chip.addEventListener("click", () => goTo(i));
      container.appendChild(chip);
    });
  }

  async function init() {
    try {
      const res = await fetch("/api/steps");
      const data = await res.json();

      $("algo-name").textContent = data.meta?.name || data.algorithmId;
      $("algo-description").textContent =
        data.meta?.description?.short || "";

      steps = data.steps || [];
      if (steps.length === 0) {
        $("step-title").textContent = "No steps generated.";
        return;
      }

      buildStepChips();
      render();

      document.addEventListener("keydown", (e) => {
        if (e.key === "ArrowRight" || e.key === "l") goTo(currentIndex + 1);
        else if (e.key === "ArrowLeft" || e.key === "h") goTo(currentIndex - 1);
        else if (e.key === "Home") goTo(0);
        else if (e.key === "End") goTo(steps.length - 1);
        else if (e.key === " ") { e.preventDefault(); togglePlay(); }
      });

      $("btn-first").addEventListener("click", () => goTo(0));
      $("btn-prev").addEventListener("click", () => goTo(currentIndex - 1));
      $("btn-next").addEventListener("click", () => goTo(currentIndex + 1));
      $("btn-last").addEventListener("click", () => goTo(steps.length - 1));
      $("btn-play").addEventListener("click", togglePlay);
    } catch (err) {
      $("algo-name").textContent = "Error loading visualization";
      $("step-explanation").textContent = err.message;
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
