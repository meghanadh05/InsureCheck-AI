#!/usr/bin/env bash
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.yml"
CLEAN=false

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
Usage: ./stop.sh [--clean|--volumes|--help]

Options:
--clean      Stop containers and remove project volumes
--volumes    Alias for --clean
--help       Show help
EOF
}

check_docker() {
  command -v docker >/dev/null 2>&1 || {
    log_error "Docker is not installed or not on PATH."
    exit 1
  }

  docker info >/dev/null 2>&1 || {
    log_warning "Docker is not running. Nothing to stop or start Docker Desktop first."
    exit 0
  }

  docker compose version >/dev/null 2>&1 || {
    log_error "Docker Compose is not available."
    exit 1
  }
}

warn_if_port_busy() {
  local port="$1"

  if command -v lsof >/dev/null 2>&1 && lsof -ti tcp:"$port" >/dev/null 2>&1; then
    log_warning "Port $port may still be in use by a local process. Stop it manually if needed."
  fi
}

remove_project_images() {
  local images
  images=$(docker compose -f "$COMPOSE_FILE" images -q 2>/dev/null | sort -u | sed '/^$/d' || true)

  if [[ -z "$images" ]]; then
    log_info "No project Docker images found to remove."
    return
  fi

  while IFS= read -r image_id; do
    docker image rm "$image_id" >/dev/null 2>&1 || true
  done <<<"$images"

  log_info "Removed local project Docker images where safe."
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --clean|--volumes)
      CLEAN=true
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

[[ -f "$COMPOSE_FILE" ]] || {
  log_error "docker-compose.yml not found at $COMPOSE_FILE"
  exit 1
}

check_docker

if [[ "$CLEAN" == true ]]; then
  log_info "Stopping InsureCheck AI services and removing project volumes."
  docker compose -f "$COMPOSE_FILE" down -v --remove-orphans
  remove_project_images
else
  log_info "Stopping InsureCheck AI services."
  docker compose -f "$COMPOSE_FILE" down --remove-orphans
fi

warn_if_port_busy 8000
warn_if_port_busy 3000

printf "\n${GREEN}InsureCheck AI services stopped${NC}\n\n"
printf "Stopped:\n"
printf -- "- backend\n"
printf -- "- frontend\n\n"

if [[ "$CLEAN" == true ]]; then
  printf "Removed:\n"
  printf -- "- Docker volumes\n"
  printf -- "- orphan containers\n"
  printf -- "- local project images where safe\n\n"
else
  printf "Kept data:\n"
  printf -- "- SQLite runtime files\n"
  printf -- "- uploads\n\n"
fi

printf "Restart:\n./setup.sh\n\n"
printf "Full rebuild:\n./setup.sh --all --clean --build\n"
