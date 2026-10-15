/**
 * JEJAK API - Basemap Definitions and Visual Metadata
 * Supports Esri Dark Canvas, Esri High-Resolution Satellite,
 * NASA GIBS Live NRT TrueColor, OpenStreetMap Standard, and OpenFreeMap Vector.
 */

export const BASEMAPS = {
  dark: {
    id: 'dark',
    name: 'Esri Dark Canvas',
    shortName: 'Mode Gelap Kontras',
    tag: 'Paling Nyaman & Jelas',
    tagColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    description: 'Latar belakang gelap agar titik api dan kotak risiko kebakaran terlihat sangat jelas dan mata tidak cepat lelah.',
    thumbnail: '/basemaps/dark.jpg',
    features: [
      'Titik api merah & kuning menyala sangat jelas',
      'Fokus langsung ke kotak area yang berisiko',
      'Sangat nyaman untuk pantauan malam hari & ruang kendali',
    ],
    style: {
      version: 8,
      glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
      sources: {
        'esri-dark-base': {
          type: 'raster',
          tiles: [
            'https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
          ],
          tileSize: 256,
          attribution: '&copy; Esri &copy; HERE, Garmin, FAO, USGS',
        },
        'esri-dark-ref': {
          type: 'raster',
          tiles: [
            'https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
          ],
          tileSize: 256,
        },
      },
      layers: [
        {
          id: 'esri-dark-base-layer',
          type: 'raster',
          source: 'esri-dark-base',
          minzoom: 0,
          maxzoom: 16,
        },
        {
          id: 'esri-dark-ref-layer',
          type: 'raster',
          source: 'esri-dark-ref',
          minzoom: 0,
          maxzoom: 16,
        },
      ],
    },
  },
  satellite: {
    id: 'satellite',
    name: 'Foto Satelit Resolusi Tinggi',
    shortName: 'Foto Satelit Nyata',
    tag: 'Foto Udara Asli',
    tagColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    description: 'Foto udara asli dan jernih untuk melihat langsung kondisi hutan, parit saluran air, dan area kebun.',
    thumbnail: '/basemaps/satellite.jpg',
    features: [
      'Melihat parit buatan dan saluran pengering gambut',
      'Membedakan kebun kelapa sawit dengan hutan lebat',
      'Melihat bekas lahan yang pernah terbakar',
    ],
    style: {
      version: 8,
      glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
      sources: {
        'esri-imagery': {
          type: 'raster',
          tiles: [
            'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          ],
          tileSize: 256,
          attribution: '&copy; Esri &copy; Maxar, Earthstar Geographics',
        },
      },
      layers: [
        {
          id: 'esri-imagery-layer',
          type: 'raster',
          source: 'esri-imagery',
          minzoom: 0,
          maxzoom: 19,
        },
      ],
    },
  },
  nasa_gibs: {
    id: 'nasa_gibs',
    name: 'Foto Satelit Harian (NASA Live)',
    shortName: 'Foto Satelit Harian',
    tag: 'Update Tiap 24 Jam',
    tagColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    description: 'Foto satelit harian terbaru dari NASA untuk memantau kepulan asap kebakaran dan tutupan awan hari ini.',
    thumbnail: '/basemaps/nasa_gibs.jpg',
    features: [
      'Foto diperbarui otomatis tiap 24 jam oleh satelit NASA',
      'Melihat kepulan asap tebal kebakaran secara nyata',
      'Mengecek tutupan awan saat pemadaman udara',
    ],
    style: {
      version: 8,
      glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
      sources: {
        'nasa-gibs-imagery': {
          type: 'raster',
          tiles: [
            'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_SNPP_CorrectedReflectance_TrueColor/default/default/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg',
          ],
          tileSize: 256,
          attribution: '&copy; NASA EOSDIS GIBS VIIRS True Color NRT',
        },
      },
      layers: [
        {
          id: 'nasa-gibs-imagery-layer',
          type: 'raster',
          source: 'nasa-gibs-imagery',
          minzoom: 0,
          maxzoom: 12,
        },
      ],
    },
  },
  osm: {
    id: 'osm',
    name: 'Peta Jalan & Permukiman',
    shortName: 'Peta Jalan & Desa',
    tag: 'Petunjuk Jalan Lapangan',
    tagColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    description: 'Peta jalan darat, nama desa, sungai, dan jalur setapak untuk mempermudah petugas menuju lokasi.',
    thumbnail: '/basemaps/osm.png',
    features: [
      'Jaringan jalan akses darat dan jembatan desa',
      'Nama desa, sungai, dan posko relawan terdekat',
      'Petunjuk jalan bagi tim pemadam di darat',
    ],
    style: {
      version: 8,
      glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
      sources: {
        'osm-tiles': {
          type: 'raster',
          tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
          tileSize: 256,
          attribution: '&copy; OpenStreetMap contributors',
        },
      },
      layers: [
        {
          id: 'osm-layer',
          type: 'raster',
          source: 'osm-tiles',
          minzoom: 0,
          maxzoom: 19,
        },
      ],
    },
  },
};

export const BASEMAP_LIST = Object.values(BASEMAPS);
