// 素材目錄（純資料，不使用任何 DOM / window API）
// 所有素材為 370×320 絕對座標的 SVG 片段，可用 token：{{skin}} {{skinShade}} {{hair}} {{hairShade}} {{line}}

export const CANVAS_WIDTH = 370;
export const CANVAS_HEIGHT = 320;
export const FIGURE_BOUNDS = { x: 8, y: 58, width: 354, height: 204 };
export const TEXT_BANDS = {
  top: { y0: 0, y1: 56, centerY: 30 },
  bottom: { y0: 264, y1: 320, centerY: 290 },
};
export const TEXT_MAX_WIDTH = 340;
export const TEXT_MAX_LENGTH = 20;
export const LINE_COLOR = "#5A3E36";

export const LAYER_ORDER = [
  "background",
  "vehicleBack",
  "hairBack",
  "body",
  "bottom",
  "top",
  "head",
  "expression",
  "hairFront",
  "glasses",
  "hat",
  "handheld",
  "vehicleFront",
];

// ---------- SVG 繪製小工具 ----------
const S = (w = 3) =>
  `stroke="{{line}}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
const path = (d, fill, w = 3) => `<path d="${d}" fill="${fill}" ${S(w)}/>`;
const line = (d, w = 3) => `<path d="${d}" fill="none" ${S(w)}/>`;
const circ = (cx, cy, r, fill, w = 3) =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" ${S(w)}/>`;
const ell = (cx, cy, rx, ry, fill, w = 3) =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" ${S(w)}/>`;
const rect = (x, y, w, h, rx, fill, sw = 3) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" ${S(sw)}/>`;
// 有輪廓的粗線條（手臂、袖子、車架）
const thick = (d, color, w) =>
  `<path d="${d}" fill="none" stroke="{{line}}" stroke-width="${w + 4}" stroke-linecap="round" stroke-linejoin="round"/>` +
  `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const starPts = (cx, cy, ro, ri) => {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? ro : ri;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return "M" + pts.join(" L") + " Z";
};
const star = (cx, cy, ro, ri, fill, w = 2) => path(starPts(cx, cy, ro, ri), fill, w);
const bgRect = (fill) => `<rect x="0" y="0" width="370" height="320" fill="${fill}"/>`;

// ---------- 人偶本體 ----------
const LEGS =
  rect(168, 208, 12, 38, 5, "{{skin}}") + rect(190, 208, 12, 38, 5, "{{skin}}");
const FEET = ell(174, 249, 11, 5, "#E8E1DD") + ell(196, 249, 11, 5, "#E8E1DD");
const ARMS =
  thick("M164 172 L148 200", "{{skin}}", 9) + thick("M206 172 L222 200", "{{skin}}", 9);
const HANDS = circ(146, 204, 8, "{{skin}}") + circ(224, 204, 8, "{{skin}}");
const TORSO = rect(160, 160, 50, 54, 14, "#FFFFFF") + rect(161, 204, 48, 14, 6, "#FFFFFF");

export const BASE_PARTS = {
  body: LEGS + FEET + ARMS + HANDS + TORSO,
  head:
    ell(136, 122, 6, 8, "{{skin}}") +
    ell(234, 122, 6, 8, "{{skin}}") +
    ell(185, 118, 50, 46, "{{skin}}"),
};

// ---------- 選項建構 ----------
const colorOpt = (id, name, color, shade) => {
  const o = { id, name, color };
  if (shade) o.shade = shade;
  return o;
};
const item = (id, name, parts, thumbViewBox) => ({ id, name, parts, thumbViewBox });
const none = (vb) => item("none", "無", {}, vb);

// ---------- 髮型 ----------
const FRINGE =
  "M134 114 C130 76 160 66 185 66 C210 66 240 76 236 114 C230 104 224 98 218 96 Q205 104 192 92 Q180 104 166 94 Q154 100 150 100 Q140 102 134 114 Z";
const HAIR_VB = "108 60 154 150";
const hairStyles = [
  item("hair-short", "短髮", { hairFront: path(FRINGE, "{{hair}}") }, HAIR_VB),
  item(
    "hair-bob",
    "鮑伯頭",
    {
      hairBack: path(
        "M130 112 C130 76 160 68 185 68 C210 68 240 76 240 112 L242 168 Q242 176 234 176 L136 176 Q128 176 128 168 Z",
        "{{hairShade}}"
      ),
      hairFront: path(FRINGE, "{{hair}}"),
    },
    HAIR_VB
  ),
  item(
    "hair-long",
    "長直髮",
    {
      hairBack: path(
        "M128 112 C126 74 158 66 185 66 C212 66 244 74 242 112 L248 212 Q248 222 238 222 L132 222 Q122 222 122 212 Z",
        "{{hairShade}}"
      ),
      hairFront: path(FRINGE, "{{hair}}"),
    },
    "108 62 154 164"
  ),
  item(
    "hair-twintail",
    "雙馬尾",
    {
      hairBack:
        path("M140 118 C128 124 120 150 126 172 C134 176 144 170 148 156 C148 140 146 126 140 118 Z", "{{hairShade}}") +
        path("M230 118 C242 124 250 150 244 172 C236 176 226 170 222 156 C222 140 224 126 230 118 Z", "{{hairShade}}"),
      hairFront:
        path(FRINGE, "{{hair}}") +
        circ(137, 112, 6, "#FF7FAE", 2.5) +
        circ(233, 112, 6, "#FF7FAE", 2.5),
    },
    HAIR_VB
  ),
  item(
    "hair-bun",
    "丸子頭",
    {
      hairFront:
        circ(185, 80, 13, "{{hair}}") +
        path(
          "M134 114 C132 84 160 74 185 74 C210 74 238 84 236 114 C230 104 224 98 218 96 Q205 104 192 92 Q180 104 166 94 Q154 100 150 100 Q140 102 134 114 Z",
          "{{hair}}"
        ),
    },
    HAIR_VB
  ),
];

// ---------- 表情 ----------
const CHEEK = (rx = 8, ry = 5, c = "#FFB0B8") =>
  `<ellipse cx="158" cy="134" rx="${rx}" ry="${ry}" fill="${c}"/><ellipse cx="212" cy="134" rx="${rx}" ry="${ry}" fill="${c}"/>`;
const DOT_EYES =
  `<circle cx="167" cy="118" r="5.5" fill="{{line}}"/><circle cx="203" cy="118" r="5.5" fill="{{line}}"/>` +
  `<circle cx="169" cy="116" r="1.9" fill="#FFFFFF"/><circle cx="205" cy="116" r="1.9" fill="#FFFFFF"/>`;
const EXPR_VB = "138 92 94 76";
const expressions = [
  item(
    "expr-happy",
    "開心",
    {
      expression:
        CHEEK() +
        line("M160 121 Q167 111 174 121") +
        line("M196 121 Q203 111 210 121") +
        path("M175 134 Q185 152 195 134 Z", "#E8645E", 2.5),
    },
    EXPR_VB
  ),
  item(
    "expr-angry",
    "生氣",
    {
      expression:
        CHEEK() +
        DOT_EYES +
        line("M157 103 L176 110") +
        line("M213 103 L194 110") +
        line("M176 145 Q185 136 194 145"),
    },
    EXPR_VB
  ),
  item(
    "expr-cry",
    "哭泣",
    {
      expression:
        CHEEK() +
        line("M160 117 Q167 125 174 117") +
        line("M196 117 Q203 125 210 117") +
        `<ellipse cx="163" cy="133" rx="3.5" ry="8" fill="#8FD3FF" stroke="{{line}}" stroke-width="1.5"/>` +
        `<ellipse cx="207" cy="133" rx="3.5" ry="8" fill="#8FD3FF" stroke="{{line}}" stroke-width="1.5"/>` +
        line("M174 148 Q180 139 185 144 Q190 139 196 148"),
    },
    EXPR_VB
  ),
  item(
    "expr-surprised",
    "驚訝",
    {
      expression:
        CHEEK() +
        circ(167, 118, 8, "#FFFFFF", 2.5) +
        circ(203, 118, 8, "#FFFFFF", 2.5) +
        `<circle cx="167" cy="119" r="3.5" fill="{{line}}"/><circle cx="203" cy="119" r="3.5" fill="{{line}}"/>` +
        line("M158 103 Q167 97 176 103", 2.5) +
        line("M194 103 Q203 97 212 103", 2.5) +
        ell(185, 142, 6, 8, "#8B3A3A", 2.5),
    },
    EXPR_VB
  ),
  item(
    "expr-shy",
    "害羞",
    {
      expression:
        CHEEK(10, 6, "#FF8FA3") +
        line("M160 121 Q167 112 174 121") +
        line("M196 121 Q203 112 210 121") +
        line("M178 138 Q185 144 192 138", 2.5) +
        line("M152 134 L156 140 M158 134 L162 140", 1.8) +
        line("M208 134 L212 140 M214 134 L218 140", 1.8),
    },
    EXPR_VB
  ),
];

// ---------- 上衣 ----------
const TOP_VB = "138 150 94 84";
const tops = [
  none(TOP_VB),
  item(
    "top-tshirt",
    "黃色T恤",
    {
      top:
        path("M160 164 L148 178 L154 192 L170 182 Z", "#FFD84D") +
        path("M210 164 L222 178 L216 192 L200 182 Z", "#FFD84D") +
        rect(157, 162, 56, 54, 14, "#FFD84D") +
        line("M175 163 Q185 172 195 163", 2.5),
    },
    TOP_VB
  ),
  item(
    "top-hoodie",
    "粉紅連帽衫",
    {
      top:
        thick("M164 172 L151 198", "#FFA6C9", 11) +
        thick("M206 172 L219 198", "#FFA6C9", 11) +
        rect(156, 162, 58, 58, 14, "#FFA6C9") +
        ell(185, 165, 20, 7, "#FF8DB9", 2.5) +
        line("M178 172 L177 186 M192 172 L193 186", 2.5) +
        rect(170, 196, 30, 16, 6, "#FF8DB9", 2.5),
    },
    TOP_VB
  ),
  item(
    "top-sailor",
    "水手服",
    {
      top:
        path("M160 164 L148 178 L154 192 L170 182 Z", "#FFFFFF") +
        path("M210 164 L222 178 L216 192 L200 182 Z", "#FFFFFF") +
        rect(157, 162, 56, 54, 14, "#FFFFFF") +
        path("M160 163 L185 192 L210 163 L212 176 L185 206 L158 176 Z", "#35508F") +
        path("M178 190 L185 200 L192 190 L185 184 Z", "#E5534B", 2.5),
    },
    TOP_VB
  ),
  item(
    "top-sweater",
    "薄荷毛衣",
    {
      top:
        thick("M164 172 L151 198", "#A8E6CF", 11) +
        thick("M206 172 L219 198", "#A8E6CF", 11) +
        rect(156, 162, 58, 58, 14, "#A8E6CF") +
        ell(185, 165, 16, 6, "#8FD6BA", 2.5) +
        line("M162 212 L208 212 M162 207 L208 207", 2),
    },
    TOP_VB
  ),
  item(
    "top-shirt",
    "藍色襯衫",
    {
      top:
        path("M160 164 L148 178 L154 192 L170 182 Z", "#7FB5FF") +
        path("M210 164 L222 178 L216 192 L200 182 Z", "#7FB5FF") +
        rect(157, 162, 56, 54, 14, "#7FB5FF") +
        path("M170 162 L185 180 L200 162 L192 160 L185 168 L178 160 Z", "#FFFFFF", 2.5) +
        line("M185 182 L185 214", 2) +
        `<circle cx="185" cy="192" r="2" fill="{{line}}"/><circle cx="185" cy="203" r="2" fill="{{line}}"/>`,
    },
    TOP_VB
  ),
];

// ---------- 下著 ----------
const BOT_VB = "142 196 86 66";
const bottoms = [
  none(BOT_VB),
  item(
    "bottom-shorts",
    "牛仔短褲",
    {
      bottom:
        path("M160 206 L210 206 L212 230 L190 230 L185 218 L180 230 L158 230 Z", "#6FA3E0") +
        line("M185 208 L185 218", 2) +
        line("M160 212 L210 212", 2),
    },
    BOT_VB
  ),
  item(
    "bottom-skirt",
    "百褶裙",
    {
      bottom:
        path("M162 206 L208 206 L214 236 L156 236 Z", "#E8708F") +
        line("M172 208 L168 235 M185 208 L185 235 M198 208 L202 235", 2),
    },
    BOT_VB
  ),
  item(
    "bottom-pants",
    "長褲",
    {
      bottom:
        path("M162 206 L208 206 L206 246 L190 246 L185 222 L180 246 L164 246 Z", "#7B8FD6") +
        line("M162 212 L208 212", 2),
    },
    BOT_VB
  ),
  item(
    "bottom-tutu",
    "蓬蓬裙",
    {
      bottom: path(
        "M164 206 L206 206 Q216 210 214 220 Q218 232 208 236 Q196 242 185 236 Q174 242 162 236 Q152 232 156 220 Q154 210 164 206 Z",
        "#FFB8DC"
      ) + line("M168 214 Q185 224 202 214", 2),
    },
    BOT_VB
  ),
];

// ---------- 帽子 ----------
const HAT_VB = "120 58 130 72";
const hats = [
  none(HAT_VB),
  item(
    "hat-cap",
    "棒球帽",
    {
      hat:
        path("M140 96 C140 58 230 58 230 96 Z", "#E5534B") +
        path("M200 94 Q232 88 246 100 Q226 106 200 102 Z", "#C4413A") +
        circ(185, 68, 3, "#FFFFFF", 2) +
        line("M185 68 L185 94", 2),
    },
    HAT_VB
  ),
  item(
    "hat-bow",
    "蝴蝶結",
    {
      hat:
        path("M152 82 L134 72 L134 94 Z", "#FF7FAE") +
        path("M152 82 L170 72 L170 94 Z", "#FF7FAE") +
        circ(152, 82, 5, "#FF5C98", 2.5),
    },
    HAT_VB
  ),
  item(
    "hat-catears",
    "貓耳髮箍",
    {
      hat:
        thick("M138 98 Q185 54 232 98", "#FFB3C7", 5) +
        path("M140 92 L142 66 L166 82 Z", "#FFB3C7") +
        path("M230 92 L228 66 L204 82 Z", "#FFB3C7") +
        path("M146 84 L147 74 L158 80 Z", "#FF7FAE", 1.5) +
        path("M224 84 L223 74 L212 80 Z", "#FF7FAE", 1.5),
    },
    HAT_VB
  ),
  item(
    "hat-crown",
    "小皇冠",
    {
      hat:
        path("M152 90 L156 70 L170 80 L185 66 L200 80 L214 70 L218 90 Z", "#FFD84D") +
        circ(185, 80, 3, "#E5534B", 1.5) +
        circ(165, 84, 2.5, "#6CB4EE", 1.5) +
        circ(205, 84, 2.5, "#6CB4EE", 1.5),
    },
    HAT_VB
  ),
];

// ---------- 眼鏡/臉部飾品 ----------
const GL_VB = "136 96 98 62";
const glassesList = [
  none(GL_VB),
  item(
    "glasses-round",
    "圓框眼鏡",
    {
      glasses:
        circ(167, 120, 13, "none") +
        circ(203, 120, 13, "none") +
        line("M180 119 Q185 114 190 119") +
        line("M154 118 L145 116 M216 118 L225 116"),
    },
    GL_VB
  ),
  item(
    "glasses-sun",
    "太陽眼鏡",
    {
      glasses:
        rect(152, 108, 28, 22, 8, "#2B2B38") +
        rect(190, 108, 28, 22, 8, "#2B2B38") +
        line("M180 114 L190 114") +
        line("M152 114 L144 112 M218 114 L226 112") +
        line("M158 114 L164 114 M196 114 L202 114", 2).replace(/stroke="\{\{line\}\}"/g, 'stroke="#FFFFFF"'),
    },
    GL_VB
  ),
  item(
    "glasses-heart",
    "愛心臉貼",
    {
      glasses: path(
        "M214 140 C198 129 203 117 211 120 C213 121 214 123 214 124 C214 123 215 121 217 120 C225 117 230 129 214 140 Z",
        "#FF5A7A",
        2.5
      ),
    },
    GL_VB
  ),
];

// ---------- 手持物 ----------
const HAND_R = circ(224, 204, 8, "{{skin}}");
const HH_VB = "150 130 140 130";
const handhelds = [
  none(HH_VB),
  item(
    "handheld-icecream",
    "冰淇淋",
    {
      handheld:
        path("M213 192 L235 192 L224 236 Z", "#E8B766") +
        circ(224, 182, 12, "#FFB3D1") +
        circ(224, 168, 10, "#BFEFE0") +
        HAND_R,
    },
    HH_VB
  ),
  item(
    "handheld-flower",
    "小花",
    {
      handheld:
        thick("M224 204 Q232 182 240 164", "#6BBF59", 3) +
        [0, 72, 144, 216, 288]
          .map((a) => {
            const r = (a * Math.PI) / 180;
            return circ((240 + 9 * Math.cos(r)).toFixed(1), (156 + 9 * Math.sin(r)).toFixed(1), 7, "#FF8FB8", 2);
          })
          .join("") +
        circ(240, 156, 5, "#FFD84D", 2) +
        HAND_R,
    },
    HH_VB
  ),
  item(
    "handheld-wand",
    "魔法棒",
    {
      handheld:
        thick("M224 204 L256 166", "#FFB3D1", 4) +
        star(262, 156, 16, 7, "#FFD84D") +
        HAND_R,
    },
    HH_VB
  ),
];

// ---------- 交通工具/設施 ----------
const wheel = (cx, cy) =>
  circ(cx, cy, 25, "none", 5) + circ(cx, cy, 3, "{{line}}", 1);
const CAR_WHEEL = (cx) => circ(cx, 248, 12, "#4A4A55") + circ(cx, 248, 4.5, "#D8D8E0", 2);
const VEH_VB = "55 170 260 100";
const vehicles = [
  none(VEH_VB),
  item(
    "vehicle-bicycle",
    "腳踏車",
    {
      vehicleBack:
        wheel(125, 232) +
        wheel(245, 232) +
        thick("M125 232 L165 232 L185 206 L232 206 L245 232 M165 232 L205 232 L232 206", "#E8604C", 4) +
        thick("M232 206 L238 198 L246 198", "#444455", 3) +
        thick("M160 200 L176 200", "#444455", 4),
    },
    VEH_VB
  ),
  item(
    "vehicle-skateboard",
    "滑板",
    {
      vehicleBack:
        rect(130, 249, 110, 7, 3.5, "#FF9A3C", 3) +
        circ(150, 257, 3, "#444455", 2) +
        circ(220, 257, 3, "#444455", 2),
    },
    VEH_VB
  ),
  item(
    "vehicle-car",
    "小汽車",
    {
      vehicleBack:
        rect(116, 196, 38, 30, 9, "#C4453A") + path("M236 214 L252 192 L262 192 L262 214 Z", "#BFE6FF"),
      vehicleFront:
        path(
          "M68 244 L68 230 Q68 214 84 214 L284 214 Q302 214 302 232 L302 244 Q302 250 296 250 L74 250 Q68 250 68 244 Z",
          "#E5534B"
        ) +
        circ(290, 228, 5, "#FFE066", 2) +
        line("M150 218 L150 244", 2) +
        CAR_WHEEL(112) +
        CAR_WHEEL(258),
    },
    VEH_VB
  ),
  item(
    "vehicle-balloon",
    "氣球",
    {
      vehicleBack:
        line("M95 148 Q85 178 120 190 T146 204", 2) +
        ell(95, 110, 32, 38, "#FF7FAE") +
        path("M95 148 L90 156 L100 156 Z", "#FF5C98", 2) +
        `<ellipse cx="82" cy="96" rx="6" ry="10" fill="#FFFFFF" transform="rotate(20 82 96)"/>`,
    },
    "50 60 110 150"
  ),
];

// ---------- 場景 ----------
const SC_VB = "0 0 370 320";
const cloud = (x, y, s = 1) =>
  `<ellipse cx="${x}" cy="${y}" rx="${26 * s}" ry="${12 * s}" fill="#FFFFFF"/>` +
  `<ellipse cx="${x - 14 * s}" cy="${y + 4 * s}" rx="${16 * s}" ry="${9 * s}" fill="#FFFFFF"/>` +
  `<ellipse cx="${x + 16 * s}" cy="${y + 3 * s}" rx="${18 * s}" ry="${10 * s}" fill="#FFFFFF"/>`;
const scenes = [
  item(
    "scene-pink",
    "純色・粉紅",
    { background: bgRect("#FFD9E8") },
    SC_VB
  ),
  item(
    "scene-sky",
    "純色・天空藍",
    { background: bgRect("#D4ECFF") },
    SC_VB
  ),
  item(
    "scene-park",
    "公園",
    {
      background:
        bgRect("#CDEFFF") +
        `<circle cx="326" cy="38" r="22" fill="#FFE066"/>` +
        cloud(90, 40, 1) +
        cloud(230, 28, 0.8) +
        `<path d="M0 222 Q90 200 185 216 T370 210 L370 320 L0 320 Z" fill="#98DB86"/>` +
        `<rect x="28" y="168" width="12" height="56" fill="#A8744F"/><circle cx="34" cy="156" r="30" fill="#5FBF6B"/>` +
        `<rect x="322" y="180" width="10" height="46" fill="#A8744F"/><circle cx="327" cy="170" r="24" fill="#6BCB77"/>` +
        `<circle cx="80" cy="270" r="4" fill="#FFFFFF"/><circle cx="300" cy="286" r="4" fill="#FFF3A0"/><circle cx="130" cy="296" r="4" fill="#FFB3D1"/>`,
    },
    SC_VB
  ),
  item(
    "scene-beach",
    "海邊",
    {
      background:
        bgRect("#BDE9FF") +
        `<circle cx="42" cy="46" r="22" fill="#FFE066"/>` +
        cloud(250, 36, 0.9) +
        `<rect x="0" y="170" width="370" height="70" fill="#4FB8E6"/>` +
        `<path d="M10 190 q10 -6 20 0 t20 0 M120 205 q10 -6 20 0 t20 0 M250 188 q10 -6 20 0 t20 0 M300 222 q10 -6 20 0 t20 0" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round"/>` +
        `<path d="M0 238 Q100 226 200 238 T370 236 L370 320 L0 320 Z" fill="#F6E2B0"/>` +
        `<circle cx="60" cy="290" r="5" fill="#FFB3C7"/><circle cx="310" cy="280" r="5" fill="#FFFFFF"/>`,
    },
    SC_VB
  ),
  item(
    "scene-night",
    "星空夜晚",
    {
      background:
        bgRect("#262A5C") +
        `<circle cx="312" cy="48" r="22" fill="#FFF3B0"/><circle cx="322" cy="42" r="19" fill="#262A5C"/>` +
        `<path d="${starPts(50, 40, 9, 4)}" fill="#FFE98A"/>` +
        `<path d="${starPts(130, 24, 6, 3)}" fill="#FFE98A"/>` +
        `<path d="${starPts(220, 44, 8, 3.5)}" fill="#FFE98A"/>` +
        `<path d="${starPts(40, 120, 6, 3)}" fill="#FFE98A"/>` +
        `<path d="${starPts(335, 130, 7, 3)}" fill="#FFE98A"/>` +
        `<path d="${starPts(90, 296, 7, 3)}" fill="#FFE98A"/>` +
        `<path d="${starPts(300, 290, 6, 3)}" fill="#FFE98A"/>` +
        `<path d="M0 250 Q90 232 185 246 T370 244 L370 320 L0 320 Z" fill="#1C1F4A"/>`,
    },
    SC_VB
  ),
  item(
    "scene-room",
    "可愛房間",
    {
      background:
        bgRect("#FFEFD5") +
        `<rect x="0" y="246" width="370" height="74" fill="#E3B988"/>` +
        `<rect x="0" y="240" width="370" height="8" fill="#D9A56E"/>` +
        `<rect x="28" y="66" width="72" height="84" fill="#BFE6FF"/>` +
        `<path d="M64 66 L64 150 M28 108 L100 108" stroke="#FFFFFF" stroke-width="5" fill="none"/>` +
        `<rect x="28" y="66" width="72" height="84" fill="none" stroke="#FFFFFF" stroke-width="5"/>` +
        `<rect x="272" y="64" width="60" height="50" fill="#FFB8D2"/><rect x="278" y="70" width="48" height="38" fill="#FFF7E0"/>` +
        `<circle cx="302" cy="89" r="9" fill="#FFD84D"/>` +
        `<ellipse cx="185" cy="288" rx="140" ry="20" fill="#F7A8C4"/>` +
        `<rect x="332" y="206" width="22" height="36" fill="#C9835A"/><circle cx="343" cy="196" r="14" fill="#6BCB77"/>`,
    },
    SC_VB
  ),
  item("scene-transparent", "透明背景", {}, SC_VB),
];

// ---------- 色彩類 ----------
const skins = [
  colorOpt("skin-porcelain", "白皙", "#FFE7D6", "#F2CBB3"),
  colorOpt("skin-fair", "淺膚", "#F9D2B4", "#E8B48F"),
  colorOpt("skin-tan", "小麥", "#E3AD82", "#C98C60"),
  colorOpt("skin-brown", "棕膚", "#B97E55", "#97603C"),
  colorOpt("skin-deep", "深膚", "#7E4E33", "#633923"),
];
const hairColors = [
  colorOpt("haircolor-black", "黑", "#2E2A2A", "#1A1717"),
  colorOpt("haircolor-brown", "棕", "#7A4B2A", "#5A341B"),
  colorOpt("haircolor-blonde", "金", "#F4C95D", "#D9A93A"),
  colorOpt("haircolor-red", "紅", "#C8473B", "#9E2F25"),
  colorOpt("haircolor-pink", "粉紅", "#F59BC0", "#DB7AA2"),
  colorOpt("haircolor-blue", "藍", "#6CB4EE", "#4A90C9"),
];
const textColors = [
  colorOpt("textcolor-black", "黑", "#222222"),
  colorOpt("textcolor-white", "白", "#FFFFFF"),
  colorOpt("textcolor-red", "紅", "#E53935"),
  colorOpt("textcolor-pink", "粉紅", "#FF5FA2"),
  colorOpt("textcolor-blue", "藍", "#1E88E5"),
  colorOpt("textcolor-yellow", "黃", "#FFC107"),
];
const textPositions = [
  { id: "top", name: "上方" },
  { id: "bottom", name: "下方" },
];

export const CATEGORIES = [
  { id: "skin", name: "膚色", tab: "doll", kind: "color", options: skins },
  { id: "hairStyle", name: "髮型", tab: "doll", kind: "item", options: hairStyles },
  { id: "hairColor", name: "髮色", tab: "doll", kind: "color", options: hairColors },
  { id: "expression", name: "表情", tab: "doll", kind: "item", options: expressions },
  { id: "top", name: "上衣", tab: "clothes", kind: "item", options: tops },
  { id: "bottom", name: "下著", tab: "clothes", kind: "item", options: bottoms },
  { id: "hat", name: "帽子/頭飾", tab: "accessory", kind: "item", options: hats },
  { id: "glasses", name: "眼鏡/臉部飾品", tab: "accessory", kind: "item", options: glassesList },
  { id: "handheld", name: "手持物/飾品", tab: "accessory", kind: "item", options: handhelds },
  { id: "vehicle", name: "交通工具/設施", tab: "vehicle", kind: "item", options: vehicles },
  { id: "scene", name: "場景", tab: "scene", kind: "item", options: scenes },
  { id: "textColor", name: "文字顏色", tab: "text", kind: "color", options: textColors },
  { id: "textPosition", name: "文字位置", tab: "text", kind: "choice", options: textPositions },
];

export function getCategory(categoryId) {
  return CATEGORIES.find((c) => c.id === categoryId);
}
export function getOption(categoryId, optionId) {
  const c = getCategory(categoryId);
  return c ? c.options.find((o) => o.id === optionId) : undefined;
}
export function getOptionIds(categoryId) {
  const c = getCategory(categoryId);
  return c ? c.options.map((o) => o.id) : [];
}
