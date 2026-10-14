"""Pydantic v2 schemas and validation models for JEJAK API."""

from __future__ import annotations

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class RiskFeatureContribution(BaseModel):
    feature_name: str = Field(..., description="Name of the predictive feature")
    contribution_score: float = Field(..., description="TreeSHAP local importance score")
    narrative: str = Field(..., description="Neutral scientific narrative explaining the local risk factor")


class CellSummary(BaseModel):
    cell_id: str
    risk_score: float = Field(..., ge=0.0, le=1.0)
    risk_score_calibrated: Optional[float] = Field(None, ge=0.0, le=1.0)
    risk_category: str = Field(..., description="Waspada, Siaga, or Bahaya")
    khg_id: str
    lon: float
    lat: float
    canal_density_km_km2: float
    distance_to_road_m: float
    distance_to_waterway_m: float
    access_distance_m: Optional[float] = Field(None, description="Minimum distance to road or navigable waterway in meters")
    top_factor_1_name: str
    top_factor_1_score: float


class CellRiskResponse(BaseModel):
    cell_id: str
    risk_score: float = Field(..., ge=0.0, le=1.0)
    risk_score_calibrated: Optional[float] = Field(None, ge=0.0, le=1.0)
    risk_category: str
    khg_id: str
    lon: float
    lat: float
    canal_density_km_km2: float
    distance_to_road_m: float
    distance_to_waterway_m: float
    access_distance_m: Optional[float] = None
    temp_c: Optional[float] = None
    rh_pct: Optional[float] = None
    dc: Optional[float] = None
    dmc: Optional[float] = None
    rain_deficit_30d: Optional[float] = None
    clearing_w0_30: Optional[float] = None
    clearing_w30_90: Optional[float] = None
    clearing_w90_365: Optional[float] = None
    fire_history_w0_30: Optional[float] = None
    top_factors: List[RiskFeatureContribution] = Field(..., min_length=3, max_length=3)


class PatrolTopKResponse(BaseModel):
    k: int
    total_cells: int
    results: List[CellSummary]


class StatsSummaryResponse(BaseModel):
    total_cells: int
    risk_distribution: Dict[str, int]
    risk_percentage: Dict[str, float]
    mean_canal_density_km_km2: float
    max_risk_score: float
    highest_risk_cell: str


class AlertSimulationRequest(BaseModel):
    target_area_name: str = Field(default="Kabupaten Ogan Komering Ilir", description="Administrative target area")
    khg_id: Optional[str] = Field(default=None, description="Optional KHG filter")
    risk_threshold: float = Field(default=0.60, ge=0.0, le=1.0, description="Risk probability alert threshold")
    dispatch_telegram: bool = Field(default=False, description="Optionally dispatch directly to Telegram if configured")
    chat_id: Optional[str] = Field(default=None, description="Optional Telegram target chat ID")


class AlertSimulationResponse(BaseModel):
    status: str
    target_area: str
    alert_level: str
    high_risk_cells_count: int
    telegram_digest: str
    dispatched: bool = False


class DatabaseHealth(BaseModel):
    engine: str
    parquet_path: str
    total_cells: int


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    database: DatabaseHealth


class ModelBenchmarkMetric(BaseModel):
    model_name: str
    model_class: str
    description: str
    feature_count: int
    features: List[str]
    training_time_seconds: Optional[float] = None
    pr_auc: float
    roc_auc: float
    recall_top_5pct: float
    precision_at_k11: Optional[float] = None
    precision_at_k16: Optional[float] = None
    brier_score_raw: Optional[float] = None
    brier_score_calibrated: Optional[float] = None
    ece_calibrated: Optional[float] = None
    reliability_diagram: Optional[List[Dict[str, Any]]] = None


class BenchmarkResponse(BaseModel):
    generated_at: str
    validation_protocol: str
    data_provenance: Dict[str, Any]
    target_operational_context: Dict[str, Any]
    models: Dict[str, ModelBenchmarkMetric]
    lift_over_baseline_0: Dict[str, Any]
    lift_over_baseline_1: Dict[str, Any]
    validation_comparison: Optional[Dict[str, Any]] = None
    normal_year_false_alarm_check_2024_2025: Optional[Dict[str, Any]] = None
    fwi_oki_relevance_study: Optional[Dict[str, Any]] = None
    methodology_note: Optional[Dict[str, Any]] = None
    fairness_land_class_audit: Optional[Dict[str, Any]] = None
    dual_label_provenance: Optional[Dict[str, Any]] = None


class DroneDetection(BaseModel):
    id: str
    label: str
    confidence: float
    bbox: List[float] = Field(..., description="[ymin, xmin, ymax, xmax] normalized bounding box coordinates")
    source_channel: str = Field(..., description="'RGB_OPTICAL' or 'THERMAL_INFRARED'")


class DroneMission(BaseModel):
    mission_id: str
    cell_id: str
    khg_id: str
    area_name: str
    priority_rank: int
    risk_score: float
    lat: float
    lon: float
    altitude_m_agl: float = Field(..., description="Altitude in meters above ground level (VLOS <= 120m Kemenhub CASR 107)")
    vlos_compliant: bool = True
    battery_pct: int
    flight_time_minutes: float
    thermal_max_c: float
    thermal_ambient_c: float
    telemetry_status: str
    detections: List[DroneDetection]
    video_stream_type: str = Field(default="SIMULATED_HLS_WEBRTC")
    region_id: Optional[str] = Field(default="oki", description="Episenter region code")
    region_name: Optional[str] = Field(default="Sumatera Selatan (OKI)", description="Episenter region name")
    camera_name: Optional[str] = Field(default=None, description="Camera callsign (AlertCalifornia style)")
    azimuth_deg: Optional[float] = Field(default=142.0, description="Compass azimuth bearing in degrees")
    video_url: Optional[str] = Field(default="/videos/drone_wildfire_recon.webm", description="Local or streaming video URL")
    stream_mode: Optional[str] = Field(default="LIVE", description="'LIVE' or 'RECORDED'")
    ptz_status: Optional[str] = Field(default="AUTO_SWEEP_360", description="PTZ camera movement status")
    timezone_label: Optional[str] = Field(default="WIB", description="Local Indonesian timezone (WIB, WITA, WIT)")
    tilt_deg: Optional[float] = Field(default=-18.0, description="Gimbal pitch tilt angle in degrees")
    camera_lens: Optional[str] = Field(default="24mm WIDE", description="Optical lens focal length preset")
    landscape_desc: Optional[str] = Field(default=None, description="Ecological landscape description")
    offline_reason: Optional[str] = Field(default=None, description="Offline or standby state reason ('STANDBY_CHARGING' or 'AREA_AMAN')")
    standby_note: Optional[str] = Field(default=None, description="Tactical note for standby or docking charging")


class DroneMissionListResponse(BaseModel):
    total_missions: int
    operational_mode: str = Field(
        default="MANUAL_VLOS_MAX_120M",
        description="Manual VLOS operation under 120m compliant with Ministry of Transportation regulations",
    )
    missions: List[DroneMission]


class DroneVerificationRequest(BaseModel):
    cell_id: str
    verification_status: str = Field(
        ...,
        description="'confirmed_fire_smoke', 'active_land_clearing', or 'false_alarm'",
    )
    pilot_team: str = Field(default="Manggala Agni Daops OKI Regu Cengal")
    notes: Optional[str] = None
    coordinates: Optional[Dict[str, float]] = None


class DroneVerificationResponse(BaseModel):
    status: str
    verification_id: str
    cell_id: str
    verification_status: str
    queued_for_active_learning: bool = True
    message: str
    timestamp: str

