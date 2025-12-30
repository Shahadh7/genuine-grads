#!/bin/bash

# GenuineGrads Deployment Script
# Usage: ./deploy.sh [build|start|stop|logs|restart|update]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env.production exists
check_env() {
    if [ ! -f ".env.production" ]; then
        echo -e "${RED}Error: .env.production file not found${NC}"
        echo "Copy .env.production.example to .env.production and fill in your values"
        exit 1
    fi
}

# Build all services
build() {
    echo -e "${YELLOW}Building all services...${NC}"
    docker compose --env-file .env.production build
    echo -e "${GREEN}Build complete!${NC}"
}

# Start all services
start() {
    check_env
    echo -e "${YELLOW}Starting all services...${NC}"
    docker compose --env-file .env.production up -d
    echo -e "${GREEN}Services started!${NC}"
    echo ""
    echo "Waiting for services to be ready..."
    sleep 10
    docker compose ps
}

# Stop all services
stop() {
    echo -e "${YELLOW}Stopping all services...${NC}"
    docker compose down
    echo -e "${GREEN}Services stopped!${NC}"
}

# View logs
logs() {
    docker compose logs -f "$@"
}

# Restart services
restart() {
    echo -e "${YELLOW}Restarting services...${NC}"
    docker compose --env-file .env.production restart
    echo -e "${GREEN}Services restarted!${NC}"
}

# Update and rebuild
update() {
    echo -e "${YELLOW}Pulling latest changes...${NC}"
    git pull

    echo -e "${YELLOW}Rebuilding services...${NC}"
    docker compose --env-file .env.production up -d --build

    echo -e "${GREEN}Update complete!${NC}"
}

# Initialize database
init_db() {
    echo -e "${YELLOW}Initializing database...${NC}"
    docker exec -it genuinegrads-backend sh -c "yarn db:push:shared && yarn db:push:university && yarn db:seed"
    echo -e "${GREEN}Database initialized!${NC}"
}

# Show status
status() {
    docker compose ps
}

# Main command handler
case "${1:-help}" in
    build)
        build
        ;;
    start)
        start
        ;;
    stop)
        stop
        ;;
    logs)
        shift
        logs "$@"
        ;;
    restart)
        restart
        ;;
    update)
        update
        ;;
    init-db)
        init_db
        ;;
    status)
        status
        ;;
    help|*)
        echo "GenuineGrads Deployment Script"
        echo ""
        echo "Usage: ./deploy.sh [command]"
        echo ""
        echo "Commands:"
        echo "  build     Build all Docker images"
        echo "  start     Start all services"
        echo "  stop      Stop all services"
        echo "  restart   Restart all services"
        echo "  update    Pull latest code and rebuild"
        echo "  init-db   Initialize database (run after first start)"
        echo "  status    Show service status"
        echo "  logs      View logs (add service name for specific logs)"
        echo ""
        echo "Examples:"
        echo "  ./deploy.sh start"
        echo "  ./deploy.sh logs backend"
        echo "  ./deploy.sh update"
        ;;
esac
