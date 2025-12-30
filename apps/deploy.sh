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

# Generate .env files for backend and frontend from .env.production
generate_env_files() {
    echo -e "${YELLOW}Generating .env files for services...${NC}"

    # Source the production env file
    set -a
    source .env.production
    set +a

    # Generate backend/.env
    cat > backend/.env << EOF
NODE_ENV=production
PORT=4000

JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
JWT_ACCESS_EXPIRY=1d
JWT_REFRESH_EXPIRY=7d

SHARED_DATABASE_URL=postgresql://genuinegrads:${DB_PASSWORD}@postgres:5432/genuinegrads_shared
UNIVERSITY_DATABASE_URL=postgresql://genuinegrads:${DB_PASSWORD}@postgres:5432/genuinegrads_uni_template

SOLANA_NETWORK=${SOLANA_NETWORK:-devnet}
SOLANA_RPC_URL=${SOLANA_RPC_URL}
SOLANA_PROGRAM_ID=${SOLANA_PROGRAM_ID}
SOLANA_SUPER_ADMIN_PUBKEY=${SOLANA_SUPER_ADMIN_PUBKEY}
HELIUS_API_KEY=${HELIUS_API_KEY}

PINATA_JWT=${PINATA_JWT}
PINATA_GATEWAY=${PINATA_GATEWAY}

MASTER_ENCRYPTION_KEY=${MASTER_ENCRYPTION_KEY}

CORS_ORIGIN=${CORS_ORIGIN}

SUPER_ADMIN_EMAIL=${SUPER_ADMIN_EMAIL}
SUPER_ADMIN_PASSWORD=${SUPER_ADMIN_PASSWORD}
EOF
    echo -e "  ${GREEN}✓${NC} backend/.env created"

    # Generate frontend/.env.local
    cat > frontend/.env.local << EOF
NEXT_PUBLIC_GRAPHQL_URL=${NEXT_PUBLIC_GRAPHQL_URL}
NEXT_PUBLIC_SOLANA_NETWORK=${SOLANA_NETWORK:-devnet}
NEXT_PUBLIC_SOLANA_RPC_URL=${SOLANA_RPC_URL}
NEXT_PUBLIC_PROGRAM_ID=${SOLANA_PROGRAM_ID}
NEXT_PUBLIC_HELIUS_API_KEY=${HELIUS_API_KEY}
NEXT_PUBLIC_SUPER_ADMIN_PUBKEY=${SOLANA_SUPER_ADMIN_PUBKEY}
EOF
    echo -e "  ${GREEN}✓${NC} frontend/.env.local created"
}

# Build all services
build() {
    check_env
    verify_files
    generate_env_files
    echo -e "${YELLOW}Building all services...${NC}"
    docker compose --env-file .env.production build
    echo -e "${GREEN}Build complete!${NC}"
}

# Start all services
start() {
    check_env
    verify_files
    generate_env_files
    echo -e "${YELLOW}Starting all services...${NC}"
    docker compose --env-file .env.production up -d --build
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
    check_env
    echo -e "${YELLOW}Pulling latest changes...${NC}"
    git pull

    verify_files
    generate_env_files
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

# Generate env files only
gen_env() {
    check_env
    generate_env_files
    echo -e "${GREEN}Environment files generated!${NC}"
}

# Verify required files exist
verify_files() {
    echo -e "${YELLOW}Verifying required files...${NC}"
    
    local missing_files=0
    
    # Check for required JSON files
    if [ ! -f "frontend/src/idl/genuinegrads.json" ]; then
        echo -e "  ${RED}✗${NC} frontend/src/idl/genuinegrads.json not found"
        missing_files=1
    else
        echo -e "  ${GREEN}✓${NC} frontend/src/idl/genuinegrads.json"
    fi
    
    if [ ! -f "frontend/src/data/designTemplates.json" ]; then
        echo -e "  ${RED}✗${NC} frontend/src/data/designTemplates.json not found"
        missing_files=1
    else
        echo -e "  ${GREEN}✓${NC} frontend/src/data/designTemplates.json"
    fi
    
    if [ ! -f "backend/src/services/solana/idl/genuinegrads.json" ]; then
        echo -e "  ${RED}✗${NC} backend/src/services/solana/idl/genuinegrads.json not found"
        missing_files=1
    else
        echo -e "  ${GREEN}✓${NC} backend/src/services/solana/idl/genuinegrads.json"
    fi
    
    # Check for required directories
    if [ ! -d "frontend/public" ]; then
        echo -e "  ${RED}✗${NC} frontend/public directory not found"
        missing_files=1
    else
        echo -e "  ${GREEN}✓${NC} frontend/public directory"
    fi
    
    if [ ! -d "backend/zk-artifacts" ]; then
        echo -e "  ${RED}✗${NC} backend/zk-artifacts directory not found"
        missing_files=1
    else
        echo -e "  ${GREEN}✓${NC} backend/zk-artifacts directory"
    fi
    
    if [ ! -f "backend/zk-artifacts/ach_member_v1_vkey.json" ]; then
        echo -e "  ${RED}✗${NC} backend/zk-artifacts/ach_member_v1_vkey.json not found"
        missing_files=1
    else
        echo -e "  ${GREEN}✓${NC} backend/zk-artifacts/ach_member_v1_vkey.json"
    fi
    
    if [ $missing_files -eq 1 ]; then
        echo -e "${RED}Error: Required files/directories are missing${NC}"
        echo "These should be committed to git. Please ensure they exist before deploying."
        exit 1
    fi
    
    echo -e "${GREEN}All required files present!${NC}"
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
    gen-env)
        gen_env
        ;;
    verify)
        verify_files
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
        echo "  gen-env   Generate .env files for backend/frontend"
        echo "  verify    Verify required files exist"
        echo "  status    Show service status"
        echo "  logs      View logs (add service name for specific logs)"
        echo ""
        echo "Examples:"
        echo "  ./deploy.sh start"
        echo "  ./deploy.sh logs backend"
        echo "  ./deploy.sh update"
        echo "  ./deploy.sh verify"
        ;;
esac
