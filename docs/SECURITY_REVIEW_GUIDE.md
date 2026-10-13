# Security & Compliance Review Guide

## 1. Pengamanan Kredensial & Secrets

* **Zero Hardcoded Secrets:** Token bot Telegram, kunci API eksternal (Google Gemini API, Sectors.app), dan kredensial server dilarang keras ditulis langsung dalam kode sumber.
* **Konfigurasi Git:** Berkas `.env`, berkas kunci akun layanan (`*.json`), serta cache data lokal wajib terdaftar di `.gitignore`.
* **Akses Client-Side:** Frontend tidak boleh menyimpan master API keys. Semua integrasi pihak ketiga wajib melalui perantara backend FastAPI.

## 2. Hardening Server Produksi (Ubuntu 22.04 LTS)

* **Firewall (UFW):** Hanya membuka port 22 (SSH), 80 (HTTP), dan 443 (HTTPS). Port internal FastAPI (8000) ditutup dari jaringan publik.
* **Rate Limiting:** Mengaktifkan modul pembatasan laju permintaan Nginx (`limit_req_zone`) maksimal 30 permintaan per menit per alamat IP untuk mencegah scraping data analitik. Berkas statis PMTiles (Range Requests) dikecualikan atau diberi burst yang cukup agar peta tidak terblokir.
* **CORS Restricted:** Header Access-Control-Allow-Origin pada FastAPI hanya mengizinkan domain frontend resmi.
* **SSH:** Autentikasi key-only, `PermitRootLogin no`, dan `fail2ban` diaktifkan.
* **n8n:** Akses UI n8n dilindungi basic auth / SSO dan tidak diekspos tanpa autentikasi; webhook memakai secret token.

## 3. Kepatuhan Hukum & Etika Data Lingkungan

* **Perlindungan Data Pribadi (UU PDP):** Kontak nomor telepon atau ID obrolan pengurus desa/MPA disimpan secara terenkripsi dan bersifat opt-in. Pencabutan persetujuan (`/stop`) harus menghapus data.
* **Netralitas Indikasi Ilmiah:** Keluaran sistem tidak boleh menyematkan label bermuatan tuduhan pidana langsung kepada korporasi tertentu. Narasi sistem wajib berbunyi: *"Indikasi aktivitas pembukaan tutupan vegetasi berdasarkan citra satelit terbuka, memerlukan ground-check lapangan."*
* **Tanpa Input Publik:** Tidak ada form pelaporan warga sehingga tidak ada pengumpulan data pribadi dari publik umum.

## 4. Keamanan Aplikasi

* **Validasi Input:** Semua parameter divalidasi Pydantic; batas atas `k` ditegakkan.
* **SQL Injection:** DuckDB hanya dipanggil dengan parameter terikat; koneksi `read_only`.
* **LLM Safety (Gemini):** Prompt hanya berisi nilai SHAP dan metadata sel, bukan data pribadi. Keluaran Gemini disanitasi dan harus melewati template netralitas di atas. Terdapat fallback narasi berbasis template bila API gagal / kuota habis.
* **Dependency Hygiene:** `pip-audit` dan `npm audit` dijalankan sebelum rilis.
* **Container:** Image berjalan sebagai non-root user; tanpa secret di layer image.
* **Logging:** Jangan mencatat token, chat ID, atau payload sensitif.

## 5. Security Review Checklist (per PR)

- [ ] Tidak ada secret pada diff (`git diff | grep -iE "token|key|secret"`).
- [ ] `.env.example` hanya berisi placeholder.
- [ ] Endpoint baru memiliki validasi skema dan rate limit.
- [ ] Narasi baru mematuhi aturan Netralitas Indikasi Ilmiah.
- [ ] Data pribadi baru (jika ada) bersifat opt-in dan terenkripsi.
