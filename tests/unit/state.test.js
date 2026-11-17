import test from "node:test";
import assert from "node:assert/strict";
import { createDefaultState, setOption, setText, randomizeState, resetState, isValidState, RANDOM_CATEGORIES } from "../../js/state.js";
import { getOptionIds, TEXT_MAX_LENGTH } from "../../js/catalog.js";

test("預設值符合設計 4.4", () => {
  assert.deepEqual(createDefaultState(), {
    skin: "skin-fair", hairStyle: "hair-short", hairColor: "haircolor-brown", expression: "expr-happy",
    top: "top-tshirt", bottom: "bottom-shorts", hat: "none", glasses: "none", handheld: "none", vehicle: "none",
    scene: "scene-pink", textColor: "textcolor-black", textPosition: "bottom", text: "",
  });
  assert.notEqual(createDefaultState(), createDefaultState());
  assert.ok(isValidState(createDefaultState()));
});
test("setOption：不修改輸入、無效值丟錯", () => {
  const s = createDefaultState();
  const n = setOption(s, "hat", "hat-crown");
  assert.equal(n.hat, "hat-crown");
  assert.equal(s.hat, "none");
  assert.throws(() => setOption(s, "hat", "xxx"));
  assert.throws(() => setOption(s, "nocat", "none"));
  assert.equal(setOption(s, "textPosition", "top").textPosition, "top");
});
test("AC5 setText：10 個中文、英文可存；超過 20 字截斷；emoji 不切壞；不 trim", () => {
  const s = createDefaultState();
  assert.equal(setText(s, "你好啊今天好開心喔哈哈").text, "你好啊今天好開心喔哈哈");
  assert.equal(setText(s, "Hello Wor").text, "Hello Wor");
  assert.equal(setText(s, "a".repeat(30)).text.length, TEXT_MAX_LENGTH);
  const e = setText(s, "😀".repeat(25)).text;
  assert.equal(Array.from(e).length, TEXT_MAX_LENGTH);
  assert.doesNotMatch(e, /[\uD800-\uDBFF](?![\uDC00-\uDFFF])/);
  assert.equal(setText(s, "  x ").text, "  x ");
});
test("AC9 randomizeState：各類落在有效選項、文字/文字色/位置不變、含 none 與透明可被抽到", () => {
  const base = { ...createDefaultState(), text: "保留", textColor: "textcolor-red", textPosition: "top" };
  for (let i = 0; i < 200; i++) {
    const r = randomizeState(base);
    assert.ok(isValidState(r));
    assert.equal(r.text, "保留");
    assert.equal(r.textColor, "textcolor-red");
    assert.equal(r.textPosition, "top");
  }
  assert.equal(randomizeState(base, () => 0).hat, "none");
  assert.equal(randomizeState(base, () => 0.999999).scene, "scene-transparent");
  for (const c of RANDOM_CATEGORIES) {
    const ids = getOptionIds(c);
    assert.equal(randomizeState(base, () => 0)[c], ids[0]);
    assert.equal(randomizeState(base, () => 0.9999)[c], ids[ids.length - 1]);
  }
  assert.equal(base.hat, "none"); // 未被修改
});
test("randomize 涵蓋所有選項（統計）", () => {
  const seen = {};
  for (let i = 0; i < 2000; i++) {
    const r = randomizeState(createDefaultState());
    for (const c of RANDOM_CATEGORIES) (seen[c] ??= new Set()).add(r[c]);
  }
  for (const c of RANDOM_CATEGORIES) assert.equal(seen[c].size, getOptionIds(c).length, c);
});
test("AC9 resetState 等同預設且文字為空", () => {
  assert.deepEqual(resetState(), createDefaultState());
  assert.equal(resetState().text, "");
});
test("isValidState 拒絕壞資料", () => {
  assert.equal(isValidState(null), false);
  assert.equal(isValidState({ ...createDefaultState(), skin: "x" }), false);
  assert.equal(isValidState({ ...createDefaultState(), text: 5 }), false);
  assert.equal(isValidState({ ...createDefaultState(), text: "a".repeat(21) }), false);
});
