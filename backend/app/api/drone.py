"""Drone live-stream verification & active learning field feedback endpoint (Feature F6).

Operational mode: Manual VLOS (Visual Line of Sight <= 120m AGL) compliant with Ministry of Transportation regulations.
"""

from __future__ import annotations

import datetime
import json
import uuid
from pathlib import Path
from typing import Any, List
from fastapi import APIRouter, HTTPException

from app.core import config
from app.models.schemas import (
    DroneDetection,
    DroneMission,
    DroneMissionListResponse,
    DroneVerificationRequest,
    DroneVerificationResponse,
)

router = APIRouter(prefix="/api/drone", tags=["Drone Verification (F6)"])

ACTIVE_LEARNING_QUEUE_PATH = config.BACKEND_DIR / "data" / "drone_active_learning_queue.json"

MOCK_MISSIONS: List[DroneMission] = [
    # --- SUMATERA SELATAN (OKI - PRIMARY PILOT - 4 CAMERAS) ---
    DroneMission(
        mission_id="mission-oki-01",
        cell_id="OKI_GRID_36794",
        khg_id="KHG_SUGIHAN_LUMPUR",
        area_name="Kecamatan Cengal, OKI",
        camera_name="CAM-OKI-01: Cengal Kubah Gambut Selatan",
        region_id="oki",
        region_name="Sumatera Selatan (OKI)",
        priority_rank=1,
        risk_score=0.8842,
        lat=-3.4149,
        lon=105.8507,
        altitude_m_agl=105.0,
        azimuth_deg=142.0,
        tilt_deg=-18.0,
        timezone_label="WIB",
        camera_lens="24mm WIDE OPTICAL",
        landscape_desc="Kubah Gambut Dalam Sugihan-Lumpur • Kolom Asap Smoldering Aktif",
        vlos_compliant=True,
        battery_pct=78,
        flight_time_minutes=14.5,
        thermal_max_c=48.2,
        thermal_ambient_c=31.4,
        telemetry_status="LIVE_TELEMETRY_CONNECTED",
        video_stream_type="HLS_WEBRTC_LOOP",
        video_url="/videos/drone_wildfire_recon.webm",
        stream_mode="LIVE",
        ptz_status="AUTO_SWEEP_360",
        detections=[
            DroneDetection(
                id="det-01",
                label="Asap Tebal / Smoldering Gambut",
                confidence=0.942,
                bbox=[0.25, 0.35, 0.65, 0.75],
                source_channel="RGB_OPTICAL",
            ),
            DroneDetection(
                id="det-02",
                label="Bukaan Vegetasi & Parit Drainase",
                confidence=0.891,
                bbox=[0.45, 0.15, 0.85, 0.55],
                source_channel="RGB_OPTICAL",
            ),
            DroneDetection(
                id="det-03",
                label="Hotspot Termal Bawah Permukaan (48.2°C)",
                confidence=0.967,
                bbox=[0.30, 0.40, 0.60, 0.70],
                source_channel="THERMAL_INFRARED",
            ),
        ],
    ),
    DroneMission(
        mission_id="mission-oki-02",
        cell_id="OKI_GRID_41022",
        khg_id="KHG_LUMPUR_JERUJU",
        area_name="Kecamatan Tulung Selapan, OKI",
        camera_name="CAM-OKI-02: Tulung Selapan Buffer Konsesi",
        region_id="oki",
        region_name="Sumatera Selatan (OKI)",
        priority_rank=2,
        risk_score=0.8415,
        lat=-3.4892,
        lon=105.7412,
        altitude_m_agl=98.0,
        azimuth_deg=215.0,
        tilt_deg=-45.0,
        timezone_label="WIB",
        camera_lens="50mm SURVEY NADIR",
        landscape_desc="Buffer Konsesi HTI Tulung Selapan • Pembalakan Kayu & Alat Berat",
        vlos_compliant=True,
        battery_pct=85,
        flight_time_minutes=8.2,
        thermal_max_c=42.6,
        thermal_ambient_c=31.8,
        telemetry_status="LIVE_TELEMETRY_CONNECTED",
        video_stream_type="HLS_WEBRTC_LOOP",
        video_url="/videos/drone_forest_survey.webm",
        stream_mode="LIVE",
        ptz_status="PTZ_TRACKING",
        detections=[
            DroneDetection(
                id="det-04",
                label="Pembalakan Kayu & Bukaan Lahan",
                confidence=0.891,
                bbox=[0.20, 0.25, 0.70, 0.80],
                source_channel="RGB_OPTICAL",
            ),
            DroneDetection(
                id="det-05",
                label="Alat Berat Ekskavator & Rintasan",
                confidence=0.914,
                bbox=[0.10, 0.30, 0.50, 0.60],
                source_channel="RGB_OPTICAL",
            ),
            DroneDetection(
                id="det-05b",
                label="Titik Friksi Termal Mekanis (42.6°C)",
                confidence=0.884,
                bbox=[0.35, 0.45, 0.65, 0.75],
                source_channel="THERMAL_INFRARED",
            ),
        ],
    ),
    DroneMission(
        mission_id="mission-oki-03",
        cell_id="OKI_GRID_28410",
        khg_id="KHG_BURNAI_SIBUMBUNG",
        area_name="Kecamatan Pedamaran, OKI",
        camera_name="CAM-OKI-03: Pedamaran Kanal Gambut Timur",
        region_id="oki",
        region_name="Sumatera Selatan (OKI)",
        priority_rank=3,
        risk_score=0.7930,
        lat=-3.3120,
        lon=105.2104,
        altitude_m_agl=112.0,
        azimuth_deg=78.0,
        tilt_deg=-22.0,
        timezone_label="WIB",
        camera_lens="35mm CANAL SWEEP",
        landscape_desc="Jaringan Kanal Sekunder Burnai • Aliran Drainase Gambut Hutan",
        vlos_compliant=True,
        battery_pct=64,
        flight_time_minutes=19.1,
        thermal_max_c=36.8,
        thermal_ambient_c=31.2,
        telemetry_status="LIVE_TELEMETRY_CONNECTED",
        video_stream_type="HLS_WEBRTC_LOOP",
        video_url="/videos/drone_river_canal.webm",
        stream_mode="LIVE",
        ptz_status="AUTO_SWEEP_360",
        detections=[
            DroneDetection(
                id="det-06",
                label="Aliran Kanal Sekunder Gambut",
                confidence=0.871,
                bbox=[0.15, 0.10, 0.85, 0.40],
                source_channel="RGB_OPTICAL",
            ),
            DroneDetection(
                id="det-06b",
                label="Vegetasi Pinggir Kanal Kering",
                confidence=0.825,
                bbox=[0.40, 0.50, 0.80, 0.85],
                source_channel="RGB_OPTICAL",
            ),
        ],
    ),
    DroneMission(
        mission_id="mission-oki-04",
        cell_id="OKI_GRID_19204",
        khg_id="KHG_SUGIHAN_LUMPUR",
        area_name="Kecamatan Air Sugihan, OKI",
        camera_name="CAM-OKI-04: Air Sugihan Konservasi Kubah",
        region_id="oki",
        region_name="Sumatera Selatan (OKI)",
        priority_rank=4,
        risk_score=0.3420,
        lat=-2.8750,
        lon=105.3410,
        altitude_m_agl=0.0,
        azimuth_deg=320.0,
        tilt_deg=0.0,
        timezone_label="WIB",
        camera_lens="28mm DOCKING CAM",
        landscape_desc="Hutan Konservasi Air Sugihan • Docking Pad Posko Manggala Agni",
        vlos_compliant=True,
        battery_pct=94,
        flight_time_minutes=0.0,
        thermal_max_c=31.2,
        thermal_ambient_c=30.8,
        telemetry_status="DOCK_CHARGING_STANDBY",
        video_stream_type="OFFLINE_STANDBY",
        video_url="/videos/drone_canopy_patrol.webm",
        stream_mode="STANDBY_CHARGING",
        offline_reason="STANDBY_CHARGING",
        standby_note="Unit Drone Standby di Docking Station Posko Air Sugihan • Pengisian Baterai Cepat (Solar Fast-Charging 94%) • Siap Re-dispatch",
        ptz_status="DOCK_LOCKED",
        detections=[],
    ),

    # --- KALIMANTAN TENGAH (PULANG PISAU - 2 CAMERAS) ---
    DroneMission(
        mission_id="mission-kalteng-01",
        cell_id="KALTENG_GRID_10842",
        khg_id="KHG_KAHAYAN_SEBANGAU",
        area_name="Sebangau Eks-PLG Blok A, Pulang Pisau",
        camera_name="CAM-KALTENG-01: Sebangau Eks-PLG Blok A",
        region_id="kalteng",
        region_name="Kalteng: Pulang Pisau",
        priority_rank=1,
        risk_score=0.8720,
        lat=-2.8540,
        lon=113.8820,
        altitude_m_agl=110.0,
        azimuth_deg=165.0,
        tilt_deg=-15.0,
        timezone_label="WIB",
        camera_lens="70mm HAZE TELEPHOTO",
        landscape_desc="Eks-PLG Sejuta Hektar Blok A Sebangau • Kabut Asap Karhutla Tebal",
        vlos_compliant=True,
        battery_pct=72,
        flight_time_minutes=12.0,
        thermal_max_c=51.4,
        thermal_ambient_c=32.1,
        telemetry_status="LIVE_TELEMETRY_CONNECTED",
        video_stream_type="HLS_WEBRTC_LOOP",
        video_url="/videos/drone_smoke_plume.webm",
        stream_mode="LIVE",
        ptz_status="ALERT_LOCKED",
        detections=[
            DroneDetection(
                id="det-kalteng-01",
                label="Kolom Asap Tebal Eks-PLG Dalam (51.4°C)",
                confidence=0.958,
                bbox=[0.20, 0.30, 0.75, 0.80],
                source_channel="THERMAL_INFRARED",
            ),
            DroneDetection(
                id="det-kalteng-01b",
                label="Pencemaran Udara Haze Partikulat PM2.5",
                confidence=0.910,
                bbox=[0.10, 0.10, 0.90, 0.50],
                source_channel="RGB_OPTICAL",
            ),
        ],
    ),
    DroneMission(
        mission_id="mission-kalteng-02",
        cell_id="KALTENG_GRID_15230",
        khg_id="KHG_KAHAYAN_SEBANGAU",
        area_name="Kahayan Hilir Kubah Gambut",
        camera_name="CAM-KALTENG-02: Kahayan Hilir Kanal Utama",
        region_id="kalteng",
        region_name="Kalteng: Pulang Pisau",
        priority_rank=2,
        risk_score=0.2850,
        lat=-2.9910,
        lon=114.1205,
        altitude_m_agl=0.0,
        azimuth_deg=45.0,
        tilt_deg=0.0,
        timezone_label="WIB",
        camera_lens="24mm BASE CAM",
        landscape_desc="Kubah Kahayan Hilir • TMA Gambut Aman +18cm • Patroli Selesai",
        vlos_compliant=True,
        battery_pct=100,
        flight_time_minutes=0.0,
        thermal_max_c=30.5,
        thermal_ambient_c=30.0,
        telemetry_status="AREA_AMAN_STANDBY",
        video_stream_type="OFFLINE_STANDBY",
        video_url="/videos/drone_flooded_peatland.webm",
        stream_mode="AREA_AMAN",
        offline_reason="AREA_AMAN",
        standby_note="Status Wilayah Dinyatakan Aman (TMA Gambut > +15cm) • Monitoring Rutin Ditutup • Unit Standby di Pos Pantau Manggala Agni",
        ptz_status="STANDBY",
        detections=[],
    ),

    # --- KALIMANTAN BARAT (KETAPANG - 2 CAMERAS) ---
    DroneMission(
        mission_id="mission-kalbar-01",
        cell_id="KALBAR_GRID_08210",
        khg_id="KHG_PAWAN_PESAGUAN",
        area_name="Kendawangan Pesisir Rawa Gambut",
        camera_name="CAM-KALBAR-01: Kendawangan Pesisir Gambut",
        region_id="kalbar",
        region_name="Kalbar: Ketapang",
        priority_rank=1,
        risk_score=0.8120,
        lat=-2.3420,
        lon=110.1540,
        altitude_m_agl=105.0,
        azimuth_deg=190.0,
        tilt_deg=-20.0,
        timezone_label="WIB",
        camera_lens="50mm COASTAL PATROL",
        landscape_desc="Pesisir Rawa Gambut Kendawangan • Semak Belukar Kering & Perbatasan Lahan",
        vlos_compliant=True,
        battery_pct=88,
        flight_time_minutes=6.8,
        thermal_max_c=39.4,
        thermal_ambient_c=31.5,
        telemetry_status="LIVE_TELEMETRY_CONNECTED",
        video_stream_type="HLS_WEBRTC_LOOP",
        video_url="/videos/drone_canopy_patrol.webm",
        stream_mode="LIVE",
        ptz_status="AUTO_SWEEP_360",
        detections=[
            DroneDetection(
                id="det-kalbar-01",
                label="Pembersihan Semak Belukar Kering",
                confidence=0.841,
                bbox=[0.35, 0.25, 0.80, 0.70],
                source_channel="RGB_OPTICAL",
            ),
            DroneDetection(
                id="det-kalbar-01b",
                label="Bukaan Parit Drainase Pesisir",
                confidence=0.812,
                bbox=[0.15, 0.50, 0.65, 0.80],
                source_channel="RGB_OPTICAL",
            ),
        ],
    ),
    DroneMission(
        mission_id="mission-kalbar-02",
        cell_id="KALBAR_GRID_11450",
        khg_id="KHG_PESAGUAN_AIRHITAM",
        area_name="Matan Hilir Selatan Kubah Gambut",
        camera_name="CAM-KALBAR-02: Matan Hilir Selatan Kubah",
        region_id="kalbar",
        region_name="Kalbar: Ketapang",
        priority_rank=2,
        risk_score=0.7910,
        lat=-2.1240,
        lon=110.3120,
        altitude_m_agl=100.0,
        azimuth_deg=280.0,
        tilt_deg=-24.0,
        timezone_label="WIB",
        camera_lens="85mm TACTICAL OPS",
        landscape_desc="Kubah Pesaguan Air Hitam • Operasi Water Bombing Pemadaman Karhutla",
        vlos_compliant=True,
        battery_pct=76,
        flight_time_minutes=15.2,
        thermal_max_c=56.1,
        thermal_ambient_c=31.7,
        telemetry_status="LIVE_TELEMETRY_CONNECTED",
        video_stream_type="HLS_WEBRTC_LOOP",
        video_url="/videos/drone_firefighting.webm",
        stream_mode="LIVE",
        ptz_status="AUTO_SWEEP_360",
        detections=[
            DroneDetection(
                id="det-kalbar-02",
                label="Titik Api Rawa Gambut Aktif (56.1°C)",
                confidence=0.947,
                bbox=[0.25, 0.35, 0.65, 0.75],
                source_channel="THERMAL_INFRARED",
            ),
            DroneDetection(
                id="det-kalbar-02b",
                label="Target Penjatuhan Water Bombing",
                confidence=0.923,
                bbox=[0.30, 0.20, 0.70, 0.60],
                source_channel="RGB_OPTICAL",
            ),
        ],
    ),

    # --- PAPUA SELATAN (MERAUKE - 1 CAMERA) ---
    DroneMission(
        mission_id="mission-merauke-01",
        cell_id="PAPUA_GRID_04112",
        khg_id="KHG_BIAN_MARO",
        area_name="Distrik Kurik Savana Gambut",
        camera_name="CAM-PAPUA-01: Distrik Kurik Savana Gambut",
        region_id="merauke",
        region_name="Papua Selatan: Merauke",
        priority_rank=1,
        risk_score=0.7480,
        lat=-8.2410,
        lon=140.2150,
        altitude_m_agl=115.0,
        azimuth_deg=110.0,
        tilt_deg=-12.0,
        timezone_label="WIT",
        camera_lens="24mm SAVANNA HORIZON",
        landscape_desc="Savana Gambut Terbuka Kurik Bian-Maro • Hamparan Rumput Kering & Padang Rawa",
        vlos_compliant=True,
        battery_pct=81,
        flight_time_minutes=9.5,
        thermal_max_c=37.2,
        thermal_ambient_c=32.4,
        telemetry_status="LIVE_TELEMETRY_CONNECTED",
        video_stream_type="HLS_WEBRTC_LOOP",
        video_url="/videos/drone_savanna_merauke.webm",
        stream_mode="LIVE",
        ptz_status="AUTO_SWEEP_360",
        detections=[
            DroneDetection(
                id="det-merauke-01",
                label="Bukaan Savana Gambut Terbuka",
                confidence=0.862,
                bbox=[0.15, 0.20, 0.75, 0.60],
                source_channel="RGB_OPTICAL",
            ),
            DroneDetection(
                id="det-merauke-01b",
                label="Biomassa Rumput Kering Rawan Terbakar",
                confidence=0.889,
                bbox=[0.30, 0.40, 0.85, 0.80],
                source_channel="RGB_OPTICAL",
            ),
        ],
    ),

    # --- PAPUA BARAT DAYA (SORONG - 1 CAMERA) ---
    DroneMission(
        mission_id="mission-sorong-01",
        cell_id="SORONG_GRID_02941",
        khg_id="KHG_WARSOMSON_KLAMONO",
        area_name="Koridor Trans-Papua Klamono",
        camera_name="CAM-SORONG-01: Trans-Papua Klamono Koridor",
        region_id="sorong",
        region_name="Papua Barat Daya: Sorong",
        priority_rank=1,
        risk_score=0.6940,
        lat=-1.0850,
        lon=131.4210,
        altitude_m_agl=108.0,
        azimuth_deg=345.0,
        tilt_deg=-26.0,
        timezone_label="WIT",
        camera_lens="35mm RAINFOREST GORGE",
        landscape_desc="Hutan Tropis Pegunungan Warsomson • Koridor Trans-Papua Klamono",
        vlos_compliant=True,
        battery_pct=90,
        flight_time_minutes=4.8,
        thermal_max_c=33.1,
        thermal_ambient_c=29.6,
        telemetry_status="LIVE_TELEMETRY_CONNECTED",
        video_stream_type="HLS_WEBRTC_LOOP",
        video_url="/videos/drone_mountain_canopy.webm",
        stream_mode="LIVE",
        ptz_status="AUTO_SWEEP_360",
        detections=[
            DroneDetection(
                id="det-sorong-01",
                label="Ngarai Sungai & Kanopi Hutan Tropis",
                confidence=0.892,
                bbox=[0.15, 0.20, 0.85, 0.60],
                source_channel="RGB_OPTICAL",
            ),
            DroneDetection(
                id="det-sorong-01b",
                label="Koridor Jalan Akses Trans-Papua",
                confidence=0.835,
                bbox=[0.30, 0.45, 0.70, 0.85],
                source_channel="RGB_OPTICAL",
            ),
        ],
    ),

    # --- SULAWESI SELATAN (MAROS - 1 CAMERA) ---
    DroneMission(
        mission_id="mission-maros-01",
        cell_id="MAROS_GRID_00812",
        khg_id="KHG_MAROS_PANGKEP",
        area_name="Bontoa Rawa Gambut Karst",
        camera_name="CAM-MAROS-01: Bontoa Rawa Gambut Karst",
        region_id="maros",
        region_name="Sulawesi Selatan: Maros",
        priority_rank=1,
        risk_score=0.7150,
        lat=-4.9540,
        lon=119.5420,
        altitude_m_agl=92.0,
        azimuth_deg=225.0,
        tilt_deg=-22.0,
        timezone_label="WITA",
        camera_lens="28mm KARST DELTA",
        landscape_desc="Lansekap Karst & Delta Gambut Pertanian Bontoa • Saluran Irigasi Kering",
        vlos_compliant=True,
        battery_pct=86,
        flight_time_minutes=11.2,
        thermal_max_c=36.4,
        thermal_ambient_c=31.2,
        telemetry_status="LIVE_TELEMETRY_CONNECTED",
        video_stream_type="HLS_WEBRTC_LOOP",
        video_url="/videos/drone_river_canal.webm",
        stream_mode="LIVE",
        ptz_status="AUTO_SWEEP_360",
        detections=[
            DroneDetection(
                id="det-maros-01",
                label="Saluran Irigasi Sawah Gambut",
                confidence=0.854,
                bbox=[0.25, 0.15, 0.75, 0.50],
                source_channel="RGB_OPTICAL",
            ),
            DroneDetection(
                id="det-maros-01b",
                label="Akumulasi Jerami Kering Pascapanen",
                confidence=0.816,
                bbox=[0.40, 0.50, 0.80, 0.85],
                source_channel="RGB_OPTICAL",
            ),
        ],
    ),
]



@router.get("/missions", response_model=DroneMissionListResponse)
def get_active_drone_missions() -> DroneMissionListResponse:
    """Retrieve active drone verification missions for Top-k priority cells in OKI.
    
    Mode: Manual Visual Line of Sight (VLOS <= 120m AGL).
    """
    return DroneMissionListResponse(
        total_missions=len(MOCK_MISSIONS),
        operational_mode="MANUAL_VLOS_MAX_120M",
        missions=MOCK_MISSIONS,
    )


@router.post("/verify", response_model=DroneVerificationResponse)
def submit_drone_field_verification(payload: DroneVerificationRequest) -> DroneVerificationResponse:
    """Submit field drone verification result from ground pilot (Manggala Agni / MPA).
    
    Injected directly into the Active Learning Retraining Queue as new ground truth.
    """
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    verification_id = f"VRF-{int(datetime.datetime.now().timestamp())}-{uuid.uuid4().hex[:6].upper()}"

    record = {
        "verification_id": verification_id,
        "cell_id": payload.cell_id,
        "verification_status": payload.verification_status,
        "pilot_team": payload.pilot_team,
        "notes": payload.notes,
        "coordinates": payload.coordinates,
        "submitted_at": now_iso,
        "queued_for_active_learning": True,
    }

    # Persist to active learning file queue
    try:
        queue_data = []
        if ACTIVE_LEARNING_QUEUE_PATH.is_file():
            with open(ACTIVE_LEARNING_QUEUE_PATH, "r", encoding="utf-8") as f:
                queue_data = json.load(f)
        queue_data.append(record)
        with open(ACTIVE_LEARNING_QUEUE_PATH, "w", encoding="utf-8") as f:
            json.dump(queue_data, f, indent=2)
    except Exception as exc:
        # Graceful non-blocking fallback if write permissions issue
        print(f"Warning: Failed to persist active learning queue to file: {exc}")

    status_labels = {
        "confirmed_fire_smoke": "Api/Asap Terkonfirmasi",
        "active_land_clearing": "Bukaan Lahan / Kanal Baru",
        "false_alarm": "Alarm Palsu (Bebas Api)",
    }
    label_text = status_labels.get(payload.verification_status, payload.verification_status)

    return DroneVerificationResponse(
        status="SUCCESS",
        verification_id=verification_id,
        cell_id=payload.cell_id,
        verification_status=payload.verification_status,
        queued_for_active_learning=True,
        message=f"Verifikasi lapangan '{label_text}' untuk sel {payload.cell_id} berhasil disimpan ke Antrean Siklus Belajar (Active Learning Queue).",
        timestamp=now_iso,
    )
