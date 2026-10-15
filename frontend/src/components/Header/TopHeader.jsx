import React, { useState } from 'react';
import { Flame, Download, ExternalLink, Database, Activity, Info, SlidersHorizontal, Search, X, Loader2 } from 'lucide-react';
import { getExportPatrolCsvUrl, searchCells, inspectCell } from '../../services/api';

const POC_REGIONS_LOOKUP = [
  { id: 'oki', name: 'Sumatera Selatan (OKI)', keywords: ['oki', 'sumsel', 'ogan', 'sugihan', 'cengal'], lon: 105.3, lat: -3.35, zoom: 9 },
  { id: 'kalteng', name: 'Kalimantan Tengah', keywords: ['kalteng', 'kalimantan tengah', 'pulang pisau', 'sebangau', 'palangka'], lon: 114.0, lat: -2.6, zoom: 8.5 },
  { id: 'kalbar', name: 'Kalimantan Barat', keywords: ['kalbar', 'kalimantan barat', 'ketapang', 'kubu raya', 'pawan'], lon: 110.3, lat: -2.2, zoom: 8.2 },
  { id: 'merauke', name: 'Papua Selatan', keywords: ['merauke', 'papua selatan', 'kurik', 'kumbe'], lon: 140.4, lat: -8.1, zoom: 8.3 },
  { id: 'sorong', name: 'Papua Barat Daya', keywords: ['sorong', 'papua barat daya', 'klamono', 'salawati'], lon: 131.45, lat: -1.05, zoom: 8.8 },
  { id: 'sulawesi', name: 'Sulawesi Selatan', keywords: ['sulawesi', 'maros', 'pangkep', 'sulsel'], lon: 119.72, lat: -4.96, zoom: 9.8 },
];

const TopHeader = ({ stats, onStartTour, onOpenTools, onSelectCell, onFlyTo }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const totalCells = stats?.total_cells || 17927;
  const bahayaCount = stats?.risk_distribution?.Bahaya || 8;
  const siagaCount = stats?.risk_distribution?.Siaga || 13070;
  const waspadaCount = stats?.risk_distribution?.Waspada || 4849;

  const handleExportData = () => {
    const url = getExportPatrolCsvUrl({ k: 50 });
    window.open(url, '_blank');
  };

  const handleSearchSubmit = async (e) => {
    if (e) e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;

    setIsSearching(true);
    setShowMobileSearch(false);
    try {
      // 1. Coordinate check (lat, lon)
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
          }
        } catch (_) {}
        setIsSearching(false);
        return;
      }

      // 2. Region check
      const lowerQ = q.toLowerCase();
      const matchedRegion = POC_REGIONS_LOOKUP.find((r) =>
        r.keywords.some((k) => lowerQ.includes(k)) ||
        r.name.toLowerCase().includes(lowerQ) ||
        r.id.toLowerCase() === lowerQ
      );
      if (matchedRegion) {
        if (onFlyTo) onFlyTo(matchedRegion.lon, matchedRegion.lat, matchedRegion.zoom);
        if (onSelectCell) onSelectCell(null);
        setIsSearching(false);
        return;
      }

      // 3. Search API or inspect cell
      const res = await searchCells(q);
      if (res?.found && res?.lon && res?.lat) {
        if (onFlyTo) onFlyTo(res.lon, res.lat, 14);
        if (onSelectCell) onSelectCell(res.cell_id, { lon: res.lon, lat: res.lat, zoom: 14 });
      } else {
        const inspected = await inspectCell(q);
        if (inspected && inspected.lon && inspected.lat) {
          if (onFlyTo) onFlyTo(inspected.lon, inspected.lat, 14);
          if (onSelectCell) onSelectCell(inspected.cell_id, { lon: inspected.lon, lat: inspected.lat, zoom: 14 });
        }
      }
    } catch (err) {
      console.warn('TopHeader search fallback:', err);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <>
      <header className="h-[52px] bg-[#181818] border-b border-[#2d3139] px-2.5 sm:px-4 flex items-center justify-between gap-2 select-none z-30 shrink-0 relative">
        {/* Brand & Region Identity */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 shrink-0">
          {/* Mobile Tools Drawer Toggle */}
          <button
            onClick={onOpenTools}
            className="md:hidden w-8 h-8 rounded-md bg-[#25282c] border border-[#383d46] flex items-center justify-center text-amber-500 hover:text-amber-400 shrink-0 transition-colors cursor-pointer"
            title="Buka Menu Alat & Analisis"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>

          <div className="hidden sm:flex w-7 h-7 rounded-md bg-[#25282c] border border-[#383d46] items-center justify-center text-amber-500 shadow-sm shrink-0">
            <Flame className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2 min-w-0" title="JEJAK API: WebGIS Peringatan Dini Kebakaran Gambut H-30 Berbasis Jejak Aktivitas Manusia Menggunakan LightGBM dan Explainable AI (TreeSHAP) dengan Verifikasi Lapangan Melalui Drone Langsung">
            <span className="font-semibold text-sm tracking-wide text-[#e8eaed] whitespace-nowrap">
              JEJAK API
            </span>
            <span className="hidden 2xl:inline text-xs text-[#9aa0a6] truncate">
              • WebGIS Peringatan Dini Kebakaran Gambut H-30
            </span>
          </div>
        </div>

        {/* Global Desktop Search Bar */}
        <form
          id="tour-header-search"
          onSubmit={handleSearchSubmit}
          className="hidden md:flex items-center gap-1.5 bg-[#202124] hover:bg-[#25282c] focus-within:bg-[#1f232b] border border-[#303134] focus-within:border-[#38bdf8]/60 focus-within:ring-1 focus-within:ring-[#38bdf8]/30 rounded-full px-2.5 py-1 transition-all w-44 md:w-52 lg:w-64 shadow-inner shrink-0"
        >
          <Search className="w-3.5 h-3.5 text-[#9aa0a6] shrink-0" />
          <input
            type="text"
            placeholder="Cari desa, kota, sel..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent text-xs text-[#e8eaed] placeholder-[#80868b] w-full focus:outline-none font-mono"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-[#9aa0a6] hover:text-[#e8eaed] cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          )}
          <button
            type="submit"
            disabled={isSearching}
            className="px-2 py-0.5 rounded-full bg-[#2d3139] hover:bg-[#38bdf8] text-[#9aa0a6] hover:text-[#0f172a] text-[10px] font-semibold transition-colors cursor-pointer shrink-0 disabled:opacity-50 flex items-center gap-1"
          >
            {isSearching ? <Loader2 className="w-3 h-3 animate-spin text-[#38bdf8]" /> : null}
            <span>Cari</span>
          </button>
        </form>

        {/* Operational Stats & Actions */}
        <div id="tour-header-stats" className="flex items-center gap-1.5 sm:gap-2.5 text-xs shrink-0">
          {/* Mobile Search Toggle Button */}
          <button
            type="button"
            onClick={() => setShowMobileSearch(!showMobileSearch)}
            className="md:hidden w-8 h-8 rounded-md bg-[#202124] hover:bg-[#282c34] border border-[#303134] flex items-center justify-center text-[#9aa0a6] hover:text-[#e8eaed] transition-colors shrink-0 cursor-pointer"
            title="Cari Wilayah atau Sel"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Regency Summary Monospace (Shown on wide screens) */}
          <div className="hidden 2xl:flex items-center gap-2 text-[11px] text-[#9aa0a6] font-mono border-r border-[#2d3139] pr-3 whitespace-nowrap">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#ef4444]"></span>
              <span className="text-[#e8eaed] font-medium">{bahayaCount}</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#f59e0b]"></span>
              <span className="text-[#e8eaed] font-medium">{siagaCount}</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#10b981]"></span>
              <span className="text-[#e8eaed] font-medium">{waspadaCount}</span>
            </span>
          </div>

        {/* Tour Guide Button - Guaranteed Prominent & Always Visible */}
        <button
          id="tour-guide-btn"
          onClick={onStartTour}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1e293b] hover:bg-[#253752] border border-[#38bdf8]/50 hover:border-[#38bdf8] text-[#38bdf8] font-semibold text-xs transition-all shadow-xs shrink-0 cursor-pointer"
          title="Buka Panduan Penggunaan"
        >
          <Info className="w-3.5 h-3.5 text-[#38bdf8]" />
          <span>Panduan</span>
        </button>

        {/* Export Action */}
        <button
          onClick={handleExportData}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#24272c] hover:bg-[#2d3137] border border-[#3c4048] text-[#e8eaed] text-xs font-medium transition-colors shrink-0 cursor-pointer"
          title="Unduh 50 lokasi paling rawan dalam format CSV untuk rute patroli darat"
        >
          <Download className="w-3.5 h-3.5 text-[#9aa0a6]" />
          <span className="hidden sm:inline">Unduh CSV</span>
        </button>

        {/* API Docs Button */}
        <a
          href="http://127.0.0.1:8000/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden xl:flex items-center gap-1 px-2 py-1.5 text-xs text-[#9aa0a6] hover:text-[#e8eaed] hover:bg-[#202124] rounded-lg border border-transparent hover:border-[#303134] transition-colors"
          title="Dokumentasi API"
        >
          <span>API</span>
          <ExternalLink className="w-3 h-3 opacity-60" />
        </a>
      </div>
    </header>

      {/* Mobile Floating Search Drawer */}
      {showMobileSearch && (
        <div className="md:hidden fixed top-[52px] left-0 right-0 z-40 bg-[#1c1d22]/98 backdrop-blur-md border-b border-[#323640] p-2.5 shadow-2xl animate-in slide-in-from-top duration-200">
          <form
            onSubmit={handleSearchSubmit}
            className="flex items-center gap-2 bg-[#121316] border border-[#383d48] focus-within:border-[#38bdf8] rounded-full px-3 py-1.5 shadow-inner"
          >
            <Search className="w-4 h-4 text-[#9aa0a6] shrink-0" />
            <input
              type="text"
              placeholder="Cari desa, kota, wilayah, atau sel..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
              className="bg-transparent text-xs text-[#e8eaed] placeholder-[#80868b] w-full focus:outline-none font-mono"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-[#9aa0a6] hover:text-[#e8eaed] p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="submit"
              disabled={isSearching}
              className="px-3 py-1 rounded-full bg-[#38bdf8] text-[#0f172a] text-xs font-bold transition-all active:scale-95 shrink-0 flex items-center gap-1"
            >
              {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              <span>Cari</span>
            </button>
          </form>
        </div>
      )}
    </>
  );
};

export default TopHeader;
