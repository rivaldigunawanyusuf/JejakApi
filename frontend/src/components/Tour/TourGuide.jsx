import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Compass,
  ChevronRight,
  ChevronLeft,
  X,
  Layers,
  ShieldAlert,
  History,
  BellRing,
  Trees,
  Search,
  Crosshair,
  Database,
  Download,
  HelpCircle,
  CheckCircle2,
  Sparkles,
  MapPin,
  ExternalLink,
  FlaskConical,
  Camera,
  Radio,
} from 'lucide-react';

export const TOUR_STEPS = [
  {
    id: 'welcome',
    target: null, // Centered modal
    title: 'Selamat Datang di JEJAK API',
    subtitle: 'WebGIS Peringatan Dini Kebakaran Gambut H-30 Berbasis Jejak Aktivitas Manusia Menggunakan LightGBM dan Explainable AI (TreeSHAP) dengan Verifikasi Lapangan Melalui Drone Langsung',
    badge: 'Overview Sistem',
    icon: Sparkles,
    content: (
      <div className="space-y-2 text-xs text-[#9aa0a6] leading-relaxed">
        <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/40 text-[11px] text-amber-200 flex items-start gap-2">
          <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold tracking-wider shrink-0">DEMO POC</span>
          <span>
            Ini adalah <strong>demo Proof of Concept</strong>. Data hanya ditampilkan untuk <strong>6 wilayah terpilih</strong>, bukan seluruh Indonesia.
          </span>
        </div>
        <p>
          <strong className="text-[#e8eaed]">JEJAK API</strong> adalah platform pemantauan dan peringatan dini risiko kebakaran lahan gambut prediktif berbasis AI yang mencakup <strong className="text-[#e8eaed]">6 wilayah rawan karhutla nasional</strong> (Sumsel/OKI, Kalteng/Pulang Pisau, Kalbar/Ketapang, Papua Selatan/Merauke, PBD/Sorong, dan Sulawesi).
        </p>
        <p>
          Platform ini memprediksi risiko <strong className="text-[#38bdf8]">30 hari ke depan</strong> pada <strong className="text-[#e8eaed]">55.532 sel grid 1 km²</strong> dengan menggabungkan cuaca (FWI) dan faktor antropogenik manusia (kanal, jalan, bukaan lahan).
        </p>
        <div className="p-2.5 rounded-lg bg-[#252830] border border-[#383d48] text-[11px] text-[#cbd5e1] flex items-center gap-2 mt-2">
          <span className="w-2 h-2 rounded-full bg-[#10b981] shrink-0 animate-pulse"></span>
          <span>Panduan ini akan memandu Anda mengenal <strong>seluruh fitur utama</strong> dalam 2 menit.</span>
        </div>
      </div>
    ),
    action: ({ setActiveTool, setIsSidebarExpanded, onSelectCell, onSelectRegion, onFlyTo }) => {
      setActiveTool('f1');
      setIsSidebarExpanded(false);
      if (onSelectCell) onSelectCell(null);
      if (onSelectRegion) onSelectRegion(null);
      if (onFlyTo) onFlyTo(119.5, -3.2, 4.4);
    },
  },
  {
    id: 'poc-scope',
    target: '#tour-tool-poc',
    title: 'Cakupan Demo POC (6 Wilayah)',
    subtitle: 'Validasi Model Karhutla Nasional',
    badge: 'Cakupan Demo',
    icon: FlaskConical,
    placement: 'right',
    content: (
      <div className="space-y-2.5 text-xs text-[#9aa0a6] leading-relaxed">
        <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-200">
          <strong>Tahap Demo Awal (POC)</strong>: Menampilkan data risiko terpadu pada <strong>6 wilayah pantauan utama</strong>:
        </div>
        <div className="grid grid-cols-2 gap-1.5 text-[11px] text-[#cbd5e1] bg-[#14151a] p-2.5 rounded-lg border border-[#2b2f3a]">
          <span className="flex items-center gap-1.5">• Sumsel (OKI)</span>
          <span className="flex items-center gap-1.5">• Kalteng (P. Pisau)</span>
          <span className="flex items-center gap-1.5">• Kalbar (Ketapang)</span>
          <span className="flex items-center gap-1.5">• Papua Sel. (Merauke)</span>
          <span className="flex items-center gap-1.5">• PBD (Sorong)</span>
          <span className="flex items-center gap-1.5">• Sulsel (Maros)</span>
        </div>
        <p className="text-[10px] text-[#94a3b8] italic">
          💡 Area di luar 6 wilayah ini belum dimasukkan pada tahap demo saat ini.
        </p>
      </div>
    ),
    action: ({ setActiveTool, setIsSidebarExpanded }) => {
      setActiveTool('poc');
      setIsSidebarExpanded(true);
    },
  },
  {
    id: 'header-stats',
    target: '#tour-header-stats',
    title: 'Bilah Status & Operasi Realtime',
    subtitle: 'Agregasi Risiko, Mesin DuckDB & Ekspor Data',
    badge: 'Header Status',
    icon: Database,
    placement: 'bottom',
    content: (
      <div className="space-y-2 text-xs text-[#9aa0a6] leading-relaxed">
        <p>
          Bilah atas menampilkan ringkasan operasional seluruh wilayah pantauan:
        </p>
        <ul className="space-y-1.5 pl-3 list-disc text-[#cbd5e1]">
          <li><strong className="text-[#ef4444]">Bahaya:</strong> Sel risiko kritis (&gt;=0.70) butuh intervensi darat segera.</li>
          <li><strong className="text-[#f59e0b]">Siaga:</strong> Sel risiko sedang (0.40–0.70) pemantauan ketat.</li>
          <li><strong className="text-[#10b981]">Waspada:</strong> Sel risiko rendah (&lt;0.40).</li>
          <li><strong className="text-[#81c995]">DuckDB In-Process:</strong> Mesin kueri analitik ultra-cepat (&lt;20 ms).</li>
          <li><strong className="text-[#e8eaed]">Export CSV:</strong> Unduh daftar 50 sel prioritas siap unggah ke GPS regu patroli.</li>
        </ul>
      </div>
    ),
    action: ({ setIsSidebarExpanded }) => {
      setIsSidebarExpanded(false);
    },
  },
  {
    id: 'left-rail',
    target: '#tour-left-rail',
    title: 'Pusat Kendali Operasi',
    subtitle: 'Modul Pantauan & Analisis',
    badge: 'Menu Utama',
    icon: Layers,
    placement: 'right',
    content: (
      <div className="space-y-2 text-xs text-[#9aa0a6] leading-relaxed">
        <p>
          Bilah samping kiri adalah pusat kendali operasi untuk mengakses fitur-fitur utama JEJAK API:
        </p>
        <div className="grid grid-cols-1 gap-1.5 text-[11px] text-[#cbd5e1]">
          <div className="p-1.5 rounded bg-[#202226] border border-[#2d3139] flex items-center gap-2">
            <span className="font-mono text-[#8ab4f8] font-bold">F1</span>
            <span>Peta Risiko 30 Hari (Resolusi 1 km²)</span>
          </div>
          <div className="p-1.5 rounded bg-[#202226] border border-[#2d3139] flex items-center gap-2">
            <span className="font-mono text-[#8ab4f8] font-bold">F2</span>
            <span>Prioritas Patroli Darat</span>
          </div>
          <div className="p-1.5 rounded bg-[#202226] border border-[#2d3139] flex items-center gap-2">
            <span className="font-mono text-[#8ab4f8] font-bold">F3</span>
            <span>Riwayat Kebakaran Besar (2019 & 2023)</span>
          </div>
          <div className="p-1.5 rounded bg-[#202226] border border-[#2d3139] flex items-center gap-2">
            <span className="font-mono text-[#8ab4f8] font-bold">F4</span>
            <span>Peringatan Dini Otomatis (Telegram)</span>
          </div>
          <div className="p-1.5 rounded bg-[#202226] border border-[#2d3139] flex items-center gap-2">
            <span className="font-mono text-[#8ab4f8] font-bold">F5</span>
            <span>Pantau Pembukaan Lahan Baru</span>
          </div>
        </div>
      </div>
    ),
    action: ({ setActiveTool, setIsSidebarExpanded }) => {
      setActiveTool('f1');
      setIsSidebarExpanded(false);
    },
  },
  {
    id: 'tool-f1',
    target: '#tour-tool-f1',
    title: 'Peta Prediksi Risiko Kebakaran',
    subtitle: 'Prediksi Peluang Kebakaran 30 Hari ke Depan',
    badge: 'Peta Risiko',
    icon: Layers,
    placement: 'right',
    content: (
      <div className="space-y-2 text-xs text-[#9aa0a6] leading-relaxed">
        <p>
          Sistem memperkirakan risiko kebakaran gambut 30 hari ke depan dengan menggabungkan:
        </p>
        <ul className="space-y-1 pl-3 list-disc text-[#cbd5e1]">
          <li><strong>Kondisi Kering Gambut:</strong> Tingkat kekeringan gambut lapisan atas dan gambut dalam serta kekurangan curah hujan.</li>
          <li><strong>Parit Saluran Air:</strong> Saluran parit buatan yang menguras air dan mengeringkan lahan gambut.</li>
          <li><strong>Kemudahan Akses:</strong> Jarak ke jalan dan sungai tempat orang berlalu-lalang.</li>
          <li><strong>Pantauan Satelit Radar:</strong> Bukaan lahan atau vegetasi yang baru dibersihkan.</li>
        </ul>
        <p className="text-[11px] text-[#38bdf8]">
          💡 Peta dimuat sangat cepat tanpa jeda loading.
        </p>
      </div>
    ),
    action: ({ setActiveTool, setIsSidebarExpanded }) => {
      setActiveTool('f1');
      setIsSidebarExpanded(true);
    },
  },
  {
    id: 'tool-f2',
    target: '#tour-panel-content',
    title: 'Prioritas Patroli Darat',
    subtitle: 'Rekomendasi Rute untuk Tim Lapangan',
    badge: 'Patroli Darat',
    icon: ShieldAlert,
    placement: 'right',
    content: (
      <div className="space-y-2 text-xs text-[#9aa0a6] leading-relaxed">
        <p>
          Membantu tim patroli di lapangan dengan rekomendasi lokasi yang paling rawan terbakar:
        </p>
        <ul className="space-y-1.5 pl-3 list-disc text-[#cbd5e1]">
          <li><strong>Filter Wilayah Gambut:</strong> Pilih kawasan gambut tertentu (contoh: Sugihan-Lumpur atau Burnai-Sibumbung).</li>
          <li><strong>Saring Status Bahaya:</strong> Pilih lokasi berstatus Bahaya (merah) atau Siaga (kuning).</li>
          <li><strong>Lihat Posisi di Peta:</strong> Klik ikon target di samping lokasi untuk langsung melihat posisinya di peta.</li>
          <li><strong>Unduh Rute (CSV):</strong> Simpan daftar koordinat untuk dibuka di GPS ponsel atau perangkat tim lapangan.</li>
        </ul>
      </div>
    ),
    action: ({ setActiveTool, setIsSidebarExpanded }) => {
      setActiveTool('f2');
      setIsSidebarExpanded(true);
    },
  },
  {
    id: 'tool-f3',
    target: '#tour-panel-content',
    title: 'Riwayat Kebakaran Besar (2019 & 2023)',
    subtitle: 'Melihat Kembali Kebakaran Masa Lalu',
    badge: 'Riwayat Api',
    icon: History,
    placement: 'right',
    content: (
      <div className="space-y-2 text-xs text-[#9aa0a6] leading-relaxed">
        <p>
          Membuktikan keakuratan sistem pada kejadian kebakaran nyata saat kemarau ekstrem (El Niño):
        </p>
        <ul className="space-y-1.5 pl-3 list-disc text-[#cbd5e1]">
          <li><strong>Kemarau Ekstrem 2019:</strong> Menampilkan sebaran titik api satelit NASA saat krisis kabut asap parah tahun 2019.</li>
          <li><strong>Kemarau Panjang 2023:</strong> Menguji ketepatan prediksi pada musim kemarau tahun 2023.</li>
        </ul>
        <p className="text-[11px] text-[#38bdf8]">
          Area merah pada sistem terbukti sangat tepat melingkupi titik api kebakaran yang pernah terjadi di masa lalu!
        </p>
      </div>
    ),
    action: ({ setActiveTool, setIsSidebarExpanded, setReplayYear }) => {
      setActiveTool('f3');
      setIsSidebarExpanded(true);
      if (setReplayYear) setReplayYear(2019);
    },
  },
  {
    id: 'tool-f4',
    target: '#tour-panel-content',
    title: 'Peringatan Dini Otomatis (Telegram)',
    subtitle: 'Kirim Pesan Otomatis ke Petugas Lapangan & Warga',
    badge: 'Peringatan Dini',
    icon: BellRing,
    placement: 'right',
    content: (
      <div className="space-y-2 text-xs text-[#9aa0a6] leading-relaxed">
        <p>
          Bukan cuma menunggu orang membuka web, sistem secara otomatis mengirimkan pesan ringkasan bahaya setiap pagi pukul 07.00 WIB via Bot Telegram:
        </p>
        <ul className="space-y-1 pl-3 list-disc text-[#cbd5e1]">
          <li><strong>Pilihan Wilayah:</strong> Pilih target kecamatan atau area rawan (misal: Cengal, Sungai Menang, Tulung Selapan).</li>
          <li><strong>Batas Bahaya:</strong> Atur batas risiko (misal: hanya kirim jika risiko di atas 60%).</li>
          <li><strong>Pratinjau Pesan:</strong> Melihat contoh format pesan yang akan diterima di HP tim lapangan (lengkap dengan koordinat dan saran tindakan).</li>
        </ul>
      </div>
    ),
    action: ({ setActiveTool, setIsSidebarExpanded }) => {
      setActiveTool('f4');
      setIsSidebarExpanded(true);
    },
  },
  {
    id: 'tool-f5',
    target: '#tour-panel-content',
    title: 'Pantau Pembukaan Lahan Baru',
    subtitle: 'Melihat Perubahan Lahan Setelah Terbakar',
    badge: 'Bukaan Lahan',
    icon: Trees,
    placement: 'right',
    content: (
      <div className="space-y-2 text-xs text-[#9aa0a6] leading-relaxed">
        <p>
          Banyak kebakaran lahan gambut berawal dari pembukaan lahan buatan manusia. Fitur ini memantau area pembukaan lahan:
        </p>
        <ul className="space-y-1.5 pl-3 list-disc text-[#cbd5e1]">
          <li><strong>Garis Penanda Area:</strong> Menandai area bekas kebakaran yang berubah menjadi kebun sawit atau tanaman industri.</li>
          <li><strong>Informasi Bukaan:</strong> Dilengkapi data luas hektare dan parit saluran air yang sengaja digali untuk mengeringkan rawa gambut.</li>
        </ul>
      </div>
    ),
    action: ({ setActiveTool, setIsSidebarExpanded, setShowConversionLayer }) => {
      setActiveTool('f5');
      setIsSidebarExpanded(true);
      if (setShowConversionLayer) setShowConversionLayer(true);
    },
  },
  {
    id: 'tool-f6',
    target: '#tour-panel-content',
    title: 'Pantauan Kamera Drone & Menara Pengawas',
    subtitle: 'Kamera Langsung dari Udara dan Menara Pantau',
    badge: 'Kamera & Drone',
    icon: Camera,
    placement: 'right',
    content: (
      <div className="space-y-2 text-xs text-[#9aa0a6] leading-relaxed">
        <p>
          Tim di lapangan dapat langsung memantau titik-titik rawan melalui kamera drone dan menara pantau secara langsung:
        </p>
        <ul className="space-y-1.5 pl-3 list-disc text-[#cbd5e1]">
          <li><strong>Kamera Biasa & Sensor Suhu Panas (Termal):</strong> Dapat berganti tampilan antara video biasa dan sensor suhu untuk menemukan bara api yang tersembunyi di dalam tanah gambut.</li>
          <li><strong>Deteksi Otomatis AI:</strong> Kotak penanda otomatis mendeteksi jika ada kepulan asap, bukaan lahan baru, atau sumber panas.</li>
          <li><strong>Status Baterai & Perangkat:</strong> Mengetahui sisa baterai drone, status pengisian daya, dan koneksi kamera secara langsung.</li>
        </ul>
      </div>
    ),
    action: ({ setActiveTool, setIsSidebarExpanded, setShowConversionLayer }) => {
      setActiveTool('f6');
      setIsSidebarExpanded(true);
      if (setShowConversionLayer) setShowConversionLayer(false);
    },
  },
  {
    id: 'map-controls',
    target: '#tour-map-controls',
    title: 'Kontrol Navigasi Kanvas Peta',
    subtitle: 'Navigasi Taktis Multi-Skala',
    badge: 'Kanvas Peta',
    icon: Compass,
    placement: 'right',
    content: (
      <div className="space-y-2 text-xs text-[#9aa0a6] leading-relaxed">
        <p>
          Alat kendali tampilan kanvas peta di pojok kiri atas:
        </p>
        <ul className="space-y-1 pl-3 list-disc text-[#cbd5e1]">
          <li><strong>Zoom In / Out:</strong> Perbesar hingga kotak pantau individual 1 km² atau perkecil hingga skala pulau tanpa jeda pemuatan peta.</li>
          <li><strong>Reset Utara:</strong> Kembalikan orientasi kompas peta tegak lurus ke utara.</li>
          <li><strong>Pilihan Tampilan Peta & Lapisan Gambut:</strong> Dikelola terpusat dan rapi melalui menu di panel kiri dengan pratinjau gambar lengkap.</li>
        </ul>
      </div>
    ),
    action: ({ setIsSidebarExpanded, setShowConversionLayer, setReplayYear }) => {
      setIsSidebarExpanded(false);
      if (setShowConversionLayer) setShowConversionLayer(false);
      if (setReplayYear) setReplayYear(2026);
    },
  },
  {
    id: 'search-pill',
    target: '#tour-header-search',
    title: 'Bilah Pencarian Cepat di Atas',
    subtitle: 'Temukan Titik Pantau atau Wilayah Seketika',
    badge: 'Pencarian Cepat',
    icon: Search,
    placement: 'bottom',
    content: (
      <div className="space-y-2 text-xs text-[#9aa0a6] leading-relaxed">
        <p>
          Bilah pencarian di bagian atas memudahkan mencari dan menuju langsung ke lokasi mana pun:
        </p>
        <p className="text-[#cbd5e1]">
          Ketik nama desa, kecamatan, atau kode titik pantau (contoh: <code className="px-1.5 py-0.5 rounded bg-[#282c34] text-[#38bdf8] font-mono text-[11px]">OKI_GRID_64630</code>), lalu tekan <strong>Enter</strong> atau tombol <strong>Cari</strong>.
        </p>
        <p className="text-[11px] text-[#9aa0a6]">
          Peta akan langsung bergerak dan menandai lokasi yang dipilih dengan kotak biru menyala.
        </p>
      </div>
    ),
    action: ({ setIsSidebarExpanded }) => {
      setIsSidebarExpanded(false);
    },
  },
  {
    id: 'right-inspector',
    target: '#tour-right-inspector',
    title: 'Detail Kotak & Penjelasan Alasan AI',
    subtitle: 'Transparan: Mengetahui Mengapa Wilayah Berisiko',
    badge: 'Analisis AI & Data',
    icon: Crosshair,
    placement: 'left',
    content: (
      <div className="space-y-2 text-xs text-[#9aa0a6] leading-relaxed">
        <p>
          Inovasi kunci JEJAK API: <strong className="text-[#e8eaed]">bukan hanya skor risiko</strong>, tetapi penjelasan transparan mengapa titik tersebut berisiko!
        </p>
        <ul className="space-y-1.5 pl-3 list-disc text-[#cbd5e1]">
          <li><strong>Peluang Risiko:</strong> Perkiraan kemungkinan kebakaran 30 hari ke depan.</li>
          <li><strong>Pemicu Utama (Analisis AI):</strong> 3 faktor pemicu dominan (misal: gambut dalam yang terlalu kering, saluran parit buatan, atau udara kering).</li>
          <li><strong>Kondisi Fisik Tanah & Air:</strong> Banyaknya parit air gambut, jarak ke jalan terdekat, jarak ke sungai, dan kekurangan curah hujan.</li>
          <li><strong>Salin Koordinat:</strong> Tombol 1-klik untuk menyalin titik lokasi GPS ke clipboard.</li>
        </ul>
      </div>
    ),
    action: ({ onSelectCell, onFlyTo }) => {
      // Select sample critical cell in Cengal/Lumpur-Jeruju so user sees real SHAP data live!
      if (onSelectCell) onSelectCell('OKI_GRID_36794');
      if (onFlyTo) onFlyTo(105.8507, -3.4149, 12);
    },
  },
  {
    id: 'finish',
    target: null, // Centered modal
    title: 'Anda Siap Memantau & Mencegah Kebakaran!',
    subtitle: 'Tur Selesai • JEJAK API Siap Digunakan',
    badge: 'Tur Selesai',
    icon: CheckCircle2,
    content: (
      <div className="space-y-3 text-xs text-[#9aa0a6] leading-relaxed">
        <p>
          Selamat! Anda telah memahami seluruh fitur dan instrumen platform <strong className="text-[#e8eaed]">JEJAK API</strong>.
        </p>
        <p>
          Peta kini kembali memperlihatkan tinjauan <strong className="text-[#38bdf8]">6 Wilayah Pantauan Gambut Utama</strong> (Sumatera Selatan, Kalimantan Tengah, Kalimantan Barat, Papua Selatan, Papua Barat Daya, dan Sulawesi) dengan total 55.532 titik pantau 1 km². Anda dapat mengklik tombol wilayah di bilah atas untuk menjelajahi masing-masing wilayah.
        </p>
        <div className="p-3 rounded-lg bg-[#1e293b]/70 border border-[#38bdf8]/30 text-xs text-[#cbd5e1] space-y-1">
          <div className="font-semibold text-[#38bdf8] flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5" />
            <span>Butuh panduan ini lagi?</span>
          </div>
          <p className="text-[11px] text-[#9aa0a6]">
            Klik tombol <strong className="text-[#38bdf8] font-medium">Panduan</strong> di bilah atas kapan saja untuk membuka kembali tur interaktif ini.
          </p>
        </div>
      </div>
    ),
    action: ({ onSelectCell, onSelectRegion, onFlyTo }) => {
      // Zoom out back to Indonesia overview so users immediately see all national areas
      if (onSelectCell) onSelectCell(null);
      if (onSelectRegion) onSelectRegion(null);
      if (onFlyTo) onFlyTo(119.5, -3.2, 4.4);
    },
  },
];

const TourGuide = ({
  isOpen,
  onClose,
  setActiveTool,
  setIsSidebarExpanded,
  onSelectCell,
  onSelectRegion,
  onFlyTo,
  setReplayYear,
  setShowConversionLayer,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const popoverRef = useRef(null);

  const currentStep = TOUR_STEPS[currentStepIndex];

  // Execute step action on step transition
  useEffect(() => {
    if (!isOpen) return;
    if (currentStep?.action) {
      currentStep.action({
        setActiveTool,
        setIsSidebarExpanded,
        onSelectCell,
        onSelectRegion,
        onFlyTo,
        setReplayYear,
        setShowConversionLayer,
      });
    }
  }, [currentStepIndex, isOpen]);

  // Update target bounding rect
  const updateRect = useCallback(() => {
    if (!isOpen || !currentStep?.target) {
      setTargetRect(null);
      return;
    }
    // On mobile screens (< 768px), center tour card cleanly to prevent offscreen displacement
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setTargetRect(null);
      return;
    }
    const element = document.querySelector(currentStep.target);
    if (element) {
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        setTargetRect(null);
        return;
      }
      setTargetRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        bottom: rect.bottom,
        right: rect.right,
      });
    } else {
      setTargetRect(null);
    }
  }, [isOpen, currentStep]);

  // Update rect on change, resize, and small delay for animations
  useEffect(() => {
    updateRect();
    const timer = setTimeout(updateRect, 150);
    const handleResize = () => updateRect();
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
    };
  }, [updateRect, currentStepIndex]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleSkip();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStepIndex]);

  const handleNext = () => {
    if (currentStepIndex < TOUR_STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      handleFinish();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    try {
      localStorage.setItem('jejak_tour_seen', 'true');
    } catch (_) {}
    if (onSelectCell) onSelectCell(null);
    if (onSelectRegion) onSelectRegion(null);
    if (onFlyTo) onFlyTo(119.5, -3.2, 4.4);
    setCurrentStepIndex(0);
    onClose();
  };

  const handleFinish = () => {
    try {
      localStorage.setItem('jejak_tour_seen', 'true');
    } catch (_) {}
    if (onSelectCell) onSelectCell(null);
    if (onSelectRegion) onSelectRegion(null);
    if (onFlyTo) onFlyTo(119.5, -3.2, 4.4);
    setCurrentStepIndex(0);
    onClose();
  };

  if (!isOpen) return null;

  // Calculate Popover Position relative to target
  let popoverStyle = {};
  const isCentered = !targetRect || !currentStep?.target;

  if (isCentered) {
    popoverStyle = {
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      position: 'fixed',
    };
  } else {
    const margin = 16;
    const placement = currentStep.placement || 'right';
    const cardEstHeight = 320;
    const maxTop = Math.max(64, window.innerHeight - cardEstHeight - margin);

    if (placement === 'bottom') {
      popoverStyle = {
        top: `${Math.min(maxTop, targetRect.bottom + margin)}px`,
        left: `${Math.max(16, Math.min(window.innerWidth - 420, targetRect.left))}px`,
        position: 'fixed',
      };
    } else if (placement === 'top') {
      popoverStyle = {
        bottom: `${Math.max(16, window.innerHeight - targetRect.top + margin)}px`,
        left: `${Math.max(16, Math.min(window.innerWidth - 420, targetRect.left))}px`,
        position: 'fixed',
      };
    } else if (placement === 'left') {
      popoverStyle = {
        top: `${Math.max(64, Math.min(maxTop, targetRect.top - 40))}px`,
        right: `${Math.max(16, window.innerWidth - targetRect.left + margin)}px`,
        position: 'fixed',
      };
    } else {
      // default 'right'
      const desiredTop = targetRect.top > window.innerHeight * 0.55
        ? targetRect.bottom - cardEstHeight
        : targetRect.top - 40;
      popoverStyle = {
        top: `${Math.max(64, Math.min(maxTop, desiredTop))}px`,
        left: `${Math.min(window.innerWidth - 420, targetRect.right + margin)}px`,
        position: 'fixed',
      };
    }
  }

  const StepIcon = currentStep.icon || HelpCircle;
  const progressPercent = Math.round(((currentStepIndex + 1) / TOUR_STEPS.length) * 100);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden pointer-events-auto select-none">
      {/* 1. Backdrop Overlay with Spotlight Cutout */}
      {targetRect && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none transition-all duration-300">
          <defs>
            <mask id="tour-spotlight-mask">
              {/* Fill entire screen with white */}
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              {/* Cutout black hole for spotlight with rounded corners */}
              <rect
                x={targetRect.left - 6}
                y={targetRect.top - 6}
                width={targetRect.width + 12}
                height={targetRect.height + 12}
                rx="8"
                ry="8"
                fill="black"
              />
            </mask>
          </defs>
          {/* Dark scrim with mask applied */}
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="rgba(10, 12, 16, 0.76)"
            mask="url(#tour-spotlight-mask)"
          />
          {/* Animated glow border around target element */}
          <rect
            x={targetRect.left - 6}
            y={targetRect.top - 6}
            width={targetRect.width + 12}
            height={targetRect.height + 12}
            rx="8"
            ry="8"
            fill="none"
            stroke="#38bdf8"
            strokeWidth="2"
            strokeDasharray="4 2"
            className="animate-pulse"
          />
        </svg>
      )}

      {/* Dimmed backdrop if centered modal */}
      {isCentered && (
        <div
          onClick={handleSkip}
          className="absolute inset-0 bg-[#0a0c10]/80 backdrop-blur-sm transition-opacity duration-300"
        />
      )}

      {/* 2. Popover Tour Card */}
      <div
        ref={popoverRef}
        style={popoverStyle}
        className="w-[400px] max-w-[calc(100vw-24px)] max-h-[calc(100vh-60px)] bg-[#1c1d22] border border-[#383d48] rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Progress Bar Line */}
        <div className="w-full h-1 bg-[#282c35] shrink-0">
          <div
            className="h-full bg-gradient-to-r from-[#38bdf8] to-[#10b981] transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Card Header */}
        <div className="p-3.5 px-4 pb-2 flex items-start justify-between gap-3 border-b border-[#2d313b] bg-[#18191e] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#252830] border border-[#383d46] text-[#38bdf8] flex items-center justify-center shrink-0 shadow-sm">
              <StepIcon className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider uppercase bg-[#282d38] text-[#38bdf8] border border-[#38bdf8]/30">
                  {currentStep.badge || `Langkah ${currentStepIndex + 1}`}
                </span>
                <span className="text-[11px] font-mono text-[#9aa0a6]">
                  {currentStepIndex + 1} / {TOUR_STEPS.length}
                </span>
              </div>
              <h3 className="font-semibold text-sm text-[#f1f3f4] mt-0.5 leading-tight">
                {currentStep.title}
              </h3>
            </div>
          </div>
          <button
            onClick={handleSkip}
            className="text-[#9aa0a6] hover:text-[#e8eaed] hover:bg-[#282c34] p-1 rounded-md transition-colors"
            title="Skip (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Card Subtitle */}
        {currentStep.subtitle && (
          <div className="px-4 py-1.5 bg-[#202228] border-b border-[#282c35] text-[11px] font-medium text-[#94a3b8] shrink-0">
            {currentStep.subtitle}
          </div>
        )}

        {/* Card Content with scroll */}
        <div className="p-4 overflow-y-auto flex-1 overscroll-contain select-text">
          {currentStep.content}
        </div>

        {/* Card Footer Actions */}
        <div className="p-3 px-4 bg-[#18191e] border-t border-[#2d313b] flex items-center justify-between text-xs shrink-0">
          <button
            onClick={handleSkip}
            className="px-3 py-1.5 rounded-lg bg-[#24272f] hover:bg-[#2e333d] border border-[#3b4252] hover:border-[#38bdf8]/50 text-[#cbd5e1] hover:text-[#38bdf8] font-medium text-xs transition-all shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95"
            title="Skip panduan (Esc)"
          >
            <span>Skip</span>
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-[#94a3b8] bg-[#1a1c23] border border-[#333a48] rounded">Esc</kbd>
          </button>

          <div className="flex items-center gap-2">
            {currentStepIndex > 0 && (
              <button
                onClick={handlePrev}
                className="px-3 py-1.5 rounded-lg bg-[#24272f] hover:bg-[#2d313a] border border-[#383d46] text-[#cbd5e1] font-medium flex items-center gap-1 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Sebelumnya</span>
              </button>
            )}

            <button
              onClick={handleNext}
              className="px-3.5 py-1.5 rounded-lg bg-[#38bdf8] hover:bg-[#0284c7] text-[#0f172a] font-semibold flex items-center gap-1.5 shadow-md transition-colors"
            >
              <span>{currentStepIndex === TOUR_STEPS.length - 1 ? 'Mulai Eksplorasi' : 'Lanjut'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TourGuide;
