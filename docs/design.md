# 系統設計文件：網頁版紙娃娃貼圖產生器

> 輸入：docs/requirements.md（已確認版）
> 讀者：AP（依本文件實作）、QA（依本文件與驗收條件設計測試）
> 原則：本文件只描述「做什麼、介面長什麼樣」；不新增需求以外的功能。凡本文件未規定的細節（例如素材的具體筆畫），AP 可自行決定，但必須遵守本文件列出的座標範圍、色票、id 與介面。

---

## 1. 技術選型與理由

| 項目 | 選擇 | 理由 |
|---|---|---|
| 平台 | 純靜態前端：HTML + CSS + 原生 JavaScript（ES Modules，`<script type="module">`） | 可直接放上 GitHub Pages，無後端、**無建置步驟**；不需 npm 才能執行網站本身。 |
| 外部依賴 | **網站執行時零外部依賴**（不使用 CDN、框架、Web Font） | 避免授權問題與網路失敗；總體積小，確保 AC11（5 秒內可操作）。 |
| 素材製作 | 全部素材以 **SVG 片段字串** 寫在 `js/catalog.js` 內，由專案自行繪製（AP 手寫向量圖形：圓、橢圓、圓角路徑） | 無外部素材授權問題；向量可任意縮放；顏色可用代換符號（token）動態套色（膚色、髮色）。 |
| 合成方式 | 依「設計狀態」產生一份 370×320 的完整 SVG 字串 → 轉成 `data:image/svg+xml` → 載入為 `Image` → `drawImage` 到 `<canvas>`；文字再以 Canvas 2D `fillText` 畫在最上層 | 預覽與輸出**使用同一個合成函式**（只差解析度倍率），保證 AC6 一致性；文字在 Canvas 上繪製可精確量測寬度，避免裁切（AC8），也不需處理 XML 跳脫。 |
| PNG 輸出 | 另一個固定 370×320 的「輸出用 canvas」（不顯示），每次狀態變更與預覽同步重繪；輸出時 `canvas.toDataURL('image/png')` | Canvas 輸出 PNG 天生為 RGBA（含 alpha），透明背景時用 `clearRect` 留空即為透明（AC7）。同步取得資料可在使用者點擊手勢內觸發下載（iPad Safari 對非同步下載較嚴格）。 |
| iPad 下載（AC16） | 雙管齊下：①`<a download>` + Blob URL 觸發下載（iPadOS 13+ Safari 會詢問並存到「檔案」）；②同時開啟「輸出結果」對話框，顯示實際 370×320 PNG 圖片（`<img src=dataURL>`），提示「長按圖片可加入照片」，並提供「下載 PNG」按鈕可再次下載 | 任一路徑失敗時，使用者仍可由另一路徑取得 PNG。 |
| 字型 | 系統字型堆疊：`"PingFang TC","Heiti TC","Microsoft JhengHei","Noto Sans CJK TC","Noto Sans TC",sans-serif`，粗體 | 不需下載字型（AC11）；中英文皆可正常顯示（AC5）。 |
| 測試 | Node 內建 `node:test` + Playwright（Chromium）函式庫 | 本環境已有 Node 22 與 Playwright 1.63（Chromium）；不需額外測試框架。 |

### 1.1 瀏覽器相容性下限
- Chrome / Edge / Firefox 最新版、Safari 15.4 以上（含 iPadOS 15.4+）。
- 使用的 API：ES Modules、`<dialog>`、Canvas 2D、`HTMLImageElement.decode()`、`Blob`、`URL.createObjectURL`、CSS Grid、CSS 自訂屬性、`@media (hover: hover)`、`@media (orientation: …)`。以上 Safari 15.4+ 皆支援。

---

## 2. 目錄與檔案結構

GitHub Pages 由 **main 分支根目錄（/）** 發布（理由見第 8 節）。網站入口在根目錄。

```
/ (repo root)
├── index.html            # 網站入口（唯一頁面）
├── .nojekyll             # 空檔，關閉 Jekyll 處理，原樣發布
├── css/
│   └── style.css         # 全部樣式（版面、RWD、元件）
├── js/
│   ├── catalog.js        # 素材目錄（資料 + SVG 片段），常數
│   ├── state.js          # 設計狀態：預設值、設定、隨機、重設、驗證（純函式，無 DOM）
│   ├── compose.js        # 合成：產生 SVG、文字排版、繪製到 canvas
│   ├── exporter.js       # 輸出 PNG：檔名、Blob 轉換、觸發下載
│   ├── ui.js             # 控制面板 DOM 建構與狀態同步
│   └── app.js            # 進入點：持有狀態、串接各模組、渲染排程、測試掛鉤
├── package.json          # 僅供測試使用（type: module、test 指令、devDependencies: playwright）
├── docs/                 # 文件（requirements.md、design.md、test-report.md）
├── tests/                # QA 測試（見 2.1）
├── README.md
└── CLAUDE.md
```

- `package.json` 內容要求：`"private": true`、`"type": "module"`、`"scripts": { "test": "node --test \"tests/**/*.test.js\"" }`、`"devDependencies": { "playwright": "1.63.0" }`。網站本身不依賴它。
- 不得新增建置工具（webpack、vite 等）。

### 2.1 測試位置與方式（建議給 QA）

```
tests/
├── helpers/
│   ├── server.js         # 以 Node 內建 http 模組提供 repo 根目錄靜態檔（隨機埠），供 e2e 使用
│   └── pw.js             # 載入 playwright：先 import('playwright')，失敗則從 `npm root -g` 路徑以 createRequire 載入
├── unit/                 # 純函式測試（直接 import js/catalog.js、js/state.js），不需瀏覽器
│   ├── catalog.test.js
│   └── state.test.js
└── e2e/                  # Playwright（Chromium）瀏覽器測試
    ├── desktop.test.js   # 1280×720
    ├── ipad.test.js      # devices['iPad (gen 7)'] 直式與橫式（hasTouch，使用 tap）
    ├── mobile.test.js    # 375 寬
    └── export.test.js    # 下載 PNG 驗證
```

- 執行：`npm test`（或 `node --test "tests/**/*.test.js"`）。glob 須加引號，由 Node 自行展開（Node 22 起 `--test` 支援 glob），以免 shell 展開不一致；只比對 `tests/unit/`、`tests/e2e/` 下的 `*.test.js`，`tests/helpers/` 不會被當成測試執行。不得使用 `node --test tests/`：Node 22 會把目錄參數當模組路徑載入而失敗（BUG-1）。`tests/index.js`（BUG-1 的暫時緩解入口檔）改用新指令後不再需要，應刪除；若保留且同時被執行會使每個測試跑兩次。e2e 透過 `helpers/server.js` 起本機伺服器（ES Modules 不能用 `file://` 開啟）。
- 本環境只有 Chromium（無 WebKit）；iPad 相關條件以 Chromium 的 iPad 裝置模擬（觸控、視窗尺寸、旋轉＝切換 viewport）驗證，真機 Safari 部分由 QA 在 test-report 列為「需人工驗證」並附檢查步驟。
- PNG 驗證建議：讀下載檔前 8 bytes 為 PNG 簽章；IHDR 寬 370、高 320、color type 6（RGBA）；再於頁面中載入該 PNG 到 canvas 用 `getImageData` 檢查角落像素 alpha（透明背景 = 0，其他場景 = 255）。
- 裁切檢查建議：用測試掛鉤 `window.__stickerApp.buildSceneSvg(state)` 取得 SVG，插入 DOM 後對每個 `g[data-layer]` 取 `getBBox()`，檢查是否落在第 4.5 節規定的範圍內；文字用 `window.__stickerApp.getTextLayout()` 檢查。

---

## 3. 模組劃分與對外介面

依賴方向（單向）：`app.js → ui.js / compose.js / exporter.js / state.js → catalog.js`。`catalog.js`、`state.js` 不可使用任何 DOM / window API（才能在 Node 中單元測試）。

### 3.1 `js/catalog.js`（素材目錄，純資料）

| 匯出 | 型別 | 說明 |
|---|---|---|
| `CANVAS_WIDTH` | `370` | 貼圖寬 |
| `CANVAS_HEIGHT` | `320` | 貼圖高 |
| `FIGURE_BOUNDS` | `{x:8, y:58, width:354, height:204}` | 人偶與所有部件（背景除外）必須落在此矩形內（即 x 8–362、y 58–262） |
| `TEXT_BANDS` | `{ top:{y0:0,y1:56,centerY:30}, bottom:{y0:264,y1:320,centerY:290} }` | 文字區帶 |
| `TEXT_MAX_WIDTH` | `340` | 文字最大寬度（左右各留 15px） |
| `TEXT_MAX_LENGTH` | `20` | 文字輸入上限（字元數，見待確認事項 3） |
| `LINE_COLOR` | `"#5A3E36"` | 全素材共用輪廓色 |
| `LAYER_ORDER` | `string[]` | 圖層由下而上順序（見 4.3） |
| `BASE_PARTS` | `{ [layerSlot]: svgFragment }` | 永遠存在的人偶本體（`body`、`head` 兩層） |
| `CATEGORIES` | `Category[]` | 所有可選類別（見 4.1、4.2） |
| `getCategory(categoryId)` | `(string) → Category \| undefined` | |
| `getOption(categoryId, optionId)` | `(string, string) → Option \| undefined` | |
| `getOptionIds(categoryId)` | `(string) → string[]` | 該類別全部有效 id（含 `none`、含 `scene-transparent`） |

### 3.2 `js/state.js`（設計狀態，純函式，皆回傳新物件、不修改輸入）

| 函式 | 簽名 | 說明 |
|---|---|---|
| `createDefaultState` | `() → DesignState` | 回傳第 4.4 節的預設值（新物件）。 |
| `setOption` | `(state, categoryId, optionId) → DesignState` | 設定某類別選項；`categoryId` 或 `optionId` 無效時丟出 `Error`。適用所有 `CATEGORIES`（含 `textColor`、`textPosition`）。 |
| `setText` | `(state, text: string) → DesignState` | 設定文字；超過 `TEXT_MAX_LENGTH` 時截斷（以 `Array.from(text)` 計字元，避免切壞字）。不 trim（顯示時才判斷空白）。 |
| `randomizeState` | `(state, rng = Math.random) → DesignState` | 對 `RANDOM_CATEGORIES` 的每一類，自 `getOptionIds()` 中均勻隨機選一個（**含 `none` 與 `scene-transparent`**）；`text`、`textColor`、`textPosition` 保持原值。`rng` 為回傳 [0,1) 的函式，便於測試注入。 |
| `resetState` | `() → DesignState` | 等同 `createDefaultState()`（文字清空）。 |
| `isValidState` | `(state) → boolean` | 每個欄位皆為有效 id、`text` 為字串且長度不超過上限。 |
| `RANDOM_CATEGORIES` | 常數 `string[]` | `["skin","hairStyle","hairColor","expression","top","bottom","hat","glasses","handheld","vehicle","scene"]` |

### 3.3 `js/compose.js`（合成）

| 函式 | 簽名 | 說明 |
|---|---|---|
| `buildSceneSvg` | `(state) → string` | 回傳完整 SVG 字串：`<svg xmlns="http://www.w3.org/2000/svg" width="370" height="320" viewBox="0 0 370 320">`，內含依 `LAYER_ORDER` 排列的 `<g data-layer="{slot}">…</g>`（某層沒有內容時仍輸出空的 `<g>`）。**不含文字**。透明背景時 `background` 層為空。所有顏色 token 已代換。 |
| `buildThumbnailSvg` | `(categoryId, optionId) → string` | 回傳選項縮圖用 SVG（`viewBox` 取 option 的 `thumbViewBox`）；色彩類回傳 `null`（UI 直接用色塊）。縮圖固定用預設膚色與預設髮色套色。 |
| `resolveTokens` | `(fragment, state) → string` | 將 `{{skin}}`、`{{skinShade}}`、`{{hair}}`、`{{hairShade}}`、`{{line}}` 代換為實際色碼。 |
| `layoutText` | `(ctx: CanvasRenderingContext2D, text, position) → TextLayout` | 計算文字版面（見 4.6）。`TextLayout = { visible:boolean, text, font, fontSize, x, y, maxWidth }`。座標為 370×320 基準座標。 |
| `renderSticker` | `(state, canvas, scale = 1) → Promise<void>` | 將 canvas 設為 `370*scale × 320*scale`，`clearRect` 全清 → 載入 `buildSceneSvg(state)` 為圖片並畫滿 → `ctx.scale(scale,scale)` 後依 `layoutText` 以 `fillText(text, x, y, maxWidth)` 畫文字（顏色取 `textColor` 對應色碼；`textAlign="center"`、`textBaseline="middle"`）。 |
| `loadSvgImage` | `(svgString) → Promise<HTMLImageElement>` | `new Image()`，`src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg)`，`await img.decode()`。 |

注意：
- 預覽 canvas 用 `scale = 2`（高解析螢幕清晰），輸出 canvas 用 `scale = 1`；兩者呼叫同一個 `renderSticker`，內容與相對位置一致（AC6）。
- 不得在 canvas 上畫任何不屬於貼圖的東西（例如透明格紋）；預覽的透明格紋用 CSS 背景畫在 canvas 後方的容器上。

### 3.4 `js/exporter.js`（輸出）

| 函式 | 簽名 | 說明 |
|---|---|---|
| `makeFileName` | `(date = new Date()) → string` | `sticker-YYYYMMDD-HHMMSS.png`（本地時間，兩位數補零）。 |
| `dataUrlToBlob` | `(dataUrl) → Blob` | 同步轉換（`atob` → `Uint8Array`），type `image/png`。 |
| `triggerDownload` | `(blob, filename) → void` | 建立 `<a href=objectURL download=filename>`，加入 DOM、`click()`、移除；60 秒後 `URL.revokeObjectURL`。 |
| `exportFromCanvas` | `(canvas) → { dataUrl, blob, filename }` | 同步：`canvas.toDataURL("image/png")` → blob → 檔名。呼叫前 canvas 必須是 370×320 且已渲染最新狀態。 |

### 3.5 `js/ui.js`（介面建構）

| 函式 | 簽名 | 說明 |
|---|---|---|
| `buildControls` | `(rootEl, { onSelect(categoryId, optionId), onText(text) }) → void` | 依 `CATEGORIES` 與第 5 節的分頁配置建立全部控制項（只建一次）。 |
| `syncControls` | `(state) → void` | 依 state 更新每個選項按鈕的 `aria-pressed` 與選取樣式；若文字框值與 `state.text` 不同才寫回（避免打斷輸入法）。 |
| `initTabs` | `(rootEl) → void` | 分頁切換（點擊/觸控），記住目前分頁於記憶體。 |
| `showExportDialog` | `({ dataUrl, blob, filename }, onDownload) → void` | 開啟輸出結果對話框（見 5.5）。 |

### 3.6 `js/app.js`（進入點）

- 模組層級持有唯一的 `let state = createDefaultState()`。
- `update(newState)`：設 `state`、`syncControls(state)`、`scheduleRender()`。
- `scheduleRender()`：以 `requestAnimationFrame` 合併；若正在渲染，標記 dirty，完成後以最新 state 再渲染一次。每次渲染同時 `renderSticker(state, previewCanvas, 2)` 與 `renderSticker(state, exportCanvas, 1)`。維護 `renderPromise`（最新一次渲染完成的 Promise）。
- 事件：
  - 選項按鈕 → `update(setOption(state, c, o))`
  - 文字框 `input` 事件（含輸入法組字期間）與 `compositionend` → `update(setText(state, value))`
  - 「隨機搭配」→ `update(randomizeState(state))`
  - 「全部重設」→ `update(resetState())`，並清空文字框。
  - 「輸出貼圖」→ 若目前無待處理渲染：**同步**呼叫 `exportFromCanvas(exportCanvas)` → `triggerDownload` → `showExportDialog`；若有待處理渲染：`await renderPromise` 後執行相同步驟（此時 iPad 若擋下自動下載，對話框仍可取得圖片）。
- 測試掛鉤（唯讀，不是使用者功能）：
  ```
  window.__stickerApp = {
    getState(): DesignState,            // 回傳複本
    whenRendered(): Promise<void>,      // 等待目前所有渲染完成
    buildSceneSvg(state?): string,      // 預設用目前 state
    getTextLayout(): TextLayout,        // 目前文字版面（370×320 座標）
    catalog: { CATEGORIES, LAYER_ORDER, FIGURE_BOUNDS, TEXT_BANDS }
  }
  ```
- 頁面載入：`buildControls` → `initTabs` → `syncControls(state)` → `scheduleRender()`。

---

## 4. 資料格式

### 4.1 型別定義

```
Category = {
  id: string,                 // 例："hairStyle"
  name: string,               // 介面顯示名稱（繁中）
  tab: "doll"|"clothes"|"accessory"|"vehicle"|"scene"|"text",
  kind: "color" | "item" | "choice",
                              // color：色塊選項；item：含 SVG 部件、顯示縮圖；choice：純文字按鈕（文字位置）
  options: Option[]
}

Option = {
  id: string,                 // 全域唯一；「無」一律為 "none"（同一類別內唯一即可）
  name: string,               // 繁中名稱，作為按鈕標籤與 aria-label
  color?: string,             // kind=color 時：主色
  shade?: string,             // kind=color 且為膚色/髮色時：陰影色
  parts?: { [layerSlot: string]: string },  // kind=item：要放進哪些圖層的 SVG 片段（370×320 絕對座標）
  thumbViewBox?: string       // kind=item：縮圖 viewBox，例 "120 55 130 70"
}
```

SVG 片段規則：
- 使用 370×320 畫布的**絕對座標**，不含外層 `<svg>`。
- 可使用 token：`{{skin}}`、`{{skinShade}}`、`{{hair}}`、`{{hairShade}}`、`{{line}}`。
- 不得使用 `<image>`、`<foreignObject>`、外部連結、`<text>`、濾鏡（filter）、`id` 屬性（避免重複 id 與 Safari canvas 汙染問題）。漸層若需要，改用多個色塊表現。
- 輪廓：`stroke="{{line}}"`、`stroke-width` 3（小物件可 2）、`stroke-linejoin="round"`、`stroke-linecap="round"`。

### 4.2 素材目錄（各類選項 id 與名稱）

數量均符合 AC（括號內為 AC 要求的最低數量，不含「無」）。

**分頁「人偶」**

| 類別 id | 名稱 | kind | 選項（id：名稱：色碼） |
|---|---|---|---|
| `skin` | 膚色 | color | `skin-porcelain` 白皙 `#FFE7D6`/`#F2CBB3`；`skin-fair` 淺膚 `#F9D2B4`/`#E8B48F`；`skin-tan` 小麥 `#E3AD82`/`#C98C60`；`skin-brown` 棕膚 `#B97E55`/`#97603C`；`skin-deep` 深膚 `#7E4E33`/`#633923`（5，AC 5） |
| `hairStyle` | 髮型 | item | `hair-short` 短髮；`hair-bob` 鮑伯頭；`hair-long` 長直髮；`hair-twintail` 雙馬尾；`hair-bun` 丸子頭（5，AC 5） |
| `hairColor` | 髮色 | color | `haircolor-black` 黑 `#2E2A2A`/`#1A1717`；`haircolor-brown` 棕 `#7A4B2A`/`#5A341B`；`haircolor-blonde` 金 `#F4C95D`/`#D9A93A`；`haircolor-red` 紅 `#C8473B`/`#9E2F25`；`haircolor-pink` 粉紅 `#F59BC0`/`#DB7AA2`；`haircolor-blue` 藍 `#6CB4EE`/`#4A90C9`（6，AC 6） |
| `expression` | 表情 | item | `expr-happy` 開心；`expr-angry` 生氣；`expr-cry` 哭泣；`expr-surprised` 驚訝；`expr-shy` 害羞（5，AC 5） |

**分頁「服裝」**

| 類別 id | 名稱 | 選項 |
|---|---|---|
| `top` | 上衣 | `none` 無；`top-tshirt` 黃色T恤；`top-hoodie` 粉紅連帽衫；`top-sailor` 水手服；`top-sweater` 薄荷毛衣；`top-shirt` 藍色襯衫（5，AC 5） |
| `bottom` | 下著 | `none` 無；`bottom-shorts` 牛仔短褲；`bottom-skirt` 百褶裙；`bottom-pants` 長褲；`bottom-tutu` 蓬蓬裙（4，AC 4） |

**分頁「配件」**

| 類別 id | 名稱 | 選項 |
|---|---|---|
| `hat` | 帽子/頭飾 | `none` 無；`hat-cap` 棒球帽；`hat-bow` 蝴蝶結；`hat-catears` 貓耳髮箍；`hat-crown` 小皇冠（4，AC 4） |
| `glasses` | 眼鏡/臉部飾品 | `none` 無；`glasses-round` 圓框眼鏡；`glasses-sun` 太陽眼鏡；`glasses-heart` 愛心臉貼（3，AC 3） |
| `handheld` | 手持物/飾品 | `none` 無；`handheld-icecream` 冰淇淋；`handheld-flower` 小花；`handheld-wand` 魔法棒（3，AC 3） |

**分頁「交通/設施」**

| 類別 id | 名稱 | 選項 |
|---|---|---|
| `vehicle` | 交通工具/設施 | `none` 無；`vehicle-bicycle` 腳踏車；`vehicle-skateboard` 滑板；`vehicle-car` 小汽車；`vehicle-balloon` 氣球（4，AC 4） |

**分頁「場景」**

| 類別 id | 名稱 | 選項 |
|---|---|---|
| `scene` | 場景 | `scene-pink` 純色・粉紅（`#FFD9E8`）；`scene-sky` 純色・天空藍（`#D4ECFF`）；`scene-park` 公園；`scene-beach` 海邊；`scene-night` 星空夜晚；`scene-room` 可愛房間；`scene-transparent` 透明背景（6 + 透明，AC 6 含 ≥1 純色） |

**分頁「文字」**

| 類別 id | 名稱 | kind | 選項 |
|---|---|---|---|
| `textColor` | 文字顏色 | color | `textcolor-black` 黑 `#222222`；`textcolor-white` 白 `#FFFFFF`；`textcolor-red` 紅 `#E53935`；`textcolor-pink` 粉紅 `#FF5FA2`；`textcolor-blue` 藍 `#1E88E5`；`textcolor-yellow` 黃 `#FFC107`（6，AC 6） |
| `textPosition` | 文字位置 | choice | `top` 上方；`bottom` 下方 |

另有文字輸入框（`state.text`），屬「文字」分頁。

素材繪製說明（每個 item 選項的 `parts` 放在哪些圖層、可用範圍）：

| 類別 | 使用的 layerSlot | 範圍（370×320 座標，x0–x1, y0–y1） |
|---|---|---|
| `hairStyle` | `hairBack`（長髮、馬尾等頭後部分，可省略）、`hairFront`（瀏海、頭頂） | x 115–255, y 64–225 |
| `expression` | `expression` | x 145–225, y 98–158 |
| `top` | `top`（含袖子） | x 148–222, y 158–224 |
| `bottom` | `bottom` | x 156–214, y 206–250 |
| `hat` | `hat` | x 120–250, y 60–112 |
| `glasses` | `glasses` | x 140–230, y 100–150 |
| `handheld` | `handheld`（握於右手 (224,204)） | x 200–280, y 140–240 |
| `vehicle-bicycle` | `vehicleBack`（車輪、車架；人偶站在車後方） | x 90–280, y 196–262 |
| `vehicle-skateboard` | `vehicleBack`（板面在腳下） | x 125–245, y 248–262 |
| `vehicle-car` | `vehicleBack`（座椅/車後半）、`vehicleFront`（車身、車輪，**上緣 y ≥ 212**，擋住腿與下著，露出手與上半身） | x 65–305, y 180–262 |
| `vehicle-balloon` | `vehicleBack`（氣球在左上，線連到左手 (146,204)） | x 55–155, y 60–206 |
| `scene` | `background`：**必須先畫一個覆蓋 0,0–370,320 的不透明矩形**，再畫裝飾；全部不透明（不可有半透明色） | 0–370, 0–320 |

### 4.3 人偶本體（BASE_PARTS）與圖層合成順序

人偶基準（Q 版比例，頭部約佔全身 1/2，符合 AC17「≥1/3」）：

| 部位 | 幾何（370×320 座標） |
|---|---|
| 中心線 | x = 185 |
| 頭（`head` 層） | 橢圓中心 (185,118)，rx 50、ry 46 → y 72–164；含小耳朵；膚色 `{{skin}}`，輪廓 `{{line}}` |
| 臉部五官錨點 | 眼 (167,118)、(203,118)；嘴 (185,140)；腮紅 (158,134)、(212,134) |
| 軀幹（`body` 層） | 圓角矩形 x 160–210、y 160–214 |
| 手臂/手 | 由肩部延伸，手為圓形 r≈8：左手 (146,204)、右手 (224,204) |
| 腿/腳 | 兩腿 x 168–180、190–202，y 212–246；腳橢圓 y 244–254 |
| 全身 | y 72（頭頂）～254（腳底），高 182；頭高 92 |

- `body` 層同時畫出**白色背心與白色短安全褲**作為基本內著，使上衣/下著選「無」時仍得體（見待確認事項 6）。
- 表情（`expression`）只畫眼、眉、嘴、腮紅、淚滴等，不畫臉型。

**`LAYER_ORDER`（由下到上）**：

| 順序 | layerSlot | 來源 |
|---|---|---|
| 1 | `background` | `scene`（透明背景時為空） |
| 2 | `vehicleBack` | `vehicle` |
| 3 | `hairBack` | `hairStyle` |
| 4 | `body` | BASE_PARTS |
| 5 | `bottom` | `bottom` |
| 6 | `top` | `top` |
| 7 | `head` | BASE_PARTS |
| 8 | `expression` | `expression` |
| 9 | `hairFront` | `hairStyle` |
| 10 | `glasses` | `glasses` |
| 11 | `hat` | `hat` |
| 12 | `handheld` | `handheld` |
| 13 | `vehicleFront` | `vehicle` |
| 14 | 文字 | Canvas `fillText`（不在 SVG 內） |

合成規則：每次渲染都**從 state 重新產生整份 SVG**（不保留上一次的 DOM/片段），因此更換選項時前一款不會殘留（AC2、AC13）。各類別各自佔用自己的 layerSlot，不互相取代（AC3、AC13）。

### 4.4 設計狀態物件（DesignState）與預設值

```
DesignState = {
  skin:         "skin-fair",
  hairStyle:    "hair-short",
  hairColor:    "haircolor-brown",
  expression:   "expr-happy",
  top:          "top-tshirt",
  bottom:       "bottom-shorts",
  hat:          "none",
  glasses:      "none",
  handheld:     "none",
  vehicle:      "none",
  scene:        "scene-pink",
  textColor:    "textcolor-black",
  textPosition: "bottom",
  text:         ""
}
```

- 欄位名稱即類別 id（`text` 除外）。值皆為 option id 字串。
- 狀態只存在記憶體，不寫入 localStorage / URL（需求明訂不做存檔）。

### 4.5 安全範圍（防裁切，AC8、AC13）

- 背景以外所有圖層的實際圖形（含輪廓線寬）必須落在 `FIGURE_BOUNDS`：x 8–362、y 58–262。
- 文字只出現在所選的文字區帶：上方 y 0–56 / 下方 y 264–320；水平寬度 ≤ 340 並置中（x 15–355）。
- 因人偶區與兩個文字區帶互不重疊，不論文字在上或下，人偶位置固定不變。

### 4.6 文字排版（`layoutText`）

1. `text.trim() === ""` → `visible:false`，不繪製（AC5）。
2. 字型：`bold {size}px "PingFang TC","Heiti TC","Microsoft JhengHei","Noto Sans CJK TC","Noto Sans TC",sans-serif`。
3. `size` 由 36 起，每次減 1，直到 `ctx.measureText(text).width ≤ 340` 或 `size = 14`。
4. 繪製：`x = 185`、`y = TEXT_BANDS[position].centerY`（上 30、下 290），`fillText(text, x, y, 340)`（第 4 參數保證不超寬）。
5. 顯示原文（保留中間空白），不做描邊或陰影（需求不做文字特效）。

以上限 20 字全形計，約 17px 即可容納，不會觸及最小值。

---

## 5. UI 規格

### 5.1 頁面結構（`index.html`）

```
<header>  標題「Q 版紙娃娃貼圖產生器」
<main class="layout">
  <section class="preview-area">
     <div class="preview-frame">（CSS 透明格紋背景）
        <canvas id="preview-canvas" aria-label="貼圖預覽">
     </div>
     <div class="actions">
        <button id="btn-random">隨機搭配</button>
        <button id="btn-reset">全部重設</button>
        <button id="btn-export">輸出貼圖</button>
     </div>
  </section>
  <section class="control-area">
     <nav class="tabs" role="tablist">  人偶｜服裝｜配件｜交通/設施｜場景｜文字
     <div class="tab-panel" role="tabpanel" data-tab="doll">…</div> × 6
  </section>
</main>
<canvas id="export-canvas" hidden width="370" height="320">
<dialog id="export-dialog">…（見 5.5）
```

- `<meta name="viewport" content="width=device-width, initial-scale=1">`（不禁止縮放）。
- `<html lang="zh-Hant">`，`<meta charset="utf-8">`。

### 5.2 分頁與元件清單

| 分頁（data-tab） | 內容（依序） |
|---|---|
| `doll` 人偶 | 膚色（色塊）、髮型（縮圖）、髮色（色塊）、表情（縮圖） |
| `clothes` 服裝 | 上衣（縮圖，含「無」）、下著（縮圖，含「無」） |
| `accessory` 配件 | 帽子/頭飾、眼鏡/臉部飾品、手持物/飾品（皆縮圖，含「無」） |
| `vehicle` 交通/設施 | 交通工具/設施（縮圖，含「無」） |
| `scene` 場景 | 場景（縮圖，含「透明背景」，縮圖為格紋） |
| `text` 文字 | 文字輸入框 `#sticker-text`（`maxlength=20`、placeholder「輸入貼圖文字（最多 20 字）」）、文字顏色（色塊）、文字位置（上方/下方按鈕） |

每個類別區塊：`<fieldset data-category="{id}"><legend>{name}</legend> 選項按鈕… </fieldset>`。

選項按鈕（QA 選擇器依據，**必須照此實作**）：
```
<button type="button" class="opt" data-category="{categoryId}" data-option-id="{optionId}"
        aria-pressed="true|false" aria-label="{name}">
```
- color：圓形色塊 48×48（觸控區 ≥ 48×48），選中時外框加粗 + 勾號。
- item：卡片 72×84（縮圖 56×56 + 名稱文字 12–13px），「無」卡片以 ⊘ 圖示表示。
- choice：文字按鈕，高 48、最小寬 88。
- 分頁按鈕：高 ≥ 48，`role="tab"`、`aria-selected`，`data-tab-target="{tab}"`。
- 動作按鈕（隨機、重設、輸出）：高 ≥ 52、寬 ≥ 96；輸出按鈕為主要色。
- 選項以 `flex-wrap: wrap` 排列，間距 8px；任何寬度都只換行，不產生橫向捲動。

### 5.3 版面配置（RWD）

| 情境 | 條件 | 配置 |
|---|---|---|
| 桌機 / iPad 橫式 | `@media (min-width: 900px) and (orientation: landscape)` | 兩欄 CSS Grid：左欄預覽區（寬 `min(46vw, 480px)`，預覽 canvas 以 370:320 比例縮放，寬度 `min(100%, 462px)` 且高度不超過 `calc(100vh - 180px)`，`position: sticky; top: 8px`），下方三顆動作按鈕；右欄分頁與控制項，右欄內容過長時在右欄內部垂直捲動（`overflow-y: auto; max-height: calc(100vh - 標題高)`）。 |
| iPad 直式 | 其他情況且 `min-width: 600px` | 單欄：預覽區在上方 `position: sticky; top: 0`（canvas 高度 ≤ 38vh，置中），動作按鈕在預覽下方同列；下面接分頁與控制項，頁面垂直捲動。 |
| 手機（<600px） | 其他 | 單欄：預覽（寬 100%，不 sticky）→ 動作按鈕 → 分頁（分頁列可換行為 2 列 3 個）→ 控制項。允許垂直捲動。 |

- 全域：`html, body { overflow-x: hidden }` 不可作為掩蓋手段；必須確保 `document.documentElement.scrollWidth ≤ clientWidth`（QA 可測）。
- 1280×720 桌機：預覽、動作按鈕、分頁列在首屏可見。

### 5.4 觸控與 hover

- 所有可點元素觸控區 ≥ 44×44 CSS px（本設計多數為 48 以上）（AC14）。
- 所有 `:hover` 樣式包在 `@media (hover: hover)` 內，僅為裝飾；選取狀態以 `aria-pressed` 對應的樣式呈現，不依賴 hover。不使用 tooltip。
- `button, .opt { touch-action: manipulation; }`（消除雙擊縮放延遲）。
- 文字框 `font-size: 16px` 以上（避免 iOS 聚焦時自動放大）。
- 一律用 `click` 事件（觸控也會觸發），不使用 `mouseover` / `dblclick` / 右鍵 / 拖曳 / 鍵盤快捷鍵。

### 5.5 輸出結果對話框（AC16）

```
<dialog id="export-dialog">
  <h2>貼圖已產生</h2>
  <img id="export-image" width="370" height="320" alt="輸出的貼圖">   （CSS max-width:100%；透明時後方格紋）
  <p>已嘗試下載 PNG（370 × 320）。若沒有自動下載：
     iPad／iPhone 可長按上方圖片選「加入照片」存到相簿，或點「下載 PNG」存到「檔案」。</p>
  <button id="btn-download-again">下載 PNG</button>
  <button id="btn-close-dialog">關閉</button>
</dialog>
```
- `#export-image` 的 `src` 為該次輸出的 dataURL（與下載檔內容相同）。
- 「下載 PNG」再次 `triggerDownload(blob, filename)`（此時為使用者直接點擊，iPad 必定允許）。
- 以 `dialog.showModal()` 開啟；點「關閉」關閉。按鈕尺寸同 5.2。

### 5.6 旋轉後狀態保留（AC15）

- 旋轉只觸發 CSS 媒體查詢切換；**不監聽 resize/orientationchange 來重建 DOM 或重新載入**。
- 狀態在 `app.js` 記憶體中，控制項 DOM 只建一次，文字框值保留在同一個 DOM 元素，因此旋轉後設計、文字、目前分頁皆不變。
- canvas 只用 CSS 調整顯示尺寸，像素內容不受旋轉影響。

### 5.7 效能（AC6、AC11）

- 無外部資源；`index.html` 直接載入 `css/style.css` 與 `js/app.js`（module）。全部檔案合計目標 < 300 KB。
- 單次渲染（SVG 字串產生 + 解碼 + 繪製）預期 < 100ms；以 rAF 合併連續變更，確保 1 秒內反映最新狀態。
- 縮圖於 `buildControls` 時一次產生（以 `<img src="data:image/svg+xml,...">` 或 inline SVG 皆可）。

---

## 6. 需求追溯表

### 6.1 功能 → 設計

| 需求 | 對應模組 / 設計點 |
|---|---|
| F1 人偶基本設計 | catalog `skin`/`hairStyle`/`hairColor`/`expression`（4.2）；BASE_PARTS 與 token 套色（4.3、3.3 `resolveTokens`）；ui「人偶」分頁 |
| F2 衣服 | catalog `top`/`bottom` + `none`；layer `top`/`bottom`；ui「服裝」分頁 |
| F3 配件 | catalog `hat`/`glasses`/`handheld`，各自獨立 layerSlot；ui「配件」分頁 |
| F4 場景 | catalog `scene`（含 `scene-transparent`）；layer `background`；compose 透明時不畫背景 |
| F5 文字 | `state.text`/`textColor`/`textPosition`；compose `layoutText`（4.6）；ui「文字」分頁 |
| F6 即時預覽 | app `scheduleRender`；compose `renderSticker` 預覽與輸出共用（3.3、3.6） |
| F7 輸出貼圖 | exporter（3.4）；輸出 canvas 370×320；對話框（5.5） |
| F8 隨機與重設 | state `randomizeState`/`resetState`（3.2）；動作按鈕 |
| F9 GitHub Pages | 純靜態、無建置、零外部依賴（1）；部署（7） |
| F10 交通/設施 | catalog `vehicle`；layer `vehicleBack`/`vehicleFront`；ui「交通/設施」分頁 |

### 6.2 驗收條件 → 設計

| AC | 對應設計點 |
|---|---|
| AC1 | 4.2 數量：膚色 5、髮型 5、髮色 6、表情 5；3.6 選擇即 `update` → 重繪 |
| AC2 | 4.2 上衣 5、下著 4 + `none`；4.3「每次整份重建 SVG」→ 無殘留 |
| AC3 | 4.2 帽子 4、眼鏡 3、手持 3 + `none`；各佔獨立 layerSlot（4.3）→ 可同時顯示 |
| AC4 | 4.2 場景 6（2 純色）+ `scene-transparent` |
| AC5 | 4.6 文字排版（空白不顯示、自動縮字）；5.2 `maxlength=20`（≥10）；6 色；上/下位置；系統中文字型、UTF-8 |
| AC6 | 3.3 同一 `renderSticker` 產生預覽與輸出；3.6 rAF 合併渲染；5.7 |
| AC7 | 3.4 `toDataURL("image/png")` → .png；輸出 canvas 固定 370×320；透明時 `clearRect` 無背景（alpha=0）；場景背景必為全幅不透明矩形（4.2 表末） |
| AC8 | 4.5 安全範圍：人偶 y 58–262、文字區帶與自動縮字、`fillText` maxWidth |
| AC9 | 3.2 `randomizeState`（11 類隨機、文字/文字色/位置不變）、`resetState`（預設值、文字清空）；4.4 預設值 |
| AC10 | 1（相容性下限、零依賴）；7 部署；無登入/後端 |
| AC11 | 5.7 無外部資源、檔案小；載入即 `scheduleRender` 顯示預設人偶 |
| AC12 | 5.3 RWD；5.2 `flex-wrap` 不產生橫向捲動 |
| AC13 | 4.2 交通 4 款 + `none`；4.2 範圍表（全在 FIGURE_BOUNDS 內）；獨立 layerSlot；整份重建無殘留 |
| AC14 | 5.4 觸控目標 ≥44、無 hover 依賴、`click` 事件；5.2 文字框；5.5 iPad 取得 PNG |
| AC15 | 5.3 iPad 直/橫式配置；5.6 旋轉不重建、狀態保留 |
| AC16 | 1（雙管齊下）；3.6 同步在點擊手勢內下載；5.5 對話框長按存相簿 / 再次下載 |
| AC17 | 4.1 SVG 片段規則（統一輪廓色/線寬、圓角）；4.3 頭身比約 1:1（頭佔全身約 1/2）；五官簡化（點眼、小嘴、腮紅）；所有素材同一套色票與線條規範 |

---

## 7. GitHub Pages 部署方式

**方案：從 `main` 分支根目錄（/）發布。**

理由：GitHub Pages 的「Deploy from a branch」只能選分支的 `/`（root）或 `/docs`。本專案 `docs/` 已用於放文件，若選 `/docs` 會把文件當網站、且網站檔需放進 docs/ 而混雜，故選 root；不需 GitHub Actions、不需建置。

使用者需在 GitHub 上做的設定：
1. 確認 repository 為 Public（免費方案的 Pages 需要公開 repo）。
2. 進入 repository → **Settings** → 左側 **Pages**。
3. **Build and deployment** → Source 選 **Deploy from a branch**。
4. Branch 選 **main**，資料夾選 **/ (root)** → 按 **Save**。
5. 等待 1～2 分鐘，頁面上方會顯示網址 `https://<帳號>.github.io/<repo 名稱>/`（預設即 https），開啟即可使用。

AP 注意事項：
- 根目錄需有 `index.html` 與空檔 `.nojekyll`。
- 所有資源路徑使用**相對路徑**（`css/style.css`、`js/app.js`、`./catalog.js`），因為網站位於子路徑 `/<repo 名稱>/`，不可用 `/js/...` 絕對路徑。
- 副作用：`docs/`、`tests/`、`package.json` 也會出現在公開網址下（內容本來就在公開 repo 中，不影響功能；見待確認事項 5）。

---

## 8. 待確認事項

1. **「隨機搭配」是否包含「無」與「透明背景」**：AC9 要求「隨機選擇一個有效選項」。本設計把「無」與「透明背景」視為有效選項，一併納入隨機（因此隨機後可能沒戴帽子、沒有交通工具、或背景透明）。若希望隨機時一定穿上衣/下著、或不出現透明背景，請告知。
2. **「隨機搭配」是否變更文字顏色與位置**：AC9 只列 F1～F4、F10，本設計隨機時**不改**文字內容、文字顏色、文字位置。
3. **文字長度上限**：需求為「至少 10 字」，本設計上限定為 20 字（中英文皆以字元數計），以確保在 370 寬內縮字後仍清晰。若需更長請告知。
4. **輸出後的結果對話框**：為滿足 iPad Safari 取得貼圖（AC16），每次按「輸出貼圖」除了下載外，都會跳出顯示貼圖的對話框（桌機也會）。若希望桌機不顯示，可改為僅觸控裝置顯示，請確認。
5. **部署位置**：採 main 分支根目錄發布，`docs/`、`tests/` 也會可經網址存取。若不希望，可改用 GitHub Actions 只發布網站資料夾（需新增 workflow 檔並在 Pages Source 選 GitHub Actions），請確認。
6. **上衣/下著選「無」時的呈現**：本設計讓人偶本體固定穿白色背心與白色短安全褲作為基本內著，避免「無」時畫面不得體。請確認可接受。
7. **字形差異**：文字使用各裝置系統字型（未內嵌字型以符合載入速度與授權考量），不同作業系統輸出的字形外觀會略有不同；同一裝置上預覽與下載內容一致。
8. **iPad 真機驗證**：本開發環境只有 Chromium，QA 只能以 iPad 模擬（觸控、尺寸、旋轉）自動化驗證 AC14～AC16；Safari 真機上的下載與長按存相簿需由使用者（或有 iPad 的人員）依 test-report 的人工步驟確認。AC10 的 Firefox/Safari 同理。
