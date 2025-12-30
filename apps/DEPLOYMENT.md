# GenuineGrads - DigitalOcean Deployment Guide

**Domain:** genuinegrads.xyz

## 1. Create a DigitalOcean Droplet

### Recommended Specs
- **Image**: Ubuntu 24.04 LTS
- **Plan**: Basic (Shared CPU)
- **Size**: 2 vCPUs / 4GB RAM / 80GB SSD ($24/month) - minimum for running all services
- **Region**: Choose closest to your users
- **Authentication**: SSH Keys (recommended)

### Create via DigitalOcean Console
1. Go to https://cloud.digitalocean.com/droplets
2. Click "Create Droplet"
3. Select Ubuntu 24.04
4. Choose 4GB RAM plan (or higher)
5. Select datacenter region
6. Add your SSH key
7. Create droplet

## 2. Point Domain to Droplet

Before setting up SSL, point your domain to the droplet:

1. Go to your domain registrar (where you bought genuinegrads.xyz)
2. Update DNS records:
   - **A Record**: `@` → `YOUR_DROPLET_IP`
   - **A Record**: `www` → `YOUR_DROPLET_IP`
3. Wait for DNS propagation (usually 5-30 minutes, can take up to 48 hours)

Verify DNS is working:
```bash
dig genuinegrads.xyz +short
# Should return your droplet IP
```

## 3. Initial Server Setup

SSH into your droplet:
```bash
ssh root@YOUR_DROPLET_IP
```

### Update system and install Docker
```bash
# Update packages
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
apt install docker-compose-plugin -y

# Verify installation
docker --version
docker compose version
```

### Setup Firewall
```bash
ufw allow 22    # SSH
ufw allow 80    # HTTP (for SSL verification)
ufw allow 443   # HTTPS
ufw enable
```

## 4. Clone Your Repository

```bash
cd /root
git clone https://github.com/YOUR_USERNAME/genuinegrads.git
cd genuinegrads/apps
```

## 5. Configure Environment Variables

```bash
# Copy the example file
cp .env.production.example .env.production

# Edit with your values
nano .env.production
```

Fill in your actual values:
```env
DB_PASSWORD=generate_a_strong_password_here
JWT_SECRET=your_64_char_hex_secret
JWT_REFRESH_SECRET=your_64_char_hex_secret
SOLANA_NETWORK=devnet
SOLANA_RPC_URL=https://devnet.helius-rpc.com/?api-key=YOUR_KEY
SOLANA_PROGRAM_ID=J9Bsd3MSutBQDqsaXc5otLvDmrrN7vEynx2fYaH296FX
SOLANA_SUPER_ADMIN_PUBKEY=YOUR_WALLET_PUBKEY
HELIUS_API_KEY=YOUR_HELIUS_KEY
PINATA_JWT=YOUR_PINATA_JWT
PINATA_GATEWAY=https://your-gateway.mypinata.cloud
MASTER_ENCRYPTION_KEY=your_64_char_hex_key
CORS_ORIGIN=https://genuinegrads.xyz
SUPER_ADMIN_EMAIL=admin@genuinegrads.xyz
SUPER_ADMIN_PASSWORD=YourSecurePassword123
NEXT_PUBLIC_GRAPHQL_URL=https://genuinegrads.xyz/graphql
```

Generate secrets:
```bash
# Generate JWT secrets
openssl rand -hex 32

# Generate encryption key
openssl rand -hex 32

# Generate database password
openssl rand -base64 24
```

## 6. Setup SSL Certificate

Before starting services, obtain SSL certificate:

```bash
# Run the SSL initialization script
sudo ./init-ssl.sh your-email@example.com
```

This script will:
1. Create a temporary nginx for domain verification
2. Request SSL certificate from Let's Encrypt
3. Store certificates in `./certbot/conf/`

## 7. Build and Start Services

```bash
# Start all services
./deploy.sh start
```

Or manually:
```bash
docker compose --env-file .env.production up -d --build
```

This will start:
1. PostgreSQL database
2. Backend API (port 4000)
3. Frontend Next.js (port 3000)
4. Nginx reverse proxy (ports 80, 443)
5. Certbot for SSL auto-renewal

## 8. Initialize Database

After containers are running, set up the database:

```bash
./deploy.sh init-db
```

Or manually:
```bash
docker exec -it genuinegrads-backend sh -c "yarn db:push:shared && yarn db:push:university && yarn db:seed"
```

## 9. Verify Deployment

```bash
# Check all containers are running
./deploy.sh status

# Or check manually
docker compose ps

# Check logs
./deploy.sh logs

# Test health endpoint
curl https://genuinegrads.xyz/health

# Test GraphQL
curl https://genuinegrads.xyz/graphql -H "Content-Type: application/json" -d '{"query":"{ __typename }"}'
```

Access your application:
- **Frontend**: https://genuinegrads.xyz
- **GraphQL API**: https://genuinegrads.xyz/graphql

## 10. Useful Commands

```bash
# View all logs
./deploy.sh logs

# View specific service logs
./deploy.sh logs backend
./deploy.sh logs frontend
./deploy.sh logs postgres
./deploy.sh logs nginx

# Restart all services
./deploy.sh restart

# Stop all services
./deploy.sh stop

# Check status
./deploy.sh status

# Rebuild and restart
./deploy.sh update
```

### Direct Docker Commands
```bash
# Rebuild a specific service
docker compose --env-file .env.production up -d --build backend

# Access PostgreSQL
docker exec -it genuinegrads-db psql -U genuinegrads -d genuinegrads_shared

# Access backend shell
docker exec -it genuinegrads-backend sh

# View nginx access logs
docker logs genuinegrads-nginx

# Stop and remove volumes (WARNING: deletes database!)
docker compose down -v
```

## 11. Updating the Application

When you push updates to GitHub:

```bash
cd /root/genuinegrads/apps

# Pull and rebuild
./deploy.sh update

# Or manually
git pull origin main
docker compose --env-file .env.production up -d --build

# Run migrations if schema changed
docker exec -it genuinegrads-backend sh -c "yarn db:push:shared && yarn db:push:university"
```

## 12. SSL Certificate Renewal

Certificates auto-renew via the certbot container. To manually renew:

```bash
docker compose run --rm certbot renew
docker compose restart nginx
```

## Troubleshooting

### SSL certificate issues
```bash
# Check if certificates exist
ls -la certbot/conf/live/genuinegrads.xyz/

# Check nginx logs
docker logs genuinegrads-nginx

# Re-run SSL setup if needed
./init-ssl.sh your-email@example.com
```

### Backend won't start
```bash
# Check logs
docker compose logs backend

# Common issues:
# - Database not ready: wait and restart
# - Missing env vars: check .env.production
docker compose restart backend
```

### Database connection issues
```bash
# Check postgres is healthy
docker compose ps postgres

# Check postgres logs
docker compose logs postgres

# Verify database exists
docker exec -it genuinegrads-db psql -U genuinegrads -l
```

### Frontend build fails
```bash
# Check if env vars are correct
docker compose logs frontend

# Rebuild frontend
docker compose --env-file .env.production up -d --build frontend
```

### Domain not resolving
```bash
# Check DNS
dig genuinegrads.xyz +short

# If still showing old IP, wait for DNS propagation
# or try flushing your local DNS cache
```

## Architecture Overview

```
                    ┌─────────────────┐
                    │   Internet      │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  Nginx (80/443) │
                    │  SSL Termination│
                    └────────┬────────┘
                             │
           ┌─────────────────┼─────────────────┐
           │                 │                 │
   ┌───────▼───────┐ ┌───────▼───────┐        │
   │   Frontend    │ │   Backend     │        │
   │  (Next.js)    │ │  (GraphQL)    │        │
   │   :3000       │ │   :4000       │        │
   └───────────────┘ └───────┬───────┘        │
                             │                 │
                    ┌────────▼────────┐        │
                    │   PostgreSQL    │        │
                    │     :5432       │        │
                    └─────────────────┘        │
                                              │
                    ┌─────────────────┐        │
                    │    Certbot      │────────┘
                    │  (SSL renewal)  │
                    └─────────────────┘
```
