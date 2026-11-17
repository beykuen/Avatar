// 控制面板 DOM 建構與狀態同步
import { CATEGORIES, TEXT_MAX_LENGTH } from "./catalog.js";
import { buildThumbnailSvg } from "./compose.js";

let root = null;
let textInput = null;

function el(tag, attrs = {}, children = []) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  for (const c of children) e.append(c);
  return e;
}

function makeOption(cat, opt) {
  const btn = el("button", {
    type: "button",
    class: `opt opt-${cat.kind}`,
    "data-category": cat.id,
    "data-option-id": opt.id,
    "aria-pressed": "false",
    "aria-label": opt.name,
  });
  if (cat.kind === "color") {
    btn.style.setProperty("--swatch", opt.color);
    btn.append(el("span", { class: "check", "aria-hidden": "true" }, ["✓"]));
  } else if (cat.kind === "item") {
    const thumb = el("span", { class: "thumb" });
    if (opt.id === "none") {
      thumb.classList.add("thumb-none");
      thumb.append("⊘");
    } else if (opt.id === "scene-transparent") {
      thumb.classList.add("thumb-checker");
    } else {
      const svg = buildThumbnailSvg(cat.id, opt.id);
      const img = el("img", {
        alt: "",
        width: "56",
        height: "56",
        draggable: "false",
        src: "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg),
      });
      thumb.append(img);
    }
    btn.append(thumb, el("span", { class: "label" }, [opt.name]));
  } else {
    btn.append(opt.name);
  }
  return btn;
}

export function buildControls(rootEl, { onSelect, onText }) {
  root = rootEl;
  rootEl.addEventListener("click", (e) => {
    const btn = e.target.closest("button.opt");
    if (btn && rootEl.contains(btn)) onSelect(btn.dataset.category, btn.dataset.optionId);
  });
  for (const cat of CATEGORIES) {
    const panel = rootEl.querySelector(`.tab-panel[data-tab="${cat.tab}"]`);
    if (!panel) continue;
    if (cat.id === "textColor") {
      textInput = el("input", {
        type: "text",
        id: "sticker-text",
        maxlength: String(TEXT_MAX_LENGTH),
        placeholder: "輸入貼圖文字（最多 20 字）",
        autocomplete: "off",
        "aria-label": "貼圖文字",
      });
      textInput.addEventListener("input", () => onText(textInput.value));
      textInput.addEventListener("compositionend", () => onText(textInput.value));
      panel.append(
        el("fieldset", { "data-category": "text" }, [el("legend", {}, ["文字內容"]), textInput])
      );
    }
    const group = el("div", { class: "opt-group" });
    for (const opt of cat.options) group.append(makeOption(cat, opt));
    panel.append(el("fieldset", { "data-category": cat.id }, [el("legend", {}, [cat.name]), group]));
  }
}

export function syncControls(state) {
  if (!root) return;
  for (const btn of root.querySelectorAll("button.opt")) {
    const on = state[btn.dataset.category] === btn.dataset.optionId;
    btn.setAttribute("aria-pressed", on ? "true" : "false");
  }
  if (textInput && textInput.value !== state.text) textInput.value = state.text;
}

export function initTabs(rootEl) {
  const tabs = [...rootEl.querySelectorAll('[role="tab"]')];
  const panels = [...rootEl.querySelectorAll(".tab-panel")];
  const select = (name) => {
    for (const t of tabs) t.setAttribute("aria-selected", t.dataset.tabTarget === name ? "true" : "false");
    for (const p of panels) p.hidden = p.dataset.tab !== name;
  };
  for (const t of tabs) t.addEventListener("click", () => select(t.dataset.tabTarget));
  select("doll");
}

export function showExportDialog({ dataUrl, blob, filename }, onDownload) {
  const dialog = document.getElementById("export-dialog");
  document.getElementById("export-image").src = dataUrl;
  document.getElementById("btn-download-again").onclick = () => onDownload(blob, filename);
  document.getElementById("btn-close-dialog").onclick = () => dialog.close();
  if (!dialog.open) dialog.showModal();
}
