import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import * as pmtiles from 'pmtiles';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Plus, Minus, Compass, Flame, Loader2, Info, MapPin, ChevronDown, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import nationalEpicenterCoverage from '../../data/national_epicenter_coverage.json';
import { captureError } from '../../services/monitoring';
import { fetchLiveHotspots } from '../../services/api';
import { BASEMAPS } from '../../data/basemaps';

// Register PMTiles protocol globally once
if (!maplibregl._pmtilesProtocolAdded) {
  const protocol = new pmtiles.Protocol();
  maplibregl.addProtocol('pmtiles', protocol.tile);
  maplibregl._pmtilesProtocolAdded = true;
}

// National Priority Region Jump Points (Seluruh Indonesia as primary national view)
export const REGION_JUMPS = [
  {
    id: 'all',
    name: 'Seluruh Indonesia',
    shortName: '🇮🇩 Nasional',
    island: 'Nasional',
    province: 'Seluruh Wilayah Indonesia',
    center: [119.5, -2.5],
    zoom: 4.6,
    cells: '55.532 Sel',
    badge: 'Nasional',
    dot: '#38bdf8',
  },
  {
    id: 'oki',
    name: 'Sumsel: OKI',
    shortName: 'OKI',
    island: 'Sumatera',
    province: 'Sumatera Selatan',
    center: [105.3, -3.35],
    zoom: 9,
    cells: '17.927 Sel',
    badge: 'Pilot Utama',
    dot: '#ef4444',
  },
  {
    id: 'kalteng',
    name: 'Kalteng: Pulang Pisau',
    shortName: 'Pulang Pisau',
    island: 'Kalimantan',
    province: 'Kalimantan Tengah',
    center: [114.0, -2.6],
    zoom: 8.5,
    cells: '9.762 Sel',
    badge: 'Eks-PLG',
    dot: '#ef4444',
  },
  {
    id: 'kalbar',
    name: 'Kalbar: Ketapang',
    shortName: 'Ketapang',
    island: 'Kalimantan',
    province: 'Kalimantan Barat',
    center: [110.3, -2.2],
    zoom: 8.2,
    cells: '8.734 Sel',
    badge: 'Rawa Pesisir',
    dot: '#f59e0b',
  },
  {
    id: 'merauke',
    name: 'Papua: Merauke',
    shortName: 'Merauke',
    island: 'Papua',
    province: 'Papua Selatan',
    center: [140.4, -8.1],
    zoom: 8.3,
    cells: '9.848 Sel',
    badge: 'Savanna Gambut',
    dot: '#f59e0b',
  },
  {
    id: 'sorong',
    name: 'Papua: Sorong',
    shortName: 'Sorong',
    island: 'Papua',
    province: 'Papua Barat Daya',
    center: [131.45, -1.05],
    zoom: 8.8,
    cells: '7.806 Sel',
    badge: 'Hutan Primer',
    dot: '#10b981',
  },
  {
    id: 'sulawesi',
    name: 'Sulsel: Maros',
    shortName: 'Maros',
    island: 'Sulawesi',
    province: 'Sulawesi Selatan',
    center: [119.72, -4.96],
    zoom: 9.8,
    cells: '1.455 Sel',
    badge: 'Karst Gambut',
    dot: '#10b981',
  },
];

// National Epicenter Markers (Multi-level zoom: compact name at far zoom, details at mid zoom, hidden at close zoom)
export const EPICENTER_MARKERS = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [105.3, -3.35] },
      properties: {
        id: 'oki',
        name: 'Sumatera Selatan (OKI)',
        shortName: 'OKI',
        cells: '17.927 Sel • Pilot Utama',
        zoom: 9,
        color: '#ef4444',
      },
    },
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [114.0, -2.6] },
      properties: {
        id: 'kalteng',
        name: 'Kalteng: Pulang Pisau',
        shortName: 'Pulang Pisau',
        cells: '9.762 Sel Grid',
        zoom: 8.5,
        color: '#ef4444',
      },
    },
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [110.3, -2.2] },
      properties: {
        id: 'kalbar',
        name: 'Kalbar: Ketapang',
        shortName: 'Ketapang',
        cells: '8.734 Sel Grid',
        zoom: 8.2,
        color: '#f59e0b',
      },
    },
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [140.4, -8.1] },
      properties: {
        id: 'merauke',
        name: 'Papua Sel: Merauke',
        shortName: 'Merauke',
        cells: '9.848 Sel Grid',
        zoom: 8.3,
        color: '#f59e0b',
      },
    },
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [131.45, -1.05] },
      properties: {
        id: 'sorong',
        name: 'PBD: Sorong',
        shortName: 'Sorong',
        cells: '7.806 Sel Grid',
        zoom: 8.8,
        color: '#10b981',
      },
    },
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [119.72, -4.96] },
      properties: {
        id: 'sulawesi',
        name: 'Sulsel: Maros',
        shortName: 'Maros',
        cells: '1.455 Sel Grid',
        zoom: 9.8,
        color: '#10b981',
      },
    },
  ],
};

// Historical Hotspot Clusters (NASA FIRMS VIIRS 375m) across National Epicenters
const HISTORICAL_HOTSPOTS_2019 = {
  type: 'FeatureCollection',
  features: [
    // OKI (Sumsel)
    { type: 'Feature', geometry: { type: 'Point', coordinates: [105.35, -3.25] }, properties: { year: 2019, region: 'Sumsel' } },
    { type: 'Feature', geometry: { type: 'Point', coordinates: [105.38, -3.28] }, properties: { year: 2019, region: 'Sumsel' } },
    { type: 'Feature', geometry: { type: 'Point', coordinates: [105.42, -3.32] }, properties: { year: 2019, region: 'Sumsel' } },
    { type: 'Feature', geometry: { type: 'Point', coordinates: [105.45, -3.38] }, properties: { year: 2019, region: 'Sumsel' } },
    { type: 'Feature', geometry: { type: 'Point', coordinates: [105.28, -3.45] }, properties: { year: 2019, region: 'Sumsel' } },
    // Kalteng (Pulang Pisau & Palangka Raya)
    { type: 'Feature', geometry: { type: 'Point', coordinates: [114.15, -2.75] }, properties: { year: 2019, region: 'Kalteng' } },
    { type: 'Feature', geometry: { type: 'Point', coordinates: [114.28, -2.92] }, properties: { year: 2019, region: 'Kalteng' } },
    { type: 'Feature', geometry: { type: 'Point', coordinates: [113.88, -2.62] }, properties: { year: 2019, region: 'Kalteng' } },
    { type: 'Feature', geometry: { type: 'Point', coordinates: [114.05, -3.08] }, properties: { year: 2019, region: 'Kalteng' } },
    // Kalbar (Ketapang)
    { type: 'Feature', geometry: { type: 'Point', coordinates: [109.85, -1.45] }, properties: { year: 2019, region: 'Kalbar' } },
    { type: 'Feature', geometry: { type: 'Point', coordinates: [110.12, -1.68] }, properties: { year: 2019, region: 'Kalbar' } },
    // Papua Selatan (Merauke)
    { type: 'Feature', geometry: { type: 'Point', coordinates: [140.25, -8.12] }, properties: { year: 2019, region: 'Papua Selatan' } },
    { type: 'Feature', geometry: { type: 'Point', coordinates: [140.48, -7.95] }, properties: { year: 2019, region: 'Papua Selatan' } },
    // Sorong (Papua Barat Daya)
    { type: 'Feature', geometry: { type: 'Point', coordinates: [131.55, -1.35] }, properties: { year: 2019, region: 'PBD' } },
    // Sulawesi
    { type: 'Feature', geometry: { type: 'Point', coordinates: [119.78, -4.88] }, properties: { year: 2019, region: 'Sulawesi' } },
  ],
};

const HISTORICAL_HOTSPOTS_2023 = {
  type: 'FeatureCollection',
  features: [
    // OKI (Sumsel)
    { type: 'Feature', geometry: { type: 'Point', coordinates: [105.4, -3.3] }, properties: { year: 2023, region: 'Sumsel' } },
    { type: 'Feature', geometry: { type: 'Point', coordinates: [105.44, -3.34] }, properties: { year: 2023, region: 'Sumsel' } },
    { type: 'Feature', geometry: { type: 'Point', coordinates: [105.33, -3.42] }, properties: { year: 2023, region: 'Sumsel' } },
    // Kalteng
    { type: 'Feature', geometry: { type: 'Point', coordinates: [114.18, -2.82] }, properties: { year: 2023, region: 'Kalteng' } },
    { type: 'Feature', geometry: { type: 'Point', coordinates: [114.35, -2.68] }, properties: { year: 2023, region: 'Kalteng' } },
    // Kalbar
    { type: 'Feature', geometry: { type: 'Point', coordinates: [109.95, -1.52] }, properties: { year: 2023, region: 'Kalbar' } },
    // Papua Selatan (Merauke - 10 Distrik eskalasi)
    { type: 'Feature', geometry: { type: 'Point', coordinates: [140.35, -8.05] }, properties: { year: 2023, region: 'Papua Selatan' } },
    { type: 'Feature', geometry: { type: 'Point', coordinates: [140.58, -7.88] }, properties: { year: 2023, region: 'Papua Selatan' } },
    { type: 'Feature', geometry: { type: 'Point', coordinates: [140.18, -8.25] }, properties: { year: 2023, region: 'Papua Selatan' } },
    // Sorong
    { type: 'Feature', geometry: { type: 'Point', coordinates: [131.68, -1.22] }, properties: { year: 2023, region: 'PBD' } },
    // Sulawesi
    { type: 'Feature', geometry: { type: 'Point', coordinates: [119.85, -4.92] }, properties: { year: 2023, region: 'Sulawesi' } },
  ],
};

// MapBiomas Indonesia Koleksi 4.0 Post-Fire Conversion Polygons
const CONVERSION_POLYGONS = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [105.32, -3.22],
            [105.38, -3.22],
            [105.38, -3.28],
            [105.32, -3.28],
            [105.32, -3.22],
          ],
        ],
      },
      properties: { name: 'Cengal Utara (Sumsel)' },
    },
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [105.42, -3.3],
            [105.48, -3.3],
            [105.48, -3.37],
            [105.42, -3.37],
            [105.42, -3.3],
          ],
        ],
      },
      properties: { name: 'Sungai Menang (Sumsel)' },
    },
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [140.28, -8.02],
            [140.38, -8.02],
            [140.38, -8.12],
            [140.28, -8.12],
            [140.28, -8.02],
          ],
        ],
      },
      properties: { name: 'Distrik Kurik (Papua Selatan)' },
    },
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [114.12, -2.72],
            [114.22, -2.72],
            [114.22, -2.82],
            [114.12, -2.82],
            [114.12, -2.72],
          ],
        ],
      },
      properties: { name: 'Kahayan Hilir (Kalteng)' },
    },
  ],
};

const MapViewer = ({
  currentBasemap: externalCurrentBasemap,
  onSelectBasemap,
  onOpenBasemapPanel,
  selectedCellId,
  onSelectCell,
  selectedRegion,
  onSelectRegion,
  replayYear = 2026,
  showConversionLayer = false,
  mapRefOut,
  onMapReady,
  onOpenPocInfo,
}) => {
  const mapContainer = useRef(null);
  const mapInstance = useRef(null);
  const [internalBasemap] = useState('dark');
  const currentBasemap = externalCurrentBasemap || internalBasemap;
  const [isLayerLoaded, setIsLayerLoaded] = useState(false);
  const [isTilesLoading, setIsTilesLoading] = useState(true);
  const [activeRegion, setActiveRegion] = useState('all');
  const [showRegionDropdown, setShowRegionDropdown] = useState(false);
  const regionDropdownRef = useRef(null);
  const regionScrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [mapBearing, setMapBearing] = useState(0);

  // Sync map style when basemap changes externally (e.g. from LeftSidebar)
  useEffect(() => {
    if (!externalCurrentBasemap || !mapInstance.current) return;
    const map = mapInstance.current;
    if (map._lastLoadedBasemap && map._lastLoadedBasemap === externalCurrentBasemap) return;
    map._lastLoadedBasemap = externalCurrentBasemap;

    try {
      map.setStyle(BASEMAPS[externalCurrentBasemap].style);
      map.once('styledata', () => {
        try {
          addRiskLayers(map);
          addOverlayLayers(map);
          if (selectedCellId && map.getLayer('oki-risk-selected')) {
            map.setFilter('oki-risk-selected', ['==', 'cell_id', selectedCellId]);
          }
        } catch (err) {
          captureError(err, { source: 'externalBasemap.styledata' });
        }
      });
    } catch (err) {
      captureError(err, { source: 'externalBasemap.setStyle' });
    }
  }, [externalCurrentBasemap]);

  // Live NASA FIRMS NRT Active Fire Hotspots
  const [showLiveHotspots, setShowLiveHotspots] = useState(true);
  const [liveHotspotsData, setLiveHotspotsData] = useState(null);
  const liveHotspotsDataRef = useRef(null);
  const [liveHotspotCount, setLiveHotspotCount] = useState(0);
  const [hotspotScope, setHotspotScope] = useState('epicenters'); // 'epicenters' | 'all'

  useEffect(() => {
    let isMounted = true;
    const onlyEpicenters = hotspotScope === 'epicenters';
    fetchLiveHotspots(onlyEpicenters)
      .then((data) => {
        if (!isMounted) return;
        setLiveHotspotsData(data);
        liveHotspotsDataRef.current = data;
        const count = data?.features?.length || 0;
        setLiveHotspotCount(count);
        const map = mapInstance.current;
        if (map && map.getSource('live-hotspots-source')) {
          map.getSource('live-hotspots-source').setData(data);
        }
      })
      .catch((err) => {
        console.warn('Live hotspots note:', err);
      });
    return () => {
      isMounted = false;
    };
  }, [hotspotScope]);

  // Synchronize live hotspots GeoJSON data to MapLibre source reliably
  // whenever layer finishes loading or liveHotspotsData is fetched
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !isLayerLoaded) return;
    const source = map.getSource('live-hotspots-source');
    const dataToSet = liveHotspotsDataRef.current || liveHotspotsData;
    if (source && dataToSet && dataToSet.features) {
      source.setData(dataToSet);
    }
  }, [liveHotspotsData, isLayerLoaded]);

  const checkRegionScroll = () => {
    if (!regionScrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = regionScrollRef.current;
    setCanScrollLeft(scrollLeft > 2);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 2);
  };

  const handleScrollRegionNav = (direction) => {
    if (regionScrollRef.current) {
      regionScrollRef.current.scrollBy({ left: direction, behavior: 'smooth' });
      setTimeout(checkRegionScroll, 300);
    }
  };

  useEffect(() => {
    checkRegionScroll();
    const el = regionScrollRef.current;
    if (el) {
      el.addEventListener('scroll', checkRegionScroll);
      window.addEventListener('resize', checkRegionScroll);
    }
    const timer = setTimeout(checkRegionScroll, 500);
    return () => {
      clearTimeout(timer);
      if (el) el.removeEventListener('scroll', checkRegionScroll);
      window.removeEventListener('resize', checkRegionScroll);
    };
  }, []);

  // Close region dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (regionDropdownRef.current && !regionDropdownRef.current.contains(e.target)) {
        setShowRegionDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Synchronize activeRegion toolbar button with selectedRegion prop
  useEffect(() => {
    if (selectedRegion?.region_id) {
      setActiveRegion(selectedRegion.region_id);
    } else if (selectedRegion === null) {
      setActiveRegion('all');
    }
  }, [selectedRegion]);

  // Initialize Map with WebGL resilience & silent crash guards
  useEffect(() => {
    if (!mapContainer.current || mapInstance.current) return;

    const initialStyle = BASEMAPS[currentBasemap].style;
    let map = null;
    let canvas = null;

    const handleContextLost = (e) => {
      e.preventDefault(); // REQUIRED: permits browser to restore WebGL context
      console.warn('[MapViewer] WebGL context lost. Preventing default to allow restoration.');
      captureError(new Error('WebGL context lost in MapViewer'), { source: 'MapViewer.webglcontextlost' });
    };

    const handleContextRestored = () => {
      console.info('[MapViewer] WebGL context restored. Re-syncing map canvas.');
      try {
        if (mapInstance.current) {
          mapInstance.current.resize();
        }
      } catch (err) {
        captureError(err, { source: 'MapViewer.webglcontextrestored' });
      }
    };

    let readyFired = false;
    const handleDataReady = () => {
      if (readyFired) return;
      readyFired = true;
      setIsTilesLoading(false);
      if (onMapReady) onMapReady();
    };

    const onSourceData = (e) => {
      if (e.sourceId === 'oki-risk-source' && e.isSourceLoaded) {
        handleDataReady();
      }
    };

    // Guaranteed fallback timer: maximum 3.2s
    const fallbackTimer = setTimeout(handleDataReady, 3200);

    try {
      map = new maplibregl.Map({
        container: mapContainer.current,
        style: initialStyle,
        center: [119.5, -2.5], // Center of Indonesia (Seluruh Indonesia archipelago overview)
        zoom: 4.6,
        minZoom: 3,
        maxZoom: 16,
        attributionControl: false,
      });

      // Canvas WebGL context loss listeners
      canvas = map.getCanvas();
      if (canvas) {
        canvas.addEventListener('webglcontextlost', handleContextLost, false);
        canvas.addEventListener('webglcontextrestored', handleContextRestored, false);
      }

      map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');
      map.addControl(new maplibregl.ScaleControl({ maxWidth: 120, unit: 'metric' }), 'bottom-left');

      map.on('load', () => {
        try {
          addRiskLayers(map);
          addOverlayLayers(map);
          setIsLayerLoaded(true);
        } catch (err) {
          captureError(err, { source: 'MapViewer.load' });
        }
      });

      // Detect when PMTiles vector tiles finish downloading & rendering
      map.once('idle', handleDataReady);
      map.on('sourcedata', onSourceData);

      // Track bearing & pitch changes in real-time for dynamic compass
      const updateBearing = () => {
        if (map) {
          setMapBearing(Math.round(map.getBearing()));
        }
      };
      map.on('rotate', updateBearing);
      map.on('pitch', updateBearing);

      // Catch internal MapLibre runtime errors (tile 404s, source errors) quietly
      map.on('error', (e) => {
        const msg = e?.error?.message || e?.message || '';
        if (msg.includes('404') || e?.status === 404 || msg.includes('abort')) {
          return; // Ignore benign tile missing or request cancellations
        }
        captureError(e?.error || new Error(msg || 'MapLibre internal error'), {
          source: 'maplibre.error',
          details: e,
        });
      });

      mapInstance.current = map;
      if (mapRefOut) mapRefOut.current = map;
    } catch (err) {
      console.warn('[MapViewer] WebGL map initialization error caught:', err);
      captureError(err, { source: 'MapViewer.MapConstructor' });
      // Schedule a single graceful recovery attempt
      const retryTimer = setTimeout(() => {
        if (!mapInstance.current && mapContainer.current) {
          window.location.reload();
        }
      }, 700);
      return () => clearTimeout(retryTimer);
    }

    return () => {
      clearTimeout(fallbackTimer);
      if (canvas) {
        canvas.removeEventListener('webglcontextlost', handleContextLost);
        canvas.removeEventListener('webglcontextrestored', handleContextRestored);
      }
      if (map) {
        try {
          map.off('rotate', updateBearing);
          map.off('pitch', updateBearing);
          map.off('idle', handleDataReady);
          map.off('sourcedata', onSourceData);
          map.remove();
        } catch (_) {}
      }
      mapInstance.current = null;
    };
  }, []);

  // Auto-resize MapLibre canvas whenever container dimensions change (sidebar toggles)
  useEffect(() => {
    if (!mapContainer.current) return;
    const observer = new ResizeObserver(() => {
      if (mapInstance.current) {
        mapInstance.current.resize();
      }
    });
    observer.observe(mapContainer.current);
    return () => observer.disconnect();
  }, []);

  const addRiskLayers = (map) => {
    // 0. National Epicenter Coverage Footprints (Visible from space, seamlessly blends into 1km² tactical grid)
    if (!map.getSource('national-epicenter-source')) {
      map.addSource('national-epicenter-source', {
        type: 'geojson',
        data: nationalEpicenterCoverage,
      });
    }

    // A. Tactical Hazard Glow Halo (Outer Radar Perimeter)
    if (!map.getLayer('national-epicenter-glow')) {
      map.addLayer({
        id: 'national-epicenter-glow',
        type: 'line',
        source: 'national-epicenter-source',
        paint: {
          'line-color': [
            'match',
            ['get', 'risk_category'],
            'Bahaya', '#ef4444',
            'Siaga', '#f59e0b',
            'Waspada', '#10b981',
            ['coalesce', ['get', 'color'], '#f59e0b'],
          ],
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            3, 8,
            6, 12,
            9, 16,
          ],
          'line-opacity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            3, 0.50,
            6, 0.40,
            8, 0.18,
            10, 0.0,
          ],
          'line-blur': 5,
        },
      });
    }

    // B. Subtle Ambient Regional Risk Glow Background
    if (!map.getLayer('national-epicenter-fill')) {
      map.addLayer({
        id: 'national-epicenter-fill',
        type: 'fill',
        source: 'national-epicenter-source',
        paint: {
          'fill-color': [
            'match',
            ['get', 'risk_category'],
            'Bahaya', '#ef4444',
            'Siaga', '#f59e0b',
            'Waspada', '#10b981',
            ['coalesce', ['get', 'color'], '#f59e0b'],
          ],
          'fill-opacity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            3, 0.18,
            6, 0.12,
            9, 0.05,
            12, 0.0,
          ],
          'fill-antialias': true,
        },
      });
    }

    const tileUrl = `pmtiles://${window.location.origin}/tiles/oki_risk_latest.pmtiles?v=8`;

    if (!map.getSource('oki-risk-source')) {
      map.addSource('oki-risk-source', {
        type: 'vector',
        url: tileUrl,
      });
    }

    // C. 1 km² Tactical Micro-Grid Risk Cells (55,532 cells across Indonesia) - ALWAYS 100% VISIBLE
    if (!map.getLayer('oki-risk-fill')) {
      map.addLayer({
        id: 'oki-risk-fill',
        type: 'fill',
        source: 'oki-risk-source',
        'source-layer': 'oki_risk',
        paint: {
          // Rich continuous 7-stop linear color ramp
          'fill-color': [
            'interpolate',
            ['linear'],
            ['get', 'risk_score'],
            0.00, '#047857', // Deep Emerald (<0.20 Sangat Aman)
            0.22, '#10b981', // Emerald Green (0.22 Waspada Rendah)
            0.38, '#facc15', // Warm Golden Yellow (Ambang Waspada -> Siaga)
            0.52, '#f59e0b', // Amber Orange (Siaga Moderat)
            0.68, '#f97316', // Fiery Orange (Siaga Tinggi)
            0.82, '#ef4444', // Vermilion Red (Bahaya Akut)
            1.00, '#991b1b', // Deep Crimson Red (Ekstrem)
          ],
          'fill-opacity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            3.0, 0.85,
            6.0, 0.85,
            9.0, 0.88,
            12.0, 0.85,
            16.0, 0.80,
          ],
          'fill-antialias': true,
        },
      });
    }

    // D. Dashed Monitoring Perimeter Border (Framing each territory on top of cells)
    if (!map.getLayer('national-epicenter-line')) {
      map.addLayer({
        id: 'national-epicenter-line',
        type: 'line',
        source: 'national-epicenter-source',
        paint: {
          'line-color': [
            'match',
            ['get', 'risk_category'],
            'Bahaya', '#fca5a5',
            'Siaga', '#fde68a',
            'Waspada', '#a7f3d0',
            '#fbbf24',
          ],
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            3, 1.8,
            5.0, 2.2,
            8.0, 2.8,
            12.0, 3.2,
          ],
          'line-opacity': 0.95,
          'line-dasharray': [3, 2],
        },
      });
    }

    // E. Tactical Modern Micro-Grid: 1km² cell structure lines with refined GIS elegance
    if (!map.getLayer('oki-risk-line')) {
      map.addLayer({
        id: 'oki-risk-line',
        type: 'line',
        source: 'oki-risk-source',
        'source-layer': 'oki_risk',
        paint: {
          'line-color': '#0f172a',
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            6.5, 0.35,
            8.5, 0.50,
            12.0, 0.75,
          ],
          'line-opacity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            6.5, 0.25,
            8.0, 0.40,
            10.0, 0.50,
            12.0, 0.60,
          ],
        },
      });
    }

    // Interactive Hover Reticle Glow for 1km² cells
    if (!map.getLayer('oki-risk-hover')) {
      map.addLayer({
        id: 'oki-risk-hover',
        type: 'line',
        source: 'oki-risk-source',
        'source-layer': 'oki_risk',
        filter: ['==', 'cell_id', ''],
        paint: {
          'line-color': '#38bdf8',
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            6, 1.2,
            9, 2.0,
            12, 3.0,
          ],
          'line-opacity': 0.95,
        },
      });
    }

    if (!map.getLayer('oki-risk-selected')) {
      map.addLayer({
        id: 'oki-risk-selected',
        type: 'line',
        source: 'oki-risk-source',
        'source-layer': 'oki_risk',
        filter: ['==', 'cell_id', selectedCellId || ''],
        paint: {
          'line-color': '#38bdf8',
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            5, 1.5,
            8, 2.5,
            12, 3.5,
          ],
          'line-opacity': 1.0,
        },
      });
    }

    // Hover tooltip for instant cell & region insight discovery
    const hoverPopup = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 12,
      className: 'jejak-hover-popup',
    });

    map.on('mousemove', 'oki-risk-fill', (e) => {
      if (e.features && e.features.length > 0) {
        map.getCanvas().style.cursor = 'pointer';
        const f = e.features[0];
        const props = f.properties;
        const score = Number(props.risk_score) || 0;
        const scorePct = (score * 100).toFixed(1);
        const cat = props.risk_category || (score >= 0.7 ? 'Bahaya' : score >= 0.4 ? 'Siaga' : 'Waspada');
        const color = cat === 'Bahaya' ? '#ef4444' : cat === 'Siaga' ? '#f59e0b' : '#10b981';

        // Update hover outline reticle
        if (map.getLayer('oki-risk-hover')) {
          map.setFilter('oki-risk-hover', ['==', 'cell_id', props.cell_id || '']);
        }

        const isMacro = map.getZoom() < 7.2;

        hoverPopup
          .setLngLat(e.lngLat)
          .setHTML(`
            <div style="background:#181818;border:1px solid #3c4048;padding:6px 10px;border-radius:6px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;color:#fff;box-shadow:0 8px 24px rgba(0,0,0,0.6);line-height:1.4;">
              <div style="display:flex;align-items:center;gap:6px;">
                <span style="width:7px;height:7px;border-radius:9999px;background:${color};"></span>
                <span style="font-weight:700;color:${color}">${cat} (${scorePct}%)</span>
              </div>
              <div style="font-size:10px;color:#cbd5e1;margin-top:2px;">${props.cell_id || 'OKI_GRID'}</div>
              <div style="font-size:9px;color:${isMacro ? '#fbbf24' : '#94a3b8'};margin-top:2px;">
                ${isMacro ? 'Klik untuk melihat detail wilayah ini' : 'Klik kotak untuk melihat penyebab risiko kebakaran'}
              </div>
            </div>
          `)
          .addTo(map);
      }
    });

    map.on('mouseleave', 'oki-risk-fill', () => {
      map.getCanvas().style.cursor = '';
      if (map.getLayer('oki-risk-hover')) {
        map.setFilter('oki-risk-hover', ['==', 'cell_id', '']);
      }
      hoverPopup.remove();
    });

    map.on('click', 'oki-risk-fill', (e) => {
      if (e.features && e.features.length > 0) {
        if (map.getZoom() < 7.2) {
          // Macro zoom: clicking inside the cluster selects the region and zooms in!
          const cellId = e.features[0].properties?.cell_id || '';
          let regionId = 'oki';
          if (cellId.startsWith('KALBAR_')) regionId = 'kalbar';
          else if (cellId.startsWith('KALTENG_')) regionId = 'kalteng';
          else if (cellId.startsWith('PAPUA_') || cellId.startsWith('MERAUKE_')) regionId = 'merauke';
          else if (cellId.startsWith('PBD_') || cellId.startsWith('SORONG_')) regionId = 'sorong';
          else if (cellId.startsWith('SULAWESI_') || cellId.startsWith('SULSEL_')) regionId = 'sulawesi';

          const target = REGION_JUMPS.find((r) => r.id === regionId);
          if (target) {
            handleFlyToRegion(target);
          }
          return;
        }

        // Regional zoom (>= 7.2): select specific cell
        const feature = e.features[0];
        const cellId = feature.properties.cell_id;
        if (onSelectCell) onSelectCell(cellId);
      }
    });

    map.on('mousemove', 'national-epicenter-fill', (e) => {
      if (map.getZoom() < 7.2 && e.features && e.features.length > 0) {
        map.getCanvas().style.cursor = 'pointer';
        const f = e.features[0];
        const props = f.properties;
        hoverPopup
          .setLngLat(e.lngLat)
          .setHTML(`
            <div style="background:#181818;border:1px solid #3c4048;padding:6px 10px;border-radius:6px;font-family:sans-serif;font-size:11px;color:#fff;box-shadow:0 8px 24px rgba(0,0,0,0.6);line-height:1.4;">
              <div style="font-weight:700;color:#38bdf8">${props.name || 'Wilayah Pantauan'}</div>
              <div style="font-size:10px;color:#94a3b8;margin-top:2px;">${(props.cell_count || 0).toLocaleString('id-ID')} Titik Pantau • Rerata Risiko: ${((props.avg_risk || 0)*100).toFixed(1)}%</div>
              <div style="font-size:9px;color:#fbbf24;margin-top:2px;">Klik area untuk melihat ringkasan kondisi wilayah</div>
            </div>
          `)
          .addTo(map);
      }
    });

    map.on('mouseleave', 'national-epicenter-fill', () => {
      map.getCanvas().style.cursor = '';
      hoverPopup.remove();
    });

    map.on('click', 'national-epicenter-fill', (e) => {
      if (e.features && e.features.length > 0) {
        const feature = e.features[0];
        const props = feature.properties;
        const regionId = props?.region_id;
        const target = REGION_JUMPS.find((r) => r.id === regionId);
        if (target) {
          handleFlyToRegion(target);
        } else if (onSelectRegion) {
          onSelectRegion(props);
        }
      }
    });

    map.on('mouseleave', 'national-epicenter-fill', () => {
      map.getCanvas().style.cursor = '';
    });

    // Clicking anywhere on empty background deselects the individual cell and returns to regional insights
    map.on('click', (e) => {
      const activeLayers = ['oki-risk-fill', 'national-epicenter-fill'].filter((id) => map.getLayer(id));
      const hit = activeLayers.length > 0 ? map.queryRenderedFeatures(e.point, { layers: activeLayers }) : [];
      if (!hit || hit.length === 0) {
        if (onSelectCell) onSelectCell(null);
      }
    });
  };

  const addOverlayLayers = (map) => {
    // 2019 Hotspots
    if (!map.getSource('hotspots-2019')) {
      map.addSource('hotspots-2019', {
        type: 'geojson',
        data: HISTORICAL_HOTSPOTS_2019,
      });
      map.addLayer({
        id: 'hotspots-2019-layer',
        type: 'circle',
        source: 'hotspots-2019',
        layout: { visibility: 'none' },
        paint: {
          'circle-radius': 6,
          'circle-color': '#ef4444',
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#ffffff',
          'circle-opacity': 0.85,
        },
      });
    }

    // 2023 Hotspots
    if (!map.getSource('hotspots-2023')) {
      map.addSource('hotspots-2023', {
        type: 'geojson',
        data: HISTORICAL_HOTSPOTS_2023,
      });
      map.addLayer({
        id: 'hotspots-2023-layer',
        type: 'circle',
        source: 'hotspots-2023',
        layout: { visibility: 'none' },
        paint: {
          'circle-radius': 6,
          'circle-color': '#f97316',
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#ffffff',
          'circle-opacity': 0.85,
        },
      });
    }

    // Conversion Layer
    if (!map.getSource('conversion-layer')) {
      map.addSource('conversion-layer', {
        type: 'geojson',
        data: CONVERSION_POLYGONS,
      });
      map.addLayer({
        id: 'conversion-fill',
        type: 'fill',
        source: 'conversion-layer',
        layout: { visibility: 'none' },
        paint: {
          'fill-color': '#e11d48',
          'fill-opacity': 0.45,
        },
      });
      map.addLayer({
        id: 'conversion-line',
        type: 'line',
        source: 'conversion-layer',
        layout: { visibility: 'none' },
        paint: {
          'line-color': '#f43f5e',
          'line-width': 1.5,
          'line-dasharray': [2, 1],
        },
      });
    }

    // Live NASA FIRMS VIIRS NRT Hotspots Layer (Last 24-48 Hours)
    if (!map.getSource('live-hotspots-source')) {
      const initialHotspotData = liveHotspotsDataRef.current || liveHotspotsData || { type: 'FeatureCollection', features: [] };
      map.addSource('live-hotspots-source', {
        type: 'geojson',
        data: initialHotspotData,
      });
      map.addLayer({
        id: 'live-hotspots-glow',
        type: 'circle',
        source: 'live-hotspots-source',
        layout: { visibility: showLiveHotspots ? 'visible' : 'none' },
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 6, 6, 10, 9, 14, 13, 22],
          'circle-color': '#ff4500',
          'circle-opacity': 0.60,
          'circle-blur': 0.5,
        },
      });
      map.addLayer({
        id: 'live-hotspots-layer',
        type: 'circle',
        source: 'live-hotspots-source',
        layout: { visibility: showLiveHotspots ? 'visible' : 'none' },
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 3.5, 6, 5.5, 9, 7.5, 13, 10],
          'circle-color': [
            'case',
            ['>=', ['coalesce', ['get', 'frp_mw'], 0], 5], '#ef4444',
            ['>=', ['coalesce', ['get', 'frp_mw'], 0], 2], '#f97316',
            '#fde047',
          ],
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#ffffff',
          'circle-opacity': 1.0,
        },
      });

      map.on('click', 'live-hotspots-layer', (e) => {
        if (!e.features || !e.features[0]) return;
        const props = e.features[0].properties;
        const coords = e.features[0].geometry.coordinates.slice();

        new maplibregl.Popup({ closeButton: true, closeOnClick: true, className: 'dark-popup' })
          .setLngLat(coords)
          .setHTML(`
            <div style="font-family: ui-sans-serif, system-ui, sans-serif; font-size: 11px; color: #e8eaed; background: #181818; padding: 6px; border-radius: 6px; border: 1px solid #3c4048; min-width: 200px;">
              <div style="font-weight: 700; color: #f87171; display: flex; align-items: center; gap: 4px; margin-bottom: 5px; border-bottom: 1px solid #2d3139; padding-bottom: 4px;">
                <span>🔥 Titik Api Aktif (Live NRT)</span>
              </div>
              <div style="color: #9aa0a6; font-size: 10px; margin-bottom: 3px;">
                <b>Satelit:</b> ${props.satellite || 'VIIRS S-NPP (NASA FIRMS)'}
              </div>
              <div style="color: #9aa0a6; font-size: 10px; margin-bottom: 3px;">
                <b>Waktu Deteksi:</b> ${props.acq_date} ${props.acq_time}
              </div>
              <div style="color: #9aa0a6; font-size: 10px; margin-bottom: 3px;">
                <b>Radiasi (FRP):</b> <span style="color: #facc15; font-weight: bold;">${props.frp_mw || 0} MW</span>
              </div>
              <div style="color: #9aa0a6; font-size: 10px; margin-bottom: 3px;">
                <b>Suhu Kecerahan:</b> ${props.brightness_k || 0} K (${props.day_night || 'Siang'})
              </div>
              ${props.epicenter ? `<div style="color: #38bdf8; font-size: 10px; margin-bottom: 3px;"><b>Wilayah:</b> ${props.epicenter}</div>` : ''}
              <div style="color: #4ade80; font-size: 9px; margin-top: 5px; padding-top: 4px; border-top: 1px solid #2d3139; font-weight: 600;">
                ✓ Terdeteksi Satelit NASA &lt; 24–48 Jam Terakhir
              </div>
            </div>
          `)
          .addTo(map);
      });

      map.on('mouseenter', 'live-hotspots-layer', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'live-hotspots-layer', () => {
        map.getCanvas().style.cursor = '';
      });
    }
  };

  // Multi-Level Epicenter Markers:
  // 1. Zoom < 5.8 (Sangat Jauh / Nasional): Nama daerah saja, ramping, bebas tumpang tindih
  // 2. 5.8 <= Zoom < 7.8 (Agak Dekat / Regional): Details grid muncul
  // 3. Zoom >= 7.8 (Dekat Sekali / Inspeksi Sel): Badge hilang total agar tidak menutupi sel grid
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !isLayerLoaded) return;

    const markerObjs = [];

    EPICENTER_MARKERS.features.forEach((feat) => {
      const { id, zoom } = feat.properties;
      const coords = feat.geometry.coordinates;

      const el = document.createElement('div');
      el.className = 'epicenter-badge cursor-pointer select-none transition-transform hover:scale-105';

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        setActiveRegion(id);
        const target = REGION_JUMPS.find((r) => r.id === id);
        if (target) {
          handleFlyToRegion(target);
        } else {
          map.flyTo({
            center: coords,
            zoom: Number(zoom) || 9,
            speed: 1.2,
            curve: 1.4,
            essential: true,
          });
        }
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat(coords)
        .addTo(map);

      markerObjs.push({ marker, el, feat });
    });

    let currentMode = null;

    const renderMarkers = (force = false) => {
      const zoom = map.getZoom();
      let newMode = 'detailed';
      if (zoom >= 7.8) {
        newMode = 'hidden';
      } else if (zoom < 5.8) {
        newMode = 'compact';
      }

      if (!force && newMode === currentMode) return;
      currentMode = newMode;

      if (newMode === 'hidden') {
        markerObjs.forEach(({ el }) => {
          el.style.display = 'none';
        });
        return;
      }

      const isCompact = newMode === 'compact';

      markerObjs.forEach(({ el, feat }) => {
        const { name, shortName, cells, color } = feat.properties;
        el.style.display = 'flex';

        if (isCompact) {
          // Zoom Sangat Jauh (< 5.8): Nama daerah saja, ramping, bebas tumpang tindih
          el.innerHTML = `
            <div style="display: flex; align-items: center; gap: 5px; padding: 3px 8px; border-radius: 9999px; background: rgba(15, 23, 42, 0.92); backdrop-filter: blur(6px); border: 1px solid ${color}; box-shadow: 0 4px 12px rgba(0,0,0,0.5); font-size: 10px; font-weight: 600; color: #f8fafc; white-space: nowrap; transition: all 0.2s ease;">
              <span style="width: 6px; height: 6px; border-radius: 9999px; background-color: ${color}; box-shadow: 0 0 8px ${color};"></span>
              <span>${shortName}</span>
            </div>
          `;
          el.setAttribute('title', `${name} • ${cells} (Klik untuk perbesar)`);
        } else {
          // Zoom Agak Dekat (5.8 - 7.7): Details grid muncul
          el.innerHTML = `
            <div style="display: flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 9999px; background: rgba(15, 23, 42, 0.95); backdrop-filter: blur(8px); border: 1.5px solid ${color}; box-shadow: 0 8px 20px rgba(0,0,0,0.6); font-size: 11px; font-weight: 600; color: #ffffff; white-space: nowrap; transition: all 0.2s ease;">
              <span style="width: 8px; height: 8px; border-radius: 9999px; background-color: ${color}; box-shadow: 0 0 10px ${color};"></span>
              <span>${name}</span>
              <span style="font-size: 10px; font-family: monospace; font-weight: 400; color: #94a3b8; background: rgba(255,255,255,0.12); padding: 1px 5px; border-radius: 4px;">(${cells})</span>
            </div>
          `;
          el.removeAttribute('title');
        }
      });
    };

    renderMarkers(true);
    map.on('zoom', renderMarkers);

    return () => {
      map.off('zoom', renderMarkers);
      markerObjs.forEach(({ marker }) => marker.remove());
    };
  }, [isLayerLoaded]);

  // Replay visibility
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !isLayerLoaded) return;

    if (map.getLayer('hotspots-2019-layer')) {
      map.setLayoutProperty('hotspots-2019-layer', 'visibility', replayYear === 2019 ? 'visible' : 'none');
    }
    if (map.getLayer('hotspots-2023-layer')) {
      map.setLayoutProperty('hotspots-2023-layer', 'visibility', replayYear === 2023 ? 'visible' : 'none');
    }
  }, [replayYear, isLayerLoaded]);

  // Live NASA FIRMS Hotspots visibility
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !isLayerLoaded) return;

    const vis = showLiveHotspots ? 'visible' : 'none';
    if (map.getLayer('live-hotspots-layer')) {
      map.setLayoutProperty('live-hotspots-layer', 'visibility', vis);
    }
    if (map.getLayer('live-hotspots-glow')) {
      map.setLayoutProperty('live-hotspots-glow', 'visibility', vis);
    }
  }, [showLiveHotspots, isLayerLoaded]);

  // Conversion visibility
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !isLayerLoaded) return;

    const vis = showConversionLayer ? 'visible' : 'none';
    if (map.getLayer('conversion-fill')) {
      map.setLayoutProperty('conversion-fill', 'visibility', vis);
    }
    if (map.getLayer('conversion-line')) {
      map.setLayoutProperty('conversion-line', 'visibility', vis);
    }
  }, [showConversionLayer, isLayerLoaded]);

  // Selected cell highlight
  useEffect(() => {
    const map = mapInstance.current;
    if (map && map.getLayer('oki-risk-selected')) {
      map.setFilter('oki-risk-selected', ['==', 'cell_id', selectedCellId || '']);
    }
  }, [selectedCellId]);



  const handleZoomIn = () => mapInstance.current?.zoomIn();
  const handleZoomOut = () => mapInstance.current?.zoomOut();

  const handleResetNorth = () => {
    const map = mapInstance.current;
    if (!map) return;

    const bearing = map.getBearing();
    const pitch = map.getPitch();

    // 1. If map has been rotated or tilted by user, smoothly animate back to true North
    if (Math.abs(bearing) > 0.5 || Math.abs(pitch) > 0.5) {
      map.easeTo({
        bearing: 0,
        pitch: 0,
        duration: 400,
        essential: true,
      });
      setMapBearing(0);
      return;
    }

    // 2. If already facing North, reset view back to National Overview (Seluruh Indonesia)
    handleFlyToRegion(REGION_JUMPS[0]);
  };

  const handleFlyToRegion = (reg) => {
    setActiveRegion(reg.id);
    setShowRegionDropdown(false);
    if (onSelectCell) onSelectCell(null); // Clear selected individual cell when jumping region
    if (reg.id !== 'all') {
      const regionData = nationalEpicenterCoverage.features.find(
        (f) => f.properties.region_id === reg.id
      )?.properties;
      if (regionData && onSelectRegion) {
        onSelectRegion(regionData);
      }
    } else {
      if (onSelectRegion) onSelectRegion(null);
    }
    if (!mapInstance.current) return;
    mapInstance.current.flyTo({
      center: reg.center,
      zoom: reg.zoom,
      speed: 1.2,
      curve: 1.4,
      essential: true,
    });
  };


  return (
    <div className="relative w-full h-full flex-1 min-w-0 overflow-hidden select-none">
      <div ref={mapContainer} className="w-full h-full bg-[#121316]" />

      {/* High-Tech Enterprise Loading Overlay */}
      {isTilesLoading && (
        <div className="absolute inset-0 bg-[#121316]/75 backdrop-blur-xs flex items-center justify-center z-30 transition-opacity duration-300 pointer-events-none">
          <div className="bg-[#18191e]/95 border border-[#2d313b] rounded-2xl px-6 py-5 shadow-2xl flex flex-col items-center gap-3.5 text-center max-w-sm pointer-events-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="relative flex items-center justify-center w-12 h-12 rounded-full bg-[#20242c] border border-[#383d48]">
              <Flame className="w-6 h-6 text-amber-500 animate-pulse" />
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#38bdf8] animate-ping" />
            </div>
            <div>
              <h4 className="font-semibold text-sm text-[#f1f3f4] flex items-center justify-center gap-2">
                <span>Memuat Peta Risiko Karhutla</span>
              </h4>
              <p className="text-xs text-[#9aa0a6] mt-1 leading-relaxed">
                Memuat 55.532 titik pantau (6 Wilayah Pantauan Utama) secara cepat...
              </p>
            </div>
            {/* Shimmer progress bar */}
            <div className="w-full bg-[#282c35] h-1.5 rounded-full overflow-hidden mt-1 relative">
              <div className="h-full bg-gradient-to-r from-amber-500 via-[#38bdf8] to-[#10b981] rounded-full w-full animate-pulse" />
            </div>
            <div className="flex items-center gap-2 text-[10px] font-mono text-[#6b7280]">
              <span className="flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin text-[#38bdf8]" />
                Sinkronisasi Byte-Range
              </span>
              <span>•</span>
              <span>DuckDB Engine</span>
            </div>
          </div>
        </div>
      )}

      {/* Floating Tactical Map Controls on Top-Left (Enterprise Dark GIS Style) */}
      <div id="tour-map-controls" className="absolute top-4 left-4 z-10 flex flex-col gap-1.5">
        <div className="bg-[#181818] border border-[#2d3139] rounded overflow-hidden shadow-lg flex flex-col">
          <button
            onClick={handleZoomIn}
            className="w-8 h-8 flex items-center justify-center text-[#9aa0a6] hover:text-[#e8eaed] hover:bg-[#202124] transition-colors border-b border-[#2d3139]"
            title="Perbesar Peta"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            className="w-8 h-8 flex items-center justify-center text-[#9aa0a6] hover:text-[#e8eaed] hover:bg-[#202124] transition-colors border-b border-[#2d3139]"
            title="Perkecil Peta"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            onClick={handleResetNorth}
            className={`w-8 h-8 flex items-center justify-center transition-all cursor-pointer active:scale-90 ${
              Math.abs(mapBearing) > 0.5
                ? 'text-[#38bdf8] bg-[#1e293b] hover:bg-[#253752]'
                : 'text-[#9aa0a6] hover:text-[#e8eaed] hover:bg-[#202124]'
            }`}
            title={
              Math.abs(mapBearing) > 0.5
                ? `Reset Arah Utara (Rotasi ${mapBearing}°)`
                : activeRegion !== 'all'
                ? 'Kembali ke Tampilan Nasional (Seluruh Indonesia)'
                : 'Pusatkan Peta ke Seluruh Indonesia'
            }
            aria-label="Reset arah utara atau tampilan nasional"
          >
            <Compass
              className="w-4 h-4 transition-transform duration-200"
              style={{ transform: `rotate(${-mapBearing}deg)` }}
            />
          </button>
        </div>
      </div>

      {/* Floating Tactical Region Navigation Toolbar - Never Collides with Sidebars */}
      <div
        id="tour-region-jumps"
        className="absolute top-3 left-14 sm:left-16 z-20 flex items-center gap-1 bg-[#14161b]/95 backdrop-blur-xl border border-[#2d3139] hover:border-[#3c4048] p-1 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.6)] max-w-[calc(100%-70px)] sm:max-w-[calc(100%-90px)] transition-all"
      >
        {/* Left Scroll Chevron Button */}
        <button
          id="region-nav-scroll-left"
          type="button"
          onClick={() => handleScrollRegionNav(-160)}
          disabled={!canScrollLeft}
          className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all ${
            canScrollLeft
              ? 'bg-[#1e2430] hover:bg-[#252f40] text-[#38bdf8] shadow-xs cursor-pointer hover:scale-110 active:scale-95 border border-[#38bdf8]/30'
              : 'opacity-20 text-[#5f6368] cursor-not-allowed pointer-events-none'
          }`}
          title="Geser Wilayah ke Kiri"
          aria-label="Scroll regions left"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        {/* Scrollable Region Nav Item List */}
        <div
          ref={regionScrollRef}
          onScroll={checkRegionScroll}
          className="flex-1 min-w-0 flex items-center gap-1 overflow-x-auto scrollbar-none scroll-smooth px-0.5"
        >
          {isTilesLoading && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#1e2430] text-[10px] font-mono text-[#38bdf8] shrink-0 border border-[#38bdf8]/30 animate-pulse">
              <Loader2 className="w-3 h-3 animate-spin text-[#38bdf8]" />
              <span className="hidden sm:inline">55.5k Sel...</span>
            </div>
          )}

          {/* 1. National Overview Button (Primary Anchor) */}
          <button
            onClick={() => handleFlyToRegion(REGION_JUMPS[0])}
            className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 ${
              activeRegion === 'all'
                ? 'bg-[#252f40] text-[#38bdf8] border border-[#38bdf8]/50 shadow-[0_0_12px_rgba(56,189,248,0.25)]'
                : 'text-[#9aa0a6] hover:text-[#e8eaed] hover:bg-[#202124]'
            }`}
            title="Tampilan Nasional: Seluruh Indonesia (55.532 Sel Grid 1 km²)"
          >
            <span className="text-sm">🇮🇩</span>
            <span>Seluruh Indonesia</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 bg-[#1b202a] rounded-full text-[#38bdf8] border border-[#38bdf8]/20">
              55.5k
            </span>
          </button>

          {/* Vertical Divider */}
          <span className="w-px h-4 bg-[#2d3139] mx-0.5 shrink-0" />

          {/* 2. Direct Region Buttons for 6 Epicenters (Clean, Direct & Tactical) */}
          {REGION_JUMPS.slice(1).map((reg) => {
            const isAct = activeRegion === reg.id;
            return (
              <button
                key={reg.id}
                onClick={() => handleFlyToRegion(reg)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 shrink-0 ${
                  isAct
                    ? 'bg-[#252f40] text-[#38bdf8] border border-[#38bdf8]/50 shadow-sm font-semibold'
                    : 'text-[#9aa0a6] hover:text-[#e8eaed] hover:bg-[#202124]'
                }`}
                title={`${reg.name} (${reg.province}) • ${reg.cells} • ${reg.badge}`}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: reg.dot }}
                />
                <span>{reg.shortName}</span>
                {reg.badge === 'Pilot Utama' && (
                  <span className="text-[9px] font-bold text-amber-400 bg-amber-500/10 px-1 rounded border border-amber-500/30">
                    Pilot
                  </span>
                )}
              </button>
            );
          })}

          {/* 3. POC Scope Modal Trigger Button */}
          {onOpenPocInfo && (
            <>
              <span className="w-px h-4 bg-[#2d3139] mx-0.5 shrink-0" />
              <button
                id="tour-poc-info-btn"
                onClick={onOpenPocInfo}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 whitespace-nowrap transition-colors shrink-0"
                title="Pelajari mengapa 6 wilayah ini yang dipilih pada tahap demo awal"
              >
                <Info className="w-3.5 h-3.5 text-amber-400" />
                <span>Wilayah Demo</span>
              </button>
            </>
          )}

        </div>

        {/* Right Scroll Chevron Button */}
        <button
          id="region-nav-scroll-right"
          type="button"
          onClick={() => handleScrollRegionNav(160)}
          disabled={!canScrollRight}
          className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all ${
            canScrollRight
              ? 'bg-[#1e2430] hover:bg-[#252f40] text-[#38bdf8] shadow-xs cursor-pointer hover:scale-110 active:scale-95 border border-[#38bdf8]/30 animate-pulse'
              : 'opacity-20 text-[#5f6368] cursor-not-allowed pointer-events-none'
          }`}
          title="Geser Wilayah ke Kanan"
          aria-label="Scroll regions right"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        {/* Vertical Divider */}
        <span className="w-px h-4 bg-[#2d3139] mx-0.5 shrink-0" />

        {/* 4. Live NASA FIRMS Hotspot NRT Toggle & Scope Selector - Always Pinned & Visible */}
        <div className="flex items-center bg-[#181818] border border-[#2d3139] rounded-full p-0.5 shrink-0 shadow-sm">
          <button
            type="button"
            onClick={() => setShowLiveHotspots(!showLiveHotspots)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              showLiveHotspots
                ? 'bg-red-500/20 text-red-300 border border-red-500/40 shadow-[0_0_10px_rgba(239,68,68,0.25)]'
                : 'text-[#9aa0a6] hover:text-[#e8eaed]'
            }`}
            title="Tampilkan / Sembunyikan Titik Api Satelit NASA VIIRS Live"
          >
            <span className="relative flex h-2 w-2">
              {showLiveHotspots && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              )}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${showLiveHotspots ? 'bg-red-500' : 'bg-gray-500'}`}></span>
            </span>
            <Flame className="w-3.5 h-3.5 text-orange-400" />
            <span className="font-mono text-[10px] text-amber-300 font-bold">
              {liveHotspotCount ? `${liveHotspotCount.toLocaleString('id-ID')} Api` : 'Live NRT'}
            </span>
          </button>

          {/* Scope Toggle: Wilayah Rawan (1.299) vs Seluruh Indonesia (5.275) */}
          {showLiveHotspots && (
            <div className="flex items-center gap-0.5 pl-1 pr-1 text-[10px]">
              <button
                type="button"
                onClick={() => setHotspotScope('epicenters')}
                className={`px-2 py-0.5 rounded-full transition-colors font-medium cursor-pointer ${
                  hotspotScope === 'epicenters'
                    ? 'bg-[#282c34] text-[#38bdf8] font-bold border border-[#38bdf8]/40 shadow-xs'
                    : 'text-[#9aa0a6] hover:text-[#e8eaed]'
                }`}
                title="Hanya tampilkan titik api yang berada di dalam 6 wilayah pantauan gambut utama"
              >
                Wilayah Rawan
              </button>
              <button
                type="button"
                onClick={() => setHotspotScope('all')}
                className={`px-2 py-0.5 rounded-full transition-colors font-medium cursor-pointer ${
                  hotspotScope === 'all'
                    ? 'bg-[#282c34] text-amber-300 font-bold border border-amber-400/40 shadow-xs'
                    : 'text-[#9aa0a6] hover:text-[#e8eaed]'
                }`}
                title="Tampilkan semua titik api satelit yang terdeteksi di seluruh Indonesia"
              >
                Seluruh RI
              </button>
            </div>
          )}
        </div>
      </div>




    </div>
  );
};

export default MapViewer;
