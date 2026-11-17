import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import zlib from "node:zlib";
import { setup, teardown, openPage, select, getState, rendered, openTab } from "../helpers/app.js";

let ctx, page, context;
before(async () => {
  ctx = await setup();
  ({ page, context } = await openPage(ctx, { viewport: { width: 1280, height: 720 } }));
});
after(async () => { await context.close(); await teardown(ctx); });

async function doExport(p = page, how = "click", keep = false) {
  const [dl] = await Promise.all([p.waitForEvent("download"), p[how]("#btn-export")]);
  const path = await dl.path();
  const buf = await readFile(path);
  await p.waitForSelector("#export-dialog[open]");
  if (!keep) await p.click("#btn-close-dialog");
  return { dl, buf, name: dl.suggestedFilename() };
}
function parsePng(buf) {
  assert.deepEqual([...buf.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10], "PNG 簽章");
  const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20), depth = buf[24], ct = buf[25];
  // 解碼像素（僅支援 8-bit RGBA 非交錯）
  let off = 8; const idat = [];
  while (off < buf.length) { const len = buf.readUInt32BE(off); const type = buf.toString("latin1", off + 4, off + 8); if (type === "IDAT") idat.push(buf.subarray(off + 8, off + 8 + len)); if (type === "IEND") break; off += 12 + len; }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const bpp = 4, stride = w * bpp; const px = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)]; const row = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? px[y * stride + x - bpp] : 0, b = y ? px[(y - 1) * stride + x] : 0, c = x >= bpp && y ? px[(y - 1) * stride + x - bpp] : 0;
      let v = row[x];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      px[y * stride + x] = v & 255;
    }
  }
  return { w, h, depth, ct, px, at: (x, y) => [...px.subarray((y * w + x) * 4, (y * w + x) * 4 + 4)] };
}

test("AC7 輸出：檔名 sticker-YYYYMMDD-HHMMSS.png、有效 PNG、370x320、RGBA、不透明場景角落 alpha=255", async () => {
  await select(page, "scene", "scene", "scene-sky");
  const { buf, name } = await doExport();
  assert.match(name, /^sticker-\d{8}-\d{6}\.png$/);
  const png = parsePng(buf);
  assert.equal(png.w, 370); assert.equal(png.h, 320); assert.equal(png.depth, 8); assert.equal(png.ct, 6);
  for (const [x, y] of [[0, 0], [369, 0], [0, 319], [369, 319], [185, 160]]) assert.equal(png.at(x, y)[3], 255, `(${x},${y})`);
  assert.deepEqual(png.at(2, 2).slice(0, 3), [0xD4, 0xEC, 0xFF]);
  assert.deepEqual(page.errors, []);
});

test("AC7 透明背景：輸出 PNG 背景 alpha=0、人偶像素 alpha=255", async () => {
  await select(page, "scene", "scene", "scene-transparent");
  const { buf } = await doExport();
  const png = parsePng(buf);
  for (const [x, y] of [[0, 0], [369, 0], [0, 319], [369, 319], [20, 160]]) assert.equal(png.at(x, y)[3], 0, `(${x},${y})`);
  assert.equal(png.at(185, 118)[3], 255, "頭部中心應不透明");
});

test("AC7 每個場景：不透明場景全面不透明（無半透明洞）", async () => {
  const ids = await page.$$eval('button.opt[data-category="scene"]', (b) => b.map((x) => x.dataset.optionId));
  for (const id of ids.filter((i) => i !== "scene-transparent")) {
    await select(page, "scene", "scene", id);
    const { buf } = await doExport();
    const png = parsePng(buf);
    let min = 255; for (let i = 3; i < png.px.length; i += 4) min = Math.min(min, png.px[i]);
    assert.equal(min, 255, id);
  }
});

test("AC6/AC16 下載檔、對話框圖片、預覽三者一致；對話框可關閉；可再下載", async () => {
  await page.click("#btn-reset").catch(() => {});
  await select(page, "accessory", "hat", "hat-crown");
  await select(page, "vehicle", "vehicle", "vehicle-car");
  await select(page, "scene", "scene", "scene-park");
  await openTab(page, "text");
  await page.fill("#sticker-text", "輸出測試 OK");
  await select(page, "text", "textColor", "textcolor-red");
  await rendered(page);
  const { buf } = await doExport(page, "click", true);
  const b64 = buf.toString("base64");
  const dlg = await page.evaluate(() => ({ src: document.querySelector("#export-image").src, w: document.querySelector("#export-image").naturalWidth, h: document.querySelector("#export-image").naturalHeight }));
  assert.equal(dlg.src, "data:image/png;base64," + b64, "對話框圖片 = 下載檔");
  assert.deepEqual([dlg.w, dlg.h], [370, 320]);
  // 與預覽比對
  const diff = await page.evaluate(async (b64) => {
    const img = new Image(); img.src = "data:image/png;base64," + b64; await img.decode();
    const c = document.createElement("canvas"); c.width = 370; c.height = 320; const x = c.getContext("2d"); x.drawImage(img, 0, 0);
    const t = document.createElement("canvas"); t.width = 370; t.height = 320; const tx = t.getContext("2d"); tx.drawImage(document.querySelector("#preview-canvas"), 0, 0, 370, 320);
    const a = x.getImageData(0, 0, 370, 320).data, b = tx.getImageData(0, 0, 370, 320).data; let bad = 0;
    for (let i = 0; i < a.length; i += 4) if (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]) > 90) bad++;
    return bad / (370 * 320);
  }, b64);
  assert.ok(diff < 0.03, `預覽與輸出差異 ${diff}`);
  // 再下載
  const [dl2] = await Promise.all([page.waitForEvent("download"), page.click("#btn-download-again")]);
  assert.deepEqual(await readFile(await dl2.path()), buf);
  await page.click("#btn-close-dialog");
  assert.equal(await page.evaluate(() => document.querySelector("#export-dialog").open), false);
});

test("AC8 輸出內容完整：文字顏色像素存在於文字區帶、人偶存在、左右不被裁切", async () => {
  for (const pos of ["top", "bottom"]) {
    await page.click("#btn-reset");
    await openTab(page, "text");
    await page.fill("#sticker-text", "一二三四五六七八九十一二三四五六七八九十");
    await select(page, "text", "textColor", "textcolor-red");
    await select(page, "text", "textPosition", pos);
    await select(page, "scene", "scene", "scene-transparent");
    await select(page, "vehicle", "vehicle", "vehicle-car");
    await select(page, "accessory", "hat", "hat-crown");
    await select(page, "accessory", "handheld", "handheld-wand");
    const { buf } = await doExport();
    const png = parsePng(buf);
    const isRed = (x, y) => { const p = png.at(x, y); return p[3] > 200 && p[0] > 200 && p[1] < 90 && p[2] < 90; };
    let minX = 999, maxX = -1, minY = 999, maxY = -1, n = 0;
    const [bandY0, bandY1] = pos === "top" ? [0, 56] : [264, 320];
    const [oppY0, oppY1] = pos === "top" ? [264, 320] : [0, 56];
    let opp = 0;
    for (let y = oppY0; y < oppY1; y++) for (let x = 0; x < 370; x++) if (isRed(x, y)) opp++;
    assert.equal(opp, 0, "另一側文字區帶不應有文字");
    for (let y = bandY0; y < bandY1; y++) for (let x = 0; x < 370; x++) if (isRed(x, y)) { n++; minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
    assert.ok(n > 200, `${pos} 文字像素 ${n}`);
    const [y0, y1] = pos === "top" ? [0, 56] : [264, 320];
    assert.ok(minY >= y0 && maxY < y1, `${pos} 文字 y ${minY}-${maxY}`);
    assert.ok(minX >= 12 && maxX <= 358, `${pos} 文字 x ${minX}-${maxX}（不得貼邊）`);
    // 全畫面不透明像素 bbox（含人偶、車、文字）離邊界至少 1px
    let ox0 = 999, ox1 = -1, oy0 = 999, oy1 = -1;
    for (let y = 0; y < 320; y++) for (let x = 0; x < 370; x++) if (png.at(x, y)[3] > 0) { ox0 = Math.min(ox0, x); ox1 = Math.max(ox1, x); oy0 = Math.min(oy0, y); oy1 = Math.max(oy1, y); }
    assert.ok(ox0 >= 1 && ox1 <= 368 && oy0 >= 1 && oy1 <= 318, `內容 bbox ${ox0},${oy0},${ox1},${oy1}`);
    // 人偶頭部（膚色）存在
    assert.ok(png.at(185, 118)[3] === 255);
    assert.ok(png.at(185, 118)[0] > 200, "頭部為膚色");
  }
});

test("AC8/AC13 每個交通工具、每個帽子等選項輸出後內容不貼邊（逐項輸出）", async () => {
  await page.click("#btn-reset");
  await select(page, "scene", "scene", "scene-transparent");
  const ids = await page.$$eval('button.opt[data-category="vehicle"]', (b) => b.map((x) => x.dataset.optionId));
  for (const id of ids) {
    await select(page, "vehicle", "vehicle", id);
    const { buf } = await doExport();
    const png = parsePng(buf);
    let x0 = 999, x1 = -1, y0 = 999, y1 = -1;
    for (let y = 0; y < 320; y++) for (let x = 0; x < 370; x++) if (png.at(x, y)[3] > 0) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    assert.ok(x0 >= 8 && x1 <= 362 && y0 >= 58 && y1 <= 262, `${id}: ${x0},${y0},${x1},${y1}`);
    if (id !== "none") {
      const base = await (async () => { await select(page, "vehicle", "vehicle", "none"); const r = await doExport(); await select(page, "vehicle", "vehicle", id); return r.buf; })();
      assert.notDeepEqual(base, buf, `${id} 輸出應與無交通工具不同`);
    }
  }
});

test("AC7 輸出前若有待處理渲染，輸出的是最新狀態（快速變更後立刻輸出）", async () => {
  await page.click("#btn-reset");
  await select(page, "scene", "scene", "scene-pink");
  await openTab(page, "scene");
  // 連續切換不等待、立刻輸出
  await page.evaluate(() => { document.querySelector('button.opt[data-category="scene"][data-option-id="scene-sky"]').click(); document.querySelector("#btn-export").click(); });
  const dl = await page.waitForEvent("download");
  const png = parsePng(await readFile(await dl.path()));
  assert.deepEqual(png.at(2, 2).slice(0, 3), [0xD4, 0xEC, 0xFF]);
});
