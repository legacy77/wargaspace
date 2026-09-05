# 🛸 WargaSpace 

> *One stop, zero drama: urus surat & iuran RT dari HP.*

Sistem manajemen RT/RW modern anti-ribet berbasis **Google Apps Script** + **Google Sheets**. Dibuat khusus buat pengurus RT yang mau serba sat-set dan warga yang mager keluar rumah cuma buat minta surat pengantar atau cek kas.

---

## ⚡ Tech Stack (No over-engineering!)
- **Backend**: Google Apps Script (GAS) monolitik (1 file doang: `Code.gs`).
- **Database**: Google Sheets (aman, gratis, backup otomatis).
- **Frontend**: SPA murni dalam 1 file `index.html` (CSS inline ala Saweria neo-brutalist, tanpa CDN eksternal, anti-blank page).
- **Integrasi**: Google Docs (auto-generate PDF surat) & Fonnte API (notifikasi WhatsApp otomatis).

---

## ✨ Fitur Utamanya Apa Aja?
1. **Portal Mandiri Warga**: Warga tinggal login pake Nomor KK + PIN, bisa langsung ajukan surat (SKTM, Domisili, Nikah) dan pantau statusnya real-time (bisa langsung download PDF kalau sudah di-approve!).
2. **Iuran & Kas Transparan**: Warga bisa cek status iuran bulan berjalan dan upload bukti transfer/QRIS langsung dari HP.
3. **Panel Admin Sat-Set**: Pengurus (yang punya akses `Admin: TRUE`) punya dashboard internal buat approve/reject surat (otomatis bikin PDF & kirim WA ke warga) serta verifikasi pembayaran kas.
4. **Info Warga & Darurat**: Kontak penting (Ambulans, Polisi, Pemadam, RT), jadwal posyandu, dan pengumuman RT dalam satu genggaman.

---

## 🛠️ Cara Deploy (Gampang Banget!)

1. **Siapin Spreadsheet**: Bikin Google Sheets baru, rename jadi `WargaSpace`.
2. **Masukin Script**: Masuk ke menu **Extensions → Apps Script**, hapus kode default, lalu buat 2 file:
   - `Code.gs` (paste backend monolitik)
   - `index.html` (paste frontend SPA)
3. **Inisialisasi**: Balik ke spreadsheet, klik menu **Kelola RT → Inisialisasi Config**.
4. **Deploy Web App**: 
   - Klik **Deploy → New deployment** (Type: Web app).
   - Execute as: `Me` | Who has access: `Anyone`.
   - Copy URL-nya!
5. **Set-up Data**: Isi tab `Config` (terutama `Template_Surat_ID` dari Google Docs) dan tambahin data warga di tab `Warga`.

---

## 📂 Struktur Project
```text
erte/
├── Code.gs        # Otak backend (Auth, Surat, Kas, Admin API)
├── index.html     # Tampilan web mobile-first ala Saweria
├── README.md      # File dokumentasi utama (lo di sini)
└── SETUP.md       # Panduan teknis lengkap & troubleshooting
```

---

*Built with lazy senior developer mindset: fewest files, zero server cost, maximum impact. 😎*
