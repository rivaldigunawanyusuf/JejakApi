#!/usr/bin/env bash

# ==============================================================================
# Script: start.sh - Anti-Gagal Launcher untuk JEJAK API
# Platform Intelijen Risiko Kebakaran Gambut (Kabupaten OKI)
# Pengembang: Rivaldi Gunawan Yusuf <rivaldigunawanyusuf@gmail.com>
# ==============================================================================

set -e

# Warna Terminal
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="${ROOT_DIR}/backend"
FRONTEND_DIR="${ROOT_DIR}/frontend"
LOGS_DIR="${ROOT_DIR}/logs"

BACKEND_PORT=8000
FRONTEND_PORT=5173

mkdir -p "${LOGS_DIR}"

echo -e "${CYAN}${BOLD}"
echo "=========================================================="
echo "          🔥 JEJAK API ANTI-GAGAL LAUNCHER               "
echo "   Peatland Fire Risk Intelligence Platform (Kab. OKI)   "
echo "=========================================================="
echo -e "${NC}"

# ------------------------------------------------------------------------------
# Fungsi Bebaskan Port
# ------------------------------------------------------------------------------
free_port() {
    local port=$1
    local name=$2
    echo -e "${BLUE}🔍 Memeriksa port ${port} (${name})...${NC}"
    
    local pids
    pids=$(lsof -ti :${port} 2>/dev/null || true)
    
    if [ -n "${pids}" ]; then
        echo -e "${YELLOW}⚠️  Port ${port} sedang digunakan oleh PID: ${pids}. Mematikan proses...${NC}"
        for pid in ${pids}; do
            kill -9 "${pid}" 2>/dev/null || true
        done
        sleep 1
        
        # Verifikasi ulang
        local remaining_pids
        remaining_pids=$(lsof -ti :${port} 2>/dev/null || true)
        if [ -n "${remaining_pids}" ]; then
            echo -e "${RED}⚠️  Mencoba force-kill kembali pada PID: ${remaining_pids}...${NC}"
            kill -9 ${remaining_pids} 2>/dev/null || true
            sleep 1
        fi
        echo -e "${GREEN}✅ Port ${port} berhasil dibebaskan.${NC}"
    else
        echo -e "${GREEN}✅ Port ${port} siap digunakan.${NC}"
    fi
}

# ------------------------------------------------------------------------------
# 1. Bebaskan Port 8000 dan 5173
# ------------------------------------------------------------------------------
free_port "${BACKEND_PORT}" "FastAPI Backend"
free_port "${FRONTEND_PORT}" "Vite Frontend"

# ------------------------------------------------------------------------------
# 2. Verifikasi Dependensi Sistem
# ------------------------------------------------------------------------------
echo -e "\n${BLUE}🔍 Memeriksa dependensi sistem...${NC}"

if ! command -v node >/dev/null 2>&1; then
    echo -e "${RED}❌ Node.js belum terinstal. Harap instal Node.js terlebih dahulu.${NC}"
    exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
    echo -e "${RED}❌ npm belum terinstal. Harap instal npm terlebih dahulu.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js: $(node -v) | npm: $(npm -v)${NC}"

# ------------------------------------------------------------------------------
# 3. Setup Backend (Python / FastAPI)
# ------------------------------------------------------------------------------
echo -e "\n${BLUE}⚙️  Menyiapkan Backend...${NC}"

# Pastikan file .env backend ada
if [ ! -f "${BACKEND_DIR}/.env" ]; then
    echo -e "${YELLOW}📝 Membuat backend/.env default...${NC}"
    cat <<EOF > "${BACKEND_DIR}/.env"
ENVIRONMENT=development
FASTAPI_PORT=8000
HOST=0.0.0.0
RELOAD=true
TELEGRAM_BOT_TOKEN=
GEMINI_API_KEY=
EOF
fi

# ------------------------------------------------------------------------------
# 4. Setup Frontend (React / Vite)
# ------------------------------------------------------------------------------
echo -e "\n${BLUE}⚙️  Menyiapkan Frontend...${NC}"

# Pastikan file .env frontend ada
if [ ! -f "${FRONTEND_DIR}/.env" ]; then
    echo -e "${YELLOW}📝 Membuat frontend/.env default...${NC}"
    cat <<EOF > "${FRONTEND_DIR}/.env"
VITE_API_URL=http://localhost:8000
VITE_BACKEND_URL=http://localhost:8000
EOF
fi

# ------------------------------------------------------------------------------
# 5. Menjalankan Server
# ------------------------------------------------------------------------------
echo -e "\n${CYAN}${BOLD}🚀 Menjalankan Server...${NC}"

cleanup() {
    echo -e "\n\n${YELLOW}🛑 Menghentikan server JEJAK API...${NC}"
    if [ -n "${BACKEND_PID}" ]; then
        kill -9 "${BACKEND_PID}" 2>/dev/null || true
    fi
    if [ -n "${FRONTEND_PID}" ]; then
        kill -9 "${FRONTEND_PID}" 2>/dev/null || true
    fi
    lsof -ti :${BACKEND_PORT} | xargs kill -9 2>/dev/null || true
    lsof -ti :${FRONTEND_PORT} | xargs kill -9 2>/dev/null || true
    echo -e "${GREEN}✅ Semua proses telah dihentikan. Sampai jumpa!${NC}"
    exit 0
}
trap cleanup SIGINT SIGTERM EXIT

# Jalankan Backend
echo -e "${BLUE}▶️  Memulai Backend di http://localhost:${BACKEND_PORT}...${NC}"
(
    cd "${BACKEND_DIR}"
    if command -v uv >/dev/null 2>&1; then
        exec uv run uvicorn app.main:app --host 0.0.0.0 --port "${BACKEND_PORT}" --reload
    else
        exec python3 -m uvicorn app.main:app --host 0.0.0.0 --port "${BACKEND_PORT}" --reload
    fi
) > "${LOGS_DIR}/backend.log" 2>&1 &
BACKEND_PID=$!

# Jalankan Frontend
echo -e "${BLUE}▶️  Memulai Frontend di http://localhost:${FRONTEND_PORT}...${NC}"
(
    cd "${FRONTEND_DIR}"
    exec npm run dev -- --host 0.0.0.0 --port "${FRONTEND_PORT}"
) > "${LOGS_DIR}/frontend.log" 2>&1 &
FRONTEND_PID=$!

# ------------------------------------------------------------------------------
# 6. Menunggu Layanan Siap (Health Check)
# ------------------------------------------------------------------------------
echo -e "\n${BLUE}⏳ Menunggu backend dan frontend siap merespons...${NC}"

MAX_RETRIES=30
COUNT=0

until curl -s "http://localhost:${BACKEND_PORT}/api/health" >/dev/null 2>&1 || [ $COUNT -ge $MAX_RETRIES ]; do
    sleep 1
    COUNT=$((COUNT + 1))
done

if [ $COUNT -ge $MAX_RETRIES ]; then
    echo -e "${RED}❌ Backend gagal merespons dalam waktu 30 detik. Cek log: ${LOGS_DIR}/backend.log${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Backend siap!${NC}"

COUNT=0
until curl -s "http://localhost:${FRONTEND_PORT}" >/dev/null 2>&1 || [ $COUNT -ge $MAX_RETRIES ]; do
    sleep 1
    COUNT=$((COUNT + 1))
done

if [ $COUNT -ge $MAX_RETRIES ]; then
    echo -e "${RED}❌ Frontend gagal merespons dalam waktu 30 detik. Cek log: ${LOGS_DIR}/frontend.log${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Frontend siap!${NC}"

# ------------------------------------------------------------------------------
# 7. Tampilan Berhasil & Petunjuk Penggunaan
# ------------------------------------------------------------------------------
echo -e "\n${GREEN}${BOLD}==========================================================${NC}"
echo -e "${GREEN}${BOLD}🎉  JEJAK API BERHASIL DIJALANKAN!                        ${NC}"
echo -e "${GREEN}${BOLD}==========================================================${NC}"
echo -e "🌐 Frontend:  ${CYAN}http://localhost:${FRONTEND_PORT}${NC}"
echo -e "🔌 Backend:   ${CYAN}http://localhost:${BACKEND_PORT}${NC}"
echo -e "📖 Swagger:   ${CYAN}http://localhost:${BACKEND_PORT}/docs${NC}"
echo -e "📜 Logs:      ${YELLOW}${LOGS_DIR}/${NC}"
echo -e "Tekan ${RED}Ctrl + C${NC} kapan saja untuk menghentikan seluruh layanan."
echo -e "${GREEN}${BOLD}==========================================================${NC}\n"

# Tunggu proses tetap berjalan
wait
