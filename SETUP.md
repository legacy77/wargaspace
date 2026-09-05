# WargaSpace — Panduan Setup & Deploy

Struktur project: **tepat 2 file** — `Code.gs` (backend) + `index.html` (frontend SPA).

## Prerequisites
- Akun Google (Gmail/Google Workspace)
- Akses ke Google Drive (tempat file template surat, bukti bayar)
- Akun Fonnte (opsional, untuk notifikasi WhatsApp)

---

## Langkah 1: Buat Google Spreadsheet sebagai Database

1. Buka [Google Sheets](https://sheets.google.com) → Buat spreadsheet baru.
2. Beri nama: **WargaSpace - [Nama RT]**
3. Copy **ID Spreadsheet** dari URL:
   ```
   https://docs.google.com/spreadsheets/d/[SPREADSHEET_ID]/edit
   ```
   Simpan `SPREADSHEET_ID` ini.

---

## Langkah 2: Buat Project Google Apps Script

1. Di spreadsheet → menu **Extensions → Apps Script**.
2. Hapus/default `Code.gs.` dan buat **2 file**:

```
Code.gs      (Script)  — paste isi file lokal Code.gs
index.html   (HTML)    — paste isi file lokal index.html
```

> **Catatan penting anti-blank-page:**
> - `index.html` DI-SERVE VERBATIM via `HtmlService.createHtmlOutputFromFile('index')` — TIDAK ada template tag `<? ?>`, TIDAK ada `include()`, TIDAK ada `createTemplateFromFile`.
> - CSS inline murni non-CDN (Tailwind CDN bisa diblok sandbox iframe GAS).
> - Navigasi internal `go(page)` + `addEventListener` — TIDAK ada `location.hash`/`hashchange` (tidak reliable di sandbox).
> - JS murni `string concatenation` — TIDAK ada template literal backtick (menghindari escaping quote berlapis).

---

## Langkah 3: Inisialisasi Database

1. Kembali ke spreadsheet → refresh.
2. Menu **Kelola RT** (muncul di toolbar) → klik **Inisialisasi Config**.
3. Tab `Warga`, `Surat`, `Kas`, `Info`, `Config` otomatis dibuat dengan header.

---

## Langkah 4: Konfigurasi (Tab `Config`)

Buka sheet `Config` dan isi nilai:

| Key                   | Contoh Nilai                                        |
|-----------------------|-----------------------------------------------------|
| `Nama_RT`             | RT 01 / RW 05                                      |
| `Alamat_RT`           | Jl. Mawar No.1, Kel. Sehat, Jakarta Selatan        |
| `Nama_Pengurus`       | Bpk. Ahmad Fauzi                                    |
| `No_HP_Pengurus`      | 6281234567890 (format 62...)                        |
| `Token_Fonnte`        | (isi dari akun Fonnte, opsional)                    |
| `Template_Surat_ID`   | ID file Google Docs template surat                  |
| `Folder_Surat_ID`     | ID folder Google Drive (surat PDF + bukti bayar)    |
| `Nominal_Iuran`       | 50000                                               |
| `Bulan_Aktif`         | 9 (bulan berjalan)                                  |
| `Tahun_Aktif`         | 2026                                                |
| `Nomor_Darurat_*`     | 118 / 110 / 113 / nomor HP pengurus                 |
| `Jadwal_Posyandu`     | Tiap tanggal 10 bulan ini                          |

---

## Langkah 5: Buat Template Surat (Google Docs)

1. Buat file Google Docs baru → tulis template surat dengan placeholder:
   ```
   {{NAMA}}
   {{NIK}}
   {{NOMOR_KK}}
   {{NOMOR_RUMAH}}
   {{JUMLAH_ANGGOTA}}
   {{STATUS_HUNIAN}}
   {{TANGGAL_SURAT}}
   {{TUJUAN}}         ← untuk SKTM / Domisili
   {{KEPERLUAN}}      ← untuk SKTM / Domisili
   {{NAMA_CALON}}     ← untuk Pengantar Nikah
   ```
2. **Share** dokumen → Get link → copy Document ID dari URL.
3. Paste ID ke kolom `Template_Surat_ID` di sheet `Config`.

---

## Langkah 6: Tambah Data Warga

Buka sheet `Warga` → tambahkan data:

| Nomor_KK | NIK | Nama | No_HP | Nomor_Rumah | Jumlah_Anggota_Keluarga | Status_Hunian | Sandi_KK | Admin |
|----------|-----|------|-------|-------------|-------------------------|---------------|----------|-------|
| 3271xxx  | ... | ... | ...   | 12          | 4                       | Tetap         | rahasia1 | FALSE |

> - `Sandi_KK`: sandi yang diberikan ke setiap KK untuk login.
> - `Admin`: isi `TRUE` untuk pengurus (ketua RT/dll) → mereka mendapat Panel Admin di aplikasi.

---

## Langkah 7: Deploy Web App

1. Di Apps Script editor → **Deploy → New deployment** → **Web app**.
2. Pengaturan:
   - **Execute as**: Me (email akun Anda)
   - **Who has access**: Anyone
3. **Wajib**: setiap kali ubah kode → Deploy → **Manage deployments** → Edit → **New version** → Deploy.
4. Copy **Web app URL** — link dibagikan ke warga.

---

## Fitur Admin (di dalam aplikasi)

- Pengurus = KK dengan kolom `Admin: TRUE` di sheet `Warga`.
- Setelah login, pengurus melihat kartu **Panel Admin** + item nav **Admin**.
- Panel berisi 3 tab:
  - **Surat** → Setujui (auto-generate PDF + WA notif) / Tolak
  - **Iuran** → Valid (LUNAS) / Tolak bukti (dengan link bukti bayar)
  - **Kas** → Total kas & rekap per bulan

---

## Struktur Tab Database

| Tab       | Primary Key | Kolom Utama                          |
|-----------|-------------|--------------------------------------|
| `Warga`   | Nomor_KK    | NIK, Nama, No_HP, Sandi_KK, Admin    |
| `Surat`   | ID_Surat    | Jenis_Surat, Detail_Isian, Status    |
| `Kas`     | ID_Transaksi| Bulan_Iuran, Nominal, Status         |
| `Config`  | Key         | Value (key-value store)              |
| `Info`    | ID_Info     | Judul, Isi, Tanggal                 |

---

## Troubleshooting

| Masalah                        | Solusi                                                        |
|--------------------------------|---------------------------------------------------------------|
| Error "Sesi berakhir"          | Login ulang via halaman login (sesi 12 jam)                   |
| PDF tidak generate             | Pastikan `Template_Surat_ID` terisi & template sudah dishare   |
| WhatsApp tidak terkirim        | Isi `Token_Fonnte` di Config, cek quota Fonnte               |
| Data warga tidak muncul        | Pastikan Nomor_KK di sheet `Warga` persis sama saat login      |
| Halaman blank                  | Pastikan redeploy New version & `index.html` ter-paste utuh    |

---

## Maintenance Rutin

1. **Bulanan**: Update `Bulan_Aktif` dan `Tahun_Aktif` di Config.
2. **Per KK baru**: Tambah row di sheet `Warga` + berikan sandi.
3. **Pengurus baru**: Kolom `Admin` di sheet `Warga` → `TRUE`.
4. **Pengumuman**: Tambah row di sheet `Info`.
5. **Backup**: Spreadsheet otomatis di-versioned oleh Google Drive.

---

## Opsional: Notifikasi WhatsApp (Fonnte)

1. Daftar di [fonnte.com](https://fonnte.com) dan buat token API.
2. Isi `Token_Fonnte` di Config sheet.
3. Notifikasi otomatis terkirim saat:
   - Surat disetujui / ditolak
   - Iuran di-verify / ditolak

## Menjalankan Tes (opsional)

- Spreadsheet → menu **Kelola RT → Jalankan Tes**.
- Verifikasi helper: normalisasi HP, Rupiah, badge HTML, UID, token, rekap.