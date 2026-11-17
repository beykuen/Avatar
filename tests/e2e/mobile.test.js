import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { setup, teardown, openPage, opt, getState, rendered, TABS } from "../helpers/app.js";

let ctx, page, context;
before(async () => {
  ctx = await setup();
  ({ page, context } = await openPage(ctx, { viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }));
});
after(async () => { await context.close(); await teardown(ctx); });

test("AC12 375px：所有分頁皆無橫向捲動、所有控制項水平方向在視窗內", async () => {
  for (const tab of Object.keys(TABS)) {
    await page.tap(`[data-tab-target="${tab}"]`);
    const r = await page.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      const over = [...document.querySelectorAll("button, input, canvas")].filter((e) => e.offsetParent !== null).filter((e) => { const b = e.getBoundingClientRect(); return b.left < -0.5 || b.right > vw + 0.5; }).map((e) => e.id || e.dataset.optionId);
      return { sw: document.documentElement.scrollWidth, vw, over };
    });
    assert.ok(r.sw <= r.vw, `${tab} ${JSON.stringify(r)}`);
    assert.deepEqual(r.over, [], tab);
  }
});

test("AC12 375px：完整流程可用（選項、文字、隨機、重設、輸出）", async () => {
  await page.tap('[data-tab-target="doll"]'); await page.tap(opt("skin", "skin-deep"));
  await page.tap('[data-tab-target="vehicle"]'); await page.tap(opt("vehicle", "vehicle-skateboard"));
  await page.tap('[data-tab-target="text"]'); await page.fill("#sticker-text", "手機 OK");
  await rendered(page);
  const s = await getState(page);
  assert.deepEqual([s.skin, s.vehicle, s.text], ["skin-deep", "vehicle-skateboard", "手機 OK"]);
  await page.tap("#btn-random"); await rendered(page);
  await page.tap("#btn-reset"); await rendered(page);
  assert.equal((await getState(page)).text, "");
  const [dl] = await Promise.all([page.waitForEvent("download"), page.tap("#btn-export")]);
  assert.match(dl.suggestedFilename(), /\.png$/);
  await page.waitForSelector("#export-dialog[open]");
  const d = await page.evaluate(() => { const r = document.querySelector("#export-dialog").getBoundingClientRect(); return [r.left, r.right, innerWidth]; });
  assert.ok(d[0] >= 0 && d[1] <= d[2], JSON.stringify(d));
  await page.tap("#btn-close-dialog");
});

test("AC12 375px：預覽 canvas 完整顯示且比例 370:320", async () => {
  const b = await page.locator("#preview-canvas").boundingBox();
  assert.ok(b.width <= 375 && b.width > 250);
  assert.ok(Math.abs(b.width / b.height - 370 / 320) < 0.02);
});
