import { getPlaywright } from "./pw.js";
import { startServer } from "./server.js";

export async function setup() {
  const pw = await getPlaywright();
  const server = await startServer();
  const browser = await pw.chromium.launch();
  return { pw, server, browser, devices: pw.devices };
}
export async function teardown(ctx) {
  await ctx.browser.close();
  await ctx.server.close();
}
export async function openPage(ctx, contextOptions = {}) {
  const context = await ctx.browser.newContext({ acceptDownloads: true, ...contextOptions });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto(ctx.server.url);
  await page.waitForFunction(() => window.__stickerApp);
  await page.evaluate(() => window.__stickerApp.whenRendered());
  page.errors = errors;
  return { page, context };
}
export const opt = (c, o) => `button.opt[data-category="${c}"][data-option-id="${o}"]`;
export async function openTab(page, tab, how = "click") {
  await page[how === "tap" ? "tap" : "click"](`[data-tab-target="${tab}"]`);
}
export async function select(page, tab, cat, id, how = "click") {
  await openTab(page, tab, how);
  await page[how === "tap" ? "tap" : "click"](opt(cat, id));
  await page.evaluate(() => window.__stickerApp.whenRendered());
}
export const getState = (page) => page.evaluate(() => window.__stickerApp.getState());
export const rendered = (page) => page.evaluate(() => window.__stickerApp.whenRendered());

// 讀取 canvas 像素
export const pixel = (page, sel, x, y) =>
  page.evaluate(([sel, x, y]) => {
    const c = document.querySelector(sel);
    const d = c.getContext("2d").getImageData(x, y, 1, 1).data;
    return [d[0], d[1], d[2], d[3]];
  }, [sel, x, y]);
export const canvasHash = (page, sel) =>
  page.evaluate((sel) => {
    const c = document.querySelector(sel);
    const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
    let h = 0;
    for (let i = 0; i < d.length; i++) h = (h * 31 + d[i]) | 0;
    return h;
  }, sel);

export const TABS = { doll: ["skin", "hairStyle", "hairColor", "expression"], clothes: ["top", "bottom"], accessory: ["hat", "glasses", "handheld"], vehicle: ["vehicle"], scene: ["scene"], text: ["textColor", "textPosition"] };
export const TAB_OF = Object.fromEntries(Object.entries(TABS).flatMap(([t, cs]) => cs.map((c) => [c, t])));

// 所有圖層 bbox（370x320 座標）
export function layerBoxes(page, state) {
  return page.evaluate((state) => {
    const svgStr = window.__stickerApp.buildSceneSvg(state);
    const host = document.createElement("div");
    host.style.cssText = "position:absolute;left:-9999px;top:0";
    host.innerHTML = svgStr;
    document.body.append(host);
    const out = {};
    for (const g of host.querySelectorAll("g[data-layer]")) {
      const b = g.getBBox();
      out[g.dataset.layer] = { x: b.x, y: b.y, w: b.width, h: b.height, empty: g.children.length === 0 };
    }
    host.remove();
    return out;
  }, state);
}
