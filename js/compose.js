// 合成：由設計狀態產生 SVG，並繪製到 canvas（預覽與輸出共用）
import {
  CANVAS_WIDTH, CANVAS_HEIGHT, TEXT_BANDS, TEXT_MAX_WIDTH, LINE_COLOR,
  LAYER_ORDER, BASE_PARTS, CATEGORIES, getOption,
} from "./catalog.js";

const FONT_FAMILY = '"PingFang TC","Heiti TC","Microsoft JhengHei","Noto Sans CJK TC","Noto Sans TC",sans-serif';
const SVG_OPEN = `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" viewBox="0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}">`;

export function resolveTokens(fragment, state) {
  const skin = getOption("skin", state.skin) || getOption("skin", "skin-fair");
  const hair = getOption("hairColor", state.hairColor) || getOption("hairColor", "haircolor-brown");
  return fragment
    .replace(/\{\{skinShade\}\}/g, skin.shade)
    .replace(/\{\{skin\}\}/g, skin.color)
    .replace(/\{\{hairShade\}\}/g, hair.shade)
    .replace(/\{\{hair\}\}/g, hair.color)
    .replace(/\{\{line\}\}/g, LINE_COLOR);
}

function collectLayers(state) {
  const layers = {};
  for (const slot of LAYER_ORDER) layers[slot] = BASE_PARTS[slot] || "";
  for (const cat of CATEGORIES) {
    if (cat.kind !== "item") continue;
    const opt = getOption(cat.id, state[cat.id]);
    if (!opt || !opt.parts) continue;
    for (const [slot, frag] of Object.entries(opt.parts)) {
      if (slot in layers) layers[slot] += frag;
    }
  }
  return layers;
}

export function buildSceneSvg(state) {
  const layers = collectLayers(state);
  const body = LAYER_ORDER.map((slot) => `<g data-layer="${slot}">${resolveTokens(layers[slot], state)}</g>`).join("");
  return SVG_OPEN + body + "</svg>";
}

// 縮圖用基底狀態（無背景、無衣物，固定預設膚色與髮色）
const THUMB_BASE = {
  skin: "skin-fair", hairStyle: "hair-short", hairColor: "haircolor-brown",
  expression: "expr-happy", top: "none", bottom: "none", hat: "none",
  glasses: "none", handheld: "none", vehicle: "none", scene: "scene-transparent",
};

export function buildThumbnailSvg(categoryId, optionId) {
  const cat = CATEGORIES.find((c) => c.id === categoryId);
  if (!cat || cat.kind !== "item") return null;
  const opt = getOption(categoryId, optionId);
  if (!opt) return null;
  const state = { ...THUMB_BASE, [categoryId]: optionId };
  const layers = collectLayers(state);
  const body = LAYER_ORDER.map((slot) => `<g>${resolveTokens(layers[slot], state)}</g>`).join("");
  const vb = opt.thumbViewBox || `0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}">${body}</svg>`;
}

export function layoutText(ctx, text, position) {
  const band = TEXT_BANDS[position] || TEXT_BANDS.bottom;
  const base = { visible: false, text, font: "", fontSize: 0, x: CANVAS_WIDTH / 2, y: band.centerY, maxWidth: TEXT_MAX_WIDTH };
  if (typeof text !== "string" || text.trim() === "") return base;
  let size = 36;
  let font = `bold ${size}px ${FONT_FAMILY}`;
  for (;;) {
    font = `bold ${size}px ${FONT_FAMILY}`;
    ctx.font = font;
    if (ctx.measureText(text).width <= TEXT_MAX_WIDTH || size <= 14) break;
    size -= 1;
  }
  return { ...base, visible: true, font, fontSize: size };
}

export async function loadSvgImage(svgString) {
  const img = new Image();
  img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgString);
  await img.decode();
  return img;
}

export async function renderSticker(state, canvas, scale = 1) {
  const img = await loadSvgImage(buildSceneSvg(state));
  canvas.width = CANVAS_WIDTH * scale;
  canvas.height = CANVAS_HEIGHT * scale;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.scale(scale, scale);
  const layout = layoutText(ctx, state.text, state.textPosition);
  if (layout.visible) {
    const color = (getOption("textColor", state.textColor) || getOption("textColor", "textcolor-black")).color;
    ctx.font = layout.font;
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(layout.text, layout.x, layout.y, layout.maxWidth);
  }
  ctx.restore();
}
