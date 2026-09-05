/**
 * WargaSpace — Backend monolitik.
 * Tepat 2 file project: Code.gs + index.html
 */

const SHEET_NAMES = { WARGA: 'Warga', SURAT: 'Surat', KAS: 'Kas', CONFIG: 'Config', INFO: 'Info' };

const WARGA_HEADERS = ['Nomor_KK', 'NIK', 'Nama', 'No_HP', 'Nomor_Rumah', 'Jumlah_Anggota_Keluarga', 'Status_Hunian', 'Sandi_KK', 'Admin'];
const SURAT_HEADERS = ['ID_Surat', 'Nomor_KK', 'Nama', 'Jenis_Surat', 'Detail_Isian', 'Status', 'Link_PDF', 'Timestamp', 'Catatan'];
const KAS_HEADERS = ['ID_Transaksi', 'Nomor_KK', 'Bulan_Iuran', 'Tahun', 'Nominal', 'Bukti_Bayar_Link', 'Status', 'Timestamp', 'Catatan_Admin'];
const INFO_HEADERS = ['ID_Info', 'Judul', 'Isi', 'Tanggal'];

const DEFAULT_CONFIG_ROWS = [
  ['Nama_RT', 'RT 01 / RW 05'],
  ['Alamat_RT', 'Jl. Contoh No.1'],
  ['Nama_Pengurus', 'Bpk. Ketua RT'],
  ['No_HP_Pengurus', '6281234567890'],
  ['Token_Fonnte', ''],
  ['Template_Surat_ID', ''],
  ['Folder_Surat_ID', ''],
  ['Nominal_Iuran', '50000'],
  ['Bulan_Aktif', String(new Date().getMonth() + 1)],
  ['Tahun_Aktif', String(new Date().getFullYear())],
  ['Nomor_Darurat_Ambulans', '118'],
  ['Nomor_Darurat_Polisi', '110'],
  ['Nomor_Darurat_Pemadam', '113'],
  ['Nomor_Darurat_RT', '6281234567890'],
  ['Jadwal_Posyandu', 'Tiap tanggal 10'],
];

const SESSION_TTL_SEC = 12 * 60 * 60;
const cfgCache = CacheService.getScriptCache();

// ═══════════════════════════════════════════════════════════
// SHEETS & CONFIG
// ═══════════════════════════════════════════════════════════

function getOrCreateSheet(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (headers && headers.length && sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

function initConfig() {
  getOrCreateSheet(SHEET_NAMES.WARGA, WARGA_HEADERS);
  getOrCreateSheet(SHEET_NAMES.SURAT, SURAT_HEADERS);
  getOrCreateSheet(SHEET_NAMES.KAS, KAS_HEADERS);
  getOrCreateSheet(SHEET_NAMES.INFO, INFO_HEADERS);
  const cfg = getOrCreateSheet(SHEET_NAMES.CONFIG, ['Key', 'Value']);
  const existing = cfg.getDataRange().getValues().slice(1).map(r => String(r[0]).trim());
  DEFAULT_CONFIG_ROWS.forEach(([k, v]) => {
    if (existing.indexOf(k) === -1) cfg.appendRow([k, v]);
  });
  SpreadsheetApp.getActiveSpreadsheet().toast('WargaSpace config siap.', 'OK', 3);
}

function cfg(key) {
  if (!key) return null;
  const cached = cfgCache.get('cfg_' + key);
  if (cached !== null) return cached;
  const sh = getOrCreateSheet(SHEET_NAMES.CONFIG);
  const vals = sh.getDataRange().getValues();
  for (let i = 1; i < vals.length; i++) {
    if (String(vals[i][0]).trim() === key) {
      cfgCache.put('cfg_' + key, String(vals[i][1] || ''), 3600);
      return String(vals[i][1] || '');
    }
  }
  return '';
}

function setCfg(key, value) {
  const sh = getOrCreateSheet(SHEET_NAMES.CONFIG);
  const vals = sh.getDataRange().getValues();
  for (let i = 1; i < vals.length; i++) {
    if (String(vals[i][0]).trim() === key) {
      sh.getRange(i + 1, 2).setValue(value);
      cfgCache.remove('cfg_' + key);
      return;
    }
  }
  sh.appendRow([key, value]);
}

// ═══════════════════════════════════════════════════════════
// DB HELPERS
// ═══════════════════════════════════════════════════════════

function readRows(name) {
  const sh = getOrCreateSheet(name);
  const vals = sh.getDataRange().getValues();
  if (!vals.length) return [];
  const header = vals[0];
  return vals.slice(1).filter(r => r.some(c => c !== '')).map(r => {
    const o = {};
    header.forEach((h, i) => { o[h] = r[i]; });
    return o;
  });
}

function uid(prefix) {
  return prefix + '_' + Utilities.getUuid().slice(0, 8) + '_' + Date.now();
}

function nowStr() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
}

function normalizePhone(p) {
  let s = String(p || '').replace(/[^0-9]/g, '');
  if (s.startsWith('0')) s = '62' + s.slice(1);
  if (!s.startsWith('62')) s = '62' + s;
  return s;
}

function fmtRupiah(n) {
  return 'Rp ' + String(Number(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function statusBadgeHtml(s) {
  const map = {
    'MENUNGGU': { t: 'Menunggu Verifikasi', c: 'bg-amber-100 text-amber-700' },
    'DISETUJUI': { t: 'Disetujui', c: 'bg-green-100 text-green-700' },
    'DITOLAK': { t: 'Ditolak', c: 'bg-red-100 text-red-700' },
    'LUNAS': { t: 'Lunas', c: 'bg-green-100 text-green-700' },
    'BELUM_BAYAR': { t: 'Belum Bayar', c: 'bg-red-100 text-red-700' },
  };
  const x = map[String(s)] || { t: String(s), c: 'bg-slate-100 text-slate-600' };
  return '<span class="badge ' + x.c + '">' + x.t + '</span>';
}

// ═══════════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════════

function loginKK(noKK, sandi) {
  const kkClean = String(noKK || '').trim();
  const sandiClean = String(sandi || '').trim();
  const rows = readRows(SHEET_NAMES.WARGA);
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (String(r.Nomor_KK).trim() === kkClean && String(r.Sandi_KK).trim() === sandiClean) {
      const token = Utilities.getUuid();
      const isAdmin = String(r.Admin || '').toUpperCase() === 'TRUE';
      const payload = kkClean + '|' + (isAdmin ? '1' : '0');
      CacheService.getScriptCache().put(token, payload, SESSION_TTL_SEC);
      return { ok: true, token: token, nama: r.Nama, nomorRumah: r.Nomor_Rumah, isAdmin: isAdmin };
    }
  }
  return { ok: false, message: 'Nomor KK atau sandi salah.' };
}

function verifyToken(token) {
  if (!token) return null;
  const data = CacheService.getScriptCache().get(String(token));
  if (!data) return null;
  const parts = String(data).split('|');
  return { kk: parts[0], isAdmin: parts[1] === '1' };
}

function requireKK(token) {
  const v = verifyToken(token);
  if (!v) throw new Error('Sesi berakhir. Silakan masuk kembali.');
  return v.kk;
}

function me(token) {
  const kk = requireKK(token);
  const v = verifyToken(token);
  const rows = readRows(SHEET_NAMES.WARGA);
  const w = rows.find(r => String(r.Nomor_KK).trim() === kk);
  if (!w) throw new Error('Data warga tidak ditemukan.');
  return {
    nomorKK: w.Nomor_KK,
    nik: w.NIK,
    nama: w.Nama,
    noHP: w.No_HP,
    nomorRumah: w.Nomor_Rumah,
    jmlAnggota: w.Jumlah_Anggota_Keluarga,
    statusHunian: w.Status_Hunian,
    isAdmin: v ? v.isAdmin : false,
  };
}

function logout(token) {
  if (token) CacheService.getScriptCache().remove(String(token));
  return { ok: true };
}

// ═══════════════════════════════════════════════════════════
// SURAT
// ═══════════════════════════════════════════════════════════

function getJenisSuratMeta() {
  return [
    { id: 'SKTM', label: 'Surat Keterangan Tidak Mampu (SKTM)', desc: 'Pengajuan bantuan sosial/sekolah/keringanan biaya.', fields: [
      { key: 'tujuan', label: 'Ditujukan Kepada', placeholder: 'cth: Kepala Sekolah SMPN 1' },
      { key: 'keperluan', label: 'Keperluan', placeholder: 'cth: Pengajuan Beasiswa' },
    ]},
    { id: 'DOMISILI', label: 'Surat Keterangan Domisili', desc: 'Konfirmasi tempat tinggal.', fields: [
      { key: 'tujuan', label: 'Ditujukan Kepada', placeholder: 'cth: Bank / Imigrasi' },
      { key: 'keperluan', label: 'Keperluan', placeholder: 'cth: Pembukaan Rekening' },
    ]},
    { id: 'PENGANTAR_NIKAH', label: 'Surat Pengantar Nikah', desc: 'Pengantar kelengkapan berkas pernikahan ke KUA.', fields: [
      { key: 'nama_calon', label: 'Nama Calon Pasangan', placeholder: 'Nama lengkap calon' },
      { key: 'bin_binti', label: 'Bin / Binti', placeholder: 'Nama ayah calon' },
      { key: 'tempat_tanggal_lahir_calon', label: 'TTL Calon', placeholder: 'Kota, tgl-bln-thn' },
    ]},
  ];
}

function ajukanSurat(token, jenis, detail) {
  const kk = requireKK(token);
  const rows = readRows(SHEET_NAMES.WARGA);
  const w = rows.find(r => String(r.Nomor_KK).trim() === kk);
  if (!w) throw new Error('Data KK tidak valid.');
  const id = uid('SURAT');
  const sh = getOrCreateSheet(SHEET_NAMES.SURAT);
  sh.appendRow([id, kk, w.Nama, jenis, JSON.stringify(detail || {}), 'MENUNGGU', '', nowStr(), '']);
  return { ok: true, idSurat: id };
}

function listSuratKK(token) {
  const kk = requireKK(token);
  return readRows(SHEET_NAMES.SURAT)
    .filter(r => String(r.Nomor_KK).trim() === kk)
    .map(r => ({
      id: r.ID_Surat,
      jenis: r.Jenis_Surat,
      detail: r.Detail_Isian ? safeParse(r.Detail_Isian) : {},
      status: r.Status,
      linkPDF: r.Link_PDF,
      timestamp: r.Timestamp,
      catatan: r.Catatan,
    }))
    .reverse();
}

function safeParse(s) { try { return JSON.parse(s); } catch (e) { return {}; } }

function listSuratPending() {
  return readRows(SHEET_NAMES.SURAT).filter(r => String(r.Status).toUpperCase() === 'MENUNGGU');
}

function generatePdfFromTemplate(rowIndex) {
  const sh = getOrCreateSheet(SHEET_NAMES.SURAT);
  const vals = sh.getDataRange().getValues();
  const header = vals[0];
  const item = {};
  header.forEach((h, i) => { item[h] = vals[rowIndex - 1][i]; });
  const warga = readRows(SHEET_NAMES.WARGA).find(x => String(x.Nomor_KK).trim() === String(item.Nomor_KK).trim()) || {};
  const tplId = cfg('Template_Surat_ID');
  if (!tplId) throw new Error('Template_Surat_ID belum diset di Config.');
  const tplFile = DriveApp.getFileById(tplId);
  const folderId = cfg('Folder_Surat_ID');
  const folder = folderId ? DriveApp.getFolderById(folderId) : DriveApp.getRootFolder();
  const copy = tplFile.makeCopy('Surat_' + item.Jenis_Surat + '_' + item.Nomor_KK + '_' + Date.now(), folder);
  const doc = DocumentApp.openById(copy.getId());
  const body = doc.getBody();
  body.replaceText('{{NAMA}}', warga.Nama || '');
  body.replaceText('{{NIK}}', warga.NIK || '');
  body.replaceText('{{NOMOR_KK}}', warga.Nomor_KK || '');
  body.replaceText('{{NOMOR_RUMAH}}', warga.Nomor_Rumah || '');
  body.replaceText('{{JUMLAH_ANGGOTA}}', warga.Jumlah_Anggota_Keluarga || '');
  body.replaceText('{{STATUS_HUNIAN}}', warga.Status_Hunian || '');
  body.replaceText('{{TANGGAL_SURAT}}', Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd MMMM yyyy'));
  const detail = safeParse(item.Detail_Isian || '{}');
  for (var k in detail) if (detail.hasOwnProperty(k)) body.replaceText('{{' + String(k).toUpperCase() + '}}', detail[k]);
  doc.saveAndClose();
  const pdfBlob = copy.getAs('application/pdf').setName('Surat_' + item.Jenis_Surat + '_' + item.Nomor_KK + '.pdf');
  const pdfFile = folder.createFile(pdfBlob);
  copy.setTrashed(true);
  return pdfFile.getUrl();
}

function setSuratStatus(idSurat, status, catatan) {
  const sh = getOrCreateSheet(SHEET_NAMES.SURAT);
  const vals = sh.getDataRange().getValues();
  let row = -1;
  for (let i = 1; i < vals.length; i++) if (String(vals[i][0]).trim() === String(idSurat).trim()) { row = i + 1; break; }
  if (row === -1) throw new Error('Surat tidak ditemukan.');
  sh.getRange(row, 6).setValue(status);
  sh.getRange(row, 9).setValue(catatan || '');
  let pdfUrl = '';
  if (status === 'DISETUJUI') {
    pdfUrl = generatePdfFromTemplate(row);
    sh.getRange(row, 7).setValue(pdfUrl);
  }
  const kk = String(vals[row - 1][1]).trim();
  const warga = readRows(SHEET_NAMES.WARGA).find(w => String(w.Nomor_KK).trim() === kk);
  if (warga && warga.No_HP) {
    if (status === 'DISETUJUI') kirimWa(warga.No_HP, 'Halo Bpk/Ibu ' + warga.Nama + ', pengajuan surat Anda telah DISETUJUI. Unduh PDF: ' + pdfUrl);
    else kirimWa(warga.No_HP, 'Mohon maaf, pengajuan surat Anda DITOLAK. Catatan: ' + (catatan || 'Hubungi pengurus.'));
  }
  return { ok: true, pdfUrl: pdfUrl };
}

// ═══════════════════════════════════════════════════════════
// KAS / IURAN
// ═══════════════════════════════════════════════════════════

function getTagihanAktif(token) {
  const kk = requireKK(token);
  const bulanAktif = Number(cfg('Bulan_Aktif')) || (new Date().getMonth() + 1);
  const tahunAktif = Number(cfg('Tahun_Aktif')) || new Date().getFullYear();
  const nominalDefault = Number(cfg('Nominal_Iuran')) || 50000;
  const found = readRows(SHEET_NAMES.KAS).find(r =>
    String(r.Nomor_KK).trim() === kk &&
    Number(r.Bulan_Iuran) === bulanAktif &&
    Number(r.Tahun) === tahunAktif
  );
  if (found) return {
    bulan: bulanAktif, tahun: tahunAktif,
    nominal: Number(found.Nominal) || nominalDefault,
    status: found.Status,
    bukti: found.Bukti_Bayar_Link || '',
    catatan: found.Catatan_Admin || '',
  };
  return { bulan: bulanAktif, tahun: tahunAktif, nominal: nominalDefault, status: 'BELUM_BAYAR', bukti: '', catatan: '' };
}

function saveBase64ToDrive(dataUrl, fileName) {
  const parts = String(dataUrl).split(',');
  const contentType = parts[0].match(/:(.*?);/)[1];
  const bytes = Utilities.base64Decode(parts[1]);
  const blob = Utilities.newBlob(bytes, contentType, fileName + '.jpg');
  const folderId = cfg('Folder_Surat_ID');
  const folder = folderId ? DriveApp.getFolderById(folderId) : DriveApp.getRootFolder();
  const file = folder.createFile(blob);
  return file.getUrl();
}

function bayarIuran(token, dataUrl, catatan) {
  const kk = requireKK(token);
  const bulanAktif = Number(cfg('Bulan_Aktif')) || (new Date().getMonth() + 1);
  const tahunAktif = Number(cfg('Tahun_Aktif')) || new Date().getFullYear();
  const nominalDefault = Number(cfg('Nominal_Iuran')) || 50000;
  let fileUrl = '';
  if (dataUrl) fileUrl = saveBase64ToDrive(dataUrl, 'Iuran_' + kk + '_' + bulanAktif + '_' + tahunAktif);
  const sh = getOrCreateSheet(SHEET_NAMES.KAS);
  const vals = sh.getDataRange().getValues();
  let row = -1;
  for (let i = 1; i < vals.length; i++) {
    if (String(vals[i][1]).trim() === kk && Number(vals[i][2]) === bulanAktif && Number(vals[i][3]) === tahunAktif) { row = i + 1; break; }
  }
  if (row !== -1) {
    sh.getRange(row, 6).setValue(fileUrl);
    sh.getRange(row, 7).setValue('MENUNGGU');
    sh.getRange(row, 8).setValue(nowStr());
    sh.getRange(row, 9).setValue(catatan || '');
  } else {
    sh.appendRow([uid('KAS'), kk, bulanAktif, tahunAktif, nominalDefault, fileUrl, 'MENUNGGU', nowStr(), catatan || '']);
  }
  return { ok: true };
}

function riwayatIuran(token) {
  const kk = requireKK(token);
  return readRows(SHEET_NAMES.KAS)
    .filter(r => String(r.Nomor_KK).trim() === kk)
    .map(r => ({ id: r.ID_Transaksi, bulan: r.Bulan_Iuran, tahun: r.Tahun, nominal: r.Nominal, status: r.Status, bukti: r.Bukti_Bayar_Link, timestamp: r.Timestamp, catatan: r.Catatan_Admin }))
    .reverse();
}

function listIuranMenunggu() { return readRows(SHEET_NAMES.KAS).filter(r => String(r.Status).toUpperCase() === 'MENUNGGU'); }

function setIuranStatus(idTransaksi, status, catatan) {
  const sh = getOrCreateSheet(SHEET_NAMES.KAS);
  const vals = sh.getDataRange().getValues();
  let row = -1;
  for (let i = 1; i < vals.length; i++) if (String(vals[i][0]).trim() === String(idTransaksi).trim()) { row = i + 1; break; }
  if (row === -1) throw new Error('Transaksi tidak ditemukan.');
  sh.getRange(row, 7).setValue(status);
  sh.getRange(row, 9).setValue(catatan || '');
  const kk = String(vals[row - 1][1]).trim();
  const bulan = vals[row - 1][2];
  const tahun = vals[row - 1][3];
  const warga = readRows(SHEET_NAMES.WARGA).find(w => String(w.Nomor_KK).trim() === kk);
  if (warga && warga.No_HP) {
    if (status === 'LUNAS') kirimWa(warga.No_HP, 'Pembayaran iuran ' + bulan + '/' + tahun + ' telah DISETUJUI (LUNAS). Terima kasih.');
    else kirimWa(warga.No_HP, 'Bukti iuran ' + bulan + '/' + tahun + ' DITOLAK. Catatan: ' + (catatan || 'Unggah ulang bukti valid.'));
  }
  return { ok: true };
}

function rekapKasSummary() {
  const rows = readRows(SHEET_NAMES.KAS);
  let total = 0;
  const perBulan = {};
  rows.forEach(r => {
    if (String(r.Status).toUpperCase() === 'LUNAS') {
      const nom = Number(r.Nominal) || 0;
      total += nom;
      const k = r.Bulan_Iuran + '/' + r.Tahun;
      perBulan[k] = (perBulan[k] || 0) + nom;
    }
  });
  return { totalKas: total, perBulan: perBulan };
}

// ═══════════════════════════════════════════════════════════
// INFO & WA
// ═══════════════════════════════════════════════════════════

function getInfoPublik() {
  const all = getAllConfig();
  return {
    namaRT: all.Nama_RT || 'RT / RW',
    alamatRT: all.Alamat_RT || '',
    namaPengurus: all.Nama_Pengurus || 'Pengurus',
    noHpPengurus: all.No_HP_Pengurus || '',
    darurat: [
      { nama: 'Ambulans / Darurat', no: all.Nomor_Darurat_Ambulans || '118' },
      { nama: 'Kantor Polisi', no: all.Nomor_Darurat_Polisi || '110' },
      { nama: 'Pemadam Kebakaran', no: all.Nomor_Darurat_Pemadam || '113' },
      { nama: 'Ketua RT / Pengurus', no: all.Nomor_Darurat_RT || '' },
    ],
    posyandu: all.Jadwal_Posyandu || 'Belum dijadwalkan',
    pengumuman: readRows(SHEET_NAMES.INFO).reverse(),
  };
}

function getAllConfig() {
  const sh = getOrCreateSheet(SHEET_NAMES.CONFIG);
  const vals = sh.getDataRange().getValues();
  const out = {};
  for (let i = 1; i < vals.length; i++) if (vals[i][0]) out[String(vals[i][0]).trim()] = vals[i][1] || '';
  return out;
}

function kirimWa(noHp, pesan) {
  const token = cfg('Token_Fonnte');
  if (!token) return;
  const target = normalizePhone(noHp);
  try {
    UrlFetchApp.fetch('https://api.fonnte.com/send', {
      method: 'post',
      headers: { 'Authorization': token },
      payload: { target: target, message: pesan },
      muteHttpExceptions: true,
    });
  } catch (e) { console.error('WA fail: ' + e.message); }
}

// ═══════════════════════════════════════════════════════════
// ADMIN API
// ═══════════════════════════════════════════════════════════

function adminGetSuratMenunggu() { return listSuratPending(); }
function adminApproveSurat(id, catatan) { return setSuratStatus(id, 'DISETUJUI', catatan); }
function adminRejectSurat(id, catatan) { return setSuratStatus(id, 'DITOLAK', catatan); }
function adminGetIuranMenunggu() { return listIuranMenunggu(); }
function adminVerifyIuran(id, catatan) { return setIuranStatus(id, 'LUNAS', catatan); }
function adminTolakIuran(id, catatan) { return setIuranStatus(id, 'DITOLAK', catatan); }
function adminGetRekap() { return rekapKasSummary(); }

// ═══════════════════════════════════════════════════════════
// ENTRY POINT
// ═══════════════════════════════════════════════════════════

function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('WargaSpace')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1');
}

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Kelola RT')
    .addItem('Inisialisasi Config', 'initConfig')
    .addItem('Jalankan Tes', 'runTests')
    .addToUi();
}

// ═══════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════

function runTests() {
  let pass = 0, fail = 0;
  function assert(name, cond) { if (cond) pass++; else { fail++; console.error('FAIL: ' + name); } }

  assert('normalize 0812', normalizePhone('081234567890') === '6281234567890');
  assert('normalize +62', normalizePhone('+62 812-3456-7890') === '6281234567890');
  assert('uid unique', uid('X') !== uid('X'));
  assert('uid prefix', uid('Y').startsWith('Y_'));
  assert('rupiah 50000', fmtRupiah(50000) === 'Rp 50.000');
  assert('badge html', statusBadgeHtml('LUNAS').indexOf('Lunas') >= 0);
  assert('verifyToken empty', verifyToken('') === null);
  assert('safeParse', safeParse('{"a":1}').a === 1);

  const r = rekapKasSummary();
  assert('rekap object', typeof r.totalKas === 'number');

  SpreadsheetApp.getActiveSpreadsheet().toast('Tes: ' + pass + ' lulus, ' + fail + ' gagal.', 'Hasil', 5);
  if (fail > 0) throw new Error(fail + ' tes gagal.');
}
