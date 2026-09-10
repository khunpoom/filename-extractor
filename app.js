const I18N = {
  th: {
    brandSub: "ดึงชื่อไฟล์",
    tagline: "ลากไฟล์มา ได้รายชื่อทันที",
    subtitle: "ดึงชื่อไฟล์จากหลายไฟล์หรือทั้งโฟลเดอร์ ส่งออกเป็นข้อความ CSV หรือ JSON — ไฟล์ไม่ออกจากเครื่องคุณ",
    privacy: "ไฟล์ไม่ออกจากเครื่อง",
    dropTitle: "วางไฟล์หรือโฟลเดอร์ที่นี่",
    dropHint: "ลากมาวาง หรือเลือกจากเครื่อง",
    pickFiles: "เลือกไฟล์",
    pickFolder: "เลือกโฟลเดอร์",
    clear: "ล้างรายการ",
    search: "ค้นชื่อไฟล์…",
    field: "ดึงเป็น",
    fieldName: "ชื่อพร้อมนามสกุล",
    fieldStem: "ชื่ออย่างเดียว",
    fieldExt: "นามสกุล",
    fieldRelative: "พาธย่อย",
    numbered: "ใส่เลขลำดับ",
    unique: "ไม่ซ้ำ",
    sort: "เรียง",
    sortOriginal: "ตามที่เลือก",
    sortName: "ชื่อ",
    sortExt: "นามสกุล",
    sortSize: "ขนาด",
    prefix: "คำนำ",
    suffix: "คำตาม",
    zipToggle: "อ่านชื่อใน ZIP",
    copy: "คัดลอก",
    copied: "คัดลอกแล้ว",
    txt: "ข้อความ .txt",
    csv: "CSV (Excel)",
    colName: "ชื่อไฟล์",
    colExt: "นามสกุล",
    colSize: "ขนาด",
    colPath: "พาธ",
    how1: "เลือกหลายไฟล์ หรือทั้งโฟลเดอร์ (รวมโฟลเดอร์ย่อย)",
    how2: "ถ้าเป็นไฟล์ ZIP สามารถอ่านรายชื่อข้างในได้โดยไม่ต้องแตกไฟล์",
    how3: "เลือกว่ารายชื่อจะเป็นชื่ออย่างเดียว นามสกุล หรือพาธ แล้วคัดลอกหรือดาวน์โหลด",
    desktopTitle: "โปรแกรม Windows",
    desktopBody: "ดาวน์โหลดซอร์สแล้วคอมไพล์ Namely.exe หรือลากโฟลเดอร์มาวางบนไอคอนโปรแกรม",
    github: "ซอร์สโค้ดบน GitHub",
    footer: "ทำงานทั้งเครื่อง · ไม่มีเซิร์ฟเวอร์เก็บไฟล์",
    names: "ชื่อ",
  },
  en: {
    brandSub: "File name extractor",
    tagline: "Drop files. Get every name.",
    subtitle: "Pull filenames from many files or a whole folder. Export TXT, CSV, or JSON — nothing leaves this device.",
    privacy: "Files never leave this device",
    dropTitle: "Drop files or a folder here",
    dropHint: "Drag and drop, or pick from your computer",
    pickFiles: "Choose files",
    pickFolder: "Choose folder",
    clear: "Clear",
    search: "Search names…",
    field: "Extract as",
    fieldName: "Name with extension",
    fieldStem: "Name only",
    fieldExt: "Extension",
    fieldRelative: "Relative path",
    numbered: "Numbered list",
    unique: "Unique only",
    sort: "Sort",
    sortOriginal: "Original order",
    sortName: "Name",
    sortExt: "Extension",
    sortSize: "Size",
    prefix: "Prefix",
    suffix: "Suffix",
    zipToggle: "Read names inside ZIP",
    copy: "Copy",
    copied: "Copied",
    txt: "Text .txt",
    csv: "CSV (Excel)",
    colName: "File name",
    colExt: "Ext",
    colSize: "Size",
    colPath: "Path",
    how1: "Select many files, or a whole folder (including subfolders).",
    how2: "ZIP archives can list inner names without unpacking.",
    how3: "Choose name, stem, or path, then copy or download the list.",
    desktopTitle: "Windows app",
    desktopBody: "Build Namely.exe from the desktop folder, or drag a folder onto the program icon.",
    github: "Source on GitHub",
    footer: "Runs on your device · no files uploaded",
    names: "names",
  },
};

const savedLang = localStorage.getItem("namely-lang");
let lang =
  savedLang === "en" || savedLang === "th"
    ? savedLang
    : (navigator.language || "").toLowerCase().startsWith("th")
      ? "th"
      : "en";
let rows = [];
let seq = 0;

function t(key) {
  return I18N[lang][key] || key;
}

function applyI18n() {
  document.documentElement.lang = lang;
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.getAttribute("data-i18n"));
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    el.placeholder = t(el.getAttribute("data-i18n-placeholder"));
  });
  document.querySelectorAll("[data-lang]").forEach((btn) => {
    btn.classList.toggle("on", btn.getAttribute("data-lang") === lang);
  });
  localStorage.setItem("namely-lang", lang);
}

function splitName(filename) {
  const base = filename.split(/[/\\]/).pop() || filename;
  const i = base.lastIndexOf(".");
  if (i <= 0 || i === base.length - 1) return { stem: base, ext: "" };
  return { stem: base.slice(0, i), ext: base.slice(i + 1).toLowerCase() };
}

function rowFromFile(file) {
  const path = file.webkitRelativePath || file.name;
  const base = path.split(/[/\\]/).pop() || file.name;
  const { stem, ext } = splitName(base);
  seq += 1;
  return { id: seq, name: base, stem, ext, relativePath: path, size: file.size, source: "file" };
}

async function zipInner(file) {
  const buf = await file.arrayBuffer();
  if (buf.byteLength < 22) return [];
  const view = new DataView(buf);
  const bytes = new Uint8Array(buf);
  const EOCD = 0x06054b50;
  const CD = 0x02014b50;
  let eocd = -1;
  const start = Math.max(0, bytes.length - 65557);
  for (let i = bytes.length - 22; i >= start; i--) {
    if (view.getUint32(i, true) === EOCD) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) return [];
  const cdSize = view.getUint32(eocd + 12, true);
  const cdOffset = view.getUint32(eocd + 16, true);
  const out = [];
  let p = cdOffset;
  const end = cdOffset + cdSize;
  while (p + 46 <= end && view.getUint32(p, true) === CD) {
    const uncomp = view.getUint32(p + 24, true);
    const nameLen = view.getUint16(p + 28, true);
    const extraLen = view.getUint16(p + 30, true);
    const commentLen = view.getUint16(p + 32, true);
    const nameBytes = bytes.subarray(p + 46, p + 46 + nameLen);
    const rel = new TextDecoder().decode(nameBytes).replace(/\\/g, "/");
    p += 46 + nameLen + extraLen + commentLen;
    if (!rel || rel.endsWith("/")) continue;
    const base = rel.split("/").pop();
    const { stem, ext } = splitName(base);
    seq += 1;
    out.push({
      id: seq,
      name: base,
      stem,
      ext,
      relativePath: `${file.name}/${rel}`,
      size: uncomp,
      source: "zip",
    });
  }
  return out;
}

async function ingest(fileList, append) {
  const files = Array.from(fileList || []);
  const zipPeek = document.getElementById("zipPeek").checked;
  const next = [];
  for (const file of files) {
    next.push(rowFromFile(file));
    const isZip = zipPeek && (file.name.toLowerCase().endsWith(".zip") || file.type.includes("zip"));
    if (isZip) {
      try {
        next.push(...(await zipInner(file)));
      } catch (_) {}
    }
  }
  rows = append ? rows.concat(next) : next;
  render();
}

function fieldValue(row, field) {
  if (field === "stem") return row.stem;
  if (field === "ext") return row.ext;
  if (field === "relative") return row.relativePath;
  return row.name;
}

function prepared() {
  const q = document.getElementById("search").value.trim().toLowerCase();
  const sort = document.getElementById("sort").value;
  let list = q
    ? rows.filter((r) => `${r.name} ${r.relativePath} ${r.ext}`.toLowerCase().includes(q))
    : rows.slice();
  if (sort !== "original") {
    list.sort((a, b) => {
      if (sort === "ext") return a.ext.localeCompare(b.ext);
      if (sort === "size") return a.size - b.size;
      return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" });
    });
  }
  return list;
}

function lines() {
  const field = document.getElementById("field").value;
  const prefix = document.getElementById("prefix").value;
  const suffix = document.getElementById("suffix").value;
  const numbered = document.getElementById("numbered").checked;
  const unique = document.getElementById("unique").checked;
  let values = prepared().map((r) => `${prefix}${fieldValue(r, field)}${suffix}`);
  if (unique) values = [...new Set(values)];
  if (numbered) values = values.map((v, i) => `${i + 1}. ${v}`);
  return values;
}

function formatBytes(n) {
  const units = ["B", "KB", "MB", "GB"];
  let v = n;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${i ? v.toFixed(v >= 10 ? 1 : 2) : v} ${units[i]}`;
}

function render() {
  const has = rows.length > 0;
  document.getElementById("results").classList.toggle("hidden", !has);
  document.getElementById("how").classList.toggle("hidden", has);
  document.getElementById("countChip").textContent = `${rows.length.toLocaleString(lang === "th" ? "th-TH" : "en-US")} ${t("names")}`;
  const list = prepared();
  const body = document.getElementById("tbody");
  body.innerHTML = list
    .slice(0, 400)
    .map(
      (r, i) =>
        `<tr><td>${i + 1}</td><td>${escapeHtml(r.name)}</td><td>${escapeHtml(r.ext || "—")}</td><td>${formatBytes(r.size)}</td><td>${escapeHtml(r.relativePath)}</td></tr>`,
    )
    .join("");
  const ls = lines();
  document.getElementById("preview").textContent = ls.slice(0, 80).join("\n") + (ls.length > 80 ? `\n… (${ls.length - 80})` : "");
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&", "<": "<", ">": ">", '"': """, "'": "&#39;" }[c]));
}

function download(name, content, mime) {
  const blob = new Blob([content], { type: mime });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`;
}

async function walkEntry(entry, prefix) {
  if (entry.isFile) {
    const file = await new Promise((res, rej) => entry.file(res, rej));
    const path = prefix ? `${prefix}/${file.name}` : file.name;
    Object.defineProperty(file, "webkitRelativePath", { value: path });
    return [file];
  }
  if (entry.isDirectory) {
    const reader = entry.createReader();
    const kids = [];
    for (;;) {
      const batch = await new Promise((res, rej) => reader.readEntries(res, rej));
      if (!batch.length) break;
      kids.push(...batch);
    }
    const next = prefix ? `${prefix}/${entry.name}` : entry.name;
    const nested = await Promise.all(kids.map((k) => walkEntry(k, next)));
    return nested.flat();
  }
  return [];
}

const drop = document.getElementById("drop");
drop.addEventListener("dragover", (e) => {
  e.preventDefault();
  drop.classList.add("over");
});
drop.addEventListener("dragleave", () => drop.classList.remove("over"));
drop.addEventListener("drop", async (e) => {
  e.preventDefault();
  drop.classList.remove("over");
  const items = [...(e.dataTransfer.items || [])];
  const entries = items.map((it) => it.webkitGetAsEntry && it.webkitGetAsEntry()).filter(Boolean);
  if (entries.length) {
    const files = (await Promise.all(entries.map((en) => walkEntry(en, "")))).flat();
    if (files.length) return ingest(files, rows.length > 0);
  }
  ingest(e.dataTransfer.files, rows.length > 0);
});

document.getElementById("btnFiles").onclick = () => document.getElementById("filePick").click();
document.getElementById("btnFolder").onclick = () => document.getElementById("folderPick").click();
document.getElementById("filePick").onchange = (e) => {
  ingest(e.target.files, rows.length > 0);
  e.target.value = "";
};
document.getElementById("folderPick").onchange = (e) => {
  ingest(e.target.files, rows.length > 0);
  e.target.value = "";
};
document.getElementById("btnClear").onclick = () => {
  rows = [];
  render();
};
["field", "sort", "prefix", "suffix", "search", "numbered", "unique"].forEach((id) => {
  document.getElementById(id).addEventListener("input", render);
  document.getElementById(id).addEventListener("change", render);
});
document.getElementById("btnCopy").onclick = async () => {
  await navigator.clipboard.writeText(lines().join("\n"));
  alert(t("copied"));
};
document.getElementById("btnTxt").onclick = () =>
  download(lang === "th" ? `รายชื่อไฟล์-${stamp()}.txt` : `filenames-${stamp()}.txt`, lines().join("\n"), "text/plain;charset=utf-8");
document.getElementById("btnCsv").onclick = () => {
  const list = prepared();
  const headers = lang === "th" ? "ลำดับ,ชื่อไฟล์,ชื่อ,นามสกุล,พาธ,ขนาดไบต์,ที่มา" : "#,name,stem,ext,path,size_bytes,source";
  const body = list
    .map((r, i) => `${i + 1},"${r.name.replace(/"/g, '""')}","${r.stem.replace(/"/g, '""')}","${r.ext}","${r.relativePath.replace(/"/g, '""')}",${r.size},${r.source}`)
    .join("\r\n");
  download(
    lang === "th" ? `รายชื่อไฟล์-${stamp()}.csv` : `filenames-${stamp()}.csv`,
    `\uFEFF${headers}\r\n${body}`,
    "text/csv;charset=utf-8",
  );
};
document.getElementById("btnJson").onclick = () =>
  download(
    lang === "th" ? `รายชื่อไฟล์-${stamp()}.json` : `filenames-${stamp()}.json`,
    JSON.stringify(prepared(), null, 2),
    "application/json",
  );
document.querySelectorAll("[data-lang]").forEach((btn) => {
  btn.onclick = () => {
    lang = btn.getAttribute("data-lang");
    applyI18n();
    render();
  };
});

document.querySelector(".icon-wrap").innerHTML =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>';

applyI18n();
