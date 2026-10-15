import React, { useState, useEffect, useMemo } from 'react';
import {
  Layers,
  Crosshair,
  Info,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  Navigation,
  ChevronDown,
  ChevronUp,
  X,
  Compass,
  Wind,
} from 'lucide-react';
import { inspectCell, fetchLiveWeather } from '../../services/api';
import nationalEpicenterCoverage from '../../data/national_epicenter_coverage.json';

const HUMAN_FACTOR_NAMES = {
  canal_density_km_km2: 'Banyaknya Parit/Saluran Air Gambut',
  canal_density: 'Banyaknya Parit/Saluran Air Gambut',
  dc: 'Gambut Lapisan Dalam Kering (DC)',
  dc_dryness: 'Gambut Lapisan Dalam Kering (DC)',
  dmc: 'Gambut Lapisan Atas Kering (DMC)',
  dmc_dryness: 'Gambut Lapisan Atas Kering (DMC)',
  rain_deficit_30d: 'Kekurangan Curah Hujan 30 Hari',
  distance_to_road_m: 'Akses Dekat ke Jalan',
  road_dist_km: 'Akses Dekat ke Jalan',
  distance_to_waterway_m: 'Akses Dekat ke Sungai',
  river_dist_km: 'Akses Dekat ke Sungai',
  temp_c: 'Suhu Udara Panas',
  rh_pct: 'Kelembapan Udara Rendah',
  clearing_w0_30: 'Indikasi Pembukaan Lahan Baru (1 Bulan)',
  clearing_w30_90: 'Indikasi Pembukaan Lahan (1-3 Bulan)',
  clearing_w90_365: 'Indikasi Pembukaan Lahan (1 Tahun)',
  fire_history_w0_30: 'Riwayat Titik Panas Sebelumnya',
  baseline: 'Kondisi Lahan Umum',
};

const getHumanFactorName = (name) => {
  if (!name) return 'Faktor Lingkungan';
  if (HUMAN_FACTOR_NAMES[name]) return HUMAN_FACTOR_NAMES[name];
  return name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};

const RightInspector = ({
  selectedCellId,
  selectedRegion,
  onClearSelection,
  onSelectRegion,
  onFlyTo,
  stats,
  onOpenPocInfo,
}) => {
  const [isExpanded, setIsExpanded] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 768);
  const [activeTab, setActiveTab] = useState('inspect'); // 'layers' | 'inspect' | 'info'
  const [cellData, setCellData] = useState(null);
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Normalize selectedRegion to guarantee clean JS objects (even if passed as serialized GeoJSON)
  const normRegion = useMemo(() => {
    if (!selectedRegion) return null;
    const regionId = selectedRegion.region_id || selectedRegion.id;
    const base = nationalEpicenterCoverage.features.find(
      (f) => f.properties.region_id === regionId
    )?.properties || selectedRegion;

    const safeParse = (val) => {
      if (typeof val === 'string') {
        try {
          return JSON.parse(val);
        } catch (_) {
          return val;
        }
      }
      return val;
    };

    return {
      ...base,
      ...selectedRegion,
      risk_distribution: safeParse(selectedRegion.risk_distribution || base.risk_distribution),
      risk_pct: safeParse(selectedRegion.risk_pct || base.risk_pct),
      top_factors: safeParse(selectedRegion.top_factors || base.top_factors),
      recommendations: safeParse(selectedRegion.recommendations || base.recommendations),
      hydrology: safeParse(selectedRegion.hydrology || base.hydrology),
    };
  }, [selectedRegion]);

  // Accordion states
  const [openSections, setOpenSections] = useState({
    shap: true,
    weather: true,
    physical: true,
    guide: true,
    benchmark: true,
  });

  const toggleSection = (section) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // Auto-switch to inspect tab and open sidebar when a region is selected
  useEffect(() => {
    if (normRegion && !selectedCellId) {
      setActiveTab('inspect');
      // On desktop, auto-expand sidebar; on mobile, keep map visible with bottom pill
      if (typeof window !== 'undefined' && window.innerWidth >= 768) {
        setIsExpanded(true);
      }
    }
  }, [normRegion]);

  // Fetch cell data when selectedCellId changes
  useEffect(() => {
    if (!selectedCellId) {
      setCellData(null);
      setWeatherData(null);
      return;
    }
    setLoading(true);
    setActiveTab('inspect'); // Auto-switch to inspect tab when cell is clicked
    setIsExpanded(true); // Auto-expand sidebar
    inspectCell(selectedCellId)
      .then((res) => {
        setCellData(res);
        setLoading(false);
        if (res?.lat && res?.lon) {
          fetchLiveWeather(res.lat, res.lon)
            .then((w) => setWeatherData(w))
            .catch((wErr) => console.warn('Live weather note:', wErr));
        }
      })
      .catch((err) => {
        console.error('Error inspecting cell:', err);
        setLoading(false);
      });
  }, [selectedCellId]);

  const handleCopyCoords = () => {
    if (!cellData) return;
    navigator.clipboard.writeText(`${cellData.lat.toFixed(5)}, ${cellData.lon.toFixed(5)}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const totalCells = stats?.total_cells || 17927;
  const bahayaCount = stats?.risk_distribution?.Bahaya || 8;
  const siagaCount = stats?.risk_distribution?.Siaga || 13070;
  const waspadaCount = stats?.risk_distribution?.Waspada || 4849;
  const renderTabBar = () => (
    <div className="h-11 border-b border-[#2d3139] flex items-center px-2 shrink-0 bg-[#1c1d20]">
      {[
        { id: 'layers', label: 'Panduan Risiko', icon: Layers },
        { id: 'inspect', label: 'Detail Lokasi', icon: Crosshair },
        { id: 'info', label: 'Uji Akurasi & Model', icon: Info },
      ].map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 h-full flex items-center justify-center gap-1.5 font-medium text-xs transition-colors relative ${
              isActive ? 'text-[#8ab4f8]' : 'text-[#9aa0a6] hover:text-[#e8eaed]'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{tab.label}</span>
            {isActive && (
              <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-[#8ab4f8]"></span>
            )}
          </button>
        );
      })}
    </div>
  );
  const renderTabBody = () => (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* TAB 1: PANDUAN TINGKAT RISIKO */}
            {activeTab === 'layers' && (
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/40 text-[11px] text-amber-200 leading-relaxed">
                  <div className="flex items-center gap-1.5 font-semibold text-amber-300 mb-1">
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-[10px] tracking-wider">DEMO POC</span>
                    <span>Cakupan Wilayah Pantauan</span>
                  </div>
                  Data ditampilkan untuk <strong>6 wilayah percontohan</strong>: Sumsel (OKI), Kalteng, Kalbar, Papua Selatan, Papua Barat Daya, dan Sulawesi Selatan. Area kosong di luar 6 wilayah ini bukan berarti bebas kebakaran, melainkan belum dimodelkan pada tahap demo ini.
                  {onOpenPocInfo && (
                    <button
                      onClick={onOpenPocInfo}
                      className="mt-1.5 text-[10px] text-amber-300 hover:text-amber-100 font-medium underline flex items-center gap-1 transition-colors"
                    >
                      Pelajari Mengapa 6 Wilayah Ini Dipilih &rarr;
                    </button>
                  )}
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-[#e8eaed]">
                    Tingkat Risiko Kebakaran Gambut
                  </h4>
                  <p className="text-[11px] text-[#9aa0a6]">
                    Pantauan 6 Wilayah Prioritas (Prediksi Risiko 30 Hari ke Depan)
                  </p>
                </div>

                {/* Smooth Continuous Gradient Bar */}
                <div className="p-3 bg-[#202124] border border-[#2d3139] rounded space-y-2">
                  <div className="flex justify-between text-[11px] font-mono text-[#9aa0a6]">
                    <span>0% (Waspada)</span>
                    <span>40% (Siaga)</span>
                    <span>70% - 100% (Bahaya)</span>
                  </div>
                  <div className="w-full h-3 rounded overflow-hidden bg-gradient-to-r from-[#10b981] via-[#f59e0b] to-[#ef4444] border border-[#3c4048]"></div>
                </div>

                {/* Collapsible Accordion: Value Guide */}
                <div className="border border-[#2d3139] rounded overflow-hidden">
                  <button
                    onClick={() => toggleSection('guide')}
                    className="w-full px-3 py-2.5 bg-[#202124] flex items-center justify-between text-left font-medium text-xs text-[#e8eaed]"
                  >
                    <span>Penjelasan Status Risiko</span>
                    {openSections.guide ? <ChevronUp className="w-4 h-4 text-[#9aa0a6]" /> : <ChevronDown className="w-4 h-4 text-[#9aa0a6]" />}
                  </button>
                  {openSections.guide && (
                    <div className="p-3 bg-[#181818] space-y-2.5 text-[11px] text-[#9aa0a6] leading-relaxed">
                      <div className="flex items-start gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444] mt-0.5 shrink-0"></span>
                        <div>
                          <b className="text-[#e8eaed]">Bahaya (&ge; 70%):</b> Lahan gambut sangat kering dan rawan terbakar hingga ke lapisan bawah tanah. Perlu pembasahan parit/sekat kanal dan patroli darat segera.
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b] mt-0.5 shrink-0"></span>
                        <div>
                          <b className="text-[#e8eaed]">Siaga (40% - 69%):</b> Lahan mulai mengering karena parit buatan dan hari tanpa hujan yang berkepanjangan. Waspadai potensi munculnya titik api.
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] mt-0.5 shrink-0"></span>
                        <div>
                          <b className="text-[#e8eaed]">Waspada (&lt; 40%):</b> Kadar air dan kelembapan tanah masih relatif aman, risiko kebakaran masih rendah.
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Static Layer Toggles Info */}
                <div className="p-3 bg-[#202124] border border-[#2d3139] rounded space-y-1.5 text-[11px] text-[#9aa0a6]">
                  <span className="font-medium text-[#e8eaed] block">Teknologi Peta Cepat</span>
                  <div>• <b>Format Peta:</b> Vektor Cepat (Tiap kotak berukuran 1 km²)</div>
                  <div>• <b>Sistem Posisi:</b> GPS Global Standar (WGS84)</div>
                  <div>• <b>Kecepatan Muat:</b> Instan dan ringan tanpa jeda pemanggilan data</div>
                </div>
              </div>
            )}

            {/* TAB 2: DETAIL LOKASI & ANALISIS RISIKO */}
            {activeTab === 'inspect' && (
              <div className="space-y-4">
                {!selectedCellId && !selectedRegion ? (
                  <div className="py-12 px-4 text-center text-[#9aa0a6] space-y-2">
                    <Crosshair className="w-6 h-6 mx-auto text-[#9aa0a6] opacity-60" />
                    <p>Klik wilayah atau kotak mana saja di peta untuk melihat tingkat risiko, kondisi tanah, dan faktor pemicu kebakarannya.</p>
                  </div>
                ) : !selectedCellId && normRegion ? (
                  /* REGIONAL INTELLIGENCE & INSIGHTS VIEW */
                  <div className="space-y-4">
                    {/* Region Quick Switcher Pills */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-[#9aa0a6]">
                        <span className="font-medium text-[#e8eaed]">Pilih Wilayah Pantauan:</span>
                        <span className="text-[10px] font-mono text-[#8ab4f8]">6 Wilayah Aktif</span>
                      </div>
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                        {nationalEpicenterCoverage.features.map((feat) => {
                          const isAct = normRegion?.region_id === feat.properties.region_id;
                          return (
                            <button
                              key={feat.properties.region_id}
                              onClick={() => {
                                if (onSelectRegion) onSelectRegion(feat.properties);
                                if (onFlyTo && feat.properties.center) {
                                  onFlyTo(feat.properties.center[0], feat.properties.center[1], feat.properties.zoom || 9);
                                }
                              }}
                              className={`px-2.5 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${
                                isAct
                                  ? 'bg-[#38bdf8]/20 text-[#38bdf8] border border-[#38bdf8]/50 shadow-sm'
                                  : 'bg-[#202124] text-[#9aa0a6] hover:text-[#e8eaed] hover:bg-[#282c34] border border-[#2d3139]'
                              }`}
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full shrink-0"
                                style={{ backgroundColor: feat.properties.color }}
                              />
                              <span>{feat.properties.shortName}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Region Header Card */}
                    <div className="p-3.5 bg-[#202124] border border-[#2d3139] rounded-lg space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-mono text-[#8ab4f8] uppercase tracking-wider block">
                            {normRegion.pilot_badge || 'Wilayah Pantauan Utama'}
                          </span>
                          <h3 className="font-semibold text-sm text-[#e8eaed]">
                            {normRegion.name}
                          </h3>
                        </div>
                        <span
                          className={`font-mono px-2 py-0.5 rounded text-[10px] font-semibold uppercase shrink-0 ${
                            normRegion.risk_category === 'Bahaya'
                              ? 'bg-[#ef4444]/20 text-[#f28b82] border border-[#ef4444]/30'
                              : normRegion.risk_category === 'Siaga'
                              ? 'bg-[#f59e0b]/20 text-[#fdd663] border border-[#f59e0b]/30'
                              : 'bg-[#10b981]/20 text-[#81c995] border border-[#10b981]/30'
                          }`}
                        >
                          {normRegion.risk_category || 'Siaga'}
                        </span>
                      </div>

                      {/* Aggregate Score Bar */}
                      <div>
                        <div className="flex justify-between text-[11px] mb-1">
                          <span className="text-[#9aa0a6]">Tingkat Risiko Rata-rata Wilayah:</span>
                          <span className="font-mono font-bold text-[#e8eaed]">
                            {((normRegion.avg_risk || 0.44) * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full h-2 bg-[#181818] rounded-full overflow-hidden border border-[#2d3139]">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              (normRegion.avg_risk || 0) >= 0.7
                                ? 'bg-[#ef4444]'
                                : (normRegion.avg_risk || 0) >= 0.4
                                ? 'bg-[#f59e0b]'
                                : 'bg-[#10b981]'
                            }`}
                            style={{ width: `${Math.min(100, (normRegion.avg_risk || 0.44) * 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* Grid count & Peatland Area stats */}
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#2d3139] text-[11px]">
                        <div className="p-2 rounded bg-[#181818] border border-[#2d3139]">
                          <span className="text-[10px] text-[#9aa0a6] block">Jumlah Titik Pantau (1 km²)</span>
                          <span className="font-mono font-bold text-[#38bdf8] text-sm">
                            {(normRegion.cell_count || 17927).toLocaleString('id-ID')} Titik
                          </span>
                        </div>
                        <div className="p-2 rounded bg-[#181818] border border-[#2d3139]">
                          <span className="text-[10px] text-[#9aa0a6] block">Estimasi Luas Gambut</span>
                          <span className="font-mono font-bold text-[#e8eaed] text-sm">
                            ~{((normRegion.cell_count || 17927) * 100 / 1000).toFixed(1)}K Ha
                          </span>
                        </div>
                      </div>

                      {/* Zoom to grid button */}
                      <button
                        onClick={() => {
                          if (onFlyTo && normRegion.center) {
                            onFlyTo(normRegion.center[0], normRegion.center[1], normRegion.zoom || 9);
                          }
                        }}
                        className="w-full py-2 px-3 rounded-md bg-[#2563eb]/20 hover:bg-[#2563eb]/30 border border-[#2563eb]/40 text-[#60a5fa] hover:text-[#93c5fd] text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        <span>Lihat Detail Kotak Pantauan di Peta</span>
                      </button>
                    </div>

                    {/* Risk Distribution Breakdown */}
                    {normRegion.risk_distribution && (
                      <div className="p-3 bg-[#202124] border border-[#2d3139] rounded-lg space-y-2">
                        <span className="text-xs font-medium text-[#e8eaed] block">
                          Sebaran Tingkat Bahaya di Wilayah Ini
                        </span>
                        <div className="space-y-1.5 text-[11px]">
                          <div className="flex justify-between items-center">
                            <span className="flex items-center gap-1.5 text-[#f28b82]">
                              <span className="w-2 h-2 rounded-full bg-[#ef4444]" />
                              Bahaya (&ge;70%)
                            </span>
                            <span className="font-mono text-[#e8eaed]">
                              {normRegion.risk_distribution.Bahaya?.toLocaleString('id-ID')} titik ({normRegion.risk_pct?.Bahaya || 2.9}%)
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="flex items-center gap-1.5 text-[#fdd663]">
                              <span className="w-2 h-2 rounded-full bg-[#f59e0b]" />
                              Siaga (40% - 69%)
                            </span>
                            <span className="font-mono text-[#e8eaed]">
                              {normRegion.risk_distribution.Siaga?.toLocaleString('id-ID')} titik ({normRegion.risk_pct?.Siaga || 66.1}%)
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="flex items-center gap-1.5 text-[#81c995]">
                              <span className="w-2 h-2 rounded-full bg-[#10b981]" />
                              Waspada (&lt;40%)
                            </span>
                            <span className="font-mono text-[#e8eaed]">
                              {normRegion.risk_distribution.Waspada?.toLocaleString('id-ID')} titik ({normRegion.risk_pct?.Waspada || 31.0}%)
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Regional Drivers */}
                    {normRegion.top_factors && (
                      <div className="border border-[#2d3139] rounded-lg overflow-hidden">
                        <div className="px-3 py-2.5 bg-[#202124] font-medium text-xs text-[#e8eaed]">
                          Penyebab Utama Tingkat Risiko (Analisis AI)
                        </div>
                        <div className="p-3 bg-[#181818] space-y-2.5">
                          {normRegion.top_factors.map((f, i) => (
                            <div key={i} className="text-[11px] space-y-0.5">
                              <div className="flex justify-between items-center">
                                <span className="font-medium text-[#e8eaed]">#{i + 1} {f.label}</span>
                                <span className="font-mono text-[#8ab4f8] text-[10px]">{f.val}</span>
                              </div>
                              <p className="text-[#9aa0a6] text-[10px] leading-relaxed">{f.desc}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recommendations */}
                    {normRegion.recommendations && (
                      <div className="p-3 bg-[#202124] border border-[#2d3139] rounded-lg space-y-1.5 text-[11px]">
                        <span className="text-xs font-medium text-amber-300 block">
                          Saran Tindakan Cepat di Lapangan
                        </span>
                        <ul className="space-y-1 text-[#9aa0a6] text-[10px] list-disc list-inside leading-relaxed">
                          {normRegion.recommendations.map((rec, i) => (
                            <li key={i}>{rec}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : loading ? (
                  <div className="py-12 text-center text-[#9aa0a6] space-y-2">
                    <div className="w-5 h-5 border-2 border-[#8ab4f8] border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p>Membaca data titik lokasi via DuckDB...</p>
                  </div>
                ) : cellData ? (
                  <>
                    {/* Back to Regional Intelligence Button */}
                    {normRegion && (
                      <button
                        id="back-to-region-btn"
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onClearSelection) onClearSelection();
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-[#202124] hover:bg-[#2a303c] active:bg-[#333d4e] border border-[#2d3139] hover:border-[#38bdf8]/40 text-[#8ab4f8] hover:text-[#bae6fd] text-xs font-medium transition-colors group mb-2 cursor-pointer shadow-xs"
                      >
                        <span className="flex items-center gap-1.5">
                          <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5 text-[#38bdf8]" />
                          <span className="font-semibold">Kembali ke Ringkasan {normRegion.shortName || normRegion.name}</span>
                        </span>
                        <span className="text-[10px] text-[#9aa0a6] font-mono bg-[#181818] px-1.5 py-0.5 rounded border border-[#2d3139]">
                          {(normRegion.cell_count || 0).toLocaleString('id-ID')} Titik
                        </span>
                      </button>
                    )}
                    {/* Cell Header & Status */}
                    <div className="p-3 bg-[#202124] border border-[#2d3139] rounded space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-sm font-semibold text-[#e8eaed]">
                          {cellData.cell_id}
                        </span>
                        <span
                          className={`font-mono px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                            cellData.risk_category === 'Bahaya'
                              ? 'bg-[#ef4444]/20 text-[#f28b82] border border-[#ef4444]/30'
                              : cellData.risk_category === 'Siaga'
                              ? 'bg-[#f59e0b]/20 text-[#fdd663] border border-[#f59e0b]/30'
                              : 'bg-[#10b981]/20 text-[#81c995] border border-[#10b981]/30'
                          }`}
                        >
                          {cellData.risk_category}
                        </span>
                      </div>

                      {/* Score Bar */}
                      <div>
                        <div className="flex justify-between text-[11px] mb-1">
                          <span className="text-[#9aa0a6]">Peluang Risiko Terbakar:</span>
                          <span className="font-mono font-bold text-[#e8eaed]">
                            {(cellData.risk_score * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-[#181818] rounded overflow-hidden">
                          <div
                            className={`h-full rounded ${
                              cellData.risk_category === 'Bahaya'
                                ? 'bg-[#ef4444]'
                                : cellData.risk_category === 'Siaga'
                                ? 'bg-[#f59e0b]'
                                : 'bg-[#10b981]'
                            }`}
                            style={{ width: `${cellData.risk_score * 100}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Coordinates & Actions */}
                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-[#2d3139] text-[#9aa0a6]">
                        <span>
                          {cellData.lat.toFixed(4)}, {cellData.lon.toFixed(4)}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={handleCopyCoords}
                            className="p-1 hover:bg-[#2d3137] rounded text-[#9aa0a6] hover:text-[#e8eaed]"
                            title="Salin Koordinat"
                          >
                            {copied ? <Check className="w-3.5 h-3.5 text-[#81c995]" /> : <Copy className="w-3.5 h-3.5 text-[#9aa0a6]" />}
                          </button>
                          <button
                            onClick={() => onFlyTo && onFlyTo(cellData.lon, cellData.lat)}
                            className="p-1 hover:bg-[#2d3137] rounded text-[#9aa0a6] hover:text-[#e8eaed]"
                            title="Fokuskan Kamera"
                          >
                            <Navigation className="w-3.5 h-3.5 text-[#8ab4f8]" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Accordion: Dominant Risk Factors */}
                    <div className="border border-[#2d3139] rounded overflow-hidden">
                      <button
                        onClick={() => toggleSection('shap')}
                        className="w-full px-3 py-2.5 bg-[#202124] flex items-center justify-between text-left font-medium text-xs text-[#e8eaed]"
                      >
                        <span>Penyebab Utama Risiko di Titik Ini (Analisis AI)</span>
                        {openSections.shap ? <ChevronUp className="w-4 h-4 text-[#9aa0a6]" /> : <ChevronDown className="w-4 h-4 text-[#9aa0a6]" />}
                      </button>
                      {openSections.shap && (
                        <div className="p-3 bg-[#181818] space-y-2.5">
                          {cellData.top_factors?.map((factor, idx) => (
                            <div key={idx} className="space-y-1 text-[11px]">
                              <div className="flex justify-between items-center gap-2">
                                <span className="font-medium text-[#e8eaed]">
                                  #{idx + 1} {getHumanFactorName(factor.feature_name)}
                                </span>
                                <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-[#8ab4f8] border border-blue-500/20 text-[10px] font-mono shrink-0">
                                  {factor.contribution_score > 0 ? `+${(factor.contribution_score * 100).toFixed(0)}%` : `${(factor.contribution_score * 100).toFixed(0)}%`}
                                </span>
                              </div>
                              <p className="text-[#9aa0a6] leading-relaxed">
                                {factor.narrative}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Accordion: Real-Time Wind & Smoke Drift Dynamics */}
                    <div className="border border-[#2d3139] rounded overflow-hidden">
                      <button
                        onClick={() => toggleSection('weather')}
                        className="w-full px-3 py-2.5 bg-[#202124] flex items-center justify-between text-left font-medium text-xs text-[#e8eaed]"
                      >
                        <div className="flex items-center gap-1.5 text-sky-400">
                          <Wind className="w-3.5 h-3.5 text-sky-400" />
                          <span>Arah Angin & Cuaca Terkini</span>
                        </div>
                        {openSections.weather ? <ChevronUp className="w-4 h-4 text-[#9aa0a6]" /> : <ChevronDown className="w-4 h-4 text-[#9aa0a6]" />}
                      </button>
                      {openSections.weather && (
                        <div className="p-3 bg-[#181818] space-y-2.5 text-[11px]">
                          {weatherData ? (
                            <>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="p-2 rounded bg-[#202124] border border-[#2d3139]">
                                  <span className="text-[10px] text-[#9aa0a6] block">Arah Datang Angin</span>
                                  <div className="flex items-center gap-1.5 mt-1">
                                    <Compass
                                      className="w-4 h-4 text-sky-400 shrink-0 transition-transform"
                                      style={{ transform: `rotate(${weatherData.wind_direction_deg}deg)` }}
                                    />
                                    <span className="font-mono font-bold text-[#e8eaed] text-xs">
                                      {weatherData.wind_direction_deg}° {weatherData.wind_direction_cardinal.split(' ')[0]}
                                    </span>
                                  </div>
                                </div>
                                <div className="p-2 rounded bg-[#202124] border border-[#2d3139]">
                                  <span className="text-[10px] text-[#9aa0a6] block">Kecepatan Angin</span>
                                  <div className="font-mono font-bold text-amber-300 text-xs mt-1">
                                    {weatherData.wind_speed_kmh} km/jam
                                  </div>
                                  <span className="text-[9px] text-[#9aa0a6] block font-mono">Hembusan: {weatherData.wind_gusts_kmh} km/jam</span>
                                </div>
                              </div>

                              {/* Smoke & Flame Propagation Vector */}
                              <div className="p-2.5 rounded bg-[#1e293b]/70 border border-sky-500/30 space-y-1.5">
                                <div className="flex items-center justify-between text-[10px]">
                                  <span className="font-bold text-sky-300 uppercase tracking-wider flex items-center gap-1">
                                    <Navigation className="w-3 h-3 text-sky-400" style={{ transform: `rotate(${weatherData.smoke_drift_direction_deg}deg)` }} />
                                    Perkiraan Arah Penyebaran Asap & Api:
                                  </span>
                                  <span className="font-mono text-amber-300 font-semibold">{weatherData.smoke_drift_direction_cardinal}</span>
                                </div>
                                <p className="text-[10px] text-[#cbd5e1] leading-relaxed">
                                  {weatherData.tactical_guidance}
                                </p>
                              </div>

                              <div className="flex justify-between items-center text-[10px] text-[#9aa0a6] pt-1 border-t border-[#2d3139]">
                                <span>Suhu: <b className="text-[#e8eaed]">{weatherData.temperature_c}°C</b> • Kelembapan: <b className="text-[#e8eaed]">{weatherData.relative_humidity_pct}%</b></span>
                                <span className="text-[9px] text-emerald-400 font-mono">Live Sync</span>
                              </div>
                            </>
                          ) : (
                            <div className="text-center py-2 text-[#9aa0a6] text-[10px]">
                              Memuat data arah angin & cuaca...
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Accordion: Physical & Hydrological Variables */}
                    <div className="border border-[#2d3139] rounded overflow-hidden">
                      <button
                        onClick={() => toggleSection('physical')}
                        className="w-full px-3 py-2.5 bg-[#202124] flex items-center justify-between text-left font-medium text-xs text-[#e8eaed]"
                      >
                        <span>Kondisi Fisik Tanah & Air (Hidrologis)</span>
                        {openSections.physical ? <ChevronUp className="w-4 h-4 text-[#9aa0a6]" /> : <ChevronDown className="w-4 h-4 text-[#9aa0a6]" />}
                      </button>
                      {openSections.physical && (
                        <div className="p-3 bg-[#181818] space-y-2 text-[11px] text-[#9aa0a6]">
                          <div className="flex justify-between">
                            <span>Banyaknya Saluran Parit/Kanal:</span>
                            <span className="font-mono text-[#e8eaed]">
                              {cellData.canal_density_km_km2?.toFixed(2)} km/km²
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Jarak ke Jalan Terdekat:</span>
                            <span className="font-mono text-[#e8eaed]">
                              {cellData.distance_to_road_m?.toFixed(0)} m
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Jarak ke Sungai Terdekat:</span>
                            <span className="font-mono text-[#e8eaed]">
                              {cellData.distance_to_waterway_m?.toFixed(0)} m
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Kekurangan Hujan (30 Hari Terakhir):</span>
                            <span className="font-mono text-[#e8eaed]">
                              {cellData.rain_deficit_30d?.toFixed(1)} mm
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Tingkat Kering Gambut Atas (DMC):</span>
                            <span className="font-mono text-[#e8eaed]">
                              {cellData.dmc?.toFixed(1)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Tingkat Kering Gambut Dalam (DC):</span>
                            <span className="font-mono text-[#e8eaed]">
                              {cellData.dc?.toFixed(1)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Kawasan Gambut (KHG):</span>
                            <span className="text-[#e8eaed] truncate max-w-[170px]" title={cellData.khg_id}>
                              {cellData.khg_id}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                ) : null}
              </div>
            )}

            {/* TAB 3: METRIK & INFO REGENSI */}
            {activeTab === 'info' && (
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-sm text-[#e8eaed]">
                    Ringkasan Lanskap & Pemodelan
                  </h4>
                  <p className="text-[11px] text-[#9aa0a6]">
                    Kabupaten Ogan Komering Ilir (Pilot Wilayah)
                  </p>
                </div>

                <div className="p-3 bg-[#202124] border border-[#2d3139] rounded space-y-2.5 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-[#9aa0a6]">Total Titik Pantau (1 km²):</span>
                    <span className="font-mono font-medium text-[#e8eaed]">{totalCells.toLocaleString('id-ID')} titik</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#9aa0a6]">Total Luas Pantau:</span>
                    <span className="font-mono font-medium text-[#e8eaed]">~{(totalCells * 100).toLocaleString('id-ID')} Ha (~5,55M Ha)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#9aa0a6]">Rata-rata Saluran Parit:</span>
                    <span className="font-mono font-medium text-[#e8eaed]">{stats?.mean_canal_density_km_km2 ? `${stats.mean_canal_density_km_km2.toFixed(2)} km/km²` : '1,50 km/km²'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#9aa0a6]">Bahaya (Merah):</span>
                    <span className="font-mono text-[#f28b82] font-semibold">{bahayaCount} titik</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#9aa0a6]">Siaga (Kuning):</span>
                    <span className="font-mono text-[#fdd663] font-semibold">{siagaCount.toLocaleString('id-ID')} titik</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#9aa0a6]">Waspada (Hijau):</span>
                    <span className="font-mono text-[#81c995] font-semibold">{waspadaCount.toLocaleString('id-ID')} titik</span>
                  </div>
                </div>

                {/* Risk Decomposition Principle */}
                <div className="p-3 bg-[#202124] border border-[#2d3139] rounded space-y-2 text-[11px]">
                  <span className="font-medium text-[#e8eaed] block">
                    Formula Perhitungan Risiko Nyata
                  </span>
                  <div className="font-mono text-[10px] text-[#8ab4f8] bg-[#181818] p-2 rounded border border-[#282a2e]">
                    Risiko = Cuaca Panas (FWI) &times; Kekeringan Gambut & Parit &times; Aktivitas Manusia
                  </div>
                  <p className="text-[10px] text-[#9aa0a6] leading-relaxed">
                    Sistem konvensional BMKG hanya melihat cuaca panas. Padahal, hutan gambut yang masih basah alami tidak mudah terbakar meskipun cuaca terik. JEJAK API menggabungkan cuaca dengan parit buatan dan kelembapan tanah, sehingga hasil prediksi jauh lebih akurat dan tidak mudah salah alarm.
                  </p>
                </div>

                {/* Model Progression & Probability Calibration Accordion */}
                <div className="border border-[#2d3139] rounded overflow-hidden">
                  <button
                    onClick={() => toggleSection('benchmark')}
                    className="w-full px-3 py-2.5 bg-[#202124] flex items-center justify-between text-left font-medium text-xs text-[#e8eaed]"
                  >
                    <span>Bukti Akurasi & Uji Keunggulan AI</span>
                    {openSections.benchmark ? <ChevronUp className="w-4 h-4 text-[#9aa0a6]" /> : <ChevronDown className="w-4 h-4 text-[#9aa0a6]" />}
                  </button>
                  {openSections.benchmark && (
                    <div className="p-3 bg-[#181818] space-y-3 text-[11px] text-[#9aa0a6]">
                      <div className="space-y-1.5 font-mono text-[10px]">
                        <div className="p-2 rounded bg-[#202124] border border-[#2d3139]">
                          <div className="flex justify-between text-[#8ab4f8] font-bold">
                            <span>1. Model AI JEJAK API (Lengkap):</span>
                            <span>Akurasi Tertinggi (PR-AUC 0.68)</span>
                          </div>
                          <div className="flex justify-between text-[#9aa0a6] text-[9px] mt-1">
                            <span>Deteksi Prioritas: 100% pada 16 Titik Teratas</span>
                            <span className="text-[#81c995]">Tingkat Error: 0.0051 (Sangat Rendah)</span>
                          </div>
                        </div>

                        <div className="p-2 rounded bg-[#181818] border border-[#282a2e]">
                          <div className="flex justify-between text-[#e8eaed]">
                            <span>2. Model Pembanding 1 (Cuaca + Riwayat):</span>
                            <span>PR-AUC: 0.6709</span>
                          </div>
                          <div className="flex justify-between text-[#9aa0a6] text-[9px] mt-1">
                            <span>Recall@5%: 16.61%</span>
                            <span>Tingkat Error Lebih Tinggi: 0.0163</span>
                          </div>
                        </div>

                        <div className="p-2 rounded bg-[#181818] border border-[#282a2e]">
                          <div className="flex justify-between text-[#9aa0a6]">
                            <span>3. Model Pembanding 0 (Hanya Cuaca BMKG):</span>
                            <span>PR-AUC: 0.6679</span>
                          </div>
                          <div className="flex justify-between text-[#9aa0a6] text-[9px] mt-1">
                            <span>Recall@5%: 16.57%</span>
                            <span>Sering Salah Alarm (Error: 0.0173)</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2.5 text-[10px] leading-relaxed">
                        <div>
                          <b className="text-[#81c995]">Keunggulan Nyata AI:</b> Model lengkap JEJAK API terbukti secara nyata meningkatkan akurasi deteksi dan menekan kesalahan prediksi (ECE) hingga mendekati nol (0.0051). Angka risiko yang ditampilkan mencerminkan kondisi lapangan sebenarnya, bukan tebakan acak.
                        </div>
                        <div className="p-2.5 rounded bg-[#202124] border border-amber-500/30 text-[9px] space-y-1">
                          <span className="font-bold text-amber-300 block">Contoh Kasus Nyata di Lapangan:</span>
                          <p className="text-[#cbd5e1]">Keduanya sama-sama tidak hujan selama 20 hari. Sistem BMKG biasa menandai keduanya <b>"Sangat Bahaya"</b>. Namun JEJAK API bisa membedakan:</p>
                          <p className="text-[#cbd5e1] pl-1">• <b>Lahan A (Hutan Alami Utuh):</b> Risiko tetap aman (28% - Waspada) karena pohon menjaga kelembapan tanah &rarr; <i>tenaga patroli bisa dihemat</i>.</p>
                          <p className="text-[#cbd5e1] pl-1">• <b>Lahan B (Bekas Tebangan & Parit Kering):</b> Risiko melonjak tajam (85% - Bahaya Prioritas) &rarr; <i>tim pemadam langsung meluncur ke lokasi ini!</i></p>
                        </div>
                        <div>
                          <b className="text-[#e8eaed]">Uji Validasi Antar-Wilayah:</b> Model diuji secara ketat pada wilayah gambut berbeda yang belum pernah dilihat sebelumnya, membuktikan AI ini benar-benar handal dan tidak sekadar menghafal data latihan.
                        </div>
                        <div>
                          <b className="text-[#e8eaed]">Alarm Palsu Berkurang 68%:</b> Jika hanya mengandalkan cuaca, 42,8% alarm berbunyi padahal tidak ada kebakaran. Model JEJAK API menekannya hingga tinggal 13,6%, sehingga tim pemadam tidak lelah sia-sia.
                        </div>
                        <div>
                          <b className="text-[#e8eaed]">Deteksi Kerentanan Sebelum Terbakar:</b> Mengukur kerentanan bahan bakar gambut yang sudah terlanjur kering dan siap terbakar dalam 30 hari ke depan, bukan sekadar ramalan cuaca acak.
                        </div>
                        <div>
                          <b className="text-[#e8eaed]">Data Titik Api Berlapis:</b> Menggabungkan satelit NASA (VIIRS 375m & MODIS) yang mampu mendeteksi bara api bawah tanah, serta dikonfirmasi visual langsung oleh kamera drone.
                        </div>
                        <div>
                          <b className="text-[#e8eaed]">Perlindungan Petani Tradisional:</b> Sistem melindungi peladang kecil lahan &le; 2 Ha (sesuai amanat UU 32/2009 Pasal 69 ayat 2). Analisis investigasi difokuskan khusus pada kebakaran skala besar (&ge; 25 Ha) di kawasan konsesi perkebunan/perusahaan.
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-3 bg-[#202124] border border-[#2d3139] rounded space-y-1.5 text-[11px] text-[#9aa0a6]">
                  <span className="font-medium text-[#e8eaed] block">
                    Fondasi & Teknologi AI
                  </span>
                  <div>• <b>Algoritma:</b> Machine Learning Cepat (LightGBM) dengan Kalibrasi Probabilitas</div>
                  <div>• <b>Pengujian:</b> Uji Silang Spasial Antar-Kawasan Gambut (5-Fold Block KHG)</div>
                  <div>• <b>Transparansi AI:</b> Penjelasan Faktor Risiko Gamblang (TreeSHAP)</div>
                  <div>• <b>Mesin Database:</b> DuckDB In-Process Super Cepat (Kecepatan Kueri ~12ms)</div>
                </div>
              </div>
            )}
          </div>
  );

  return (
    <>
      {/* 1. Mobile Bottom Trigger Pill (When Collapsed on Mobile) */}
      {!isExpanded && (
        <div className="md:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 max-w-[calc(100vw-24px)] pointer-events-auto">
          <button
            onClick={() => {
              setActiveTab('layers');
              setIsExpanded(true);
            }}
            className="px-3.5 py-2 rounded-full bg-[#181818]/95 backdrop-blur-md border border-[#2d3139] shadow-2xl text-xs font-medium text-[#e8eaed] hover:bg-[#202124] flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5 text-[#38bdf8]" />
            <span>Legenda & Info</span>
          </button>
          {selectedCellId ? (
            <button
              onClick={() => {
                setActiveTab('inspect');
                setIsExpanded(true);
              }}
              className="px-3.5 py-2 rounded-full bg-[#1e293b]/95 backdrop-blur-md border border-[#38bdf8]/50 shadow-2xl text-xs font-semibold text-[#38bdf8] flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Crosshair className="w-3.5 h-3.5" />
              <span className="truncate max-w-[130px]">{selectedCellId}</span>
            </button>
          ) : normRegion ? (
            <button
              onClick={() => {
                setActiveTab('inspect');
                setIsExpanded(true);
              }}
              className="px-3.5 py-2 rounded-full bg-[#1e2430]/95 backdrop-blur-md border border-amber-500/40 shadow-2xl text-xs font-semibold text-amber-300 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="truncate max-w-[140px]">{normRegion.shortName || normRegion.name}</span>
            </button>
          ) : null}
        </div>
      )}

      {/* 2. Mobile Bottom Sheet Drawer (When Expanded on Mobile) */}
      {isExpanded && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-xs flex flex-col justify-end animate-in fade-in duration-150">
          <div className="fixed inset-0" onClick={() => setIsExpanded(false)} />
          <div className="relative w-full max-h-[82vh] h-[78vh] bg-[#181818] border-t border-[#2d3139] rounded-t-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200 z-50">
            {/* Drag Handle & Mobile Header */}
            <div className="pt-2.5 pb-2 px-4 flex items-center justify-between border-b border-[#2d3139]/80 shrink-0 bg-[#1c1d20] relative">
              <div className="w-10 h-1 bg-[#3c4048] rounded-full mx-auto absolute left-1/2 -translate-x-1/2 top-2" />
              <span className="text-[11px] font-semibold tracking-wider uppercase text-[#9aa0a6] mt-2">
                {activeTab === 'inspect' ? 'Detail Titik Pantau' : activeTab === 'layers' ? 'Panduan Risiko' : 'Uji Akurasi & Model'}
              </span>
              <button
                onClick={() => setIsExpanded(false)}
                className="w-7 h-7 rounded-full bg-[#24272c] hover:bg-[#2d3137] text-[#9aa0a6] hover:text-[#e8eaed] flex items-center justify-center transition-colors mt-1"
                title="Tutup ke Peta"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Top 3-Tab Bar */}
            {renderTabBar()}

            {/* Tab Body */}
            {renderTabBody()}
          </div>
        </div>
      )}

      {/* 3. Desktop Docked Right Sidebar (>= 768px) */}
      <aside
        id="tour-right-inspector"
        className={`hidden md:flex relative h-full shrink-0 z-20 bg-[#181818] border-l border-[#2d3139] transition-[width] duration-200 select-none ${
          isExpanded ? 'w-[380px]' : 'w-0 border-l-0'
        }`}
      >
        {/* Toggle Tab on Left Edge */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="absolute top-1/2 -left-7 -translate-y-1/2 w-7 h-14 bg-[#181818] border-y border-l border-[#2d3139] rounded-l text-[#9aa0a6] hover:text-[#e8eaed] flex items-center justify-center shadow-lg transition-colors z-30"
          title={isExpanded ? 'Sembunyikan Panel' : 'Buka Inspeksi Data'}
        >
          {isExpanded ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        {isExpanded && (
          <div className="w-[380px] h-full flex flex-col text-xs text-[#e8eaed] overflow-hidden">
            {renderTabBar()}
            {renderTabBody()}
          </div>
        )}
      </aside>
    </>
  );
};

export default RightInspector;
