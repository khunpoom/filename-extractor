package main

import (
	"archive/zip"
	"bufio"
	"encoding/csv"
	"encoding/json"
	"flag"
	"fmt"
	"io/fs"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strings"
	"syscall"
	"unicode/utf16"
	"unsafe"
)

type lang string

const (
	langTH lang = "th"
	langEN lang = "en"
)

type row struct {
	Name     string `json:"name"`
	Stem     string `json:"stem"`
	Ext      string `json:"ext"`
	Path     string `json:"path"`
	Size     int64  `json:"size"`
	Source   string `json:"source"`
	ZipParent string `json:"zip,omitempty"`
}

func main() {
	outFlag := flag.String("o", "", "output file path")
	fmtFlag := flag.String("format", "txt", "txt | csv | json")
	langFlag := flag.String("lang", "", "th | en")
	recurse := flag.Bool("r", true, "include subfolders")
	zipPeek := flag.Bool("zip", true, "list names inside zip files")
	stemOnly := flag.Bool("stem", false, "name without extension")
	flag.Parse()

	l := detectLang()
	if *langFlag == "en" {
		l = langEN
	}
	if *langFlag == "th" {
		l = langTH
	}

	args := flag.Args()
	if len(args) == 0 {
		if err := runGUI(l); err != nil {
			messageBox(tr(l, "title"), err.Error())
			os.Exit(1)
		}
		return
	}

	rows, err := collect(args, *recurse, *zipPeek)
	if err != nil {
		messageBox(tr(l, "title"), err.Error())
		os.Exit(1)
	}
	if *stemOnly {
		for i := range rows {
			rows[i].Name = rows[i].Stem
		}
	}
	out := *outFlag
	if out == "" {
		dir := filepath.Dir(args[0])
		if info, err := os.Stat(args[0]); err == nil && info.IsDir() {
			dir = args[0]
		}
		name := "filenames.txt"
		if l == langTH {
			name = "รายชื่อไฟล์.txt"
		}
		if *fmtFlag == "csv" {
			name = strings.TrimSuffix(name, ".txt") + ".csv"
		}
		if *fmtFlag == "json" {
			name = strings.TrimSuffix(name, ".txt") + ".json"
		}
		out = filepath.Join(dir, name)
	}
	if err := writeOutput(out, *fmtFlag, rows, l); err != nil {
		messageBox(tr(l, "title"), err.Error())
		os.Exit(1)
	}
	messageBox(tr(l, "title"), fmt.Sprintf(tr(l, "done"), len(rows), out))
}

func runGUI(l lang) error {
	folder, err := pickFolder(l)
	if err != nil {
		return err
	}
	if folder == "" {
		return nil
	}
	rows, err := collect([]string{folder}, true, true)
	if err != nil {
		return err
	}
	save, err := pickSave(l, folder)
	if err != nil {
		return err
	}
	if save == "" {
		return nil
	}
	format := "txt"
	switch strings.ToLower(filepath.Ext(save)) {
	case ".csv":
		format = "csv"
	case ".json":
		format = "json"
	}
	if err := writeOutput(save, format, rows, l); err != nil {
		return err
	}
	messageBox(tr(l, "title"), fmt.Sprintf(tr(l, "done"), len(rows), save))
	return nil
}

func collect(paths []string, recurse, zipPeek bool) ([]row, error) {
	var out []row
	seen := map[string]struct{}{}
	for _, p := range paths {
		abs, err := filepath.Abs(p)
		if err != nil {
			abs = p
		}
		info, err := os.Stat(abs)
		if err != nil {
			return nil, err
		}
		if !info.IsDir() {
			addFile(&out, seen, abs, info, filepath.Base(abs), zipPeek)
			continue
		}
		root := abs
		walkFn := func(path string, d fs.DirEntry, err error) error {
			if err != nil {
				return nil
			}
			if d.IsDir() {
				if path != root && !recurse {
					return filepath.SkipDir
				}
				return nil
			}
			fi, err := d.Info()
			if err != nil {
				return nil
			}
			rel, _ := filepath.Rel(root, path)
			addFile(&out, seen, path, fi, rel, zipPeek)
			return nil
		}
		if err := filepath.WalkDir(root, walkFn); err != nil {
			return nil, err
		}
	}
	sort.SliceStable(out, func(i, j int) bool {
		return strings.ToLower(out[i].Path) < strings.ToLower(out[j].Path)
	})
	return out, nil
}

func addFile(out *[]row, seen map[string]struct{}, path string, info os.FileInfo, rel string, zipPeek bool) {
	base := filepath.Base(path)
	stem, ext := splitName(base)
	key := path
	if _, ok := seen[key]; ok {
		return
	}
	seen[key] = struct{}{}
	*out = append(*out, row{
		Name:   base,
		Stem:   stem,
		Ext:    ext,
		Path:   filepath.ToSlash(rel),
		Size:   info.Size(),
		Source: "file",
	})
	if zipPeek && strings.EqualFold(ext, "zip") {
		inner, err := zipNames(path, base)
		if err == nil {
			*out = append(*out, inner...)
		}
	}
}

func zipNames(path, parent string) ([]row, error) {
	r, err := zip.OpenReader(path)
	if err != nil {
		return nil, err
	}
	defer r.Close()
	var out []row
	for _, f := range r.File {
		name := strings.ReplaceAll(f.Name, "\\", "/")
		if name == "" || strings.HasSuffix(name, "/") {
			continue
		}
		base := filepath.Base(name)
		stem, ext := splitName(base)
		out = append(out, row{
			Name:      base,
			Stem:      stem,
			Ext:       ext,
			Path:      parent + "/" + name,
			Size:      int64(f.UncompressedSize64),
			Source:    "zip",
			ZipParent: parent,
		})
	}
	return out, nil
}

func splitName(filename string) (string, string) {
	base := filepath.Base(filename)
	i := strings.LastIndex(base, ".")
	if i <= 0 || i == len(base)-1 {
		return base, ""
	}
	return base[:i], strings.ToLower(base[i+1:])
}

func writeOutput(path, format string, rows []row, l lang) error {
	if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil && !os.IsExist(err) {
		// dir of a file in current folder may be "."
	}
	f, err := os.Create(path)
	if err != nil {
		return err
	}
	defer f.Close()
	switch format {
	case "csv":
		if _, err := f.Write([]byte{0xEF, 0xBB, 0xBF}); err != nil {
			return err
		}
		w := csv.NewWriter(f)
		if l == langTH {
			_ = w.Write([]string{"ลำดับ", "ชื่อไฟล์", "ชื่อ", "นามสกุล", "พาธ", "ขนาดไบต์", "ที่มา"})
		} else {
			_ = w.Write([]string{"#", "name", "stem", "ext", "path", "size_bytes", "source"})
		}
		for i, r := range rows {
			_ = w.Write([]string{
				fmt.Sprintf("%d", i+1), r.Name, r.Stem, r.Ext, r.Path,
				fmt.Sprintf("%d", r.Size), r.Source,
			})
		}
		w.Flush()
		return w.Error()
	case "json":
		enc := json.NewEncoder(f)
		enc.SetIndent("", "  ")
		return enc.Encode(rows)
	default:
		w := bufio.NewWriter(f)
		for _, r := range rows {
			if _, err := w.WriteString(r.Name + "\r\n"); err != nil {
				return err
			}
		}
		return w.Flush()
	}
}

func pickFolder(l lang) (string, error) {
	script := fmt.Sprintf(`
Add-Type -AssemblyName System.Windows.Forms
$d = New-Object System.Windows.Forms.FolderBrowserDialog
$d.Description = %s
$d.ShowNewFolderButton = $false
if ($d.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Write-Output $d.SelectedPath }
`, psQuote(tr(l, "pickFolder")))
	return runPS(script)
}

func pickSave(l lang, folder string) (string, error) {
	def := "filenames.txt"
	if l == langTH {
		def = "รายชื่อไฟล์.txt"
	}
	script := fmt.Sprintf(`
Add-Type -AssemblyName System.Windows.Forms
$d = New-Object System.Windows.Forms.SaveFileDialog
$d.Title = %s
$d.Filter = "Text (*.txt)|*.txt|CSV Excel (*.csv)|*.csv|JSON (*.json)|*.json"
$d.FileName = %s
$d.InitialDirectory = %s
if ($d.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Write-Output $d.FileName }
`, psQuote(tr(l, "saveTitle")), psQuote(def), psQuote(folder))
	return runPS(script)
}

func runPS(script string) (string, error) {
	cmd := exec.Command("powershell.exe", "-NoProfile", "-STA", "-ExecutionPolicy", "Bypass", "-Command", script)
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true, CreationFlags: 0x08000000}
	out, err := cmd.Output()
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(string(out)), nil
}

func psQuote(s string) string {
	return "'" + strings.ReplaceAll(s, "'", "''") + "'"
}

func detectLang() lang {
	k := syscall.NewLazyDLL("kernel32.dll")
	p := k.NewProc("GetUserDefaultUILanguage")
	r, _, _ := p.Call()
	if uint32(r) == 0x041E {
		return langTH
	}
	return langEN
}

func tr(l lang, key string) string {
	th := map[string]string{
		"title":      "Namely — ดึงชื่อไฟล์",
		"pickFolder": "เลือกโฟลเดอร์ที่ต้องการดึงชื่อไฟล์",
		"saveTitle":  "บันทึกรายชื่อไฟล์",
		"done":       "ดึงชื่อไฟล์ได้ %d รายการ\nบันทึกที่:\n%s",
	}
	en := map[string]string{
		"title":      "Namely — File name extractor",
		"pickFolder": "Choose a folder to extract file names from",
		"saveTitle":  "Save file name list",
		"done":       "Extracted %d names\nSaved to:\n%s",
	}
	if l == langTH {
		if v, ok := th[key]; ok {
			return v
		}
	}
	if v, ok := en[key]; ok {
		return v
	}
	return key
}

func messageBox(title, text string) {
	user32 := syscall.NewLazyDLL("user32.dll")
	proc := user32.NewProc("MessageBoxW")
	tptr := utf16Ptr(title)
	mptr := utf16Ptr(text)
	proc.Call(0, uintptr(unsafe.Pointer(mptr)), uintptr(unsafe.Pointer(tptr)), 0x40)
}

func utf16Ptr(s string) *uint16 {
	u := utf16.Encode([]rune(s + "\x00"))
	return &u[0]
}
