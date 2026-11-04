# Portofolio IT Developer — Ahmad Jazil Faiz

Website portofolio pribadi yang dibuat dengan HTML, CSS, dan JavaScript murni (tanpa framework).

## Fitur
- Tampilan responsif (desktop & mobile)
- Dark mode dan light mode (pilihan tersimpan di browser)
- Bagian Tentang, Pengalaman, Proyek, Keahlian, Pendidikan & Sertifikasi, serta Kontak
- Link sertifikasi yang dapat diklik dan CV yang dapat diunduh

## Struktur
```
.
├── index.html          # kerangka halaman, isinya dirender dari data/content.json
├── data/content.json   # SEMUA konten website ada di sini
├── css/style.css
├── js/script.js        # merender konten + interaksi (tema, menu, animasi)
├── admin/
│   ├── login.html      # halaman 1: login dengan GitHub token
│   ├── index.html      # halaman 2: dashboard edit konten
│   ├── dashboard.js    # form & skema konten
│   ├── common.js       # sesi + GitHub API
│   └── admin.css
└── assets/
    ├── img/            # foto profil & favicon
    └── docs/           # CV (PDF)
```

## Mengubah konten (tanpa menyentuh kode)
1. Buka `https://<domain-kamu>/admin/login.html`.
2. Login dengan **GitHub fine-grained token**:
   - Buat di https://github.com/settings/personal-access-tokens/new
   - *Repository access*: hanya repo ini
   - *Permissions → Contents*: **Read and write**
3. Edit bagian mana pun (Profil, Statistik, Tentang, Pengalaman, Proyek, Keahlian, Pendidikan, Sertifikasi, Kontak).
   Foto profil dan CV bisa langsung diunggah dari dashboard (maks. 5 MB).
4. Klik **Pratinjau** untuk melihat hasil sebelum dipublikasikan.
5. Klik **Simpan & Publikasikan** (atau `Ctrl+S`). Admin membuat commit ke repo,
   lalu Vercel otomatis deploy ulang. Website terupdate dalam ±1 menit.

Setiap penyimpanan tercatat sebagai commit, jadi perubahan bisa dilihat atau dikembalikan lewat riwayat Git.
Token hanya disimpan di browser yang dipakai login, tidak pernah ditulis ke repo.

## Menjalankan secara lokal
Konten dimuat lewat `fetch`, jadi jalankan dengan server lokal (bukan dibuka langsung sebagai file):
```
python -m http.server 8000
```
Lalu buka http://localhost:8000.

## Link
- Portofolio IT Developer: https://my-portofolio-gkwp3vgnw-ahmds20s-projects.vercel.app/
- Portofolio Data Science: https://my-portfolio-drab-three-13.vercel.app/
- LinkedIn: https://www.linkedin.com/in/ahmad-jazil-faiz-956788245/
- GitHub: https://github.com/Ahmds20
