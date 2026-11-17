// 進入點：持有狀態、串接各模組、渲染排程、測試掛鉤
import { CATEGORIES, LAYER_ORDER, FIGURE_BOUNDS, TEXT_BANDS } from "./catalog.js";
import { createDefaultState, setOption, setText, randomizeState, resetState } from "./state.js";
import { buildSceneSvg, layoutText, renderSticker } from "./compose.js";
import { exportFromCanvas, triggerDownload } from "./exporter.js";
import { buildControls, syncControls, initTabs, showExportDialog } from "./ui.js";

let state = createDefaultState();

const previewCanvas = document.getElementById("preview-canvas");
const exportCanvas = document.getElementById("export-canvas");
const controlArea = document.querySelector(".control-area");

let rafId = 0;
let running = false;
let dirty = false;
let renderPromise = Promise.resolve();
let renderDone = null;

function isBusy() {
  return dirty || running || rafId !== 0;
}

function scheduleRender() {
  dirty = true;
  if (!renderDone) {
    renderPromise = new Promise((r) => (renderDone = r));
  }
  if (rafId || running) return;
  rafId = requestAnimationFrame(runRender);
}

async function runRender() {
  rafId = 0;
  running = true;
  try {
    while (dirty) {
      dirty = false;
      const s = state;
      await Promise.all([renderSticker(s, previewCanvas, 2), renderSticker(s, exportCanvas, 1)]);
    }
  } catch (err) {
    console.error(err);
  }
  running = false;
  const done = renderDone;
  renderDone = null;
  if (done) done();
}

function update(newState) {
  state = newState;
  syncControls(state);
  scheduleRender();
}

async function doExport() {
  if (isBusy()) await renderPromise;
  const result = exportFromCanvas(exportCanvas);
  triggerDownload(result.blob, result.filename);
  showExportDialog(result, (blob, filename) => triggerDownload(blob, filename));
}

buildControls(controlArea, {
  onSelect: (c, o) => update(setOption(state, c, o)),
  onText: (t) => update(setText(state, t)),
});
initTabs(controlArea);

document.getElementById("btn-random").addEventListener("click", () => update(randomizeState(state)));
document.getElementById("btn-reset").addEventListener("click", () => update(resetState()));
document.getElementById("btn-export").addEventListener("click", doExport);

window.__stickerApp = {
  getState: () => ({ ...state }),
  whenRendered: () => (isBusy() ? renderPromise : Promise.resolve()),
  buildSceneSvg: (s = state) => buildSceneSvg(s),
  getTextLayout: () => layoutText(exportCanvas.getContext("2d"), state.text, state.textPosition),
  catalog: { CATEGORIES, LAYER_ORDER, FIGURE_BOUNDS, TEXT_BANDS },
};

syncControls(state);
scheduleRender();
