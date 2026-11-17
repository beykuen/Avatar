// 設計狀態（純函式，不使用 DOM；皆回傳新物件，不修改輸入）
import { CATEGORIES, TEXT_MAX_LENGTH, getOption, getOptionIds } from "./catalog.js";

export const RANDOM_CATEGORIES = [
  "skin", "hairStyle", "hairColor", "expression", "top", "bottom",
  "hat", "glasses", "handheld", "vehicle", "scene",
];

export function createDefaultState() {
  return {
    skin: "skin-fair",
    hairStyle: "hair-short",
    hairColor: "haircolor-brown",
    expression: "expr-happy",
    top: "top-tshirt",
    bottom: "bottom-shorts",
    hat: "none",
    glasses: "none",
    handheld: "none",
    vehicle: "none",
    scene: "scene-pink",
    textColor: "textcolor-black",
    textPosition: "bottom",
    text: "",
  };
}

export function setOption(state, categoryId, optionId) {
  if (!getOption(categoryId, optionId)) {
    throw new Error(`Invalid option: ${categoryId}/${optionId}`);
  }
  return { ...state, [categoryId]: optionId };
}

export function setText(state, text) {
  const chars = Array.from(String(text));
  return { ...state, text: chars.slice(0, TEXT_MAX_LENGTH).join("") };
}

export function randomizeState(state, rng = Math.random) {
  const next = { ...state };
  for (const cat of RANDOM_CATEGORIES) {
    const ids = getOptionIds(cat);
    const i = Math.min(ids.length - 1, Math.floor(rng() * ids.length));
    next[cat] = ids[i];
  }
  return next;
}

export function resetState() {
  return createDefaultState();
}

export function isValidState(state) {
  if (!state || typeof state !== "object") return false;
  for (const c of CATEGORIES) {
    if (!getOption(c.id, state[c.id])) return false;
  }
  return typeof state.text === "string" && Array.from(state.text).length <= TEXT_MAX_LENGTH;
}
