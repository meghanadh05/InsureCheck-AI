#!/usr/bin/env bash
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_PATH="$SCRIPT_DIR/backend"
FRONTEND_PATH="$SCRIPT_DIR/frontend"
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.yml"
ENV_FILE="$SCRIPT_DIR/.env"
ENV_EXAMPLE_FILE="$SCRIPT_DIR/.env.example"

MODE="all"
CLEAN=false
BUILD=false
LOCAL=false

log_info() {
  printf "${BLUE}[INFO]${NC} %s\n" "$1"
}

log_success() {
  printf "${GREEN}[OK]${NC} %s\n" "$1"
}

log_warning() {
  printf "${YELLOW}[WARN]${NC} %s\n" "$1"
}

log_error() {
  printf "${RED}[ERROR]${NC} %s\n" "$1" >&2
}

print_help() {
  cat <<'EOF'
Usage:
  ./setup.sh [--all|--backend|--frontend] [--clean] [--build] [--local] [--help]

Modes:
  --all        Start backend and frontend with Docker Compose. Default mode.
  --backend    Start only backend service with Docker Compose.
  --frontend   Start only frontend service with Docker Compose.
  --clean      Stop and remove existing containers/volumes before starting.
  --build      Rebuild Docker images before starting.
  --local      Do not start Docker. Install local dependencies and print local dev commands.
  --help       Show this help message.
EOF
}

require_paths() {
  [[ -d "$BACKEND_PATH" ]] || { log_error "Backend directory not found at $BACKEND_PATH"; exit 1; }
  [[ -d "$FRONTEND_PATH" ]] || { log_error "Frontend directory not found at $FRONTEND_PATH"; exit 1; }
  [[ -f "$COMPOSE_FILE" ]] || { log_error "docker-compose.yml not found at $COMPOSE_FILE"; exit 1; }
}

ensure_env_files() {
  if [[ ! -f "$ENV_EXAMPLE_FILE" ]]; then
    cat >"$ENV_EXAMPLE_FILE" <<'EOF'
GROQ_API_KEY=
OPENAI_API_KEY=
EOF
    log_info "Created .env.example with optional AI key placeholders."
  fi

  if [[ ! -f "$ENV_FILE" ]]; then
    cp "$ENV_EXAMPLE_FILE" "$ENV_FILE"
    log_info "Created .env from .env.example. AI keys are optional; fallback extractor will be used if keys are empty."
  else
    log_info "Using existing .env"
  fi
}

read_key_value() {
  local key="$1"
  local file_value=""

  if [[ -f "$ENV_FILE" ]]; then
    file_value="$(grep -E "^${key}=" "$ENV_FILE" | tail -n1 | cut -d'=' -f2- || true)"
  fi

  if [[ -n "${!key:-}" ]]; then
    printf "%s" "${!key}"
  else
    printf "%s" "$file_value"
  fi
}

print_key_status() {
  local groq_value openai_value
  groq_value="$(read_key_value "GROQ_API_KEY")"
  openai_value="$(read_key_value "OPENAI_API_KEY")"

  if [[ -n "${groq_value// /}" ]]; then
    log_info "GROQ_API_KEY configured: yes"
  else
    log_info "GROQ_API_KEY configured: no"
  fi

  if [[ -n "${openai_value// /}" ]]; then
    log_info "OPENAI_API_KEY configured: yes"
  else
    log_info "OPENAI_API_KEY configured: no"
  fi
}

check_docker() {
  command -v docker >/dev/null 2>&1 || {
    log_error "Docker is not installed or not on PATH."
    exit 1
  }

  docker info >/dev/null 2>&1 || {
    log_error "Docker is not running. Start Docker Desktop and retry."
    exit 1
  }

  docker compose version >/dev/null 2>&1 || {
    log_error "Docker Compose is not available."
    exit 1
  }
}

wait_for_url() {
  local name="$1"
  local url="$2"
  local attempts=20
  local delay=2

  if ! command -v curl >/dev/null 2>&1; then
    log_warning "curl is not installed; skipping health check for $name."
    return 1
  fi

  for _ in $(seq 1 "$attempts"); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      log_success "$name is reachable at $url"
      return 0
    fi
    sleep "$delay"
  done

  log_warning "$name did not become reachable at $url"
  return 1
}

check_test_cases() {
  if ! command -v curl >/dev/null 2>&1; then
    return 0
  fi

  if curl -fsS -X POST "http://localhost:8000/api/test-cases/run" >/dev/null 2>&1; then
    log_success "Plum test case runner reachable."
  else
    log_warning "Plum test case runner was not reachable yet. Check backend logs if needed."
  fi
}

run_local_setup() {
  require_paths
  ensure_env_files
  print_key_status

  log_info "Preparing local development dependencies."

  python3 -m venv "$BACKEND_PATH/venv"
  # shellcheck disable=SC1091
  source "$BACKEND_PATH/venv/bin/activate"
  pip install --upgrade pip
  pip install -r "$BACKEND_PATH/requirements.txt"

  (
    cd "$FRONTEND_PATH"
    npm install
  )

  log_success "Local dependencies installed."
  cat <<EOF

InsureCheck AI Local Setup Ready

Terminal 1:
cd $BACKEND_PATH
source venv/bin/activate
uvicorn app.main:app --reload --port 8000

Terminal 2:
cd $FRONTEND_PATH
npm run dev
EOF
}

run_docker_setup() {
  local services=()
  case "$MODE" in
    all) services=(backend frontend) ;;
    backend) services=(backend) ;;
    frontend) services=(frontend) ;;
    *)
      log_error "Unknown mode: $MODE"
      exit 1
      ;;
  esac

  require_paths
  ensure_env_files
  print_key_status
  check_docker

  if [[ "$CLEAN" == true ]]; then
    log_info "Stopping existing project containers and removing volumes."
    docker compose -f "$COMPOSE_FILE" down -v --remove-orphans
  fi

  mkdir -p "$BACKEND_PATH/uploads" "$BACKEND_PATH/runtime"

  log_info "Starting services: ${services[*]}"
  if [[ "$BUILD" == true ]]; then
    docker compose -f "$COMPOSE_FILE" up -d --build "${services[@]}"
  else
    docker compose -f "$COMPOSE_FILE" up -d "${services[@]}"
  fi

  local backend_ready=false
  local frontend_ready=false

  if [[ " ${services[*]} " == *" backend "* ]]; then
    if wait_for_url "Backend health" "http://localhost:8000/api/health"; then
      backend_ready=true
      check_test_cases
    else
      log_warning "Backend health check failed. Debug with: docker compose -f \"$COMPOSE_FILE\" logs -f backend"
    fi
  fi

  if [[ " ${services[*]} " == *" frontend "* ]]; then
    if wait_for_url "Frontend" "http://localhost:3000"; then
      frontend_ready=true
    else
      log_warning "Frontend check failed. Debug with: docker compose -f \"$COMPOSE_FILE\" logs -f frontend"
    fi
  fi

  printf "\n${GREEN}InsureCheck AI Setup Complete${NC}\n\n"
  printf "Frontend:\nhttp://localhost:3000\n\n"
  printf "Backend API:\nhttp://localhost:8000/api\n\n"
  printf "Backend Health:\nhttp://localhost:8000/api/health\n\n"
  printf "Test Cases:\nhttp://localhost:3000/test-cases\n\n"
  printf "Quick Commands:\n"
  printf "View containers:\ndocker compose -f \"%s\" ps\n\n" "$COMPOSE_FILE"
  printf "Backend logs:\ndocker compose -f \"%s\" logs -f backend\n\n" "$COMPOSE_FILE"
  printf "Frontend logs:\ndocker compose -f \"%s\" logs -f frontend\n\n" "$COMPOSE_FILE"
  printf "Stop:\n./stop.sh\n\n"
  printf "Rebuild:\n./setup.sh --all --build\n\n"
  printf "Full reset:\n./setup.sh --all --clean --build\n\n"

  if [[ "$backend_ready" == false ]] && [[ " ${services[*]} " == *" backend "* ]]; then
    log_warning "Backend did not report healthy during setup."
  fi
  if [[ "$frontend_ready" == false ]] && [[ " ${services[*]} " == *" frontend "* ]]; then
    log_warning "Frontend did not report reachable during setup."
  fi
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --all)
      MODE="all"
      ;;
    --backend)
      MODE="backend"
      ;;
    --frontend)
      MODE="frontend"
      ;;
    --clean)
      CLEAN=true
      ;;
    --build)
      BUILD=true
      ;;
    --local)
      LOCAL=true
      ;;
    --help)
      print_help
      exit 0
      ;;
    *)
      log_error "Unknown option: $1"
      print_help
      exit 1
      ;;
  esac
  shift
done

if [[ "$LOCAL" == true ]]; then
  run_local_setup
else
  run_docker_setup
fi
