# MALA'BIRI - Bimas Islam Kemenag Gowa

Aplikasi Manajemen Layanan Bimas Islam yang Responsif - Seksi Bimas Islam Kantor Kementerian Agama Kabupaten Gowa.

---

## 🚀 Panduan Deploy ke Vercel (vercel.app)

Aplikasi ini dibangun menggunakan **React 19 + TypeScript + Vite + Tailwind CSS**, sehingga sangat optimal dan cepat saat di-deploy ke **Vercel**.

### Langkah 1: Ekspor Kode dari Google AI Studio
1. Di pojok kanan atas Google AI Studio, klik menu **Settings** (ikon gear / titik tiga).
2. Pilih opsi **Export to GitHub** (atau **Download ZIP** jika ingin mengunggah secara manual ke repository GitHub Anda).

### Langkah 2: Deploy di Vercel
1. Buka [https://vercel.com](https://vercel.com) dan login menggunakan akun GitHub Anda.
2. Klik tombol **"Add New..."** lalu pilih **"Project"**.
3. Pilih repository GitHub proyek **MALA'BIRI** yang telah Anda ekspor.
4. Pada bagian konfigurasi proyek:
   - **Framework Preset**: Pilih **Vite** (biasanya terdeteksi otomatis).
   - **Root Directory**: `./` (default).
   - **Build Command**: `npm run build` (sudah diatur otomatis di `vercel.json`).
   - **Output Directory**: `dist` (sudah diatur otomatis di `vercel.json`).
5. Klik tombol **Deploy**.
6. Tunggu proses build selama 1–2 menit hingga aplikasi aktif dengan URL `https://[nama-proyek-anda].vercel.app`.

---

### Langkah 3: Tambahkan Domain Vercel ke Google Cloud & Firebase (PENTING!)
Agar fitur **Google Drive** dan **Login Petugas (Firebase Auth)** dapat berjalan di domain Vercel tanpa diblokir:

1. **Firebase Console**:
   - Buka [Firebase Console](https://console.firebase.google.com/).
   - Pilih proyek Anda (`gen-lang-client-0985600324`).
   - Masuk ke menu **Authentication** > tab **Settings** > **Authorized domains**.
   - Klik **Add domain**, lalu masukkan domain Vercel Anda (contoh: `malabbiri-gowa.vercel.app`).

2. **Google Cloud Console**:
   - Buka [Google Cloud Credentials](https://console.cloud.google.com/apis/credentials).
   - Pilih Client ID OAuth 2.0 Web Application.
   - Pada bagian **Authorized JavaScript origins**, tambahkan:
     `https://[nama-proyek-anda].vercel.app`
   - Klik **Save**.
