import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { setup, teardown, openPage, opt, getState, rendered, TABS, TAB_OF, canvasHash } from "../helpers/app.js";

let ctx;
before(async () => { ctx = await setup(); });
after(async () => { await teardown(ctx); });

function deviceOpts(name) {
  const { defaultBrowserType, ...rest } = ctx.devices[name];
  return rest;
}
const MODES = [["直式", "iPad (gen 7)"], ["橫式", "iPad (gen 7) landscape"]];

for (const [label, dev] of MODES) {
  test(`AC14/AC15 [${label}] 裝置模擬：觸控、視窗尺寸`, async () => {
    const o = deviceOpts(dev);
    assert.equal(o.hasTouch, true);
    const { page, context } = await openPage(ctx, o);
    const vp = page.viewportSize();
    if (label === "直式") assert.ok(vp.height > vp.width); else assert.ok(vp.width > vp.height);
    await context.close();
  });

  test(`AC14/AC15 [${label}] 僅用 tap 完成 F1~F8、F10 全流程並輸出，全程無橫向捲動`, async () => {
    const { page, context } = await openPage(ctx, deviceOpts(dev));
    const noHScroll = async (where) => assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), `橫向捲動：${where}`);
    await noHScroll("初始");
    const steps = [
      ["doll", "skin", "skin-tan"], ["doll", "hairStyle", "hair-bun"], ["doll", "hairColor", "haircolor-blue"], ["doll", "expression", "expr-cry"],
      ["clothes", "top", "top-sailor"], ["clothes", "bottom", "bottom-tutu"],
      ["accessory", "hat", "hat-catears"], ["accessory", "glasses", "glasses-round"], ["accessory", "handheld", "handheld-icecream"],
      ["vehicle", "vehicle", "vehicle-bicycle"], ["scene", "scene", "scene-beach"],
      ["text", "textColor", "textcolor-blue"], ["text", "textPosition", "top"],
    ];
    for (const [tab, cat, id] of steps) {
      await page.tap(`[data-tab-target="${tab}"]`);
      await page.tap(opt(cat, id));
      await rendered(page);
      assert.equal((await getState(page))[cat], id, `${cat}`);
      assert.equal(await page.getAttribute(opt(cat, id), "aria-pressed"), "true");
      await noHScroll(`${tab}/${cat}`);
    }
    // 文字輸入（觸控聚焦後輸入）
    await page.tap("#sticker-text");
    await page.keyboard.type("iPad 你好");
    await rendered(page);
    assert.equal((await getState(page)).text, "iPad 你好");
    // 隨機與重設
    const before = await canvasHash(page, "#preview-canvas");
    await page.tap("#btn-random"); await rendered(page);
    assert.equal((await getState(page)).text, "iPad 你好");
    await page.tap("#btn-reset"); await rendered(page);
    assert.equal((await getState(page)).text, "");
    assert.equal((await getState(page)).scene, "scene-pink");
    // 重建後輸出
    await page.tap('[data-tab-target="vehicle"]'); await page.tap(opt("vehicle", "vehicle-car"));
    await page.tap('[data-tab-target="text"]'); await page.tap("#sticker-text"); await page.keyboard.type("Hi");
    await rendered(page);
    const [dl] = await Promise.all([page.waitForEvent("download"), page.tap("#btn-export")]);
    assert.match(dl.suggestedFilename(), /\.png$/);
    // 對話框（AC16）：顯示 370x320 圖片、尺寸在視窗內、可 tap 關閉
    await page.waitForSelector("#export-dialog[open]");
    const info = await page.evaluate(() => { const i = document.querySelector("#export-image"); const r = i.getBoundingClientRect(); const d = document.querySelector("#export-dialog").getBoundingClientRect(); return { nw: i.naturalWidth, nh: i.naturalHeight, right: d.right, bottom: d.bottom, left: d.left, top: d.top, vw: innerWidth, vh: innerHeight, src: i.src.slice(0, 22) }; });
    assert.deepEqual([info.nw, info.nh], [370, 320]);
    assert.equal(info.src, "data:image/png;base64,");
    assert.ok(info.left >= 0 && info.right <= info.vw && info.top >= 0 && info.bottom <= info.vh, JSON.stringify(info));
    for (const sel of ["#btn-download-again", "#btn-close-dialog"]) { const b = await page.locator(sel).boundingBox(); assert.ok(b.width >= 44 && b.height >= 44, sel); }
    const [dl2] = await Promise.all([page.waitForEvent("download"), page.tap("#btn-download-again")]);
    assert.match(dl2.suggestedFilename(), /\.png$/);
    await page.tap("#btn-close-dialog");
    assert.equal(await page.evaluate(() => document.querySelector("#export-dialog").open), false);
    assert.deepEqual(page.errors, []);
    await context.close();
  });

  test(`AC14 [${label}] 所有分頁中所有可見可點元素觸控目標 >= 44x44`, async () => {
    const { page, context } = await openPage(ctx, deviceOpts(dev));
    const small = [];
    for (const tab of Object.keys(TABS)) {
      await page.tap(`[data-tab-target="${tab}"]`);
      const r = await page.evaluate(() => [...document.querySelectorAll("button, input, a, [role=tab]")].filter((e) => e.offsetParent !== null && !e.closest("dialog:not([open])")).map((e) => { const b = e.getBoundingClientRect(); return { id: e.id || e.dataset.optionId || e.dataset.tabTarget || e.tagName, w: b.width, h: b.height }; }));
      for (const e of r) if (e.w < 44 || e.h < 44) small.push(`${tab}:${e.id} ${e.w}x${e.h}`);
    }
    assert.deepEqual(small, []);
    await context.close();
  });

  test(`AC14 [${label}] 輸入框字級 >= 16px（避免 iOS 聚焦放大）、viewport 未禁止縮放`, async () => {
    const { page, context } = await openPage(ctx, deviceOpts(dev));
    await page.tap('[data-tab-target="text"]');
    const fs = await page.$eval("#sticker-text", (e) => parseFloat(getComputedStyle(e).fontSize));
    assert.ok(fs >= 16, `font-size ${fs}`);
    const meta = await page.$eval('meta[name="viewport"]', (e) => e.content);
    assert.doesNotMatch(meta, /user-scalable\s*=\s*no|maximum-scale\s*=\s*1(\.0)?\b/);
    await context.close();
  });

  test(`AC15 [${label}] 預覽、動作按鈕、分頁列可到達；捲動控制區時預覽/按鈕仍可見或可達`, async () => {
    const { page, context } = await openPage(ctx, deviceOpts(dev));
    const vp = page.viewportSize();
    await page.tap('[data-tab-target="text"]');
    for (const sel of ["#preview-canvas", "#btn-export"]) {
      await page.locator(sel).scrollIntoViewIfNeeded();
      const b = await page.locator(sel).boundingBox();
      assert.ok(b.x >= 0 && b.x + b.width <= vp.width, `${sel} 水平`);
    }
    // 滾到底部後預覽仍在視窗內（sticky 或不需捲動）
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.tap('[data-tab-target="scene"]');
    const pb = await page.locator("#preview-canvas").boundingBox();
    const eb = await page.locator("#btn-export").boundingBox();
    assert.ok(pb.y + pb.height > 0 && pb.y < vp.height, `預覽不可見 ${JSON.stringify(pb)}`);
    assert.ok(eb.y + eb.height > 0 && eb.y < vp.height, `輸出鈕不可見 ${JSON.stringify(eb)}`);
    // 預覽不被捲出且未佔滿整個視窗（保留操作空間）
    assert.ok(pb.height <= vp.height * 0.6, `預覽高 ${pb.height}/${vp.height}`);
    await context.close();
  });
}

test("AC15 旋轉（直式→橫式→直式）後設計、文字、分頁皆保留，且無重新載入", async () => {
  const { page, context } = await openPage(ctx, deviceOpts("iPad (gen 7)"));
  await page.evaluate(() => { window.__marker = 1; });
  await page.tap('[data-tab-target="vehicle"]'); await page.tap(opt("vehicle", "vehicle-balloon"));
  await page.tap('[data-tab-target="accessory"]'); await page.tap(opt("hat", "hat-crown"));
  await page.tap('[data-tab-target="text"]'); await page.tap("#sticker-text"); await page.keyboard.type("旋轉測試");
  await rendered(page);
  const s0 = await getState(page); const h0 = await canvasHash(page, "#export-canvas");
  for (const vp of [{ width: 1080, height: 810 }, { width: 810, height: 1080 }]) {
    await page.setViewportSize(vp);
    await page.waitForTimeout(150);
    await rendered(page);
    assert.deepEqual(await getState(page), s0);
    assert.equal(await page.inputValue("#sticker-text"), "旋轉測試");
    assert.equal(await page.getAttribute('[data-tab-target="text"]', "aria-selected"), "true");
    assert.equal(await page.evaluate(() => window.__marker), 1, "頁面不應重新載入");
    assert.equal(await page.getAttribute(opt("vehicle", "vehicle-balloon"), "aria-pressed"), "true");
    assert.equal(await canvasHash(page, "#export-canvas"), h0);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth));
  }
  await context.close();
});

test("AC14 無 hover 依賴：所有 :hover 規則皆在 @media (hover: hover) 內；JS 不使用 mouseover/dblclick/contextmenu/keydown 快捷鍵", async () => {
  const { page, context } = await openPage(ctx, deviceOpts("iPad (gen 7)"));
  const top = await page.evaluate(() => { const bad = []; for (const sh of document.styleSheets) for (const r of sh.cssRules) if (r.type === 1 && /:hover/.test(r.selectorText)) bad.push(r.selectorText); return bad; });
  assert.deepEqual(top, []);
  const hasHoverMedia = await page.evaluate(() => [...document.styleSheets[0].cssRules].some((r) => r.type === 4 && /hover:\s*hover/.test(r.conditionText || r.media.mediaText)));
  assert.ok(hasHoverMedia);
  for (const f of ["app", "ui", "exporter", "compose", "state"]) {
    const src = readFileSync(new URL(`../../js/${f}.js`, import.meta.url), "utf8");
    assert.doesNotMatch(src, /mouseover|mouseenter|dblclick|contextmenu|keydown|keyup|title=|tooltip/i, f);
  }
  await context.close();
});

test("AC14 iPad 模擬下 tap 與 click 事件：選項只用 click 事件（tap 可觸發）", async () => {
  const { page, context } = await openPage(ctx, deviceOpts("iPad (gen 7)"));
  await page.tap('[data-tab-target="clothes"]');
  await page.tap(opt("top", "top-hoodie"));
  assert.equal((await getState(page)).top, "top-hoodie");
  await context.close();
});
