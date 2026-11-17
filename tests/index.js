// 讓 `node --test tests/`（package.json 的 npm test）在 Node 22 可運作：
// Node 22 會把目錄參數當模組路徑載入，故以此入口檔匯入全部測試。
import "./unit/catalog.test.js";
import "./unit/state.test.js";
import "./e2e/desktop.test.js";
import "./e2e/export.test.js";
import "./e2e/ipad.test.js";
import "./e2e/mobile.test.js";
