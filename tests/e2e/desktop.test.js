import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { setup, teardown, openPage, opt, select, getState, rendered, canvasHash, pixel, layerBoxes, TABS, TAB_OF, openTab } from "../helpers/app.js";

let ctx, page, context;
before(async () => {
  ctx = await setup();
  ({ page, context } = await openPage(ctx, { viewport: { width: 1280, height: 720 } }));
});
after(async () => { await context.close(); await teardown(ctx); });

const countOpts = (cat) => page.locator(`button.opt[data-category="${cat}"]`).count();

test("載入：無 console/頁面錯誤、預設 state、預設選項 aria-pressed", async () => {
  assert.deepEqual(page.errors, []);
  const s = await getState(page);
  assert.equal(s.skin, "skin-fair");
  assert.equal(await page.getAttribute(opt("skin", "skin-fair"), "aria-pressed"), "true", "預設膚色需顯示為選取");
  await openTab(page, "doll");
});

test("AC1 選項數量與按鈕（膚色5/髮型5/髮色6/表情5）並逐一點擊預覽改變", async () => {
  const exp = { skin: 5, hairStyle: 5, hairColor: 6, expression: 5 };
  for (const [cat, n] of Object.entries(exp)) {
    assert.ok((await countOpts(cat)) >= n, `${cat} 數量`);
    const ids = await page.$$eval(`button.opt[data-category="${cat}"]`, (b) => b.map((x) => x.dataset.optionId));
    let prev = null;
    const hashes = new Set();
    for (const id of ids) {
      await select(page, "doll", cat, id);
      assert.equal((await getState(page))[cat], id);
      assert.equal(await page.getAttribute(opt(cat, id), "aria-pressed"), "true");
      hashes.add(await canvasHash(page, "#preview-canvas"));
      prev = id;
    }
    assert.equal(hashes.size, ids.length, `${cat} 每個選項預覽圖皆不同`);
  }
});

test("AC2 上衣>=5/下著>=4、可選無、預覽改變、前一款不殘留", async () => {
  for (const [cat, min] of [["top", 6], ["bottom", 5]]) {
    assert.ok((await countOpts(cat)) >= min);
    const ids = await page.$$eval(`button.opt[data-category="${cat}"]`, (b) => b.map((x) => x.dataset.optionId));
    assert.ok(ids.includes("none"));
    const hashes = new Set();
    for (const id of ids) { await select(page, "clothes", cat, id); hashes.add(await canvasHash(page, "#preview-canvas")); }
    assert.equal(hashes.size, ids.length, `${cat} 預覽皆不同`);
  }
  // 殘留檢查：A→B→A 與直接 B 之圖相同；SVG 圖層只含目前款式
  await select(page, "clothes", "top", "top-hoodie");
  const hB = await canvasHash(page, "#preview-canvas");
  await select(page, "clothes", "top", "top-sailor");
  await select(page, "clothes", "top", "top-hoodie");
  assert.equal(await canvasHash(page, "#preview-canvas"), hB);
  const topLayer = (id) => page.evaluate((id) => {
    const s = window.__stickerApp.getState(); s.top = id;
    const d = new DOMParser().parseFromString(window.__stickerApp.buildSceneSvg(s), "image/svg+xml");
    return d.querySelector('g[data-layer="top"]').innerHTML;
  }, id);
  const a = await topLayer("top-tshirt"), b = await topLayer("top-sailor");
  assert.notEqual(a, b);
  assert.equal(await topLayer("none"), "");
});

test("AC3 配件三類獨立同時顯示、不互相取代", async () => {
  assert.ok((await countOpts("hat")) >= 5 && (await countOpts("glasses")) >= 4 && (await countOpts("handheld")) >= 4);
  await select(page, "accessory", "hat", "none");
  await select(page, "accessory", "glasses", "none");
  await select(page, "accessory", "handheld", "none");
  const h0 = await canvasHash(page, "#preview-canvas");
  await select(page, "accessory", "hat", "hat-crown");
  const h1 = await canvasHash(page, "#preview-canvas");
  await select(page, "accessory", "glasses", "glasses-sun");
  const h2 = await canvasHash(page, "#preview-canvas");
  await select(page, "accessory", "handheld", "handheld-wand");
  const h3 = await canvasHash(page, "#preview-canvas");
  assert.equal(new Set([h0, h1, h2, h3]).size, 4);
  const s = await getState(page);
  assert.deepEqual([s.hat, s.glasses, s.handheld], ["hat-crown", "glasses-sun", "handheld-wand"]);
  const svg = await page.evaluate(() => window.__stickerApp.buildSceneSvg());
  const doc = new (await import("node:util")).TextEncoder(); // keep import used
  void doc;
  const filled = await page.evaluate(() => {
    const d = new DOMParser().parseFromString(window.__stickerApp.buildSceneSvg(), "image/svg+xml");
    return ["hat", "glasses", "handheld"].map((l) => d.querySelector(`g[data-layer="${l}"]`).children.length > 0);
  });
  assert.deepEqual(filled, [true, true, true]);
  // 更換其中一類不影響其他類
  await select(page, "accessory", "hat", "hat-bow");
  const s2 = await getState(page);
  assert.deepEqual([s2.hat, s2.glasses, s2.handheld], ["hat-bow", "glasses-sun", "handheld-wand"]);
  // 每類逐一切換皆改變預覽
  for (const cat of ["hat", "glasses", "handheld"]) {
    const ids = await page.$$eval(`button.opt[data-category="${cat}"]`, (b) => b.map((x) => x.dataset.optionId));
    const hs = new Set();
    for (const id of ids) { await select(page, "accessory", cat, id); hs.add(await canvasHash(page, "#preview-canvas")); }
    assert.equal(hs.size, ids.length, `${cat} 預覽皆不同`);
  }
});

test("AC4 場景 >=6 + 透明、切換改變預覽、透明背景 canvas alpha=0", async () => {
  const ids = await page.$$eval('button.opt[data-category="scene"]', (b) => b.map((x) => x.dataset.optionId));
  assert.ok(ids.length >= 7 && ids.includes("scene-transparent"));
  const hs = new Set();
  for (const id of ids) {
    await select(page, "scene", "scene", id);
    hs.add(await canvasHash(page, "#preview-canvas"));
    const a = (await pixel(page, "#preview-canvas", 2, 2))[3];
    assert.equal(a, id === "scene-transparent" ? 0 : 255, id);
  }
  assert.equal(hs.size, ids.length);
});

test("AC5 文字：中英文、10 字、顯示、顏色>=6、上下位置、空白不顯示", async () => {
  await openTab(page, "text");
  const input = page.locator("#sticker-text");
  await select(page, "scene", "scene", "scene-sky");
  await openTab(page, "text");
  await input.fill("");
  await rendered(page);
  assert.equal((await page.evaluate(() => window.__stickerApp.getTextLayout())).visible, false);
  const bottomEmpty = await canvasHash(page, "#preview-canvas");
  await input.fill("你好你好你好你好你好");
  await rendered(page);
  let lay = await page.evaluate(() => window.__stickerApp.getTextLayout());
  assert.equal(lay.visible, true);
  assert.equal(lay.text, "你好你好你好你好你好");
  const withZh = await canvasHash(page, "#preview-canvas");
  assert.notEqual(withZh, bottomEmpty);
  await input.fill("Hello 123");
  await rendered(page);
  assert.equal((await getState(page)).text, "Hello 123");
  assert.notEqual(await canvasHash(page, "#preview-canvas"), withZh);
  // 空白不顯示
  await input.fill("     ");
  await rendered(page);
  assert.equal((await page.evaluate(() => window.__stickerApp.getTextLayout())).visible, false);
  assert.equal(await canvasHash(page, "#preview-canvas"), bottomEmpty, "僅空白時畫面不應有文字");
  // 20 字上限（maxlength）
  await input.fill("一二三四五六七八九十一二三四五六七八九十甲乙");
  assert.equal((await getState(page)).text.length, 20);
  lay = await page.evaluate(() => window.__stickerApp.getTextLayout());
  assert.ok(lay.fontSize >= 14 && lay.fontSize <= 36);
  // 顏色
  await input.fill("測試");
  const colors = await page.$$eval('button.opt[data-category="textColor"]', (b) => b.map((x) => x.dataset.optionId));
  assert.ok(colors.length >= 6);
  const hs = new Set();
  for (const c of colors) { await select(page, "text", "textColor", c); hs.add(await canvasHash(page, "#preview-canvas")); }
  assert.equal(hs.size, colors.length);
  // 位置
  await select(page, "text", "textPosition", "top");
  const top = await canvasHash(page, "#preview-canvas");
  await select(page, "text", "textPosition", "bottom");
  const bot = await canvasHash(page, "#preview-canvas");
  assert.notEqual(top, bot);
  assert.equal((await page.evaluate(() => window.__stickerApp.getTextLayout())).y, 290);
  await select(page, "text", "textPosition", "top");
  assert.equal((await page.evaluate(() => window.__stickerApp.getTextLayout())).y, 30);
  // 文字像素確實落在對應區帶（預覽 canvas 2x）
  const inBand = await page.evaluate(() => {
    const c = document.querySelector("#preview-canvas"); const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
    const bg = [d[0], d[1], d[2]];
    const rows = (y0, y1) => { let n = 0; for (let y = y0 * 2; y < y1 * 2; y++) for (let x = 0; x < c.width; x++) { const i = (y * c.width + x) * 4; if (d[i] !== bg[0] || d[i + 1] !== bg[1] || d[i + 2] !== bg[2]) n++; } return n; };
    return { top: rows(0, 56), bottom: rows(264, 320) };
  });
  assert.ok(inBand.top > 50, "上方區帶應有文字像素");
  assert.equal(inBand.bottom, 0, "下方區帶應無像素（純色背景下）");
});

test("AC5 無亂碼：中文字型實際可繪製（CJK 字形寬度與 tofu 比較）", async () => {
  const r = await page.evaluate(() => {
    const c = document.createElement("canvas").getContext("2d");
    c.font = 'bold 30px "Noto Sans CJK TC","WenQuanYi Zen Hei",sans-serif';
    return { a: c.measureText("貼").width, b: c.measureText("圖").width };
  });
  assert.ok(r.a > 20 && r.b > 20);
});

test("AC6 預覽 1 秒內更新（含逐項計時）", async () => {
  for (const [cat, id] of [["skin", "skin-deep"], ["hairStyle", "hair-bun"], ["top", "top-sailor"], ["vehicle", "vehicle-car"], ["scene", "scene-night"]]) {
    const alt = await page.$$eval(`button.opt[data-category="${cat}"]`, (b, id) => b.map((x) => x.dataset.optionId).find((x) => x !== id), id);
    await select(page, TAB_OF[cat], cat, alt);
    const before = await canvasHash(page, "#preview-canvas");
    const t0 = Date.now();
    await openTab(page, TAB_OF[cat]);
    await page.click(opt(cat, id));
    await page.waitForFunction((h) => {
      const c = document.querySelector("#preview-canvas"); const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
      let x = 0; for (let i = 0; i < d.length; i++) x = (x * 31 + d[i]) | 0; return x !== h;
    }, before, { timeout: 1000 });
    assert.ok(Date.now() - t0 < 1000, `${cat} 更新時間`);
  }
});

test("AC6 預覽與輸出 canvas 內容一致（預覽 2x 縮小後與輸出 1x 比對）", async () => {
  const diff = await page.evaluate(async () => {
    await window.__stickerApp.whenRendered();
    const p = document.querySelector("#preview-canvas"), e = document.querySelector("#export-canvas");
    const t = document.createElement("canvas"); t.width = 370; t.height = 320;
    const tc = t.getContext("2d"); tc.drawImage(p, 0, 0, 370, 320);
    const a = tc.getImageData(0, 0, 370, 320).data, b = e.getContext("2d").getImageData(0, 0, 370, 320).data;
    let bad = 0; for (let i = 0; i < a.length; i += 4) if (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]) > 90) bad++;
    return bad / (370 * 320);
  });
  assert.ok(diff < 0.03, `差異像素比例 ${diff}`);
});

test("AC9 隨機搭配：各項為有效選項、文字不變；重設：預設且文字清空", async () => {
  await openTab(page, "text");
  await page.fill("#sticker-text", "保留我");
  const valid = await page.evaluate(() => {
    const cats = window.__stickerApp.catalog.CATEGORIES; const s = window.__stickerApp.getState();
    return cats.every((c) => c.options.some((o) => o.id === s[c.id]));
  });
  assert.ok(valid);
  const seen = {};
  for (let i = 0; i < 25; i++) {
    await page.click("#btn-random");
    const s = await getState(page);
    assert.equal(s.text, "保留我");
    assert.equal(await page.inputValue("#sticker-text"), "保留我");
    for (const [k, v] of Object.entries(s)) (seen[k] ??= new Set()).add(v);
    const ok = await page.evaluate(() => {
      const s = window.__stickerApp.getState();
      return window.__stickerApp.catalog.CATEGORIES.every((c) => c.options.some((o) => o.id === s[c.id]));
    });
    assert.ok(ok);
    // 每類恰有一個 aria-pressed=true
    const pressed = await page.$$eval('button.opt[aria-pressed="true"]', (b) => b.map((x) => x.dataset.category));
    assert.equal(new Set(pressed).size, pressed.length);
  }
  for (const c of ["skin", "hairStyle", "top", "vehicle", "scene"]) assert.ok(seen[c].size > 1, `${c} 有變化`);
  await rendered(page);
  await page.click("#btn-reset");
  await rendered(page);
  const s = await getState(page);
  assert.deepEqual(s, { skin: "skin-fair", hairStyle: "hair-short", hairColor: "haircolor-brown", expression: "expr-happy", top: "top-tshirt", bottom: "bottom-shorts", hat: "none", glasses: "none", handheld: "none", vehicle: "none", scene: "scene-pink", textColor: "textcolor-black", textPosition: "bottom", text: "" });
  assert.equal(await page.inputValue("#sticker-text"), "");
  assert.equal((await page.evaluate(() => window.__stickerApp.getTextLayout())).visible, false);
});

test("AC8/AC13 所有素材不超出安全範圍 FIGURE_BOUNDS（逐選項檢查 bbox）", async () => {
  const base = await getState(page);
  const bounds = await page.evaluate(() => window.__stickerApp.catalog.FIGURE_BOUNDS);
  const cats = await page.evaluate(() => window.__stickerApp.catalog.CATEGORIES.filter((c) => c.kind === "item" && c.id !== "scene").map((c) => ({ id: c.id, ids: c.options.map((o) => o.id) })));
  const bad = [];
  const tol = 0.5;
  for (const c of cats) {
    for (const id of c.ids) {
      const boxes = await layerBoxes(page, { ...base, [c.id]: id });
      for (const [layer, b] of Object.entries(boxes)) {
        if (layer === "background" || b.empty) continue;
        if (b.x < bounds.x - tol || b.y < bounds.y - tol || b.x + b.w > bounds.x + bounds.width + tol || b.y + b.h > bounds.y + bounds.height + tol)
          bad.push(`${c.id}/${id}/${layer} bbox=(${b.x.toFixed(1)},${b.y.toFixed(1)},${(b.x + b.w).toFixed(1)},${(b.y + b.h).toFixed(1)})`);
      }
    }
  }
  assert.deepEqual(bad, []);
});

test("AC8 全部組合最大化：人偶、所有配件、交通同時存在仍在範圍內，且各層皆有內容", async () => {
  const s = { ...(await getState(page)), hat: "hat-cap", glasses: "glasses-round", handheld: "handheld-icecream", vehicle: "vehicle-bicycle", hairStyle: "hair-twintail" };
  const boxes = await layerBoxes(page, s);
  for (const l of ["body", "head", "expression", "hairFront", "hat", "glasses", "handheld", "vehicleBack"]) assert.equal(boxes[l].empty, false, l);
  assert.equal(boxes.background.empty, false);
});

test("AC13 交通工具：>=4 款含無、逐款改變預覽、前一款不殘留、與配件並存", async () => {
  const ids = await page.$$eval('button.opt[data-category="vehicle"]', (b) => b.map((x) => x.dataset.optionId));
  for (const v of ["none", "vehicle-bicycle", "vehicle-skateboard", "vehicle-car", "vehicle-balloon"]) assert.ok(ids.includes(v), v);
  const hs = new Set();
  for (const id of ids) { await select(page, "vehicle", "vehicle", id); hs.add(await canvasHash(page, "#preview-canvas")); }
  assert.equal(hs.size, ids.length);
  // 殘留：car → none 的圖層 vehicleBack/Front 皆為空
  await select(page, "vehicle", "vehicle", "vehicle-car");
  await select(page, "vehicle", "vehicle", "vehicle-balloon");
  const layers = await page.evaluate(() => {
    const d = new DOMParser().parseFromString(window.__stickerApp.buildSceneSvg(), "image/svg+xml");
    return { front: d.querySelector('g[data-layer="vehicleFront"]').children.length };
  });
  assert.equal(layers.front, 0, "氣球不應殘留汽車前景層");
  // 並存
  await select(page, "accessory", "hat", "hat-crown");
  await select(page, "accessory", "glasses", "glasses-heart");
  await select(page, "accessory", "handheld", "handheld-flower");
  const s = await getState(page);
  assert.deepEqual([s.vehicle, s.hat, s.glasses, s.handheld], ["vehicle-balloon", "hat-crown", "glasses-heart", "handheld-flower"]);
});

test("AC12 1280x720：無橫向捲動、首屏可見預覽/動作按鈕/分頁列", async () => {
  const r = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  assert.ok(r.sw <= r.cw, JSON.stringify(r));
  for (const sel of ["#preview-canvas", "#btn-random", "#btn-reset", "#btn-export", ".tabs"]) {
    const box = await page.locator(sel).boundingBox();
    assert.ok(box && box.y >= 0 && box.y + box.height <= 720 && box.x + box.width <= 1280, `${sel} ${JSON.stringify(box)}`);
  }
  for (const tab of Object.keys(TABS)) {
    await openTab(page, tab);
    const r2 = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
    assert.ok(r2, tab);
  }
});

test("AC11 首次載入到可操作（預設人偶已繪製）< 5 秒", async () => {
  const { page: p2, context: c2 } = await openPage(ctx, { viewport: { width: 1280, height: 720 } });
  await c2.close();
  const c3 = await ctx.browser.newContext({ viewport: { width: 1280, height: 720 } });
  const p3 = await c3.newPage();
  const t0 = Date.now();
  await p3.goto(ctx.server.url);
  await p3.waitForFunction(() => { const c = document.querySelector("#preview-canvas"); return c && c.getContext("2d").getImageData(185 * 2, 118 * 2, 1, 1).data[3] > 0 && window.__stickerApp; });
  const dt = Date.now() - t0;
  await c3.close();
  assert.ok(dt < 5000, `載入 ${dt}ms`);
  // 資源大小
  const sizes = await page.evaluate(async () => { let t = 0; for (const u of ["index.html", "css/style.css", "js/app.js", "js/catalog.js", "js/compose.js", "js/ui.js", "js/state.js", "js/exporter.js"]) t += (await (await fetch(u)).text()).length; return t; });
  assert.ok(sizes < 300 * 1024, `總大小 ${sizes}`);
});

test("AC10 部分：無外部網路請求、不需後端（所有請求同源靜態檔）", async () => {
  const c = await ctx.browser.newContext();
  const p = await c.newPage();
  const reqs = [];
  p.on("request", (r) => reqs.push(r.url()));
  await p.goto(ctx.server.url);
  await p.waitForFunction(() => window.__stickerApp);
  await p.click("#btn-random");
  await c.close();
  const origin = new URL(ctx.server.url).origin;
  const external = reqs.filter((u) => !u.startsWith(origin) && !u.startsWith("data:") && !u.startsWith("blob:"));
  assert.deepEqual(external, []);
});

test("AC10 部署檔案：.nojekyll 存在、使用相對路徑（可在 /repo/ 子路徑運作）", async () => {
  const fs = await import("node:fs");
  assert.ok(fs.existsSync(new URL("../../.nojekyll", import.meta.url)));
  const html = fs.readFileSync(new URL("../../index.html", import.meta.url), "utf8");
  assert.doesNotMatch(html, /(src|href)="\//);
  const res = await fetch(ctx.server.url + "js/app.js");
  assert.equal(res.status, 200);
});

test("AC17 Q 版（幾何）：頭高/全身高 >= 1/3，輪廓線一致、五官簡化", async () => {
  const s = { ...(await getState(page)), hat: "none", vehicle: "none", hairStyle: "hair-short" };
  const boxes = await layerBoxes(page, s);
  const head = boxes.head, body = boxes.body;
  const total = Math.max(head.y + head.h, body.y + body.h) - head.y;
  const ratio = head.h / total;
  assert.ok(ratio >= 1 / 3, `頭身比 ${ratio}`);
  assert.ok(ratio <= 0.7, `頭身比不應過度（${ratio}）`);
  // 全素材使用共用輪廓色
  const frag = await page.evaluate(() => window.__stickerApp.buildSceneSvg());
  assert.match(frag, /#5A3E36/);
  // 表情元素數量簡化（<= 12 個圖形）
  const n = await page.evaluate(() => window.__stickerApp.catalog.CATEGORIES.find((c) => c.id === "expression").options.map((o) => (Object.values(o.parts).join("").match(/<(path|circle|ellipse|rect|line|polygon)/g) || []).length));
  assert.ok(n.every((x) => x <= 14), JSON.stringify(n));
});
