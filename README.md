# 🛸 WargaSpace

> **Urus surat & iuran RT langsung dari HP. Nol drama, nol server, nol biaya.**

Portal mandiri warga berbasis **Google Apps Script + Google Sheets** — dibuat untuk pengurus RT yang mau serba *sat-set* dan warga yang mager keluar rumah cuma buat minta surat pengantar atau cek kas.

<p align="left">
  <img alt="Platform" src="https://img.shields.io/badge/platform-Google%20Apps%20Script-4285F4?logo=google&logoColor=white">
  <img alt="Database" src="https://img.shields.io/badge/database-Google%20Sheets-34A853?logo=googlesheets&logoColor=white">
  <img alt="Frontend" src="https://img.shields.io/badge/frontend-Vanilla%20JS-f7df1e?logo=javascript&logoColor=black">
  <img alt="Biaya" src="https://img.shields.io/badge/biaya-100%25%20GRATIS-brightgreen">
  <img alt="Files" src="https://img.shields.io/badge/proyek-2%20file-blueviolet">
</p>

---

## ✨ Kenapa WargaSpace?

| Masalah lama 😩 | Dengan WargaSpace 🚀 |
|---|---|
| Warga antre minta surat pengantar | Ajukan online, PDF jadi otomatis |
| "Kas RT habis buat apa ya?" | Rekap kas transparan, cek kapan aja |
| Iuran nunggak, nagihnya manual | Upload bukti bayar + notif WhatsApp |
| Data warga di buku tulis | Database Google Sheets, aman & ter-backup |
| Bikin sistem butuh server & biaya | Cukup 2 file, jalan di akun Google kamu |

## 🎯 Fitur Utama

- 🧾 **Portal Mandiri Warga** — Login pakai Nomor KK + PIN, ajukan surat (SKTM, Domisili, Pengantar Nikah), pantau status real-time, download PDF kalau sudah disetujui.
- 💰 **Iuran & Kas Transparan** — Cek tagihan bulan berjalan, upload bukti transfer/QRIS langsung dari HP.
- 🛡️ **Panel Admin Sat-Set** — Pengurus approve/reject surat (auto PDF + notif WA) & verifikasi pembayaran dalam satu dashboard.
- 👥 **Kelola Pengurus** — Jadikan/cabut admin warga lain langsung dari aplikasi, tanpa buka spreadsheet.
- 📢 **Info Warga & Darurat** — Kontak penting (Ambulans, Polisi, Pemadam, RT), jadwal posyandu, dan pengumuman RT dalam satu genggaman.
- 🔒 **Aman by Design** — Token sesi 12 jam, otorisasi `requireKK`/`requireAdmin`, helper internal terkunci dari browser.

## ⚡ Tech Stack (No Over-engineering)

- **Backend** — Google Apps Script monolitik (`Code.gs`)
- **Database** — Google Sheets (gratis, backup otomatis)
- **Frontend** — SPA 1 file (`index.html`), CSS neo-brutalist tanpa CDN eksternal
- **Integrasi** — Google Docs (auto-generate PDF) + Fonnte API (notif WhatsApp)

## 🚀 Quick Start

```text
1. Buat Google Sheets  →  menu Extensions → Apps Script
2. Paste Code.gs + index.html (2 file saja)
3. Menu "Kelola RT" → Inisialisasi Config
4. Deploy → New deployment → Web app → bagikan URL ke warga
```

📖 **Panduan lengkap langkah demi langkah ada di [`INSTALL.md`](INSTALL.md).**

## 📂 Struktur Project

```text
wargaspace/
├── Code.gs        # Backend: auth, surat, kas, admin API
├── index.html     # Frontend SPA mobile-first
├── INSTALL.md     # Panduan instalasi & deploy lengkap
├── README.md      # Dokumentasi utama (kamu di sini)
└── .gitignore
```

## 🔐 Keamanan Singkat

- Semua fungsi **top-level** di GAS bisa dipanggil browser → karena itu setiap API wajib verifikasi token (`requireKK` / `requireAdmin`).
- Helper internal dibungkus namespace `H` sehingga **tidak** terekspos ke `google.script.run`.
- Token dibuat server-side (`Utilities.getUuid()`) di `CacheService` (12 jam) → tidak bisa dipalsukan dari client.
- Data sensitif (sandi, token WA) **tidak pernah** dikirim ke halaman publik.

Detail model otorisasi: lihat bagian **Keamanan** di [`INSTALL.md`](INSTALL.md).

## 🤝 Kontribusi

Pull request & issue terbuka. Kalau project ini membantu RT kamu, kasih ⭐ biar makin banyak yang nemu. 😎

---

<p align="center"><i>Dibuat dengan mindset "lazy senior developer": paling sedikit file, nol biaya server, dampak maksimal.</i></p>
