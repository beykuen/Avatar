# 測試報告：Q 版紙娃娃貼圖產生器

## 1. 測試環境
- Node v22.23.4、Playwright 1.63（全域安裝，由 `tests/helpers/pw.js` 載入）、Chromium（無 WebKit / Firefox）
- e2e 以 `tests/helpers/server.js`（Node http，隨機埠）提供靜態檔；iPad 以 Playwright `iPad (gen 7)`（直式 810×1080）與 `iPad (gen 7) landscape`（1080×810）裝置參數在 Chromium 模擬（hasTouch、`tap`），桌機 1280×720，手機 375×667。
- 未修改任何程式碼；僅新增 `tests/` 與本報告。

## 2. 執行指令與結果
- 指令：`npm test`（= `node --test "tests/**/*.test.js"`）
- 結果：**60 項測試，60 通過，0 失敗**（約 14–30 秒）
  - unit：19（catalog 11、state 8）
  - e2e：desktop 18、export 7、ipad 13、mobile 3
- 驗證：已刪除暫時緩解用的 `tests/index.js`，全部測試各只執行一次（TAP 計數 1..60，tests 60 / pass 60 / fail 0 / skipped 0）。BUG-1 已修正並驗證（見第 5 節）。

## 3. 逐條驗收條件

| AC | 狀態 | 依據 |
|---|---|---|
| AC1 | 通過 | catalog 數量：膚色 5、髮型 5、髮色 6、表情 5；desktop 逐一點擊每個選項，預覽 canvas 雜湊皆不同、aria-pressed 正確 |
| AC2 | 通過 | 上衣 5+無、下著 4+無；逐款預覽皆不同；A→B→A 與直接 B 圖相同、SVG 圖層「無」時為空，無殘留 |
| AC3 | 通過 | 帽 4、眼鏡 3、手持 3（含無）；三類同時選取，預覽逐步改變、三圖層皆有內容，更換其一不影響其他兩類 |
| AC4 | 通過 | 6 種場景（含 2 純色）+ 透明；逐項預覽皆不同；透明場景 canvas alpha=0，其餘 alpha=255；非透明場景背景為全畫面不透明矩形 |
| AC5 | 通過（亂碼為部分人工） | 10 個中文、英文 "Hello 123" 顯示；上限 20 字；6 色皆改變輸出；上/下位置 y=30/290，像素落在對應區帶；空白字串不顯示且畫面與無文字相同。環境已有 CJK 字型，無亂碼；其他 OS 字型見人工驗證 |
| AC6 | 通過 | 5 類變更皆在 1 秒內更新預覽；預覽（縮至 1×）與輸出 canvas、與下載 PNG 差異像素 < 3% |
| AC7 | 通過 | 下載檔名 `sticker-YYYYMMDD-HHMMSS.png`；PNG 簽章、IHDR 370×320、8-bit RGBA（color type 6）；透明背景四角 alpha=0；各不透明場景逐像素 alpha=255；快速變更後立即輸出為最新狀態 |
| AC8 | 通過 | 全部 item 選項的各圖層 getBBox 均在 FIGURE_BOUNDS（x8–362、y58–262）內；輸出圖中文字（上/下，20 字）完整落在區帶且距左右邊界 ≥12px；輸出內容不貼邊；人偶、帽、車等皆存在 |
| AC9 | 通過 | 隨機 25 次：全部欄位皆為有效選項、文字與輸入框不變、有變化；統計 2000 次涵蓋所有選項；重設後回預設且文字清空 |
| AC10 | 需人工驗證（部分通過） | 自動：無外部請求、全為相對路徑、`.nojekyll` 存在、無 console 錯誤。人工：見 4-1 |
| AC11 | 通過（本機）／真實網路需人工 | 本機載入至預設人偶繪出 < 5 秒；全站原始碼 < 300 KB。GitHub Pages 實際網速見人工驗證 |
| AC12 | 通過 | 1280×720：無橫向捲動，預覽、三顆按鈕、分頁列首屏可見；375 寬：6 個分頁皆無橫向捲動、控制項在視窗內、完整流程（選項、文字、隨機、重設、輸出）可用 |
| AC13 | 通過 | 腳踏車/滑板/汽車/氣球 + 無；逐款預覽不同；氣球不殘留汽車前景層；與三類配件同時並存；逐項輸出內容在安全範圍內且不同於無交通工具 |
| AC14 | 通過（模擬）／真機需人工 | 直式、橫式皆僅用 `tap` 完成 F1–F8、F10 與輸出、再下載；所有分頁所有可見按鈕/輸入框 ≥ 44×44；輸入框字級 ≥16px；viewport 未禁縮放；所有 `:hover` 規則皆在 `@media (hover:hover)` 內；JS 無 mouseover/dblclick/contextmenu/keydown |
| AC15 | 通過（模擬）／真機需人工 | 兩方向全流程無橫向捲動；直→橫→直旋轉（setViewportSize）後 state、文字、分頁、輸出 canvas 雜湊不變且頁面未重載；預覽與輸出鈕在捲動後仍可見 |
| AC16 | 需人工驗證（部分通過） | 自動：點輸出觸發下載、對話框圖片為 370×320 `data:image/png`、與下載檔位元組一致、「下載 PNG」可再下載、對話框在兩種 iPad 視窗內且按鈕 ≥44px。人工：見 4-2 |
| AC17 | 需人工驗證（部分通過） | 自動（幾何）：頭高約全身 1/2（≥1/3 且 ≤0.7）；全素材共用 `#5A3E36` 輪廓；表情圖形數 ≤14（簡化）。已目視全部素材接觸表（人偶、衣服、配件、交通、場景），風格一致、圓潤、無寫實素材混用；最終主觀判斷見 4-3 |

## 4. 需人工驗證項目
1. **AC10 瀏覽器／Pages**：推送後於 GitHub Pages 的 https 網址，分別用最新版 Chrome、Firefox、Edge/Safari（至少三種）執行：切換每個分頁各選一項→輸入中英文→隨機→重設→輸出並開啟 PNG；確認不需登入、DevTools Network 無外部/後端請求、頁面在子路徑 `/<repo>/` 正常載入。同時以一般寬頻量測首次載入至可操作是否 < 5 秒（AC11）。
2. **AC14/15/16 iPad Safari 真機**：(a) 用手指（不接鍵盤滑鼠）完成全部功能與文字輸入（含中文注音/手寫輸入法，確認組字時不中斷）；(b) 點「輸出貼圖」後確認 Safari 下載到「檔案」，或於對話框長按圖片選「加入照片」存相簿；開啟檢查為 370×320 且與預覽一致；(c) 直、橫向各完整操作一次並旋轉，確認設計與文字不遺失；(d) 確認聚焦輸入框不被自動放大、無雙擊縮放延遲。
3. **AC17 Q 版畫風**：請設計/使用者檢視各類素材接觸表（可於頁面逐一切換選項）：頭身比、輪廓圓潤、五官簡化、各素材畫風一致。
4. **AC5 字型**：在 iPad/Mac/Windows 上輸入中文與英文，確認無豆腐字（方框）。

## 5. 缺陷清單

### BUG-1（低）`npm test` 在 Node 22 無法執行 — 狀態：已修正並驗證
- 對應：非 AC（專案測試流程，設計 2.1/package.json）
- 重現：Node 22.23.4 下執行 `node --test tests/`（原 package.json 的 `test` 指令）。
- 預期：執行 tests 下全部測試。
- 實際：`Error: Cannot find module '/home/user/testrpo/tests'`，0 項測試執行。
- 原緩解：QA 曾新增 `tests/index.js` 匯入全部測試檔。
- 修正方式：docs/design.md 改為 `node --test "tests/**/*.test.js"` 並規定刪除 `tests/index.js`（避免重複執行）；AP 已將 package.json 的 `test` 改為該指令；QA 已刪除 `tests/index.js`。
- 驗證結果：`npm test` 執行 60 項測試、60 通過、0 失敗，每項只執行一次，無重複。

BUG-1 已修正，**未發現其他功能缺陷**（無 AC 失敗）。

## 6. 測試檔案
`tests/helpers/{pw,server,app}.js`、`tests/unit/{catalog,state}.test.js`、`tests/e2e/{desktop,export,ipad,mobile}.test.js`（已刪除 `tests/index.js`）
