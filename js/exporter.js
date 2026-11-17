// 輸出 PNG
const pad = (n) => String(n).padStart(2, "0");

export function makeFileName(date = new Date()) {
  return (
    `sticker-${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}.png`
  );
}

export function dataUrlToBlob(dataUrl) {
  const bin = atob(dataUrl.split(",")[1]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: "image/png" });
}

export function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

export function exportFromCanvas(canvas) {
  const dataUrl = canvas.toDataURL("image/png");
  return { dataUrl, blob: dataUrlToBlob(dataUrl), filename: makeFileName() };
}
