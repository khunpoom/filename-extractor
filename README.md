# Namely — ดึงชื่อไฟล์

ลากไฟล์มา ได้รายชื่อทันที · Drop files. Get every name.

ดึงชื่อไฟล์จากหลายไฟล์ โฟลเดอร์ หรือไฟล์ ZIP แล้วคัดลอก / บันทึกเป็น TXT, CSV, JSON  
Extract filenames from many files, folders, or ZIP archives. Copy or download TXT, CSV, JSON.

ไฟล์ไม่ออกจากเครื่อง · Files never leave this device.

## ลิงก์

- GitHub (public): https://github.com/khunpoom/filename-extractor
- เว็บบน Vercel: https://filename-extractor-khunpoom.vercel.app
- ดาวน์โหลด Namely.exe: https://github.com/khunpoom/filename-extractor/releases/download/v1.0.0/Namely.exe

ถ้าหน้า Vercel ขึ้นล็อกอิน ให้ปิด **Deployment Protection** ที่  
Vercel Dashboard → Project `filename-extractor` → Settings → Deployment Protection → ปิด Vercel Authentication

## ภาษา / Languages

ไทย และ English — สลับได้ที่มุมบนขวา (เว็บ) หรือตามภาษาของ Windows (`.exe`)

## เว็บ

เปิดเว็บแล้วลากไฟล์หรือโฟลเดอร์มาวาง ไม่ต้องติดตั้ง

- ชื่อพร้อมนามสกุล / ชื่ออย่างเดียว / นามสกุล / พาธย่อย
- อ่านรายชื่อข้างใน `.zip` โดยไม่ต้องแตกไฟล์
- คัดลอก หรือดาวน์โหลด TXT · CSV (เปิดใน Excel ได้ รองรับไทย) · JSON · Markdown
- ค้นหา เรียง ไม่ซ้ำ ใส่เลขลำดับ คำนำ/คำตาม

## Windows `.exe`

1. ดาวน์โหลด [`Namely.exe`](https://github.com/khunpoom/filename-extractor/releases/download/v1.0.0/Namely.exe)
2. ดับเบิลคลิก เลือกโฟลเดอร์ แล้วบันทึกรายชื่อ
3. หรือลากโฟลเดอร์มาวางบนไอคอนโปรแกรม — จะได้ไฟล์ `รายชื่อไฟล์.txt` ในโฟลเดอร์นั้น

คอมไพล์เอง:

```bash
cd desktop
GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go build -ldflags="-s -w -H windowsgui" -o Namely.exe
```

Python (Windows / macOS / Linux):

```bash
python3 desktop/namely.py
```

## ความเป็นส่วนตัว

ทุกอย่างรันบนเครื่องคุณ เว็บใช้ File API ของเบราว์เซอร์ ไม่มีอัปโหลด

## License

MIT
