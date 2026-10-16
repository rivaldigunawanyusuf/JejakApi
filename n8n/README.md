# n8n Workflow Automation: JEJAK API Risk Alerting

File ini berisi alur kerja (workflow) n8n Pro / self-hosted untuk automasi peringatan dini kebakaran lahan gambut di Kabupaten Ogan Komering Ilir (OKI).

## Arsitektur Alur Kerja

```
[Cron Harian 07:00 WIB] ──┐
                          ├──► [HTTP POST: /api/alerts/webhook/simulate] ──► [If: Level != AMAN] ──► [Telegram Bot SendMessage]
[Webhook Trigger Manual] ──┘
```

## Fitur Kunci

1. **Jadwal Berkala (Schedule Trigger):** Berjalan otomatis setiap hari pukul 07:00 WIB (00:00 UTC) untuk mengevaluasi data prediksi terbaru.
2. **On-Demand Webhook Trigger:** Menerima payload POST dari antarmuka Web GIS atau komandan regu patroli untuk memindai wilayah spesifik (misalnya KHG tertentu atau ambang probabilitas kustom).
3. **Penyaringan Bertingkat (If Node):** Mencegah derau notifikasi dengan hanya mengirimkan peringatan jika status wilayah minimal `WASPADA`, `SIAGA`, atau `BAHAYA`.
4. **Format Pesan Telegram Siap Lapangan:** Mengirim ringkasan terstruktur dengan format Markdown yang memuat koordinat GPS presisi dan indikator kunci lokal.

## Panduan Impor ke n8n

1. Buka dashboard n8n Anda (n8n Cloud Pro atau self-hosted).
2. Klik **Workflows** > **Import from File**, lalu pilih `n8n/jejak_fire_alert_workflow.json`.
3. Tambahkan Kredensial Telegram Bot (`Telegram API`) dengan Bot Token Anda.
4. Set variabel lingkungan pada n8n atau workflow:
   - `JEJAK_API_URL`: URL server FastAPI (misalnya `https://api.jejakapi.id` atau `http://localhost:8000`).
   - `TELEGRAM_CHAT_ID`: ID grup / channel / chat kepala desa atau regu Masyarakat Peduli Api (MPA).
5. Klik **Activate** untuk menjalankan workflow secara otomatis.
