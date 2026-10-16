import React, { useState, useEffect, useRef } from 'react';
import TopHeader from './components/Header/TopHeader';
import LeftSidebar from './components/Sidebar/LeftSidebar';
import MapViewer from './components/Map/MapViewer';
import RightInspector from './components/Sidebar/RightInspector';
import TourGuide from './components/Tour/TourGuide';
import PocScopeModal from './components/Info/PocScopeModal';
import { fetchStatsSummary } from './services/api';
import nationalEpicenterCoverage from './data/national_epicenter_coverage.json';

function App() {
  const [activeTool, setActiveTool] = useState('f1');
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [isInspectorExpanded, setIsInspectorExpanded] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 768);
  const [selectedCellId, setSelectedCellId] = useState(null);
  const [selectedRegion, setSelectedRegion] = useState(null); // null defaults to Seluruh Indonesia
  const [replayYear, setReplayYear] = useState(2026);
  const [showConversionLayer, setShowConversionLayer] = useState(false);
  const [currentBasemap, setCurrentBasemap] = useState('dark');
  const [stats, setStats] = useState(null);
  const [showTour, setShowTour] = useState(false);
  const [showPocInfo, setShowPocInfo] = useState(false);
  const mapRef = useRef(null);

  // Guard: the tour auto-opens at most once per page load. After the user
  // skips/finishes it, nothing may re-open it except the "Panduan Tur" button.
  const tourAutoOpenedRef = useRef(false);

  const autoOpenTourOnce = () => {
    if (tourAutoOpenedRef.current) return;
    try {
      if (localStorage.getItem('jejak_tour_seen') === 'true') return;
    } catch (_) {}
    tourAutoOpenedRef.current = true;
    setShowTour(true);
  };

  useEffect(() => {
    fetchStatsSummary()
      .then((data) => setStats(data))
      .catch((err) => console.error('Failed to fetch summary stats:', err));

    // Fallback in case the map never reports ready (slow network)
    const timer = setTimeout(autoOpenTourOnce, 4500);
    return () => clearTimeout(timer);
  }, []);

  const handleMapReady = () => {
    setTimeout(autoOpenTourOnce, 400);
  };

  const handleSelectCell = (cellId, coords = null) => {
    setSelectedCellId(cellId);
    if (cellId) {
      // On mobile, opening inspector should close left sidebar
      if (typeof window !== 'undefined' && window.innerWidth < 768) {
        setIsSidebarExpanded(false);
      }
      setIsInspectorExpanded(true);

      let regionId = 'oki';
      if (cellId.startsWith('KALBAR_')) regionId = 'kalbar';
      else if (cellId.startsWith('KALTENG_')) regionId = 'kalteng';
      else if (cellId.startsWith('PAPUA_') || cellId.startsWith('MERAUKE_')) regionId = 'merauke';
      else if (cellId.startsWith('PBD_') || cellId.startsWith('SORONG_')) regionId = 'sorong';
      else if (cellId.startsWith('SULAWESI_') || cellId.startsWith('SULSEL_')) regionId = 'sulawesi';

      const cleanProps = nationalEpicenterCoverage.features.find(
        (f) => f.properties.region_id === regionId
      )?.properties;
      if (cleanProps) {
        setSelectedRegion(cleanProps);
      }

      if (coords && coords.lon !== undefined && coords.lat !== undefined) {
        handleFlyTo(coords.lon, coords.lat, coords.zoom || 13.5);
      }
    }
  };

  const handleSelectRegion = (regionProps) => {
    if (!regionProps) {
      setSelectedRegion(null);
      setSelectedCellId(null);
      return;
    }
    const regionId = regionProps.region_id || regionProps.id;
    const cleanProps = nationalEpicenterCoverage.features.find(
      (f) => f.properties.region_id === regionId
    )?.properties || regionProps;

    setSelectedRegion(cleanProps);
    setSelectedCellId(null);
  };

  const handleClearSelection = () => {
    setSelectedCellId(null);
  };

  const handleFlyTo = (lon, lat, zoom = 12) => {
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [lon, lat],
        zoom: zoom,
        duration: 1200,
      });
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#181818] font-sans text-[#e8eaed]">
      {/* 1. Top Minimalist Operations Header */}
      <TopHeader
        stats={stats}
        onStartTour={() => {
          setIsSidebarExpanded(false);
          setIsInspectorExpanded(false);
          setShowTour(true);
        }}
        onOpenTools={() => {
          setIsSidebarExpanded((prev) => {
            const next = !prev;
            if (next && typeof window !== 'undefined' && window.innerWidth < 768) {
              setIsInspectorExpanded(false);
            }
            return next;
          });
        }}
        onSelectCell={handleSelectCell}
        onFlyTo={handleFlyTo}
      />

      {/* 2. Operations Work Area: Left Rail + Map Canvas + Right Inspector */}
      <div className="relative flex-1 flex w-full h-[calc(100vh-52px)] overflow-hidden">
        {/* Left Mission Control Rail (Docked & Collapsible) */}
        <LeftSidebar
          activeTool={activeTool}
          setActiveTool={setActiveTool}
          isExpanded={isSidebarExpanded}
          setIsExpanded={(expanded) => {
            setIsSidebarExpanded(expanded);
            if (expanded && typeof window !== 'undefined' && window.innerWidth < 768) {
              setIsInspectorExpanded(false);
            }
          }}
          currentBasemap={currentBasemap}
          onSelectBasemap={setCurrentBasemap}
          onSelectCell={handleSelectCell}
          onFlyTo={handleFlyTo}
          replayYear={replayYear}
          setReplayYear={setReplayYear}
          showConversionLayer={showConversionLayer}
          setShowConversionLayer={setShowConversionLayer}
          onOpenPocModal={() => {
            setIsSidebarExpanded(false);
            setIsInspectorExpanded(false);
            setShowPocInfo(true);
          }}
        />

        {/* Center Hero Map Canvas */}
        <MapViewer
          currentBasemap={currentBasemap}
          onSelectBasemap={setCurrentBasemap}
          onOpenBasemapPanel={() => {
            setActiveTool('f1');
            setIsSidebarExpanded(true);
            if (typeof window !== 'undefined' && window.innerWidth < 768) {
              setIsInspectorExpanded(false);
            }
          }}
          selectedCellId={selectedCellId}
          onSelectCell={handleSelectCell}
          selectedRegion={selectedRegion}
          onSelectRegion={handleSelectRegion}
          replayYear={replayYear}
          showConversionLayer={showConversionLayer}
          mapRefOut={mapRef}
          onMapReady={handleMapReady}
          onOpenPocInfo={() => {
            setIsSidebarExpanded(false);
            setIsInspectorExpanded(false);
            setShowPocInfo(true);
          }}
        />

        {/* Right Data & TreeSHAP Inspector (Docked & Collapsible) */}
        <RightInspector
          selectedCellId={selectedCellId}
          selectedRegion={selectedRegion}
          onClearSelection={handleClearSelection}
          onSelectRegion={handleSelectRegion}
          onFlyTo={handleFlyTo}
          stats={stats}
          onOpenPocInfo={() => {
            setIsSidebarExpanded(false);
            setIsInspectorExpanded(false);
            setShowPocInfo(true);
          }}
          isExpanded={isInspectorExpanded}
          setIsExpanded={(expanded) => {
            setIsInspectorExpanded(expanded);
            if (expanded && typeof window !== 'undefined' && window.innerWidth < 768) {
              setIsSidebarExpanded(false);
            }
          }}
        />
      </div>

      {/* 3. Interactive Feature Tour Guide (Joyride) */}
      <TourGuide
        isOpen={showTour}
        onClose={() => setShowTour(false)}
        setActiveTool={setActiveTool}
        setIsSidebarExpanded={setIsSidebarExpanded}
        onSelectCell={handleSelectCell}
        onSelectRegion={handleSelectRegion}
        onFlyTo={handleFlyTo}
        setReplayYear={setReplayYear}
        setShowConversionLayer={setShowConversionLayer}
      />

      {/* 4. POC Scope Info (explains why only selected regions are shown) */}
      <PocScopeModal
        isOpen={showPocInfo}
        onClose={() => setShowPocInfo(false)}
        onStartTour={() => setShowTour(true)}
      />
    </div>
  );
}

export default App;