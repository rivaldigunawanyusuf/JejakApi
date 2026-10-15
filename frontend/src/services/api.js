// src/services/api.js
import axios from 'axios';

const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL || '';
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
    // If accessing from remote server/VPS/domain, but env var is pointing to localhost, fallback to relative path ''
    if (!isLocalhost && (envUrl.includes('localhost') || envUrl.includes('127.0.0.1'))) {
      return '';
    }
  }
  return envUrl;
};

const API_BASE_URL = getApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

export const fetchHealth = async () => {
  const response = await api.get('/api/health');
  return response.data;
};

export const fetchStatsSummary = async () => {
  const response = await api.get('/api/stats/summary');
  return response.data;
};

export const fetchTopKPatrol = async ({
  k = 10,
  khg_id = null,
  risk_category = null,
  max_access_distance_m = null,
  sort_by = 'risk_score',
} = {}) => {
  const params = { k, sort_by };
  if (khg_id) params.khg_id = khg_id;
  if (risk_category) params.risk_category = risk_category;
  if (max_access_distance_m != null) params.max_access_distance_m = max_access_distance_m;

  const response = await api.get('/api/patrol/top-k', { params });
  return response.data;
};

export const fetchModelBenchmark = async () => {
  const response = await api.get('/api/model/benchmark');
  return response.data;
};

export const inspectCell = async (cell_id) => {
  const response = await api.get(`/api/cells/${cell_id}/inspect`);
  return response.data;
};

export const searchCells = async (query) => {
  const response = await api.get('/api/cells/search', { params: { q: query } });
  return response.data;
};

export const simulateAlertWebhook = async ({
  target_area_name = 'Kabupaten Ogan Komering Ilir',
  khg_id = null,
  risk_threshold = 0.6,
  dispatch_telegram = false,
  chat_id = null,
} = {}) => {
  const payload = {
    target_area_name,
    khg_id: khg_id || null,
    risk_threshold,
    dispatch_telegram,
    chat_id: chat_id || null,
  };
  const response = await api.post('/api/alerts/webhook/simulate', payload);
  return response.data;
};

export const getExportPatrolCsvUrl = ({
  k = 15,
  khg_id = null,
  risk_category = null,
  max_access_distance_m = null,
  sort_by = 'risk_score',
} = {}) => {
  const params = new URLSearchParams({ k: String(k), sort_by });
  if (khg_id) params.append('khg_id', khg_id);
  if (risk_category) params.append('risk_category', risk_category);
  if (max_access_distance_m != null) params.append('max_access_distance_m', String(max_access_distance_m));
  return `${API_BASE_URL}/api/patrol/top-k/export?${params.toString()}`;
};

export const fetchDroneMissions = async () => {
  const response = await api.get('/api/drone/missions');
  return response.data;
};

export const verifyDroneMission = async (payload) => {
  const response = await api.post('/api/drone/verify', payload);
  return response.data;
};

export const fetchLiveHotspots = async (onlyEpicenters = true, refresh = false) => {
  try {
    const response = await api.get('/api/live/hotspots', {
      params: { only_epicenters: onlyEpicenters, refresh },
      timeout: 8000,
    });
    if (response.data && Array.isArray(response.data.features) && response.data.features.length > 0) {
      return response.data;
    }
  } catch (err) {
    console.warn('API /api/live/hotspots unreachable or failed, attempting local fallback:', err);
  }

  // Robust fallback: load bundled NASA FIRMS live verification dataset
  try {
    const fallbackModule = await import('../data/live_hotspots_latest.json');
    const rawData = fallbackModule.default || fallbackModule;
    const allFeatures = rawData.features || [];
    const features = onlyEpicenters
      ? allFeatures.filter((f) => f.properties?.is_in_epicenter)
      : allFeatures;

    return {
      type: 'FeatureCollection',
      features,
      metadata: {
        total_epicenter_hotspots: allFeatures.filter((f) => f.properties?.is_in_epicenter).length,
        total_indonesia_hotspots: allFeatures.length,
        source: 'NASA FIRMS VIIRS 375m (Verified NRT Fallback)',
        status: 'cached_fallback',
      },
    };
  } catch (fallbackErr) {
    console.error('Failed to load local hotspots fallback:', fallbackErr);
    return { type: 'FeatureCollection', features: [] };
  }
};

export const fetchLiveWeather = async (lat = -3.35, lon = 105.30) => {
  const response = await api.get('/api/live/weather', {
    params: { lat, lon },
  });
  return response.data;
};

export default api;