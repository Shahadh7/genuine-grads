#!/bin/bash

# SSL Certificate Initialization Script for genuinegrads.xyz
# This script obtains Let's Encrypt SSL certificates

set -e

DOMAIN="genuinegrads.xyz"
EMAIL="${1:-admin@genuinegrads.xyz}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}SSL Certificate Setup for ${DOMAIN}${NC}"
echo ""

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run with sudo: sudo ./init-ssl.sh your-email@example.com${NC}"
    exit 1
fi

# Create directories
echo -e "${YELLOW}Creating certificate directories...${NC}"
mkdir -p certbot/conf
mkdir -p certbot/www

# Create a temporary nginx config for initial certificate request
echo -e "${YELLOW}Creating temporary nginx config...${NC}"
cat > nginx-temp.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    server {
        listen 80;
        server_name genuinegrads.xyz www.genuinegrads.xyz;

        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location / {
            return 200 'SSL setup in progress';
            add_header Content-Type text/plain;
        }
    }
}
EOF

# Stop existing nginx if running
echo -e "${YELLOW}Stopping existing services...${NC}"
sudo docker compose down nginx 2>/dev/null || true

# Start temporary nginx for certificate validation
echo -e "${YELLOW}Starting temporary nginx for domain validation...${NC}"
sudo docker run -d --name nginx-temp \
    -p 80:80 \
    -v $(pwd)/nginx-temp.conf:/etc/nginx/nginx.conf:ro \
    -v $(pwd)/certbot/www:/var/www/certbot:ro \
    nginx:alpine

# Wait for nginx to start
sleep 3

# Request certificate
echo -e "${YELLOW}Requesting SSL certificate from Let's Encrypt...${NC}"
sudo docker run --rm \
    -v $(pwd)/certbot/conf:/etc/letsencrypt \
    -v $(pwd)/certbot/www:/var/www/certbot \
    certbot/certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    --force-renewal \
    -d "$DOMAIN" \
    -d "www.$DOMAIN"

# Check if certificate was obtained
if [ -f "certbot/conf/live/$DOMAIN/fullchain.pem" ]; then
    echo -e "${GREEN}SSL certificate obtained successfully!${NC}"
else
    echo -e "${RED}Failed to obtain SSL certificate${NC}"
    sudo docker stop nginx-temp 2>/dev/null || true
    sudo docker rm nginx-temp 2>/dev/null || true
    rm nginx-temp.conf
    exit 1
fi

# Stop temporary nginx
echo -e "${YELLOW}Cleaning up temporary nginx...${NC}"
sudo docker stop nginx-temp 2>/dev/null || true
sudo docker rm nginx-temp 2>/dev/null || true
rm nginx-temp.conf

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}SSL Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Certificate files are located in: ./certbot/conf/live/$DOMAIN/"
echo ""
echo -e "Now you can start all services with SSL:"
echo -e "  ${YELLOW}./deploy.sh start${NC}"
echo ""
