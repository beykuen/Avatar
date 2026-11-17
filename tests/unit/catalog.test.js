import test from "node:test";
import assert from "node:assert/strict";
import * as C from "../../js/catalog.js";

const ids = (c) => C.getOptionIds(c);
const real = (c) => ids(c).filter((i) => i !== "none" && i !== "scene-transparent");

test("常數：尺寸 370x320", () => {
  assert.equal(C.CANVAS_WIDTH, 370);
  assert.equal(C.CANVAS_HEIGHT, 320);
});
test("AC1 選項數量：膚色>=5 髮型>=5 髮色>=6 表情>=5", () => {
  assert.ok(real("skin").length >= 5);
  assert.ok(real("hairStyle").length >= 5);
  assert.ok(real("hairColor").length >= 6);
  assert.ok(real("expression").length >= 5);
});
test("AC2 上衣>=5、下著>=4，且皆有「無」", () => {
  assert.ok(real("top").length >= 5);
  assert.ok(real("bottom").length >= 4);
  assert.ok(ids("top").includes("none") && ids("bottom").includes("none"));
});
test("AC3 帽子>=4 眼鏡>=3 手持>=3，且皆有「無」", () => {
  assert.ok(real("hat").length >= 4);
  assert.ok(real("glasses").length >= 3);
  assert.ok(real("handheld").length >= 3);
  for (const c of ["hat", "glasses", "handheld"]) assert.ok(ids(c).includes("none"));
});
test("AC4 場景>=6（不含透明）、含>=1 純色、含透明背景", () => {
  assert.ok(real("scene").length >= 6);
  assert.ok(ids("scene").includes("scene-transparent"));
  assert.ok(ids("scene").includes("scene-pink") && ids("scene").includes("scene-sky"));
});
test("AC5 文字顏色>=6、位置 top/bottom、上限>=10", () => {
  assert.ok(ids("textColor").length >= 6);
  assert.deepEqual([...ids("textPosition")].sort(), ["bottom", "top"]);
  assert.ok(C.TEXT_MAX_LENGTH >= 10);
});
test("AC13 交通工具>=4，含腳踏車/滑板/汽車/氣球，且有「無」", () => {
  assert.ok(real("vehicle").length >= 4);
  for (const v of ["vehicle-bicycle", "vehicle-skateboard", "vehicle-car", "vehicle-balloon", "none"]) assert.ok(ids("vehicle").includes(v), v);
});
test("每個類別內 id 唯一、name 非空、getOption 可取回", () => {
  for (const cat of C.CATEGORIES) {
    const list = cat.options.map((o) => o.id);
    assert.equal(new Set(list).size, list.length, cat.id);
    for (const o of cat.options) {
      assert.ok(o.name && o.name.length > 0, `${cat.id}/${o.id} name`);
      assert.equal(C.getOption(cat.id, o.id), o);
    }
  }
  assert.equal(C.getOption("skin", "nope"), undefined);
  assert.equal(C.getCategory("nope"), undefined);
});
test("素材 SVG 規則：無 image/foreignObject/text/filter/id、無 <svg>", () => {
  const frags = [...Object.values(C.BASE_PARTS)];
  for (const cat of C.CATEGORIES) for (const o of cat.options) if (o.parts) frags.push(...Object.values(o.parts));
  assert.ok(frags.length > 20);
  for (const f of frags) {
    assert.doesNotMatch(f, /<image|<foreignObject|<text|<filter|<svg|\sid=|href=/i);
  }
});
test("素材所用 layerSlot 皆在 LAYER_ORDER 內", () => {
  for (const cat of C.CATEGORIES) for (const o of cat.options) for (const s of Object.keys(o.parts || {})) assert.ok(C.LAYER_ORDER.includes(s), `${cat.id}/${o.id}:${s}`);
});
test("AC4 場景背景：非透明場景含覆蓋全畫面的不透明矩形，且無半透明", () => {
  for (const id of real("scene")) {
    const bg = C.getOption("scene", id).parts.background;
    assert.match(bg, /<rect x="0" y="0" width="370" height="320" fill="#[0-9A-Fa-f]{6}"\/>/, id);
    assert.doesNotMatch(bg, /opacity|rgba|fill="none".*<rect x="0" y="0"/i, id);
  }
  const t = C.getOption("scene", "scene-transparent");
  assert.ok(!t.parts || !t.parts.background);
});
test("AC17 Q 版：頭高佔全身比例（由 BASE_PARTS 橢圓估算）>= 1/3", () => {
  const head = C.BASE_PARTS.head;
  const m = head.match(/<ellipse[^>]*cx="185"[^>]*cy="(\d+)"[^>]*rx="(\d+)"[^>]*ry="(\d+)"/);
  assert.ok(m, "找不到頭部橢圓");
  const [cy, ry] = [Number(m[1]), Number(m[3])];
  const headH = 2 * ry;
  const fullH = 254 - (cy - ry); // 設計：腳底 y≈254
  assert.ok(headH / fullH >= 1 / 3, `ratio=${headH / fullH}`);
});
