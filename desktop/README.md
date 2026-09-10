# Namely desktop

Windows `.exe` (no extra runtime) and a Python fallback.

## Windows

Double-click `Namely.exe`.

- Picks a folder (subfolders included)
- Optionally lists names inside `.zip` files
- Saves TXT / CSV / JSON
- Thai or English follows Windows display language (`-lang th` / `-lang en`)

Drag a folder onto the `.exe` to write `รายชื่อไฟล์.txt` (or `filenames.txt`) inside it.

```text
Namely.exe D:\Photos
Namely.exe -format csv -o names.csv D:\Photos
Namely.exe -lang en -stem D:\Photos
```

Build from this folder (Go 1.23+):

```bash
GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go build -ldflags="-s -w -H windowsgui" -o Namely.exe
```

## Python (Windows / macOS / Linux)

```bash
python3 namely.py
python3 namely.py /path/to/folder
```
