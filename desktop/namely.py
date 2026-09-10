#!/usr/bin/env python3
"""Namely — bilingual filename extractor (Thai / English)."""

from __future__ import annotations

import csv
import json
import locale
import os
import sys
import zipfile
from pathlib import Path
from tkinter import filedialog, messagebox
import tkinter as tk
from tkinter import ttk

TH = {
    "title": "Namely — ดึงชื่อไฟล์",
    "pick": "เลือกโฟลเดอร์",
    "save": "บันทึกรายชื่อ",
    "done": "ดึงชื่อไฟล์ได้ {n} รายการ\nบันทึกที่:\n{path}",
    "lang": "ภาษา",
    "zip": "อ่านชื่อใน ZIP",
    "extract": "ดึงชื่อไฟล์",
}

EN = {
    "title": "Namely — File name extractor",
    "pick": "Choose folder",
    "save": "Save name list",
    "done": "Extracted {n} names\nSaved to:\n{path}",
    "lang": "Language",
    "zip": "Read names inside ZIP",
    "extract": "Extract names",
}


def is_thai() -> bool:
    loc = (locale.getdefaultlocale() or ("",))[0] or ""
    return loc.lower().startswith("th")


def split_name(name: str) -> tuple[str, str]:
    base = os.path.basename(name)
    i = base.rfind(".")
    if i <= 0 or i == len(base) - 1:
        return base, ""
    return base[:i], base[i + 1 :].lower()


def collect(folder: Path, zip_peek: bool) -> list[dict]:
    rows: list[dict] = []
    for path in folder.rglob("*"):
        if not path.is_file():
            continue
        rel = path.relative_to(folder).as_posix()
        stem, ext = split_name(path.name)
        rows.append(
            {
                "name": path.name,
                "stem": stem,
                "ext": ext,
                "path": rel,
                "size": path.stat().st_size,
                "source": "file",
            }
        )
        if zip_peek and ext == "zip":
            try:
                with zipfile.ZipFile(path) as zf:
                    for info in zf.infolist():
                        if info.is_dir():
                            continue
                        inner = info.filename.replace("\\", "/")
                        base = os.path.basename(inner)
                        s, e = split_name(base)
                        rows.append(
                            {
                                "name": base,
                                "stem": s,
                                "ext": e,
                                "path": f"{path.name}/{inner}",
                                "size": info.file_size,
                                "source": "zip",
                            }
                        )
            except zipfile.BadZipFile:
                pass
    rows.sort(key=lambda r: r["path"].lower())
    return rows


def write_out(dest: Path, rows: list[dict], thai: bool) -> None:
    ext = dest.suffix.lower()
    if ext == ".csv":
        with dest.open("w", encoding="utf-8-sig", newline="") as f:
            w = csv.writer(f)
            w.writerow(
                ["ลำดับ", "ชื่อไฟล์", "ชื่อ", "นามสกุล", "พาธ", "ขนาดไบต์", "ที่มา"]
                if thai
                else ["#", "name", "stem", "ext", "path", "size_bytes", "source"]
            )
            for i, r in enumerate(rows, 1):
                w.writerow([i, r["name"], r["stem"], r["ext"], r["path"], r["size"], r["source"]])
    elif ext == ".json":
        dest.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")
    else:
        dest.write_text("\n".join(r["name"] for r in rows) + "\n", encoding="utf-8")


def main() -> None:
    thai = is_thai()
    if len(sys.argv) > 1:
        folder = Path(sys.argv[1])
        rows = collect(folder, True)
        dest = folder / ("รายชื่อไฟล์.txt" if thai else "filenames.txt")
        write_out(dest, rows, thai)
        print(dest)
        return

    root = tk.Tk()
    root.title("Namely")
    root.geometry("420x220")
    root.resizable(False, False)

    lang_var = tk.StringVar(value="th" if thai else "en")
    zip_var = tk.BooleanVar(value=True)
    folder_var = tk.StringVar(value="")

    def t(key: str) -> str:
        return (TH if lang_var.get() == "th" else EN)[key]

    def refresh() -> None:
        root.title(t("title"))
        pick_btn.configure(text=t("pick"))
        zip_chk.configure(text=t("zip"))
        go_btn.configure(text=t("extract"))
        lang_lbl.configure(text=t("lang"))

    frm = ttk.Frame(root, padding=16)
    frm.pack(fill="both", expand=True)

    lang_lbl = ttk.Label(frm, text="")
    lang_lbl.grid(row=0, column=0, sticky="w")
    lang_bar = ttk.Frame(frm)
    lang_bar.grid(row=0, column=1, sticky="e")
    ttk.Radiobutton(lang_bar, text="ไทย", value="th", variable=lang_var, command=refresh).pack(side="left")
    ttk.Radiobutton(lang_bar, text="EN", value="en", variable=lang_var, command=refresh).pack(side="left")

    pick_btn = ttk.Button(
        frm,
        text="",
        command=lambda: folder_var.set(filedialog.askdirectory() or folder_var.get()),
    )
    pick_btn.grid(row=1, column=0, columnspan=2, sticky="ew", pady=(16, 8))
    path_lbl = ttk.Label(frm, textvariable=folder_var, wraplength=380)
    path_lbl.grid(row=2, column=0, columnspan=2, sticky="w")

    zip_chk = ttk.Checkbutton(frm, text="", variable=zip_var)
    zip_chk.grid(row=3, column=0, columnspan=2, sticky="w", pady=8)

    def run() -> None:
        folder = folder_var.get().strip()
        if not folder:
            return
        rows = collect(Path(folder), zip_var.get())
        default = "รายชื่อไฟล์.txt" if lang_var.get() == "th" else "filenames.txt"
        dest = filedialog.asksaveasfilename(
            defaultextension=".txt",
            initialfile=default,
            filetypes=[("Text", "*.txt"), ("CSV", "*.csv"), ("JSON", "*.json")],
        )
        if not dest:
            return
        write_out(Path(dest), rows, lang_var.get() == "th")
        messagebox.showinfo(t("title"), t("done").format(n=len(rows), path=dest))

    go_btn = ttk.Button(frm, text="", command=run)
    go_btn.grid(row=4, column=0, columnspan=2, sticky="ew", pady=(8, 0))
    frm.columnconfigure(0, weight=1)
    frm.columnconfigure(1, weight=1)
    refresh()
    root.mainloop()


if __name__ == "__main__":
    main()
