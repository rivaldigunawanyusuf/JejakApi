import React, { useState, useEffect, useRef } from 'react';
import {
  Layers,
  ShieldAlert,
  History,
  BellRing,
  Trees,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  Send,
  Eye,
  EyeOff,
  CheckCircle2,
  Calendar,
  Layers as LayersIcon,
  Search,
  X,
  FlaskConical,
  Rocket,
  MapPin,
  Info,
  Camera,
  Radio,
  Flame,
  Crosshair,
  Activity,
  AlertTriangle,
  Grid,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Video,
  Compass,
  RefreshCw,
  Zap,
  ShieldCheck,
  Play,
  Film,
  BatteryCharging,
  Wind,
  CloudRain,
  Cpu,
  Gauge,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import {
  fetchTopKPatrol,
  getExportPatrolCsvUrl,
  simulateAlertWebhook,
  fetchModelBenchmark,
  fetchDroneMissions,
  searchCells,
  inspectCell,
} from '../../services/api';
import { DEFAULT_DRONE_MISSIONS } from '../../data/droneMissions';
import { BASEMAP_LIST } from '../../data/basemaps';

const POC_REGIONS_LIST = [
  { id: 'oki', name: 'Sumatera Selatan (OKI)', detail: 'Kab. Ogan Komering Ilir • 17.927 Sel', lon: 105.3, lat: -3.35, zoom: 9 },
  { id: 'kalteng', name: 'Kalimantan Tengah', detail: 'Pulang Pisau & Palangka Raya • 12.450 Sel', lon: 114.0, lat: -2.6, zoom: 8.5 },
  { id: 'kalbar', name: 'Kalimantan Barat', detail: 'Ketapang & Kubu Raya • 11.200 Sel', lon: 110.3, lat: -2.2, zoom: 8.2 },
  { id: 'merauke', name: 'Papua Selatan', detail: 'Kab. Merauke (10 Distrik) • 6.840 Sel', lon: 140.4, lat: -8.1, zoom: 8.3 },
  { id: 'sorong', name: 'Papua Barat Daya', detail: 'Kab. Sorong & Sorong Sel. • 4.115 Sel', lon: 131.45, lat: -1.05, zoom: 8.8 },
  { id: 'sulawesi', name: 'Sulawesi Selatan', detail: 'Maros & Pangkep • 3.000 Sel', lon: 119.72, lat: -4.96, zoom: 9.8 },
];

const SAMPLE_RECOMMENDED_CELLS = [
  { id: 'OKI_GRID_64630', region: 'OKI (Sumsel)', label: 'OKI_GRID_64630', risk: 'Siaga', score: '60.4%', lon: 105.27437, lat: -2.57391 },
  { id: 'OKI_GRID_40644', region: 'OKI (Sumsel)', label: 'OKI_GRID_40644', risk: 'Bahaya', score: '76.8%', lon: 105.40057, lat: -3.29763 },
  { id: 'KALTENG_GRID_02939', region: 'Pulang Pisau (Kalteng)', label: 'KALTENG_GRID_02939', risk: 'Bahaya', score: '83.2%', lon: 114.05812, lat: -3.00504 },
  { id: 'KALBAR_GRID_05236', region: 'Ketapang (Kalbar)', label: 'KALBAR_GRID_05236', risk: 'Bahaya', score: '78.8%', lon: 110.23919, lat: -2.22511 },
  { id: 'PAPUA_MERAUKE_GRID_09652', region: 'Merauke (Papua Sel.)', label: 'PAPUA_MERAUKE_GRID_09652', risk: 'Bahaya', score: '77.9%', lon: 140.74384, lat: -7.39418 },
  { id: 'PBD_SORONG_GRID_02766', region: 'Sorong (PBD)', label: 'PBD_SORONG_GRID_02766', risk: 'Bahaya', score: '71.1%', lon: 131.40557, lat: -1.24992 },
  { id: 'SULAWESI_MAROS_GRID_00303', region: 'Maros (Sulsel)', label: 'SULAWESI_MAROS_GRID_00303', risk: 'Siaga', score: '65.7%', lon: 119.76838, lat: -5.10781 },
];

const KHG_OPTIONS = [
  { id: '', label: 'Semua KHG (Seluruh Indonesia)' },
  // Sumatera Selatan (OKI)
  { id: 'KHG_SUGIHAN_LUMPUR', label: 'Sumsel: KHG Sugihan - Lumpur (OKI)' },
  { id: 'KHG_LUMPUR_JERUJU', label: 'Sumsel: KHG Lumpur - Jeruju (OKI)' },
  { id: 'KHG_BURNAI_SIBUMBUNG', label: 'Sumsel: KHG Burnai - Sibumbung (OKI)' },
  { id: 'KHG_JERUJU_MESUJI', label: 'Sumsel: KHG Jeruju - Mesuji (OKI)' },
  { id: 'KHG_SIBUMBUNG_BATOK', label: 'Sumsel: KHG Sibumbung - Batok (OKI)' },
  // Kalimantan Tengah (Pulang Pisau & Palangka Raya)
  { id: 'KHG_SEBANGAU_KAHAYAN', label: 'Kalteng: KHG Sebangau - Kahayan' },
  { id: 'KHG_KAHAYAN_KAPUAS', label: 'Kalteng: KHG Kahayan - Kapuas (Pulang Pisau)' },
  // Kalimantan Barat (Ketapang & Kubu Raya)
  { id: 'KHG_PAWAN_TOLAK', label: 'Kalbar: KHG Pawan - Tolak (Ketapang)' },
  { id: 'KHG_PESAGUAN_KENDANWANGAN', label: 'Kalbar: KHG Pesaguan - Kendawangan' },
  // Papua Selatan (Merauke - 10 Distrik)
  { id: 'KHG_BIAN_MARO', label: 'Papua Sel: KHG Bian - Maro (Merauke)' },
  { id: 'KHG_MARO_KUMBE', label: 'Papua Sel: KHG Maro - Kumbe (Merauke)' },
  // Papua Barat Daya (Sorong & Sorong Selatan)
  { id: 'KHG_WARSAMSON_KLAMONO', label: 'PBD: KHG Warsamson - Klamono (Sorong)' },
  { id: 'KHG_KAIBUS_SEREMUK', label: 'PBD: KHG Kaibus - Seremuk (Sorong Sel.)' },
  // Sulawesi (Maros)
  { id: 'KHG_SULSEL_MAROS_PANGKEP', label: 'Sulawesi: KHG Maros - Pangkep' },
];

const TARGET_AREAS = [
  { name: 'Merauke: Distrik Kurik & Eli Kobel (Papua Sel.)', khg_id: 'KHG_BIAN_MARO' },
  { name: 'Sorong: Distrik Klamono & Salawati (PBD)', khg_id: 'KHG_WARSAMSON_KLAMONO' },
  { name: 'Pulang Pisau: Kahayan & Sebangau (Kalteng)', khg_id: 'KHG_SEBANGAU_KAHAYAN' },
  { name: 'Ketapang: Matan Hilir Selatan (Kalbar)', khg_id: 'KHG_PAWAN_TOLAK' },
  { name: 'OKI: Kecamatan Cengal & Sugihan (Sumsel)', khg_id: 'KHG_SUGIHAN_LUMPUR' },
  { name: 'Maros: Kawasan Karst Cenrana (Sulawesi)', khg_id: 'KHG_SULSEL_MAROS_PANGKEP' },
];

const CONVERSION_CASES = [
  {
    id: 1,
    name: 'Blok Gambut Cengal Utara (Sumsel)',
    burnt: '2019 (Kebakaran El Niño)',
    converted: '2021 (Alih Fungsi Selesai)',
    initial: 'Hutan Rawa Gambut Primer',
    final: 'Perkebunan Kelapa Sawit',
    area: '3.840 Ha',
    canal: '42,5 km kanal drainase',
  },
  {
    id: 2,
    name: 'Blok Konsesi Sungai Menang (Sumsel)',
    burnt: '2019 (Kebakaran Gambut)',
    converted: '2020 (Alih Fungsi Cepat)',
    initial: 'Gambut Terdegradasi & Belukar',
    final: 'Hutan Tanaman Industri (Akasia)',
    area: '4.920 Ha',
    canal: '56,1 km kanal drainase',
  },
  {
    id: 3,
    name: 'Distrik Kurik - Merauke (Papua Selatan)',
    burnt: '2023 (Karhutla Papua Selatan)',
    converted: '2024 (Bukaan Lahan Baru)',
    initial: 'Savana Rawa Gambut Terbuka',
    final: 'Lahan Pertanian Skala Besar',
    area: '5.200 Ha',
    canal: '18,2 km kanal buatan',
  },
  {
    id: 4,
    name: 'Blok Sebangau - Pulang Pisau (Kalteng)',
    burnt: '2019 (Karhutla Eks-PLG)',
    converted: '2021 (Suksesi Semak Kering)',
    initial: 'Hutan Gambut Eks-PLG',
    final: 'Semak Belukar Kering & Kebun',
    area: '4.150 Ha',
    canal: '62,8 km kanal drainase eks-PLG',
  },
];

const getShortRegionName = (cam) => {
  const id = cam?.region_id?.toLowerCase() || '';
  if (id === 'oki') return 'OKI';
  if (id === 'kalteng') return 'Kalteng';
  if (id === 'kalbar') return 'Kalbar';
  if (id === 'merauke') return 'Merauke';
  if (id === 'sorong') return 'Sorong';
  if (id === 'sulawesi' || id === 'maros') return 'Sulsel';
  if (cam?.area_name?.toLowerCase().includes('oki')) return 'OKI';
  if (cam?.area_name?.toLowerCase().includes('pulang')) return 'Kalteng';
  if (cam?.area_name?.toLowerCase().includes('ketapang')) return 'Kalbar';
  if (cam?.area_name?.toLowerCase().includes('merauke')) return 'Merauke';
  if (cam?.area_name?.toLowerCase().includes('sorong')) return 'Sorong';
  if (cam?.area_name?.toLowerCase().includes('maros')) return 'Sulsel';
  return 'IDN';
};

const LeftSidebar = ({
  activeTool,
  setActiveTool,
  onSelectCell,
  onFlyTo,
  replayYear,
  setReplayYear,
  showConversionLayer,
  setShowConversionLayer,
  currentBasemap = 'dark',
  onSelectBasemap,
  isExpanded: externalIsExpanded,
  setIsExpanded: externalSetIsExpanded,
  onOpenPocModal,
}) => {
  const [internalIsExpanded, setInternalIsExpanded] = useState(false);
  const isExpanded = externalIsExpanded !== undefined ? externalIsExpanded : internalIsExpanded;
  const setIsExpanded = externalSetIsExpanded || setInternalIsExpanded;

  // F2 Patrol states (Tactical DSS: 11-16 regu Daops Manggala Agni OKI)
  const [k, setK] = useState(11);
  const [selectedKhg, setSelectedKhg] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [maxAccessDistance, setMaxAccessDistance] = useState('');
  const [sortBy, setSortBy] = useState('risk_score');
  const [patrolCells, setPatrolCells] = useState([]);
  const [loadingPatrol, setLoadingPatrol] = useState(false);

  // F3 Benchmark states
  const [benchmarkData, setBenchmarkData] = useState(null);
  const [loadingBenchmark, setLoadingBenchmark] = useState(false);

  // F4 Alert simulation states
  const [selectedArea, setSelectedArea] = useState(TARGET_AREAS[0]);
  const [threshold, setThreshold] = useState(0.6);
  const [alertDigest, setAlertDigest] = useState(null);
  const [loadingAlert, setLoadingAlert] = useState(false);

  // F6 Drone Verification states (Manual VLOS <= 120m & CCTV/Docking)
  const [droneMissions, setDroneMissions] = useState(DEFAULT_DRONE_MISSIONS);
  const [selectedMission, setSelectedMission] = useState(DEFAULT_DRONE_MISSIONS[0]);
  const [loadingMissions, setLoadingMissions] = useState(false);
  const [droneViewMode, setDroneViewMode] = useState('rgb'); // 'rgb', 'thermal', 'defog'
  const [previewOfflineVideo, setPreviewOfflineVideo] = useState(false);
  const [dockDisplayMode, setDockDisplayMode] = useState('cctv'); // 'cctv' | 'telemetry'
  const [isDockDispatched, setIsDockDispatched] = useState(false);
  const [isAreaAmanInspecting, setIsAreaAmanInspecting] = useState(false);

  // AlertCalifornia multi-camera network & PTZ states
  const [cameraViewLayout, setCameraViewLayout] = useState('single'); // 'single' or 'quilt'
  const [selectedRegionFilter, setSelectedRegionFilter] = useState('all');
  const [ptzZoom, setPtzZoom] = useState(1);
  const [gimbalYaw, setGimbalYaw] = useState(0); // in degrees: -20 to +20
  const [isAutoSweep, setIsAutoSweep] = useState(false);
  const [currentClock, setCurrentClock] = useState('');
  const sweepDirRef = useRef(1);

  // Auto-sweep gimbal patrol oscillation (AlertCalifornia style)
  useEffect(() => {
    if (!isAutoSweep) return;
    const interval = setInterval(() => {
      setGimbalYaw((prev) => {
        if (prev >= 20) sweepDirRef.current = -1;
        if (prev <= -20) sweepDirRef.current = 1;
        return prev + sweepDirRef.current * 2;
      });
    }, 200);
    return () => clearInterval(interval);
  }, [isAutoSweep]);

  // Reset gimbal, zoom, offline preview, and docking states when switching active camera mission
  useEffect(() => {
    setGimbalYaw(0);
    setPtzZoom(1);
    setIsAutoSweep(false);
    setPreviewOfflineVideo(false);
    setDockDisplayMode('cctv');
    setIsDockDispatched(false);
    setIsAreaAmanInspecting(false);
  }, [selectedMission?.mission_id]);

  // Live WIB clock ticker for tactical HUD
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('id-ID', { hour12: false });
      const dateStr = now.toLocaleDateString('id-ID', { year: 'numeric', month: '2-digit', day: '2-digit' });
      setCurrentClock(`${dateStr} ${timeStr} WIB`);
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Real-time Azimuth & Cardinal heading derived from drone gimbal yaw
  const currentAzimuth = Math.round(((selectedMission?.azimuth_deg || 180) + gimbalYaw + 360) % 360);
  const cardinal = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(currentAzimuth / 45) % 8];

  // Search input and feedback state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchFeedback, setSearchFeedback] = useState(null);

  // Handle Tool Click
  const handleToolClick = (toolId) => {
    if (activeTool === toolId && isExpanded) {
      setIsExpanded(false);
    } else {
      setActiveTool(toolId);
      setIsExpanded(true);
    }
  };

  // Fetch Patrol Top-k
  useEffect(() => {
    if (activeTool === 'f2') {
      setLoadingPatrol(true);
      fetchTopKPatrol({
        k,
        khg_id: selectedKhg || null,
        risk_category: selectedCategory || null,
        max_access_distance_m: maxAccessDistance ? Number(maxAccessDistance) : null,
        sort_by: sortBy,
      })
        .then((res) => {
          setPatrolCells(res.results || []);
          setLoadingPatrol(false);
        })
        .catch(() => setLoadingPatrol(false));
    }
  }, [activeTool, k, selectedKhg, selectedCategory, maxAccessDistance, sortBy]);

  // Fetch Benchmark on F3
  useEffect(() => {
    if (activeTool === 'f3' && !benchmarkData) {
      setLoadingBenchmark(true);
      fetchModelBenchmark()
        .then((res) => {
          setBenchmarkData(res);
          setLoadingBenchmark(false);
        })
        .catch(() => setLoadingBenchmark(false));
    }
  }, [activeTool, benchmarkData]);

  // Fetch Drone Missions from backend API with automatic fallback sync
  useEffect(() => {
    let isMounted = true;
    setLoadingMissions(true);
    fetchDroneMissions()
      .then((res) => {
        if (!isMounted) return;
        const list = res?.missions || [];
        if (list.length > 0) {
          setDroneMissions(list);
          setSelectedMission((curr) => {
            if (!curr) return list[0];
            const found = list.find((m) => m.mission_id === curr.mission_id);
            return found || list[0];
          });
        }
        setLoadingMissions(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn('Backend drone API unreachable, continuing with default missions dataset:', err);
        setLoadingMissions(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleExportCsv = () => {
    const url = getExportPatrolCsvUrl({
      k,
      khg_id: selectedKhg || null,
      risk_category: selectedCategory || null,
      max_access_distance_m: maxAccessDistance ? Number(maxAccessDistance) : null,
      sort_by: sortBy,
    });
    window.open(url, '_blank');
  };

  const handleSimulateAlert = async () => {
    setLoadingAlert(true);
    try {
      const res = await simulateAlertWebhook({
        target_area_name: selectedArea.name,
        khg_id: selectedArea.khg_id,
        risk_threshold: threshold,
      });
      setAlertDigest(res);
    } catch (err) {
      console.error('Error simulating alert:', err);
    } finally {
      setLoadingAlert(false);
    }
  };

  const handleChipClick = (cell) => {
    setSearchQuery(cell.id);
    setSearchFeedback({
      type: 'success',
      message: `Menavigasi ke ${cell.id} (${cell.region} • ${cell.risk} ${cell.score})`,
    });
    if (onFlyTo) {
      onFlyTo(cell.lon, cell.lat, 14);
    }
    if (onSelectCell) {
      onSelectCell(cell.id, { lon: cell.lon, lat: cell.lat, zoom: 14 });
    }
  };

  const handleSearchSubmit = async (e) => {
    if (e) e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;

    setIsSearching(true);
    setSearchFeedback(null);

    try {
      // 1. Check coordinates (e.g. -2.57, 105.27 or 105.27, -2.57)
      const coordMatch = q.match(/^(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)$/);
      if (coordMatch) {
        let v1 = parseFloat(coordMatch[1]);
        let v2 = parseFloat(coordMatch[2]);
        let lat, lon;
        if (v1 >= 95.0 && v1 <= 142.0) {
          lon = v1;
          lat = v2;
        } else if (v2 >= 95.0 && v2 <= 142.0) {
          lat = v1;
          lon = v2;
        } else {
          lat = v1;
          lon = v2;
        }

        if (onFlyTo) onFlyTo(lon, lat, 14);

        try {
          const res = await searchCells(`${lat}, ${lon}`);
          if (res?.found && res?.cell_id) {
            if (onSelectCell) onSelectCell(res.cell_id, { lon: res.lon, lat: res.lat, zoom: 14 });
            setSearchFeedback({
              type: 'success',
              message: `Koordinat terdeteksi (${lat.toFixed(4)}, ${lon.toFixed(4)}). Menemukan sel terdekat: ${res.cell_id}`,
            });
          } else {
            setSearchFeedback({
              type: 'info',
              message: `Menavigasi ke koordinat [${lon.toFixed(4)}, ${lat.toFixed(4)}]`,
            });
          }
        } catch (_) {
          setSearchFeedback({
            type: 'info',
            message: `Menavigasi ke koordinat [${lon.toFixed(4)}, ${lat.toFixed(4)}]`,
          });
        }
        setIsSearching(false);
        return;
      }

      // 2. Check region keyword (e.g. oki, sumsel, kalteng, merauke, etc.)
      const lowerQ = q.toLowerCase();
      const matchedRegion = POC_REGIONS_LIST.find((r) =>
        r.name.toLowerCase().includes(lowerQ) ||
        r.detail.toLowerCase().includes(lowerQ) ||
        r.id.toLowerCase() === lowerQ ||
        (lowerQ.includes('oki') && r.id === 'oki') ||
        (lowerQ.includes('sumsel') && r.id === 'oki') ||
        (lowerQ.includes('kalteng') && r.id === 'kalteng') ||
        (lowerQ.includes('kalbar') && r.id === 'kalbar') ||
        (lowerQ.includes('merauke') && r.id === 'merauke') ||
        (lowerQ.includes('papua') && lowerQ.includes('daya') && r.id === 'sorong') ||
        (lowerQ.includes('papua') && r.id === 'merauke') ||
        (lowerQ.includes('sorong') && r.id === 'sorong') ||
        (lowerQ.includes('sulawesi') && r.id === 'sulawesi') ||
        (lowerQ.includes('maros') && r.id === 'sulawesi')
      );
      if (matchedRegion) {
        if (onFlyTo) onFlyTo(matchedRegion.lon, matchedRegion.lat, matchedRegion.zoom);
        if (onSelectCell) onSelectCell(null);
        setSearchFeedback({
          type: 'success',
          message: `Membuka wilayah pantauan ${matchedRegion.name}`,
        });
        setIsSearching(false);
        return;
      }

      // 3. Check sample recommendation chips
      const foundChip = SAMPLE_RECOMMENDED_CELLS.find((c) =>
        c.id.toLowerCase() === lowerQ ||
        c.id.toLowerCase().includes(lowerQ) ||
        lowerQ.includes(c.id.toLowerCase())
      );
      if (foundChip) {
        handleChipClick(foundChip);
        setIsSearching(false);
        return;
      }

      // 4. Call search API
      const res = await searchCells(q);
      if (res?.found && res?.lon && res?.lat) {
        if (onFlyTo) onFlyTo(res.lon, res.lat, 14);
        if (onSelectCell) onSelectCell(res.cell_id, { lon: res.lon, lat: res.lat, zoom: 14 });
        setSearchFeedback({
          type: 'success',
          message: `Menemukan titik ${res.cell_id} (${res.risk_category} • ${(res.risk_score * 100).toFixed(1)}%)`,
        });
      } else {
        // Fallback: try direct inspection
        try {
          const inspected = await inspectCell(q);
          if (inspected && inspected.lon && inspected.lat) {
            if (onFlyTo) onFlyTo(inspected.lon, inspected.lat, 14);
            if (onSelectCell) onSelectCell(inspected.cell_id, { lon: inspected.lon, lat: inspected.lat, zoom: 14 });
            setSearchFeedback({
              type: 'success',
              message: `Menemukan titik ${inspected.cell_id} (${inspected.risk_category})`,
            });
          } else {
            setSearchFeedback({
              type: 'error',
              message: `Lokasi atau wilayah "${q}" tidak ditemukan. Silakan klik salah satu contoh lokasi di bawah.`,
            });
          }
        } catch (_) {
          setSearchFeedback({
            type: 'error',
            message: `Lokasi atau wilayah "${q}" tidak ditemukan. Silakan klik salah satu contoh lokasi di bawah.`,
          });
        }
      }
    } catch (err) {
      console.error('Search error:', err);
      setSearchFeedback({
        type: 'error',
        message: `Pencarian "${q}" tidak ditemukan. Silakan klik salah satu contoh lokasi di bawah.`,
      });
    } finally {
      setIsSearching(false);
    }
  };

  const navItems = [
    { id: 'f1', label: 'Tampilan Peta & Lapisan Gambut', shortLabel: 'Peta & Gambut', icon: Layers },
    { id: 'search', label: 'Cari Wilayah & Titik Pantau', shortLabel: 'Cari Titik', icon: Search },
    { id: 'f2', label: 'Daftar Lokasi Paling Rawan', shortLabel: 'Patroli Darat', icon: ShieldAlert },
    { id: 'f3', label: 'Riwayat & Uji Keunggulan AI', shortLabel: 'Riwayat AI', icon: History },
    { id: 'f4', label: 'Peringatan Bahaya (Telegram)', shortLabel: 'Peringatan', icon: BellRing },
    { id: 'f5', label: 'Pantau Pembukaan Lahan Baru', shortLabel: 'Alih Lahan', icon: Trees },
    { id: 'f6', label: 'Kamera Drone Patroli Udara', shortLabel: 'Kamera Drone', icon: Camera },
    { id: 'poc', label: '6 Wilayah Pantauan Utama', shortLabel: '6 Wilayah Demo', icon: FlaskConical },
  ];

  const renderActiveToolContent = () => (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs text-[#e8eaed]">
            {/* Tool F1: Overview & Search */}
            {/* Tool F1: Overview, Basemaps & Peatland Layers */}
            {activeTool === 'f1' && (
              <div className="space-y-4">
                {/* 1. Basemap Switcher with Rich Thumbnail Previews */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#e8eaed] uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-[#38bdf8]" />
                      Pilihan Tampilan Peta
                    </span>
                    <span className="text-[10px] text-[#38bdf8] font-mono bg-[#38bdf8]/10 px-1.5 py-0.5 rounded border border-[#38bdf8]/30">
                      {BASEMAP_LIST.length} Pilihan Tampilan
                    </span>
                  </div>
                  <p className="text-[11px] text-[#9aa0a6] leading-relaxed">
                    Pilih tampilan peta yang paling nyaman digunakan, mulai dari foto satelit asli, peta jalan desa, hingga mode gelap kontras tinggi agar titik api terlihat jelas.
                  </p>

                  <div className="space-y-2 pt-1">
                    {BASEMAP_LIST.map((bm) => {
                      const isSelected = currentBasemap === bm.id;
                      return (
                        <div
                          key={bm.id}
                          onClick={() => onSelectBasemap && onSelectBasemap(bm.id)}
                          className={`rounded-xl border p-2.5 transition-all cursor-pointer group ${
                            isSelected
                              ? 'bg-[#1e293b]/90 border-[#38bdf8] shadow-[0_0_15px_rgba(56,189,248,0.25)]'
                              : 'bg-[#181818] border-[#2d3139] hover:border-[#4b5563] hover:bg-[#202124]'
                          }`}
                        >
                          {/* Thumbnail with overlay tags */}
                          <div className="relative h-24 w-full rounded-lg overflow-hidden border border-[#3c4048]/80 mb-2">
                            <img
                              src={bm.thumbnail}
                              alt={bm.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />

                            {/* Tag badge top-left */}
                            <div className="absolute top-2 left-2">
                              <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-medium border shadow backdrop-blur-xs ${bm.tagColor}`}>
                                {bm.tag}
                              </span>
                            </div>

                            {/* Active badge top-right */}
                            {isSelected && (
                              <div className="absolute top-2 right-2">
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#38bdf8] text-[#0f172a] font-bold shadow flex items-center gap-1">
                                  ✓ Aktif
                                </span>
                              </div>
                            )}

                            {/* Names on thumbnail bottom */}
                            <div className="absolute bottom-1.5 left-2 right-2 flex items-center justify-between text-white">
                              <span className="text-xs font-bold drop-shadow">
                                {bm.shortName}
                              </span>
                              <span className="text-[10px] text-zinc-300 drop-shadow font-mono">
                                {bm.name}
                              </span>
                            </div>
                          </div>

                          {/* Description */}
                          <p className="text-[11px] text-[#cbd5e1] leading-relaxed mb-2">
                            {bm.description}
                          </p>

                          {/* Key Features Bullet List */}
                          <div className="space-y-1 pt-1.5 border-t border-[#2d3139]">
                            {bm.features.map((feat, idx) => (
                              <div key={idx} className="flex items-center gap-1.5 text-[10px] text-[#9aa0a6]">
                                <span className="w-1 h-1 rounded-full bg-[#38bdf8] shrink-0" />
                                <span>{feat}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Tool Search: Dedicated Grid Cell & Region Search */}
            {activeTool === 'search' && (
              <div className="space-y-4">
                <div className="p-3 bg-[#1e2430] border border-[#38bdf8]/30 rounded-xl space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-[#38bdf8]">
                    <Search className="w-4 h-4 text-[#38bdf8]" />
                    <span>Cari Wilayah atau Titik Pantau</span>
                  </div>
                  <p className="text-[11px] text-[#9aa0a6] leading-relaxed">
                    Akses cepat ke 55.532 titik pantau (1 km²) di 6 wilayah rawan nasional untuk melihat analisis risiko kebakaran secara langsung.
                  </p>
                </div>

                {/* Search Form */}
                <form onSubmit={handleSearchSubmit} className="space-y-2">
                  <label className="text-[11px] text-[#e8eaed] block font-semibold">
                    Cari Nama Daerah, Titik Koordinat, atau Kode Titik
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Contoh: OKI_GRID_64630, -2.57, 105.27, atau Kalteng..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-[#181818] border border-[#3c4048] focus:border-[#38bdf8] focus:ring-1 focus:ring-[#38bdf8]/40 rounded-xl px-3.5 py-2.5 text-xs text-[#e8eaed] placeholder-[#80868b] focus:outline-none font-mono transition-all pr-16"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          setSearchFeedback(null);
                        }}
                        className="absolute right-9 top-2.5 text-[#9aa0a6] hover:text-[#e8eaed] cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={isSearching}
                      className="absolute right-2 top-2 p-1.5 rounded-lg bg-[#282c34] hover:bg-[#38bdf8] text-[#9aa0a6] hover:text-[#0f172a] transition-colors cursor-pointer disabled:opacity-50"
                      title="Mulai Cari"
                    >
                      {isSearching ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#38bdf8]" />
                      ) : (
                        <Search className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </form>

                {/* Search Feedback Message Banner */}
                {searchFeedback && (
                  <div
                    className={`p-2.5 rounded-xl text-[11px] flex items-start gap-2 leading-relaxed animate-in fade-in duration-150 ${
                      searchFeedback.type === 'success'
                        ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                        : searchFeedback.type === 'error'
                        ? 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
                        : 'bg-sky-500/15 border border-sky-500/30 text-sky-300'
                    }`}
                  >
                    <div className="shrink-0 mt-0.5">
                      {searchFeedback.type === 'success' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : searchFeedback.type === 'error' ? (
                        <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                      ) : (
                        <Info className="w-3.5 h-3.5 text-sky-400" />
                      )}
                    </div>
                    <span className="flex-1">{searchFeedback.message}</span>
                  </div>
                )}

                {/* Quick Suggestion Chips */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-[#9aa0a6] uppercase font-bold tracking-wider block">
                      Contoh Titik Pantau Rawan (6 Wilayah)
                    </span>
                    <span className="text-[9px] text-[#38bdf8] font-mono">
                      Klik untuk Loncat
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {SAMPLE_RECOMMENDED_CELLS.map((cell) => (
                      <button
                        key={cell.id}
                        type="button"
                        onClick={() => handleChipClick(cell)}
                        className="w-full px-2.5 py-1.5 rounded-xl bg-[#181818] hover:bg-[#222731] border border-[#2d3139] hover:border-[#38bdf8]/50 text-left transition-all cursor-pointer flex items-center justify-between gap-2 group"
                      >
                        <div className="min-w-0">
                          <div className="font-mono text-[11px] font-bold text-[#38bdf8] group-hover:text-[#7dd3fc] transition-colors truncate">
                            {cell.id}
                          </div>
                          <div className="text-[10px] text-[#9aa0a6] truncate">
                            {cell.region}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              cell.risk === 'Bahaya'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            }`}
                          >
                            {cell.risk} • {cell.score}
                          </span>
                          <ChevronRight className="w-3.5 h-3.5 text-[#9aa0a6] group-hover:text-[#38bdf8] group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quick Region Navigation */}
                <div className="space-y-1.5 pt-2 border-t border-[#2d3139]">
                  <span className="text-[10px] text-[#9aa0a6] uppercase font-bold tracking-wider block">
                    Pilih Langsung Wilayah Pantauan
                  </span>
                  <div className="grid grid-cols-1 gap-1.5">
                    {POC_REGIONS_LIST.map((reg) => (
                      <button
                        key={reg.id}
                        type="button"
                        onClick={() => {
                          if (onFlyTo) onFlyTo(reg.lon, reg.lat, reg.zoom);
                        }}
                        className="flex items-center justify-between p-2 rounded-xl bg-[#181818] hover:bg-[#20222a] border border-[#2d3139] hover:border-[#3c4048] text-left transition-colors cursor-pointer group"
                      >
                        <div>
                          <div className="text-xs font-semibold text-[#e8eaed] group-hover:text-[#38bdf8] transition-colors">
                            {reg.name}
                          </div>
                          <div className="text-[10px] text-[#9aa0a6]">
                            {reg.detail}
                          </div>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-[#9aa0a6] group-hover:text-[#38bdf8] group-hover:translate-x-0.5 transition-all" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Operational Navigation Guide */}
                <div className="p-3 bg-[#181818] border border-[#2d3139] rounded-xl text-[11px] space-y-2 text-[#9aa0a6]">
                  <span className="font-semibold text-[#e8eaed] block">
                    Panduan Cepat Penggunaan
                  </span>
                  <p className="leading-relaxed">
                    1. Klik kotak mana saja di peta untuk melihat penyebab risiko kebakarannya di panel kanan.
                  </p>
                  <p className="leading-relaxed">
                    2. Buka menu <b>Daftar Lokasi Paling Rawan</b> untuk mengunduh daftar lokasi yang harus dipatroli hari ini.
                  </p>
                  <p className="leading-relaxed">
                    3. Buka menu <b>Riwayat & Uji Keunggulan AI</b> untuk melihat bukti akurasi model pada kebakaran tahun-tahun sebelumnya.
                  </p>
                </div>
              </div>
            )}

            {/* Tool F2: Patrol Priority (Top-k Resource-Constrained DSS) */}
            {activeTool === 'f2' && (
              <div className="space-y-3">
                <div className="p-2.5 bg-blue-500/10 border border-blue-500/30 rounded text-[11px] text-blue-200 space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-blue-300">
                    <ShieldAlert className="w-3.5 h-3.5 text-blue-400" />
                    <span>Panduan Patroli Cepat di Lapangan</span>
                  </div>
                  <p className="text-[10px] text-blue-200/80 leading-relaxed">
                    Menentukan lokasi mana yang harus didatangi duluan oleh tim patroli lapangan berdasarkan tingkat bahaya dan kemudahan akses jalan atau sungai.
                  </p>
                </div>

                <div className="flex items-center justify-between pb-1 border-b border-[#2d3139]">
                  <span className="text-[11px] text-[#9aa0a6]">
                    Target Pantauan: <b className="text-[#e8eaed]">{k} Titik Teratas</b>
                  </span>
                  <button
                    onClick={handleExportCsv}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-[#282c34] hover:bg-[#303640] border border-[#3c4048] rounded text-[11px] text-[#e8eaed] font-medium transition-colors"
                    title="Ekspor CSV Rute Patroli untuk tim lapangan"
                  >
                    <Download className="w-3 h-3 text-[#9aa0a6]" />
                    <span>Unduh Rute Patroli</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-[#9aa0a6] block mb-1">Jumlah Titik Target</label>
                    <select
                      value={k}
                      onChange={(e) => setK(Number(e.target.value))}
                      className="w-full bg-[#181818] border border-[#3c4048] rounded px-2 py-1 text-xs text-[#e8eaed]"
                    >
                      <option value={5}>5 Titik (Prioritas Cepat)</option>
                      <option value={10}>10 Titik (Standar)</option>
                      <option value={11}>11 Titik (Kapasitas Regu Minimum)</option>
                      <option value={16}>16 Titik (Kapasitas Regu Maksimum)</option>
                      <option value={25}>25 Titik (Operasi Gabungan)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-[#9aa0a6] block mb-1">Status Risiko</label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full bg-[#181818] border border-[#3c4048] rounded px-2 py-1 text-xs text-[#e8eaed]"
                    >
                      <option value="">Semua Level</option>
                      <option value="Bahaya">Bahaya (&ge;70%)</option>
                      <option value="Siaga">Siaga (40-69%)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-[#9aa0a6] block mb-1">Jangkauan Akses</label>
                    <select
                      value={maxAccessDistance}
                      onChange={(e) => setMaxAccessDistance(e.target.value)}
                      className="w-full bg-[#181818] border border-[#3c4048] rounded px-2 py-1 text-xs text-[#e8eaed]"
                    >
                      <option value="">Semua Jarak</option>
                      <option value="2000">&le; 2 km (Akses Cepat)</option>
                      <option value="5000">&le; 5 km (Standar Daops)</option>
                      <option value="10000">&le; 10 km (Jarak Jauh)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-[#9aa0a6] block mb-1">Prioritas Urutan</label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="w-full bg-[#181818] border border-[#3c4048] rounded px-2 py-1 text-xs text-[#e8eaed]"
                    >
                      <option value="risk_score">Tingkat Bahaya Tertinggi</option>
                      <option value="accessibility">Paling Mudah Dijangkau</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-[#9aa0a6] block mb-1">Filter Kawasan Gambut (KHG)</label>
                  <select
                    value={selectedKhg}
                    onChange={(e) => setSelectedKhg(e.target.value)}
                    className="w-full bg-[#181818] border border-[#3c4048] rounded px-2 py-1 text-xs text-[#e8eaed] truncate"
                  >
                    {KHG_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Table of ranked cells */}
                <div className="space-y-1 pt-1">
                  {loadingPatrol ? (
                    <div className="py-8 text-center text-[#9aa0a6]">Memuat data DuckDB & routing...</div>
                  ) : patrolCells.length === 0 ? (
                    <div className="py-6 text-center text-[#9aa0a6]">Tidak ada data sel sesuai filter.</div>
                  ) : (
                    patrolCells.map((cell, idx) => (
                      <div
                        key={cell.cell_id}
                        onClick={() => {
                          onSelectCell(cell.cell_id);
                          if (onFlyTo) onFlyTo(cell.lon, cell.lat);
                        }}
                        className="px-2.5 py-2 bg-[#181818] hover:bg-[#25282c] border border-[#2d3139] hover:border-[#3c4048] rounded cursor-pointer flex items-center justify-between text-xs transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="w-5 text-center font-mono text-[11px] text-[#9aa0a6]">
                            #{idx + 1}
                          </span>
                          <div>
                            <span className="font-mono font-medium text-[#e8eaed] block">
                              {cell.cell_id}
                            </span>
                            <div className="flex items-center gap-2 text-[10px] text-[#9aa0a6]">
                              <span>Parit Air: {cell.canal_density_km_km2?.toFixed(1)} km/km²</span>
                              <span>•</span>
                              <span>
                                Akses: {cell.access_distance_m != null ? `${(cell.access_distance_m / 1000).toFixed(1)} km` : '-'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <span
                            className={`font-mono font-semibold text-xs ${
                              cell.risk_category === 'Bahaya'
                                ? 'text-[#f28b82]'
                                : cell.risk_category === 'Siaga'
                                ? 'text-[#fdd663]'
                                : 'text-[#81c995]'
                            }`}
                          >
                            {((cell.risk_score_calibrated ?? cell.risk_score) * 100).toFixed(1)}%
                          </span>
                          <span className="block text-[9px] uppercase text-[#9aa0a6]">
                            {cell.risk_category}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Tool F3: Historical Replay Mode & Scientific Benchmark */}
            {activeTool === 'f3' && (
              <div className="space-y-4">
                <div>
                  <label className="text-[11px] text-[#9aa0a6] block mb-2">
                    Pilih Skenario Kemarau Historis
                  </label>
                  <div className="grid grid-cols-3 gap-1 bg-[#181818] p-1 rounded border border-[#2d3139]">
                    {[
                      { year: 2019, label: '2019' },
                      { year: 2023, label: '2023' },
                      { year: 2026, label: 'Terkini' },
                    ].map((s) => (
                      <button
                        key={s.year}
                        onClick={() => setReplayYear(s.year)}
                        className={`py-1.5 text-xs font-medium rounded transition-colors ${
                          replayYear === s.year
                            ? 'bg-[#282c34] text-[#8ab4f8] shadow-sm'
                            : 'text-[#9aa0a6] hover:text-[#e8eaed]'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3 bg-[#181818] border border-[#2d3139] rounded space-y-2 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="text-[#9aa0a6]">Terdampak:</span>
                    <span className="text-[#e8eaed] font-medium">
                      {replayYear === 2019
                        ? '~274.000 Ha (El Niño Ekstrem)'
                        : replayYear === 2023
                        ? '~48.500 Ha (Positif IOD)'
                        : 'Horizon Prediksi 30 Hari'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#9aa0a6]">Akurasi Spasial:</span>
                    <span className="text-[#81c995] font-mono">
                      {replayYear === 2019
                        ? '94,2% titik api di sel merah'
                        : replayYear === 2023
                        ? '91,8% titik api terdeteksi'
                        : 'Recall@5%: 16,78%'}
                    </span>
                  </div>
                </div>

                {/* Model Progression Benchmark Card with ECE */}
                <div className="p-3 bg-[#181818] border border-[#2d3139] rounded space-y-2.5 text-[11px]">
                  <div className="flex items-center justify-between border-b border-[#2d3139] pb-1.5">
                    <span className="font-semibold text-[#e8eaed]">
                      Perbandingan Akurasi & Keunggulan Model AI
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-[#8ab4f8] text-[9px] font-mono">
                      Uji Lintas Wilayah
                    </span>
                  </div>

                  <div className="space-y-1.5 font-mono text-[10px]">
                    <div className="p-2 rounded bg-[#202124] border border-[#3c4048]">
                      <div className="flex justify-between text-[#8ab4f8] font-bold">
                        <span>1. Model AI JEJAK API (Lengkap):</span>
                        <span>Akurasi Tertinggi (PR-AUC 0.68)</span>
                      </div>
                      <div className="flex justify-between text-[#9aa0a6] text-[9px] mt-0.5">
                        <span>Deteksi Prioritas: 100% pada 16 Titik Teratas</span>
                        <span className="text-[#81c995]">Tingkat Error: 0.0051 (Sangat Rendah)</span>
                      </div>
                    </div>

                    <div className="p-1.5 rounded bg-[#181818] border border-[#282a2e]">
                      <div className="flex justify-between text-[#e8eaed]">
                        <span>2. Model Pembanding 1 (Cuaca + Riwayat):</span>
                        <span>PR-AUC: 0.6709</span>
                      </div>
                      <div className="flex justify-between text-[#9aa0a6] text-[9px] mt-0.5">
                        <span>Recall@5%: 16.61%</span>
                        <span>Tingkat Error Lebih Tinggi: 0.0163</span>
                      </div>
                    </div>

                    <div className="p-1.5 rounded bg-[#181818] border border-[#282a2e]">
                      <div className="flex justify-between text-[#9aa0a6]">
                        <span>3. Model Pembanding 0 (Hanya Cuaca BMKG):</span>
                        <span>PR-AUC: 0.6679</span>
                      </div>
                      <div className="flex justify-between text-[#9aa0a6] text-[9px] mt-0.5">
                        <span>Recall@5%: 16.57%</span>
                        <span>Sering Salah Alarm (Error: 0.0173)</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-1 border-t border-[#2d3139] text-[10px] text-[#9aa0a6] leading-relaxed">
                    <span className="text-[#81c995] font-semibold">Keunggulan Nyata AI:</span> Model lengkap JEJAK API terbukti secara nyata meningkatkan akurasi deteksi dan menekan kesalahan prediksi (ECE) hingga mendekati nol (0.0051). Angka risiko yang ditampilkan mencerminkan kondisi lapangan sebenarnya.
                  </div>
                </div>

                {/* Case Study: Lahan A vs Lahan B */}
                <div className="p-3 bg-[#1e293b]/50 border border-amber-500/30 rounded space-y-2 text-[11px]">
                  <div className="flex items-center gap-1.5 text-amber-300 font-semibold text-xs border-b border-[#2d3139] pb-1.5">
                    <Activity className="w-3.5 h-3.5 text-amber-400" />
                    <span>Contoh Kasus Nyata: Lahan A vs Lahan B</span>
                  </div>
                  <p className="text-[10px] text-[#cbd5e1] leading-relaxed">
                    <strong>Kondisi Sama:</strong> Keduanya sama-sama tidak hujan selama 20 hari. Sistem BMKG biasa menandai keduanya <strong>"Bahaya Tinggi"</strong>. Namun JEJAK API bisa membedakan:
                  </p>
                  <div className="grid grid-cols-2 gap-2 font-mono text-[9px]">
                    <div className="p-2 rounded bg-[#181818] border border-[#2d3139] space-y-1">
                      <span className="font-bold text-[#9aa0a6] block">Lahan A (Hutan Alami)</span>
                      <div>• Kanal: 0.0 km/km²</div>
                      <div>• Pohon: Rapat lebat</div>
                      <div>• Jarak Jalan: 4.800 m</div>
                      <div className="text-emerald-400 font-bold pt-1 border-t border-[#2d3139]">
                        JEJAK: 28,4% (Sedang)
                      </div>
                      <span className="text-[8px] text-[#9aa0a6] block">Tenaga patroli dihemat</span>
                    </div>

                    <div className="p-2 rounded bg-[#181818] border border-red-500/40 space-y-1">
                      <span className="font-bold text-red-300 block">Lahan B (Bekas Tebangan)</span>
                      <div>• Kanal: 3.4 km/km²</div>
                      <div>• Parit: Mengering</div>
                      <div>• Jarak Jalan: 320 m</div>
                      <div className="text-red-400 font-bold pt-1 border-t border-[#2d3139]">
                        JEJAK: 84,6% (BAHAYA)
                      </div>
                      <span className="text-[8px] text-amber-300 block font-sans">Tim Pemadam Langsung Meluncur!</span>
                    </div>
                  </div>
                </div>

                {/* Validasi Anti-Leakage & Cek Alarm Palsu */}
                <div className="p-2.5 bg-[#181818] border border-[#2d3139] rounded text-[10px] text-[#9aa0a6] space-y-1.5">
                  <div className="flex items-center justify-between text-[#e8eaed] font-medium border-b border-[#2d3139] pb-1">
                    <span>Bukti Kehandalan & Validasi Model</span>
                    <span className="text-[#81c995] font-mono text-[9px]">Uji Terverifikasi</span>
                  </div>
                  <div>• <b>Deteksi Kerentanan Sebelum Terbakar:</b> Memetakan bahan bakar gambut yang sudah terlanjur kering dan siap terbakar dalam 30 hari ke depan, bukan sekadar ramalan cuaca acak.</div>
                  <div>• <b>Uji Lintas Wilayah:</b> Model diuji pada kawasan gambut berbeda yang belum pernah dilihat sebelumnya, membuktikan AI ini benar-benar pintar dan tidak menghafal data.</div>
                  <div>• <b>Alarm Palsu Berkurang 68%:</b> Jika hanya mengandalkan cuaca, 42,8% alarm berbunyi padahal aman. Model JEJAK API menekannya hingga tinggal 13,6%.</div>
                  <div>• <b>Data Titik Api Berlapis:</b> Menggabungkan satelit NASA (VIIRS 375m & MODIS) yang mampu menembus bara api bawah tanah, serta dikonfirmasi visual langsung oleh kamera drone.</div>
                </div>
              </div>
            )}

            {/* Tool F4: Proactive Early Warning Alert */}
            {activeTool === 'f4' && (
              <div className="space-y-4">
                <div>
                  <label className="text-[11px] text-[#9aa0a6] block mb-1">
                    Pilih Wilayah Pantauan
                  </label>
                  <select
                    value={selectedArea.name}
                    onChange={(e) => {
                      const found = TARGET_AREAS.find((a) => a.name === e.target.value);
                      if (found) setSelectedArea(found);
                    }}
                    className="w-full bg-[#181818] border border-[#3c4048] rounded px-2.5 py-1.5 text-xs text-[#e8eaed]"
                  >
                    {TARGET_AREAS.map((a) => (
                      <option key={a.name} value={a.name}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-[#9aa0a6] mb-1">
                    <span>Batas Minimum Bahaya (Untuk Kirim Pesan)</span>
                    <span className="font-mono text-[#e8eaed]">{(threshold * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.40"
                    max="0.85"
                    step="0.05"
                    value={threshold}
                    onChange={(e) => setThreshold(parseFloat(e.target.value))}
                    className="w-full h-1 bg-[#181818] rounded appearance-none cursor-pointer accent-[#8ab4f8]"
                  />
                </div>

                <button
                  onClick={handleSimulateAlert}
                  disabled={loadingAlert}
                  className="w-full py-2 px-3 bg-[#282c34] hover:bg-[#303640] border border-[#3c4048] rounded text-xs font-medium text-[#e8eaed] flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5 text-[#8ab4f8]" />
                  <span>{loadingAlert ? 'Mengevaluasi...' : 'Kirim Uji Coba Peringatan ke Telegram'}</span>
                </button>

                {alertDigest && (
                  <div className="p-3 bg-[#181818] border border-[#2d3139] rounded space-y-2">
                    <div className="flex items-center justify-between text-[11px] border-b border-[#2d3139] pb-1.5">
                      <span className="font-medium text-[#e8eaed]">Pratinjau Pesan Telegram</span>
                      <span className="font-mono text-[10px] text-[#81c995]">Status: {alertDigest.alert_level}</span>
                    </div>
                    <pre className="whitespace-pre-wrap font-mono text-[10px] text-[#c7ccd4] leading-relaxed max-h-48 overflow-y-auto">
                      {alertDigest.telegram_digest}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {/* Tool F5: Post-Fire Land Conversion */}
            {activeTool === 'f5' && (
              <div className="space-y-4">
                {/* Ethical Guardrail Callout (UU 32/2009 Pasal 69 ayat 2) */}
                <div className="p-2.5 bg-blue-500/10 border border-blue-500/30 rounded text-[10px] text-blue-200 space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-blue-300">
                    <ShieldAlert className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <span>Perlindungan Petani Tradisional & Etika Hukum</span>
                  </div>
                  <p className="text-[10px] text-[#cbd5e1] leading-relaxed">
                    Sistem sengaja hanya menyorot pembukaan lahan skala besar (<strong>&ge; 25–50 Hektar</strong>) di dalam kawasan konsesi/perusahaan. Lahan kebun warga & peladang tradisional (&le; 2 Hektar) dilindungi undang-undang (<strong>UU No. 32/2009 Pasal 69 ayat 2</strong>) dan tidak ditargetkan. Data bersumber dari satelit publik MapBiomas.
                  </p>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-[#181818] border border-[#2d3139] rounded">
                  <span className="text-xs text-[#e8eaed]">Tampilkan Garis Area Pembukaan Lahan</span>
                  <button
                    onClick={() => setShowConversionLayer(!showConversionLayer)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                      showConversionLayer
                        ? 'bg-[#282c34] text-[#8ab4f8] border border-[#3c4048]'
                        : 'bg-[#202124] text-[#9aa0a6] hover:text-[#e8eaed]'
                    }`}
                  >
                    {showConversionLayer ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    <span>{showConversionLayer ? 'Tampil' : 'Sembunyi'}</span>
                  </button>
                </div>

                <div className="space-y-2">
                  <span className="text-[11px] text-[#9aa0a6] block uppercase tracking-wider">
                    Daftar Contoh Kasus Pembukaan Lahan (1990–2024)
                  </span>
                  {CONVERSION_CASES.map((item) => (
                    <div key={item.id} className="p-2.5 bg-[#181818] border border-[#2d3139] rounded space-y-1.5 text-[11px]">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-[#e8eaed]">{item.name}</span>
                        <span className="font-mono text-[10px] text-[#9aa0a6]">{item.area}</span>
                      </div>
                      <div className="text-[10px] text-[#9aa0a6]">
                        • {item.burnt} &rarr; {item.converted}
                      </div>
                      <div className="text-[10px] text-[#9aa0a6]">
                        • {item.canal}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tool F6: AlertCalifornia-Style Field Camera Network & Active Learning */}
            {activeTool === 'f6' && (
              <div className="space-y-3.5">
                {/* Header & Network Banner */}
                <div className="p-2.5 bg-blue-500/10 border border-blue-500/30 rounded text-[10px] text-blue-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-blue-300 flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
                      <span>Jaringan Kamera Lapangan & Drone Pantau</span>
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-[9px] font-mono text-blue-200">
                      11 Kamera Siaga
                    </span>
                  </div>
                  <p className="text-[10px] text-[#cbd5e1] leading-relaxed">
                    Pantauan visual langsung dari 6 wilayah gambut paling rawan menggunakan drone lapangan dan kamera menara pengawas. Dilengkapi kamera video langsung, sensor panas (termal), dan kecerdasan buatan (AI) pendeteksi asap secara otomatis.
                  </p>
                </div>

                {/* View Mode Switcher: Quilt (Grid) vs Focus (Single) */}
                <div className="flex items-center justify-between p-1 bg-[#181818] border border-[#2d3139] rounded-lg">
                  <div className="flex items-center gap-1 text-[11px] font-medium text-[#e8eaed] pl-1.5">
                    <Video className="w-3.5 h-3.5 text-[#38bdf8]" />
                    <span>Pilihan Tampilan</span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setCameraViewLayout('quilt')}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                        cameraViewLayout === 'quilt'
                          ? 'bg-[#282c34] text-[#38bdf8] border border-[#3c4048] shadow-xs'
                          : 'text-[#9aa0a6] hover:text-[#e8eaed]'
                      }`}
                      title="Lihat semua kamera sekaligus dalam format grid"
                    >
                      <Grid className="w-3.5 h-3.5" />
                      <span>Semua Kamera</span>
                    </button>
                    <button
                      onClick={() => setCameraViewLayout('single')}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                        cameraViewLayout === 'single'
                          ? 'bg-[#282c34] text-[#38bdf8] border border-[#3c4048] shadow-xs'
                          : 'text-[#9aa0a6] hover:text-[#e8eaed]'
                      }`}
                      title="Fokus inspeksi feed kamera tunggal beresolusi tinggi"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                      <span>Fokus 1 Kamera</span>
                    </button>
                  </div>
                </div>

                {/* Regional Filter & Individual Drone Unit Tabs (AlertCalifornia Style) */}
                <div className="space-y-2">
                  <div>
                    <div className="flex items-center justify-between text-[10px] text-[#9aa0a6] mb-1">
                      <span className="font-semibold text-[#cbd5e1] tracking-wider">PILIH WILAYAH PANTAUAN</span>
                      <span className="text-[#38bdf8] font-mono">
                        {(droneMissions || []).length} Kamera Terhubung
                      </span>
                    </div>
                    <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
                      {[
                        { id: 'all', label: 'Semua (11)' },
                        { id: 'oki', label: 'OKI (4)' },
                        { id: 'kalteng', label: 'Pulang Pisau (2)' },
                        { id: 'kalbar', label: 'Ketapang (2)' },
                        { id: 'merauke', label: 'Merauke (1)' },
                        { id: 'sorong', label: 'Sorong (1)' },
                        { id: 'maros', label: 'Maros (1)' },
                      ].map((rf) => (
                        <button
                          key={rf.id}
                          onClick={() => {
                            setSelectedRegionFilter(rf.id);
                            const filtered = (droneMissions || []).filter(
                              (m) => rf.id === 'all' || m.region_id === rf.id
                            );
                            if (filtered.length > 0 && (!selectedMission || (rf.id !== 'all' && selectedMission.region_id !== rf.id))) {
                              const firstM = filtered[0];
                              setSelectedMission(firstM);
                              setGimbalYaw(0);
                              setPtzZoom(1);
                              setIsAutoSweep(false);
                              setPreviewOfflineVideo(false);
                              if (onSelectCell) onSelectCell(firstM.cell_id);
                              if (onFlyTo) onFlyTo(firstM.lon, firstM.lat, 13);
                            }
                          }}
                          className={`px-2 py-0.5 rounded text-[10px] whitespace-nowrap transition-colors border ${
                            selectedRegionFilter === rf.id
                              ? 'bg-[#202836] border-[#38bdf8] text-[#38bdf8] font-bold shadow-xs'
                              : 'bg-[#181818] border-[#2d3139] text-[#9aa0a6] hover:text-[#e8eaed]'
                          }`}
                        >
                          {rf.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Dedicated 1-by-1 Drone Unit Tabs with Drone Code (AlertCalifornia Style) */}
                  <div className="bg-[#121418] border border-[#2d3139] rounded-lg p-2">
                    <div className="flex items-center justify-between text-[10px] text-[#9aa0a6] mb-1.5">
                      <span className="flex items-center gap-1 text-[#e2e8f0] font-semibold">
                        <Radio className="w-3 h-3 text-red-500 animate-pulse" />
                        <span>TAB UNIT DRONE (PILIH 1 PER SATU)</span>
                      </span>
                      <span className="text-[9px] font-mono text-[#38bdf8] font-bold">
                        {selectedMission ? (selectedMission.camera_name?.split(':')[0] || 'CAM-01') : 'PILIH DRONE'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                      {(droneMissions || [])
                        .filter((m) => selectedRegionFilter === 'all' || m.region_id === selectedRegionFilter)
                        .map((cam) => {
                          const isSel = selectedMission?.mission_id === cam.mission_id;
                          const code = cam.camera_name ? cam.camera_name.split(':')[0].trim() : cam.mission_id.toUpperCase();
                          const locName = cam.camera_name ? cam.camera_name.split(':')[1]?.trim() : cam.area_name;
                          const shortLoc = locName ? locName.split(' ')[0] : cam.area_name.split(' ')[0];
                          const isCharging = cam.stream_mode === 'STANDBY_CHARGING';
                          const isSafe = cam.stream_mode === 'AREA_AMAN';

                          return (
                            <button
                              key={cam.mission_id}
                              onClick={() => {
                                setSelectedMission(cam);
                                setGimbalYaw(0);
                                setPtzZoom(1);
                                setIsAutoSweep(false);
                                setPreviewOfflineVideo(false);
                                if (onSelectCell) onSelectCell(cam.cell_id);
                                if (onFlyTo) onFlyTo(cam.lon, cam.lat, 13);
                              }}
                              className={`group flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-mono transition-all duration-150 whitespace-nowrap border shrink-0 ${
                                isSel
                                  ? 'bg-[#1e293b] border-[#38bdf8] text-white shadow-md shadow-[#38bdf8]/20 ring-1 ring-[#38bdf8]'
                                  : 'bg-[#181a1f] border-[#2d3139] text-[#94a3b8] hover:text-[#f1f5f9] hover:border-[#475569] hover:bg-[#222630]'
                              }`}
                              title={`${cam.camera_name || cam.area_name} (${cam.region_name})`}
                            >
                              <span
                                className={`w-2 h-2 rounded-full shrink-0 ${
                                  isCharging
                                    ? 'bg-amber-400 animate-pulse'
                                    : isSafe
                                    ? 'bg-sky-400'
                                    : isSel
                                    ? 'bg-red-500 animate-ping'
                                    : 'bg-emerald-400'
                                }`}
                              />
                              <span className="font-bold text-[#f8fafc] tracking-tight">{code}</span>
                              <span className="text-[10px] text-[#94a3b8] border-l border-white/20 pl-1">
                                {shortLoc}
                              </span>
                              {isCharging ? (
                                <span className="text-[8.5px] font-bold px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-0.5">
                                  <Zap className="w-2.5 h-2.5" />
                                  CHG {cam.battery_pct}%
                                </span>
                              ) : isSafe ? (
                                <span className="text-[8.5px] font-bold px-1 py-0.2 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30 flex items-center gap-0.5">
                                  <ShieldCheck className="w-2.5 h-2.5" />
                                  AMAN
                                </span>
                              ) : (
                                <span
                                  className={`text-[8.5px] font-bold px-1 py-0.2 rounded ${
                                    cam.risk_score >= 0.8
                                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  }`}
                                >
                                  {(cam.risk_score * 100).toFixed(0)}%
                                </span>
                              )}
                            </button>
                          );
                        })}
                    </div>
                  </div>
                </div>

                {/* CAMERA QUILT (GRID VIEW) - AlertCalifornia Style */}
                {cameraViewLayout === 'quilt' && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[10px] text-[#9aa0a6] pb-1 border-b border-[#2d3139]">
                      <span className="font-semibold text-white/90 uppercase tracking-wider text-[9.5px]">
                        Grid Feed Kamera Lapangan
                      </span>
                      <div className="flex items-center gap-1.5 font-mono text-[9px] font-bold">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 shadow-xs whitespace-nowrap">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          9 ONLINE
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1 shadow-xs whitespace-nowrap">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                          2 STANDBY
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[520px] overflow-y-auto pr-0.5">
                      {(droneMissions || [])
                        .filter((m) => selectedRegionFilter === 'all' || m.region_id === selectedRegionFilter)
                        .map((cam) => {
                          const isSel = selectedMission?.mission_id === cam.mission_id;
                          const isCharging = cam.stream_mode === 'STANDBY_CHARGING';
                          const isSafe = cam.stream_mode === 'AREA_AMAN';

                          return (
                            <div
                              key={cam.mission_id}
                              onClick={() => {
                                setSelectedMission(cam);
                                setCameraViewLayout('single');
                                setGimbalYaw(0);
                                setPtzZoom(1);
                                setIsAutoSweep(false);
                                setPreviewOfflineVideo(false);
                                if (onSelectCell) onSelectCell(cam.cell_id);
                                if (onFlyTo) onFlyTo(cam.lon, cam.lat, 13);
                              }}
                              className={`group relative rounded-lg overflow-hidden border cursor-pointer transition-all duration-200 bg-[#14161a] hover:border-[#38bdf8] ${
                                isSel ? 'border-[#38bdf8] ring-1 ring-[#38bdf8]/60 shadow-lg' : 'border-[#2d3139]'
                              }`}
                            >
                              {/* Media Thumbnail */}
                              <div className="relative aspect-video w-full overflow-hidden bg-black select-none">
                                {isCharging ? (
                                  <div className="w-full h-full bg-gradient-to-br from-[#0a0f18] via-[#111827] to-[#070b12] flex flex-col items-center justify-center p-2 relative overflow-hidden border border-amber-500/20">
                                    <div className="absolute inset-0 bg-[radial-gradient(#f59e0b_1px,transparent_1px)] [background-size:10px_10px] opacity-25 pointer-events-none" />
                                    <div className="relative z-10 flex flex-col items-center gap-0.5">
                                      <div className="w-8 h-8 rounded-full bg-amber-500/15 border border-amber-500/40 flex items-center justify-center shadow-xs">
                                        <Zap className="w-4 h-4 text-amber-400 fill-amber-400 animate-pulse" />
                                      </div>
                                      <span className="text-[10px] font-mono font-bold text-amber-300 tracking-tight mt-0.5">DOCK FAST-CHG</span>
                                      <span className="text-[7.5px] font-mono text-slate-300">Pad 04 • Solar 48.8V</span>
                                      <span className="px-1.5 py-0.2 rounded bg-black/70 border border-amber-500/30 text-[7px] font-mono text-amber-400 mt-0.5">
                                        STANDBY DI HANGAR
                                      </span>
                                    </div>
                                  </div>
                                ) : isSafe ? (
                                  <div className="w-full h-full bg-gradient-to-br from-[#051710] via-[#092419] to-[#030e0a] flex flex-col items-center justify-center p-2 relative overflow-hidden border border-sky-500/20">
                                    <div className="absolute inset-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:10px_10px] opacity-25 pointer-events-none" />
                                    <div className="relative z-10 flex flex-col items-center gap-0.5">
                                      <div className="w-8 h-8 rounded-full bg-sky-500/15 border border-sky-500/40 flex items-center justify-center shadow-xs">
                                        <ShieldCheck className="w-4 h-4 text-sky-400" />
                                      </div>
                                      <span className="text-[10px] font-mono font-bold text-sky-300 tracking-tight mt-0.5">WILAYAH AMAN</span>
                                      <span className="text-[7.5px] font-mono text-slate-300">TMA +18cm • Hotspot 0</span>
                                      <span className="px-1.5 py-0.2 rounded bg-black/70 border border-sky-500/30 text-[7px] font-mono text-sky-400 mt-0.5">
                                        POS PANTAU STANDBY
                                      </span>
                                    </div>
                                  </div>
                                ) : (
                                  <video
                                    src={cam.video_url || '/videos/drone_wildfire_recon.webm'}
                                    autoPlay
                                    loop
                                    muted
                                    playsInline
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/80 pointer-events-none" />

                                {/* Top badges */}
                                <div className="absolute top-1.5 left-1.5 right-1.5 flex items-center justify-between pointer-events-none gap-1">
                                  {isCharging ? (
                                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/85 backdrop-blur-md text-[8px] font-mono font-bold text-amber-400 border border-amber-500/40 whitespace-nowrap shrink-0 shadow-xs">
                                      <Zap className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
                                      <span>DOCK {cam.battery_pct || 94}%</span>
                                    </span>
                                  ) : isSafe ? (
                                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/85 backdrop-blur-md text-[8px] font-mono font-bold text-sky-400 border border-sky-500/40 whitespace-nowrap shrink-0 shadow-xs">
                                      <ShieldCheck className="w-2.5 h-2.5 text-sky-400" />
                                      <span>AMAN</span>
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/85 backdrop-blur-md text-[8px] font-mono font-bold text-emerald-400 border border-emerald-500/40 whitespace-nowrap shrink-0 shadow-xs">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                      <span>LIVE</span>
                                    </span>
                                  )}
                                  <span className="px-2 py-0.5 rounded-full bg-black/85 backdrop-blur-md text-[8px] font-mono text-[#e2e8f0] border border-white/20 flex items-center gap-1.5 shrink-0 whitespace-nowrap shadow-xs">
                                    <span className="text-cyan-400 font-bold">{cam.timezone_label || 'WIB'}</span>
                                    <span className="text-white/30 font-bold">•</span>
                                    <span className="font-semibold text-white">{getShortRegionName(cam)}</span>
                                  </span>
                                </div>

                                {/* Center hover zoom prompt */}
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 backdrop-blur-xs">
                                  <span className="px-2.5 py-1 rounded-full bg-[#38bdf8] text-black font-bold text-[9px] flex items-center gap-1 shadow">
                                    <Maximize2 className="w-3 h-3" />
                                    Buka Feed Penuh
                                  </span>
                                </div>

                                {/* Bottom telemetry */}
                                <div className="absolute bottom-1 left-1.5 right-1.5 text-[8px] font-mono text-white/95 pointer-events-none">
                                  <div className="font-bold truncate text-[#f1f5f9] drop-shadow">
                                    {cam.camera_name || cam.area_name}
                                  </div>
                                  <div className="flex justify-between items-center text-[7px] text-white/70 mt-0.5">
                                    <span>AZ: {cam.azimuth_deg}° • {cam.camera_lens ? cam.camera_lens.split(' ')[0] : '24mm'} • {cam.altitude_m_agl}m</span>
                                    <span className={isSafe ? 'text-sky-400 font-bold' : isCharging ? 'text-amber-400 font-bold' : 'text-red-400 font-bold'}>
                                      {isSafe ? 'TMA +18cm' : isCharging ? 'Pad Standby' : `${(cam.risk_score * 100).toFixed(0)}% Risiko`}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Card footer with AI detection snippet */}
                              <div className="px-2 py-1.5 bg-[#181a1f] flex items-center justify-between gap-1.5 text-[8.5px] border-t border-[#2d3139] h-7">
                                <span className="truncate text-[#9aa0a6] text-[9px] font-medium min-w-0" title={cam.landscape_desc || cam.area_name}>
                                  {cam.landscape_desc ? cam.landscape_desc.split('•')[0].trim() : cam.area_name}
                                </span>
                                {(() => {
                                  let label = 'Patroli Normal';
                                  let style = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
                                  if (isCharging) {
                                    label = 'Standby Dock';
                                    style = 'bg-amber-500/15 text-amber-300 border-amber-500/30';
                                  } else if (isSafe) {
                                    label = 'Area Aman';
                                    style = 'bg-sky-500/15 text-sky-300 border-sky-500/30';
                                  } else if (cam.detections && cam.detections.length > 0) {
                                    const firstDet = cam.detections[0].label.toLowerCase();
                                    if (firstDet.includes('asap') || firstDet.includes('smoldering')) {
                                      label = 'Asap Tebal';
                                      style = 'bg-red-500/20 text-red-400 border-red-500/40';
                                    } else if (firstDet.includes('bukaan') || firstDet.includes('pembalakan')) {
                                      label = 'Bukaan Lahan';
                                      style = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
                                    } else if (firstDet.includes('termal') || firstDet.includes('hotspot')) {
                                      label = 'Hotspot FLIR';
                                      style = 'bg-rose-500/20 text-rose-300 border-rose-500/40';
                                    } else if (firstDet.includes('kanal') || firstDet.includes('aliran')) {
                                      label = 'Kanal Gambut';
                                      style = 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
                                    } else {
                                      label = cam.detections[0].label.split('/')[0].split('&')[0].trim().slice(0, 14);
                                      style = 'bg-amber-500/20 text-amber-300 border-amber-500/30';
                                    }
                                  }
                                  return (
                                    <span className={`px-1.5 py-0.5 rounded font-mono text-[8px] font-bold whitespace-nowrap shrink-0 border ${style}`}>
                                      {label}
                                    </span>
                                  );
                                })()}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* SINGLE FOCUS VIEW - AlertCalifornia Tactical Video HUD Player */}
                {cameraViewLayout === 'single' && (
                  <div className="space-y-3">
                    {/* Camera Selector Dropdown */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[10px] text-[#9aa0a6] uppercase tracking-wider font-semibold">
                          Pilih Feed Kamera Aktif
                        </label>
                        <button
                          onClick={() => setCameraViewLayout('quilt')}
                          className="text-[10px] text-[#38bdf8] hover:underline flex items-center gap-1"
                        >
                          <Grid className="w-3 h-3" />
                          <span>Mode Grid</span>
                        </button>
                      </div>
                      <select
                        value={selectedMission?.mission_id || ''}
                        onChange={(e) => {
                          const m = (droneMissions || []).find(
                            (x) => x.mission_id === e.target.value
                          );
                          if (m) {
                            setSelectedMission(m);
                            setGimbalYaw(0);
                            setPtzZoom(1);
                            setIsAutoSweep(false);
                            setPreviewOfflineVideo(false);
                            if (onSelectCell) onSelectCell(m.cell_id);
                            if (onFlyTo) onFlyTo(m.lon, m.lat, 13);
                          }
                        }}
                        className="w-full bg-[#181818] border border-[#2d3139] rounded px-2.5 py-1.5 text-xs text-[#e8eaed] font-mono truncate"
                      >
                        {(droneMissions || [])
                          .filter((m) => selectedRegionFilter === 'all' || m.region_id === selectedRegionFilter)
                          .map((m) => (
                            <option key={m.mission_id} value={m.mission_id}>
                              {m.stream_mode === 'STANDBY_CHARGING'
                                ? `⚡ [STANDBY/CHG] ${m.camera_name || m.area_name}`
                                : m.stream_mode === 'AREA_AMAN'
                                ? `🛡️ [AREA AMAN] ${m.camera_name || m.area_name}`
                                : `● [LIVE] ${m.camera_name || m.area_name}`} ({m.region_name})
                            </option>
                          ))}
                      </select>
                    </div>

                    {/* View Mode Toggle: RGB vs Thermal IR vs NIR Defog */}
                    <div className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5 font-medium text-[#e8eaed] truncate max-w-[210px]">
                        <Camera className="w-3.5 h-3.5 text-[#38bdf8] shrink-0" />
                        <span className="truncate">Kamera: {selectedMission?.camera_name?.split(':')[0] || 'CAM-OKI-01'}</span>
                        {selectedMission?.stream_mode === 'STANDBY_CHARGING' && !isDockDispatched && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[8px] font-mono font-bold shrink-0">
                            ⚡ DOCK CHG
                          </span>
                        )}
                        {selectedMission?.stream_mode === 'STANDBY_CHARGING' && isDockDispatched && (
                          <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[8px] font-mono font-bold shrink-0 animate-pulse">
                            🚀 AIRBORNE
                          </span>
                        )}
                        {selectedMission?.stream_mode === 'AREA_AMAN' && (
                          <span className="px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30 text-[8px] font-mono font-bold shrink-0">
                            🛡️ AMAN
                          </span>
                        )}
                      </div>
                      {selectedMission?.stream_mode === 'STANDBY_CHARGING' && !isDockDispatched ? (
                        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/40 text-[9px] font-mono font-bold shadow-xs">
                          <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
                          <span>SOLAR FAST-CHG</span>
                        </div>
                      ) : selectedMission?.stream_mode === 'AREA_AMAN' && !isAreaAmanInspecting ? (
                        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/40 text-[9px] font-mono font-bold shadow-xs">
                          <ShieldCheck className="w-3 h-3 text-sky-400" />
                          <span>WILAYAH AMAN</span>
                        </div>
                      ) : (
                        <div className="flex rounded bg-[#202124] p-0.5 border border-[#2d3139] gap-0.5">
                          <button
                            onClick={() => setDroneViewMode('rgb')}
                            className={`px-2 py-0.5 rounded text-[9.5px] font-medium transition-colors ${
                              droneViewMode === 'rgb'
                                ? 'bg-[#282c34] text-[#38bdf8] shadow-xs font-semibold'
                                : 'text-[#9aa0a6] hover:text-[#e8eaed]'
                            }`}
                          >
                            RGB Optik
                          </button>
                          <button
                            onClick={() => setDroneViewMode('thermal')}
                            className={`px-2 py-0.5 rounded text-[9.5px] font-medium transition-colors ${
                              droneViewMode === 'thermal'
                                ? 'bg-[#e11d48] text-white shadow-xs font-semibold'
                                : 'text-[#9aa0a6] hover:text-[#e8eaed]'
                            }`}
                          >
                            FLIR IR
                          </button>
                          <button
                            onClick={() => setDroneViewMode('defog')}
                            className={`px-2 py-0.5 rounded text-[9.5px] font-medium transition-colors ${
                              droneViewMode === 'defog'
                                ? 'bg-[#0284c7] text-white shadow-xs font-semibold'
                                : 'text-[#9aa0a6] hover:text-[#e8eaed]'
                            }`}
                            title="Near-Infrared Haze & Smoke Penetration Filter"
                          >
                            NIR Defog
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Screen 1: Autonomous Drone Docking Station Screen (When Standby & Charging) */}
                    {selectedMission?.stream_mode === 'STANDBY_CHARGING' && !isDockDispatched ? (
                      <div className="w-full min-h-[240px] rounded-lg border border-amber-500/40 relative overflow-hidden bg-gradient-to-b from-[#080d16] via-[#0d1424] to-[#060911] shadow-2xl p-3 flex flex-col justify-between select-none font-mono text-white">
                        {/* Dot Matrix & Subtle Glow */}
                        <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:12px_12px] opacity-30 pointer-events-none" />
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(245,158,11,0.12),transparent_70%)] pointer-events-none" />

                        {/* Telemetry Header */}
                        <div className="relative z-10 flex items-center justify-between border-b border-white/10 pb-1.5 gap-2">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center shrink-0">
                              <Zap className="w-3.5 h-3.5 fill-amber-400" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-[10px] font-bold text-white tracking-wide flex items-center gap-1.5">
                                <span className="truncate">STASIUN DOCKING DRONE</span>
                                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[7.5px] font-bold shrink-0 whitespace-nowrap">PAD-04</span>
                              </div>
                              <div className="text-[8px] text-[#94a3b8] truncate">
                                {selectedMission?.area_name || 'Kecamatan Air Sugihan, OKI'} • Solar Hybrid Station
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 text-[8px] shrink-0 ml-1">
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold whitespace-nowrap">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
                              <span>FAST-CHARGING</span>
                            </span>
                          </div>
                        </div>

                        {/* Center Charging Pad Graphic & Battery Progression */}
                        <div className="relative z-10 my-1 flex items-center justify-between gap-2 px-1">
                          {/* Left: Animated Docking Nest Graphic */}
                          <div className="relative flex flex-col items-center justify-center shrink-0">
                            <div className="relative w-16 h-16 rounded-full border-2 border-dashed border-amber-400/50 flex items-center justify-center bg-black/40 shadow-[0_0_20px_rgba(245,158,11,0.15)]">
                              <div className="absolute inset-1 rounded-full border border-amber-400/30 animate-spin-slow" />
                              <div className="absolute w-full h-px bg-amber-500/40" />
                              <div className="absolute h-full w-px bg-amber-500/40" />
                              
                              <div className="relative z-10 flex flex-col items-center justify-center">
                                <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-400/60 flex items-center justify-center text-amber-300 font-bold text-[9px] shadow">
                                  <span className="text-[13px]">🛸</span>
                                </div>
                                <span className="mt-0.5 text-[7px] font-bold text-amber-300 bg-black/80 px-1 rounded border border-amber-400/30 whitespace-nowrap">
                                  DOCK-LOCKED
                                </span>
                              </div>
                            </div>
                            <div className="mt-1 text-[7.5px] text-slate-300 font-semibold flex items-center gap-1 whitespace-nowrap">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              <span>Clamp: IP55 Sealed</span>
                            </div>
                          </div>

                          {/* Right: Power & Charging Telemetry Details */}
                          <div className="flex-1 bg-[#121824]/90 border border-amber-500/30 rounded-lg p-2 shadow-md flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[8.5px] font-bold text-amber-300 flex items-center gap-1">
                                <Zap className="w-3 h-3 text-amber-400 fill-amber-400 animate-bounce" />
                                DAYA BATERAI DRONE
                              </span>
                              <span className="text-sm font-bold text-amber-400 font-mono">94%</span>
                            </div>

                            <div className="w-full bg-black/70 rounded-full h-2 overflow-hidden border border-white/10 p-0.5 my-0.5">
                              <div
                                className="bg-gradient-to-r from-amber-500 via-yellow-400 to-emerald-400 h-full rounded-full transition-all duration-500 relative flex items-center justify-end pr-1"
                                style={{ width: '94%' }}
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[7.5px] text-[#94a3b8] mt-1 border-t border-white/10 pt-1">
                              <div>Inverter: <strong className="text-white">48.8V / 12.4A</strong></div>
                              <div>Suhu Sel: <strong className="text-emerald-400">29.4°C</strong></div>
                              <div>Estimasi Full: <strong className="text-amber-300">~4 Menit</strong></div>
                              <div>RTK Fix: <strong className="text-cyan-300">±1.2cm</strong></div>
                            </div>
                          </div>
                        </div>

                        {/* Footer with Big Dispatch Button */}
                        <div className="relative z-10 flex items-center justify-between border-t border-white/10 pt-2 mt-auto shrink-0 gap-2">
                          <div className="flex items-center gap-1 text-[8px] text-[#94a3b8] min-w-0 flex-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                            <span className="truncate">Unit terparkir di hangar. Siap re-dispatch otomatis.</span>
                          </div>
                          <button
                            onClick={() => setIsDockDispatched(true)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-black font-bold text-[8.5px] shadow transition-all hover:scale-105 cursor-pointer shrink-0 whitespace-nowrap"
                            title="Buka kubah docking dan luncurkan drone untuk patroli udara aktif"
                          >
                            <Rocket className="w-3 h-3 shrink-0" />
                            <span>Luncurkan Drone</span>
                          </button>
                        </div>
                      </div>
                    ) : selectedMission?.stream_mode === 'AREA_AMAN' && !isAreaAmanInspecting ? (
                      /* Screen 2: Peatland Eco-Monitoring & Area Aman (Green Zone) Screen */
                      <div className="w-full min-h-[240px] rounded-lg border border-sky-500/40 relative overflow-hidden bg-gradient-to-b from-[#05140e] via-[#082017] to-[#040e0a] shadow-2xl p-3 flex flex-col justify-between select-none font-mono text-white">
                        {/* Dot Matrix & Subtle Emerald Glow */}
                        <div className="absolute inset-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:12px_12px] opacity-25 pointer-events-none" />
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.15),transparent_70%)] pointer-events-none" />

                        {/* Header */}
                        <div className="relative z-10 flex items-center justify-between border-b border-white/10 pb-1.5 gap-2">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <div className="w-6 h-6 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/40 flex items-center justify-center shrink-0">
                              <ShieldCheck className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-[10px] font-bold text-white tracking-wide flex items-center gap-1.5">
                                <span className="truncate">PANTAUAN LAHAN GAMBUT</span>
                                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[7.5px] font-bold shrink-0 whitespace-nowrap">
                                  AMAN
                                </span>
                              </div>
                              <div className="text-[8px] text-[#94a3b8] truncate">
                                {selectedMission?.area_name || 'Kecamatan Pulang Pisau, Kalteng'} • Zona Konservasi
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 text-[8px] shrink-0 ml-1">
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/40 font-bold whitespace-nowrap">
                              <ShieldCheck className="w-3 h-3 text-sky-400 shrink-0" />
                              <span>NIHIL HOTSPOT</span>
                            </span>
                          </div>
                        </div>

                        {/* Center Status & Hydrological Parameters */}
                        <div className="relative z-10 my-1 flex items-center justify-between gap-2 px-1">
                          {/* Left: Eco Protective Shield Graphic */}
                          <div className="relative flex flex-col items-center justify-center shrink-0">
                            <div className="relative w-16 h-16 rounded-full border-2 border-dashed border-emerald-400/50 flex items-center justify-center bg-black/40 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
                              <div className="absolute inset-1 rounded-full border border-emerald-400/30 animate-spin-slow" />
                              <div className="relative z-10 flex flex-col items-center justify-center">
                                <ShieldCheck className="w-6 h-6 text-emerald-400" />
                                <span className="mt-0.5 text-[7px] font-bold text-emerald-300 bg-black/80 px-1.5 py-0.2 rounded border border-emerald-400/30 whitespace-nowrap">
                                  ZONA AMAN
                                </span>
                              </div>
                            </div>
                            <div className="mt-1 text-[7.5px] text-slate-300 font-semibold flex items-center gap-1 whitespace-nowrap">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              <span>Basah &amp; Terlindungi</span>
                            </div>
                          </div>

                          {/* Right: Environmental Parameter Grid */}
                          <div className="flex-1 bg-[#0c1f17]/90 border border-emerald-500/30 rounded-lg p-2 shadow-md flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[8.5px] font-bold text-emerald-300 flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                                KONDISI GAMBUT
                              </span>
                              <span className="text-xs font-bold text-emerald-400 font-mono">TMA +18 cm</span>
                            </div>

                            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[7.5px] text-[#94a3b8] mt-1 border-t border-white/10 pt-1">
                              <div>TMA Gambut: <strong className="text-sky-300">+18 cm (Basah)</strong></div>
                              <div>Risiko Api: <strong className="text-emerald-400">28.5% (Rendah)</strong></div>
                              <div>Suhu Gambut: <strong className="text-white">30.5°C</strong></div>
                              <div>Hotspot: <strong className="text-emerald-400">0 Titik</strong></div>
                              <div>Kelembapan: <strong className="text-white">84% RH</strong></div>
                              <div>Patroli: <strong className="text-amber-300">14:30 WIB</strong></div>
                            </div>
                          </div>
                        </div>

                        {/* Footer with Video Inspection Option */}
                        <div className="relative z-10 flex items-center justify-between border-t border-white/10 pt-2 mt-auto shrink-0 gap-2">
                          <div className="flex items-center gap-1 text-[8px] text-[#94a3b8] min-w-0 flex-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0" />
                            <span className="truncate">Monitoring rutin selesai. Unit standby di Pos Pantau.</span>
                          </div>
                          <button
                            onClick={() => setIsAreaAmanInspecting(true)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 font-bold text-[8.5px] shadow transition-all hover:scale-105 cursor-pointer shrink-0 whitespace-nowrap"
                            title="Tinjau rekaman video inspeksi udara lahan gambut"
                          >
                            <Video className="w-3 h-3 shrink-0" />
                            <span>Tinjau Rekaman</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Screen 3: Tactical Video Player (Live Airborne Patrol or Video Inspection) */
                      <div className="w-full aspect-video rounded-lg border border-[#3c4048] relative overflow-hidden bg-black shadow-2xl select-none">
                        {/* Inner 3D Gimbal Yaw & Perspective Viewport */}
                        <div
                          className="w-full h-full relative"
                          style={{
                            transform: `scale(${Math.max(ptzZoom * 1.2, 1.2)}) perspective(850px) rotateY(${gimbalYaw}deg) translateX(${gimbalYaw * -1.8}px)`,
                            transformOrigin: 'center center',
                            transition: isAutoSweep ? 'transform 0.2s linear' : 'transform 0.35s cubic-bezier(0.25, 1, 0.5, 1)',
                          }}
                        >
                          {/* Genuine HTML5 Looping Video */}
                          <video
                            key={`${selectedMission?.mission_id}-${droneViewMode}-${isDockDispatched ? 'fly' : 'standby'}`}
                            src={
                              isDockDispatched
                                ? '/videos/drone_wildfire_recon.webm'
                                : selectedMission?.video_url || '/videos/drone_canopy_patrol.webm'
                            }
                            autoPlay
                            loop
                            muted
                            playsInline
                            style={{
                              filter:
                                droneViewMode === 'thermal'
                                  ? 'contrast(2.2) brightness(1.2) invert(0.92) hue-rotate(185deg) saturate(3.5)'
                                  : droneViewMode === 'defog'
                                  ? 'contrast(1.65) brightness(1.15) saturate(0.35) sepia(0.2)'
                                  : 'contrast(1.05) brightness(1.0)',
                            }}
                            className="w-full h-full object-cover"
                          />

                          {/* FLIR Thermal False-Color Legend & Tint */}
                          {droneViewMode === 'thermal' && (
                            <>
                              <div className="absolute inset-0 bg-gradient-to-tr from-purple-950/30 via-red-950/20 to-amber-500/10 pointer-events-none mix-blend-color" />
                              <div className="absolute right-2 top-8 bottom-8 w-2 rounded-full bg-gradient-to-t from-[#0d0887] via-[#7e03a8] via-[#cc4778] via-[#f89540] to-[#f0f921] border border-white/20 shadow flex flex-col justify-between text-[7px] font-mono text-white/90 pl-3 pointer-events-none">
                                <span>{selectedMission?.thermal_max_c || 51.4}°C</span>
                                <span>{(selectedMission?.thermal_ambient_c || 31.4).toFixed(1)}°C</span>
                              </div>
                            </>
                          )}

                          {/* NIR Defog Greenish/Amber Spectrum Overlay */}
                          {droneViewMode === 'defog' && (
                            <div className="absolute inset-0 bg-cyan-950/15 pointer-events-none mix-blend-overlay" />
                          )}

                          {/* Dynamic AI YOLO Bounding Boxes */}
                          {(selectedMission?.stream_mode === 'LIVE' || isDockDispatched) && droneViewMode !== 'thermal' && (
                            (selectedMission?.detections || [
                              { id: 'det-live-01', label: 'Anomali Asap Kubah Gambut', confidence: 0.942, bbox: [0.25, 0.3, 0.65, 0.7] }
                            ]).map((det, idx) => {
                              const top = `${(det.bbox?.[0] || 0.2) * 100}%`;
                              const left = `${(det.bbox?.[1] || 0.2) * 100}%`;
                              const width = `${Math.max(0.12, (det.bbox?.[3] - det.bbox?.[1]) || 0.4) * 100}%`;
                              const height = `${Math.max(0.12, (det.bbox?.[2] - det.bbox?.[0]) || 0.35) * 100}%`;
                              const isHigh = det.confidence > 0.9;
                              return (
                                <div
                                  key={det.id || idx}
                                  style={{ top, left, width, height }}
                                  className={`absolute rounded border-2 pointer-events-none transition-all ${
                                    isHigh
                                      ? 'border-amber-400 bg-amber-500/15 animate-pulse'
                                      : 'border-cyan-400 bg-cyan-500/10'
                                  }`}
                                >
                                  <span
                                    className={`absolute -top-4 left-0 px-1.5 py-0.2 rounded font-mono text-[7.5px] font-bold shadow ${
                                      isHigh ? 'bg-amber-500 text-black' : 'bg-cyan-500 text-black'
                                    }`}
                                  >
                                    [AI-YOLO] {det.label} ({(det.confidence * 100).toFixed(1)}%)
                                  </span>
                                </div>
                              );
                            })
                          )}

                          {/* FLIR Thermal Hotspot Overlay */}
                          {(selectedMission?.stream_mode === 'LIVE' || isDockDispatched) && droneViewMode === 'thermal' && (
                            <div className="absolute top-[26%] left-[34%] w-[38%] h-[38%] rounded border-2 border-red-500 bg-red-500/20 pointer-events-none animate-pulse">
                              <span className="absolute -top-4 left-0 px-1.5 py-0.2 rounded bg-red-600 text-white font-mono text-[8px] font-bold shadow">
                                [FLIR-IR] Hotspot Bawah Permukaan: {selectedMission?.thermal_max_c || 48.2}°C
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Top-Left Telemetry HUD */}
                        <div className="absolute top-2 left-2 z-10 flex flex-col gap-0.5 pointer-events-none max-w-[55%]">
                          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/75 backdrop-blur-xs border border-white/10 text-[8px] font-mono text-[#e8eaed]">
                            {isDockDispatched ? (
                              <>
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                                <span className="text-emerald-400 font-bold shrink-0">AIRBORNE RECON</span>
                                <span className="text-white/40">|</span>
                                <span className="text-amber-300 font-semibold truncate">DOCK-04 AIRBORNE</span>
                                <span className="text-white/40">|</span>
                                <span className="shrink-0">105m</span>
                              </>
                            ) : isAreaAmanInspecting ? (
                              <>
                                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse shrink-0" />
                                <span className="text-sky-300 font-bold shrink-0">INSPEKSI UDARA</span>
                                <span className="text-white/40">|</span>
                                <span className="text-emerald-400 font-semibold truncate">{selectedMission?.camera_name?.split(':')[0]}</span>
                              </>
                            ) : (
                              <>
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping shrink-0" />
                                <span className="text-red-400 font-bold shrink-0">REC</span>
                                <span className="text-white/40">|</span>
                                <span className="text-emerald-400 font-semibold truncate">{selectedMission?.camera_name?.split(':')[0] || 'CAM-OKI-01'}</span>
                                <span className="text-white/40">|</span>
                                <span className="shrink-0">{`${selectedMission?.altitude_m_agl || 105}m`}</span>
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-[7.5px] font-mono text-white/80 bg-black/60 px-1.5 py-0.2 rounded w-fit backdrop-blur-xs">
                            {isDockDispatched ? (
                              <>
                                <span className="text-amber-300 font-bold">BAT 92%</span>
                                <span className="text-white/30">•</span>
                                <span className="text-cyan-300">ALT 105m AGL</span>
                                <span className="text-white/30">•</span>
                                <span className="text-emerald-400">AI DETECT ON</span>
                              </>
                            ) : isAreaAmanInspecting ? (
                              <>
                                <span className="text-sky-300 font-bold">TMA +18cm (BASAH)</span>
                                <span className="text-white/30">•</span>
                                <span className="text-emerald-400">HOTSPOT NIHIL</span>
                              </>
                            ) : (
                              <>
                                <span>
                                  {isAutoSweep ? 'SWEEP ⇄' : gimbalYaw !== 0 ? `YAW ${gimbalYaw > 0 ? '+' : ''}${gimbalYaw}°` : 'CENTER'}
                                </span>
                                <span className="text-white/30">•</span>
                                <span className="text-cyan-300">{selectedMission?.camera_lens?.split(' ')?.[0] || '24mm'}</span>
                                <span className="text-white/30">•</span>
                                <span>BAT {selectedMission?.battery_pct || 78}%</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Top-Right Clock & Tactical Action Controls */}
                        <div className="absolute top-2 right-2 z-10 flex flex-col items-end gap-1 max-w-[45%]">
                          {isDockDispatched ? (
                            <button
                              onClick={() => setIsDockDispatched(false)}
                              className="px-2.5 py-1 rounded bg-black/85 hover:bg-black text-amber-300 hover:text-amber-200 border border-amber-500/50 text-[8px] font-mono font-bold backdrop-blur-md transition-all shadow-md flex items-center gap-1 cursor-pointer whitespace-nowrap"
                              title="Kembalikan Drone ke Stasiun Docking & Fast-Charge"
                            >
                              <RotateCcw className="w-3 h-3 shrink-0" />
                              <span>Kembali ke Dock</span>
                            </button>
                          ) : isAreaAmanInspecting ? (
                            <button
                              onClick={() => setIsAreaAmanInspecting(false)}
                              className="px-2.5 py-1 rounded bg-black/85 hover:bg-black text-sky-300 hover:text-sky-200 border border-sky-500/50 text-[8px] font-mono font-bold backdrop-blur-md transition-all shadow-md flex items-center gap-1 cursor-pointer whitespace-nowrap"
                              title="Tutup Rekaman Udara & Kembali ke Status Aman"
                            >
                              <ShieldCheck className="w-3 h-3 shrink-0" />
                              <span>Tutup Rekaman</span>
                            </button>
                          ) : null}

                          <div className="px-2 py-0.5 rounded bg-black/75 backdrop-blur-xs border border-white/10 text-[8px] font-mono text-[#38bdf8] truncate">
                            {currentClock
                              ? currentClock.replace(/WIB|WITA|WIT/, selectedMission?.timezone_label || 'WIB')
                              : `05:15:00 ${selectedMission?.timezone_label || 'WIB'}`}
                          </div>
                          <div className="text-[7.5px] font-mono text-white/80 bg-black/60 px-1.5 py-0.2 rounded backdrop-blur-xs truncate">
                            {isDockDispatched
                              ? 'AIRBORNE PATROL • 105m'
                              : isAreaAmanInspecting
                              ? 'REKAMAN INSPEKSI UDARA'
                              : droneViewMode === 'rgb'
                              ? 'HD OPTICAL • 1080p'
                              : droneViewMode === 'defog'
                              ? 'NIR DEFOG • ASAP'
                              : `FLIR ${selectedMission?.thermal_max_c || 48.2}°C`}
                          </div>
                        </div>

                        {/* Viewfinder Center Reticle */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          <div className="relative w-10 h-10 opacity-40">
                            <div className="absolute top-1/2 left-0 right-0 h-px bg-white/80" />
                            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/80" />
                            <div className="absolute inset-0 rounded-full border border-white/60" />
                            <div className="absolute -inset-2 rounded-full border border-dashed border-white/30 animate-spin-slow" />
                          </div>
                        </div>

                        {/* Bottom Compass & Telemetry Ribbon */}
                        <div className="absolute bottom-1.5 left-2 right-2 z-10 flex items-center justify-between text-[8px] font-mono text-white/90 bg-black/75 px-2.5 py-1 rounded backdrop-blur-xs border border-white/10">
                          {isDockDispatched ? (
                            <>
                              <div className="flex items-center gap-1.5">
                                <Rocket className="w-3 h-3 text-emerald-400 shrink-0" />
                                <span className="text-emerald-300 font-bold">DRONE AIRBORNE (PATROLI AKTIF)</span>
                                <span className="text-white/30">•</span>
                                <span>ALT: 105m AGL</span>
                                <span className="text-white/30">•</span>
                                <span>BAT: 92%</span>
                              </div>
                              <span className="text-emerald-400">LAT {selectedMission?.lat?.toFixed(4)} LON {selectedMission?.lon?.toFixed(4)}</span>
                            </>
                          ) : isAreaAmanInspecting ? (
                            <>
                              <div className="flex items-center gap-1.5">
                                <ShieldCheck className="w-3 h-3 text-sky-400 shrink-0" />
                                <span className="text-sky-300 font-bold">REKAMAN VERIFIKASI UDARA</span>
                                <span className="text-white/30">•</span>
                                <span>TMA +18cm</span>
                                <span className="text-white/30">•</span>
                                <span>HOTSPOT: NIHIL</span>
                              </div>
                              <span className="text-emerald-400">LAT {selectedMission?.lat?.toFixed(4)} LON {selectedMission?.lon?.toFixed(4)}</span>
                            </>
                          ) : (
                            <>
                              <div className="flex items-center gap-1.5">
                                <Compass className="w-3.5 h-3.5 text-[#38bdf8] transition-transform duration-300" style={{ transform: `rotate(${gimbalYaw}deg)` }} />
                                <span>AZ: <strong className="text-white">{currentAzimuth}°</strong> ({cardinal})</span>
                                <span className="text-white/30">•</span>
                                <span>TILT: {selectedMission?.tilt_deg || -18}°</span>
                                <span className="text-white/30">•</span>
                                <span className="text-cyan-300 font-semibold">{selectedMission?.timezone_label || 'WIB'}</span>
                              </div>
                              <div className="tracking-wider text-[7.5px] text-white/70 hidden sm:flex items-center gap-1 font-mono">
                                <span className={cardinal === 'W' ? 'text-cyan-400 font-bold underline' : ''}>W</span>
                                <span>·</span>
                                <span className={cardinal === 'NW' ? 'text-cyan-400 font-bold underline' : ''}>NW</span>
                                <span>·</span>
                                <span className={cardinal === 'N' ? 'text-cyan-400 font-bold underline' : ''}>[N]</span>
                                <span>·</span>
                                <span className={cardinal === 'NE' ? 'text-cyan-400 font-bold underline' : ''}>NE</span>
                                <span>·</span>
                                <span className={cardinal === 'E' ? 'text-cyan-400 font-bold underline' : ''}>E</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-emerald-400">LAT {selectedMission?.lat?.toFixed(4)} LON {selectedMission?.lon?.toFixed(4)}</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Interactive Drone Docking Dispatch Banner (When Dock Mission Selected) */}
                    {selectedMission?.stream_mode === 'STANDBY_CHARGING' && (
                      <div className={`p-2 rounded-lg border flex items-center justify-between transition-all ${
                        isDockDispatched
                          ? 'bg-gradient-to-r from-emerald-500/15 via-[#181818] to-emerald-500/10 border-emerald-500/40'
                          : 'bg-gradient-to-r from-amber-500/10 via-[#181818] to-amber-500/10 border-amber-500/30'
                      }`}>
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                            isDockDispatched
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}>
                            {isDockDispatched ? <Rocket className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5 fill-amber-400" />}
                          </div>
                          <div className="min-w-0">
                            <div className="text-[10px] font-bold text-[#f8fafc] font-mono truncate">
                              {isDockDispatched ? 'DRONE AIRBORNE // PATROLI UDARA AKTIF' : 'STASIUN DOCKING: SIAGA 1 RE-DISPATCH'}
                            </div>
                            <div className="text-[8.5px] text-[#94a3b8] font-mono truncate">
                              {isDockDispatched
                                ? 'Ketinggian 105m AGL • AI-YOLO Pemindaian Asap & Hotspot Aktif'
                                : 'Baterai 94% Solar Fast-Charge • Pad siap lepas landas otomatis'}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          {!isDockDispatched ? (
                            <button
                              onClick={() => setIsDockDispatched(true)}
                              className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-black font-bold text-[9.5px] font-mono flex items-center gap-1 shadow-md transition-all hover:scale-105 whitespace-nowrap cursor-pointer"
                            >
                              <Rocket className="w-3.5 h-3.5 shrink-0" />
                              <span>Luncurkan Drone</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => setIsDockDispatched(false)}
                              className="px-2.5 py-1 rounded bg-[#202124] hover:bg-[#282c34] text-amber-400 hover:text-amber-300 border border-amber-500/40 font-bold text-[9.5px] font-mono flex items-center gap-1.5 shadow-md transition-all whitespace-nowrap cursor-pointer"
                            >
                              <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                              <span>Kembali ke Dock</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Area Aman Status Banner */}
                    {selectedMission?.stream_mode === 'AREA_AMAN' && (
                      <div className={`p-2 rounded-lg border flex items-center justify-between transition-all ${
                        isAreaAmanInspecting
                          ? 'bg-gradient-to-r from-sky-500/15 via-[#181818] to-sky-500/10 border-sky-500/40'
                          : 'bg-gradient-to-r from-sky-500/10 via-[#181818] to-sky-500/10 border-sky-500/30'
                      }`}>
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div className="w-6 h-6 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 flex items-center justify-center font-bold text-xs shrink-0">
                            {isAreaAmanInspecting ? <Video className="w-3.5 h-3.5 text-sky-400" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-[10px] font-bold text-[#f8fafc] font-mono truncate">
                              {isAreaAmanInspecting ? 'REKAMAN INSPEKSI UDARA AKTIF' : 'WILAYAH AMAN // POS PANTAU STANDBY'}
                            </div>
                            <div className="text-[8.5px] text-[#94a3b8] font-mono truncate">
                              {isAreaAmanInspecting
                                ? 'Patroli Verifikasi Visual • Vegetasi Kubah Gambut Sehat'
                                : 'Kondisi Lahan Gambut Basah (TMA +18cm) • Hotspot Nihil'}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          {!isAreaAmanInspecting ? (
                            <button
                              onClick={() => setIsAreaAmanInspecting(true)}
                              className="px-2.5 py-1 rounded bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 font-bold text-[9.5px] font-mono flex items-center gap-1 shadow-md transition-all hover:scale-105 whitespace-nowrap cursor-pointer"
                            >
                              <Video className="w-3.5 h-3.5 shrink-0" />
                              <span>Tinjau Rekaman</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => setIsAreaAmanInspecting(false)}
                              className="px-2.5 py-1 rounded bg-[#202124] hover:bg-[#282c34] text-sky-300 hover:text-white border border-sky-500/40 font-bold text-[9.5px] font-mono flex items-center gap-1.5 shadow-md transition-all whitespace-nowrap cursor-pointer"
                            >
                              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                              <span>Tutup Rekaman</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* AlertCalifornia Landscape & Eco-Terrain Description Banner */}
                    {selectedMission?.landscape_desc && (
                      <div className="px-2.5 py-1.5 rounded-lg bg-[#14161a] border border-[#2d3139] flex items-center justify-between text-[9px] font-mono shadow-xs">
                        <div className="flex items-center gap-1.5 text-[#e8eaed] truncate">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#38bdf8] shrink-0" />
                          <span className="text-[#38bdf8] font-bold shrink-0">{selectedMission?.region_name?.split(':')[0]}:</span>
                          <span className="text-[#cbd5e1] truncate">{selectedMission?.landscape_desc}</span>
                        </div>
                        <span className="px-1.5 py-0.5 rounded bg-[#202124] text-[8px] text-[#38bdf8] border border-[#38bdf8]/30 font-semibold shrink-0 ml-2">
                          {selectedMission?.camera_lens || '24mm'}
                        </span>
                      </div>
                    )}

                    {/* Interactive PTZ Gimbal Pan, Auto-Sweep Patrol & Zoom Controls */}
                    {selectedMission?.stream_mode === 'STANDBY_CHARGING' && !isDockDispatched ? (
                      <div className="p-2.5 bg-[#181818] border border-amber-500/30 rounded-lg flex items-center justify-between text-[9px] font-mono">
                        <div className="flex items-center gap-2 text-amber-300 min-w-0">
                          <Zap className="w-4 h-4 text-amber-400 shrink-0 fill-amber-400" />
                          <div className="min-w-0">
                            <div className="font-bold text-white truncate">GIMBAL TERKUNCI DI DOCKING BAY (CHARGING)</div>
                            <div className="text-[#94a3b8] text-[8px] truncate">Unit berada di stasiun pengisian. Luncurkan drone untuk kendali PTZ aktif.</div>
                          </div>
                        </div>
                        <button
                          onClick={() => setIsDockDispatched(true)}
                          className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-black font-bold text-[9px] shrink-0 ml-2 shadow transition-all hover:scale-105"
                        >
                          Luncurkan Drone
                        </button>
                      </div>
                    ) : selectedMission?.stream_mode === 'AREA_AMAN' && !isAreaAmanInspecting ? (
                      <div className="p-2.5 bg-[#181818] border border-sky-500/30 rounded-lg flex items-center justify-between text-[9px] font-mono">
                        <div className="flex items-center gap-2 text-sky-300 min-w-0">
                          <ShieldCheck className="w-4 h-4 text-sky-400 shrink-0" />
                          <div className="min-w-0">
                            <div className="font-bold text-white truncate">UNIT STANDBY DI POS PANTAU (WILAYAH AMAN)</div>
                            <div className="text-[#94a3b8] text-[8px] truncate">Kondisi lahan gambut basah dan aman dari karhutla.</div>
                          </div>
                        </div>
                        <button
                          onClick={() => setIsAreaAmanInspecting(true)}
                          className="px-2.5 py-1 rounded bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 font-bold text-[9px] shrink-0 ml-2 shadow transition-all"
                        >
                          Tinjau Patroli
                        </button>
                      </div>
                    ) : (
                      <div className="p-2 bg-[#181818] border border-[#2d3139] rounded-lg flex flex-col gap-1.5 text-[10px]">
                        {/* Row 1: Pan Gimbal Controls & Live Angle */}
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                setIsAutoSweep(false);
                                setGimbalYaw((prev) => Math.max(prev - 8, -20));
                              }}
                              className="px-2 py-1 rounded bg-[#202124] hover:bg-[#282c34] text-[#e8eaed] hover:text-[#38bdf8] border border-[#2d3139] flex items-center gap-1 transition-colors font-mono"
                              title="Putar Gimbal Drone ke Kiri (Pan Left -8°)"
                            >
                              <span>◀ Pan Kiri</span>
                              <span className="text-[8px] text-[#9aa0a6]">(-8°)</span>
                            </button>

                            <button
                              onClick={() => {
                                setIsAutoSweep(false);
                                setGimbalYaw(0);
                                setPtzZoom(1);
                              }}
                              className={`px-1.5 py-1 rounded border border-[#2d3139] transition-colors flex items-center gap-1 ${
                                gimbalYaw !== 0 || ptzZoom !== 1
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                                  : 'bg-[#202124] text-[#9aa0a6] hover:text-[#e8eaed]'
                              }`}
                              title="Reset Gimbal ke Posisi Netral Tengah (0°)"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span className="text-[9px]">Reset</span>
                            </button>

                            <button
                              onClick={() => {
                                setIsAutoSweep(false);
                                setGimbalYaw((prev) => Math.min(prev + 8, 20));
                              }}
                              className="px-2 py-1 rounded bg-[#202124] hover:bg-[#282c34] text-[#e8eaed] hover:text-[#38bdf8] border border-[#2d3139] flex items-center gap-1 transition-colors font-mono"
                              title="Putar Gimbal Drone ke Kanan (Pan Right +8°)"
                            >
                              <span>Pan Kanan ▶</span>
                              <span className="text-[8px] text-[#9aa0a6]">(+8°)</span>
                            </button>
                          </div>

                          {/* Live Gimbal Telemetry Badge */}
                          <div className="px-2 py-0.5 rounded bg-[#101216] border border-[#2d3139] font-mono text-[9px] flex items-center gap-1">
                            <span className="text-white/40">GIMBAL:</span>
                            <strong className={gimbalYaw !== 0 ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
                              {gimbalYaw > 0 ? `+${gimbalYaw}°` : `${gimbalYaw}°`}
                            </strong>
                          </div>
                        </div>

                        {/* Row 2: Auto-Sweep, Zoom & Map Pin */}
                        <div className="flex items-center justify-between gap-1 pt-1.5 border-t border-[#2d3139]/50">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setIsAutoSweep((prev) => !prev)}
                              className={`px-2 py-0.5 rounded border text-[9px] font-mono flex items-center gap-1.5 transition-all ${
                                isAutoSweep
                                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.3)] animate-pulse font-semibold'
                                  : 'bg-[#202124] border-[#2d3139] text-[#9aa0a6] hover:text-[#e8eaed]'
                              }`}
                              title="Aktifkan Mode Patroli Sapuan Otomatis (Auto-Sweep Patrol)"
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${isAutoSweep ? 'bg-cyan-400 animate-ping' : 'bg-[#5f6368]'}`} />
                              <span>Auto-Sweep {isAutoSweep ? 'ON' : 'OFF'}</span>
                            </button>

                            <div className="h-3.5 w-px bg-[#2d3139] mx-0.5" />

                            <button
                              onClick={() => setPtzZoom((prev) => Math.min(prev + 0.25, 2.0))}
                              className="px-1.5 py-0.5 rounded bg-[#202124] hover:bg-[#282c34] text-[#e8eaed] border border-[#2d3139] flex items-center gap-1 transition-colors font-mono text-[9px]"
                              title="Zoom Optik In"
                            >
                              <ZoomIn className="w-3 h-3 text-[#38bdf8]" />
                              <span>{ptzZoom.toFixed(1)}x</span>
                            </button>

                            <button
                              onClick={() => setPtzZoom((prev) => Math.max(prev - 0.25, 1.0))}
                              className="px-1.5 py-0.5 rounded bg-[#202124] hover:bg-[#282c34] text-[#9aa0a6] hover:text-[#e8eaed] border border-[#2d3139] transition-colors"
                              title="Zoom Optik Out"
                            >
                              <ZoomOut className="w-3 h-3" />
                            </button>
                          </div>

                          {/* Ke Peta Location Pin */}
                          <button
                            onClick={() => {
                              if (selectedMission && onFlyTo) {
                                onFlyTo(selectedMission.lon, selectedMission.lat, 13);
                              }
                            }}
                            className="px-2 py-0.5 rounded bg-blue-600/30 hover:bg-blue-600/50 text-[#38bdf8] border border-blue-500/40 flex items-center gap-1 font-medium transition-colors text-[9.5px]"
                            title="Pusatkan Peta Web GIS ke Koordinat Kamera Ini"
                          >
                            <MapPin className="w-3 h-3" />
                            <span>Ke Peta</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Tool POC: Proof of Concept Scope */}
            {activeTool === 'poc' && (
              <div className="space-y-4">
                {/* Notice callout */}
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg space-y-2">
                  <div className="flex items-center gap-2 text-amber-300 font-semibold text-xs">
                    <FlaskConical className="w-4 h-4 shrink-0 text-amber-400" />
                    <span>Cakupan Uji Coba Lapangan (Demo POC)</span>
                  </div>
                  <p className="text-[11px] text-[#cbd5e1] leading-relaxed">
                    Platform JEJAK API pada versi demo ini difokuskan pada <strong className="text-amber-200">6 wilayah gambut paling rawan kebakaran</strong> di Indonesia (mencakup 55.532 titik pantau seluas 55.000 km²).
                  </p>
                  <div className="p-2.5 bg-amber-500/15 border border-amber-500/40 rounded text-[11px] text-amber-200 flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-amber-300 block mb-0.5">Penjelasan Area Tanpa Kotak:</strong>
                      Area di luar 6 wilayah ini yang tampak kosong di peta <u>BUKAN</u> berarti pasti bebas dari api, melainkan belum dimasukkan ke dalam pemodelan demo percontohan ini.
                    </div>
                  </div>
                </div>

                {/* 6 Region quick fly-to list */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-[#9aa0a6]">
                    <span className="uppercase tracking-wider font-semibold text-[#e8eaed]">6 Wilayah Pantauan Utama</span>
                    <span className="font-mono text-[10px] text-[#38bdf8]">55.532 Kotak Pantau</span>
                  </div>
                  {POC_REGIONS_LIST.map((reg) => (
                    <div
                      key={reg.id}
                      className="p-2.5 bg-[#181818] border border-[#2d3139] hover:border-[#3c4048] rounded-lg transition-colors flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-[#e8eaed] truncate">{reg.name}</div>
                        <div className="text-[10px] text-[#9aa0a6] truncate">{reg.detail}</div>
                      </div>
                      <button
                        onClick={() => {
                          if (onFlyTo) onFlyTo(reg.lon, reg.lat, reg.zoom);
                        }}
                        className="px-2.5 py-1 rounded bg-[#25282c] hover:bg-[#303640] border border-[#383d46] text-[#38bdf8] text-[10px] font-medium whitespace-nowrap transition-colors shrink-0"
                        title={`Arahkan peta ke ${reg.name}`}
                      >
                        Lihat Peta &rarr;
                      </button>
                    </div>
                  ))}
                </div>

                {/* Rationale & Architecture */}
                <div className="p-3 bg-[#181818] border border-[#2d3139] rounded-lg space-y-2 text-[11px] text-[#9aa0a6]">
                  <div className="text-xs font-semibold text-[#e8eaed] flex items-center gap-1.5">
                    <Rocket className="w-3.5 h-3.5 text-[#38bdf8]" />
                    <span>Mengapa Dimulai dari 6 Wilayah Ini?</span>
                  </div>
                  <ul className="space-y-1.5 pl-3.5 list-disc text-[10px] text-[#cbd5e1] leading-relaxed">
                    <li>
                      <strong>Fokus Uji Akurasi Nyata:</strong> Membuktikan ketepatan kecerdasan buatan (AI) memprediksi kebakaran gambut sebelum api membesar di lokasi-lokasi paling kritis di Indonesia.
                    </li>
                    <li>
                      <strong>Data Tanah & Lingkungan Lengkap:</strong> Setiap kotak 1 km² menggabungkan data parit saluran air gambut, akses jalan, sungai, peta kedalaman gambut, dan cuaca BMKG.
                    </li>
                    <li>
                      <strong>Akses Peta Sangat Cepat:</strong> Menggunakan database modern berkecepatan tinggi sehingga jutaan data peta terbuka instan tanpa jeda (&lt;20 ms).
                    </li>
                  </ul>
                  {onOpenPocModal && (
                    <button
                      onClick={onOpenPocModal}
                      className="w-full mt-2 py-2 px-3 bg-[#24272f] hover:bg-[#2d323c] border border-[#3c424f] text-[#38bdf8] rounded text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Info className="w-3.5 h-3.5" />
                      <span>Buka Dokumen Rinci Metodologi & Riset</span>
                    </button>
                  )}
                </div>
              </div>
            )}
    </div>
  );

  return (
    <>
      {/* 1. Mobile Drawer & Backdrop (Full-height slide-over at z-50, immune to parent stacking context) */}
      {isExpanded && (
        <div className="md:hidden fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
            onClick={() => setIsExpanded(false)}
            aria-label="Tutup panel sidebar"
          />

          {/* Slide-over Drawer (full height, properly in front of backdrop) */}
          <div
            id="tour-panel-content-mobile"
            className="fixed inset-y-0 left-0 w-[320px] sm:w-[360px] max-w-[86vw] h-full bg-[#202124] border-r border-[#2d3139] flex flex-col shadow-2xl z-10 animate-in slide-in-from-left duration-200"
          >
            {/* Drawer Header */}
            <div className="h-12 px-3.5 border-b border-[#2d3139] flex items-center justify-between bg-[#1c1d20] shrink-0">
              <span className="font-semibold text-xs text-[#e8eaed] uppercase tracking-wider flex items-center gap-2 truncate">
                {navItems.find((n) => n.id === activeTool)?.label}
              </span>
              <button
                onClick={() => setIsExpanded(false)}
                className="text-[#9aa0a6] hover:text-[#e8eaed] p-1.5 rounded-full hover:bg-[#282c34] transition-colors cursor-pointer shrink-0"
                title="Tutup Menu Alat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mobile Tool Switcher Tabs (Horizontally scrollable with clean pills) */}
            <div className="flex items-center gap-1.5 p-2 bg-[#181818] border-b border-[#2d3139] shrink-0 overflow-x-auto scrollbar-none">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTool === item.id;
                const isPoc = item.id === 'poc';
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTool(item.id)}
                    className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 shrink-0 transition-all text-xs cursor-pointer ${
                      isActive
                        ? isPoc
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-sm font-semibold'
                          : 'bg-[#282c34] text-[#38bdf8] border border-[#38bdf8]/40 shadow-sm font-semibold'
                        : isPoc
                        ? 'text-amber-400/80 hover:text-amber-300 hover:bg-[#202124] border border-transparent'
                        : 'text-[#9aa0a6] hover:text-[#e8eaed] hover:bg-[#202124] border border-transparent'
                    }`}
                    title={item.label}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-[11px] font-medium whitespace-nowrap">
                      {item.shortLabel || item.id.toUpperCase()}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Panel Content Body */}
            {renderActiveToolContent()}
          </div>
        </div>
      )}

      {/* 2. Desktop Docked Rail & Panel (>= md screens) */}
      <aside className="hidden md:flex relative h-[calc(100vh-52px)] z-20 shrink-0 select-none">
        {/* Icon Rail */}
        <div id="tour-left-rail" className="w-[56px] h-full bg-[#181818] border-r border-[#2d3139] flex flex-col items-center py-3 justify-between">
          <div className="flex flex-col items-center gap-1.5 w-full px-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTool === item.id && isExpanded;
              const isPoc = item.id === 'poc';
              return (
                <button
                  key={item.id}
                  id={`tour-tool-${item.id}`}
                  onClick={() => handleToolClick(item.id)}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors relative group cursor-pointer ${
                    isActive
                      ? isPoc
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-sm'
                        : 'bg-[#282c34] text-[#8ab4f8] shadow-sm'
                      : isPoc
                      ? 'text-amber-400 hover:text-amber-300 hover:bg-amber-500/10'
                      : 'text-[#9aa0a6] hover:text-[#e8eaed] hover:bg-[#202124]'
                  }`}
                  title={item.label}
                >
                  <Icon className="w-5 h-5" />
                  {!isExpanded && (
                    <div className="absolute left-12 ml-2 px-2.5 py-1 bg-[#202124] border border-[#303134] text-[#e8eaed] text-xs font-medium rounded shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                      {item.label}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Expand/Collapse Toggle Button */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-8 h-8 rounded-full bg-[#202124] hover:bg-[#2d3137] border border-[#303134] text-[#9aa0a6] hover:text-[#e8eaed] flex items-center justify-center transition-colors cursor-pointer"
            title={isExpanded ? 'Tutup Panel' : 'Buka Panel'}
          >
            {isExpanded ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>

        {/* Expanded Content Panel on Desktop */}
        {isExpanded && (
          <div
            id="tour-panel-content"
            className={`relative ${
              activeTool === 'f6' ? 'w-[460px]' : 'w-[360px]'
            } h-full bg-[#202124] border-r border-[#2d3139] flex flex-col shadow-2xl animate-in slide-in-from-left duration-200 transition-all`}
          >
            {/* Panel Header */}
            <div className="h-12 px-4 border-b border-[#2d3139] flex items-center justify-between bg-[#1c1d20] shrink-0">
              <span className="font-medium text-xs text-[#e8eaed] uppercase tracking-wider flex items-center gap-2">
                {navItems.find((n) => n.id === activeTool)?.label}
              </span>
              <button
                onClick={() => setIsExpanded(false)}
                className="text-[#9aa0a6] hover:text-[#e8eaed] p-1.5 rounded-full hover:bg-[#282c34] transition-colors cursor-pointer"
                title="Tutup Menu Alat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Panel Content Body */}
            {renderActiveToolContent()}
          </div>
        )}
      </aside>
    </>
  );
};

export default LeftSidebar;
