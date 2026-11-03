# Aplikasi Prototipe — WarungKu v3.0

Aplikasi web prototipe untuk Pembukuan Utang Warung Klontong. Siap untuk diunggah ke GitHub Pages / hosting statis. Data disimpan di browser (`localStorage`) sehingga tidak membutuhkan server.

Versi 3.0 menambahkan dark mode, pencarian & filter transaksi, paginasi, detail & edit transaksi, backup/pemulihan data JSON, halaman Pengaturan, badge navigasi, dan tombol aksi cepat (FAB) di mobile.

## Cara Menjalankan

1. Buka `index.html` di browser (Chrome/Edge).
2. Atau unggah folder ini ke GitHub Pages / hosting statis.
3. Untuk pengembangan lokal, jalankan server sederhana: `python -m http.server 8000`, lalu buka `http://localhost:8000/index.html`.

## Cara Push ke GitHub

```bash
cd website
git init
git add .
git commit -m "WarungKu prototype v3.0"
git remote add origin https://github.com/USERNAME/REPO-NAME.git
git branch -M main
git push -u origin main
```

Ganti `USERNAME` dan `REPO-NAME` dengan akun GitHub Anda.

## Halaman yang Tersedia

- `index.html` — Aplikasi utama (Dashboard, Pelanggan, Transaksi, Rekap, Pengaturan)
- `wireframe.html` — Rancangan antarmuka (bisa diganti dengan desain asli)
- `style.css` — Styling: bottom nav, dark mode, paginasi, print styles
- `script.js` — Logika aplikasi (CRUD, localStorage, render, export, backup)

## Fitur v3.0

- **Dark mode** — Tema gelap yang tersimpan di browser.
- **Pencarian & filter transaksi** — Cari berdasarkan pelanggan/keterangan, filter per pelanggan dan jenis transaksi.
- **Paginasi** — Daftar transaksi dibagi per halaman (5/10/25/50 baris).
- **Detail & edit transaksi** — Klik baris transaksi untuk melihat detail, edit, atau hapus.
- **Backup & pemulihan** — Unduh dan muat kembali data dalam format JSON.
- **Halaman Pengaturan** — Pusat kontrol tampilan, cadangan data, dan info aplikasi.
- **Badge navigasi** — Penanda jumlah pelanggan belum lunas dan transaksi hari ini.
- **FAB mobile** — Tombol aksi cepat "tambah" mengambang di layar kecil.

> Catatan: Ini adalah prototipe frontend. Untuk produksi, tambahkan backend (database, autentikasi, backup otomatis).
