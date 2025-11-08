# GenuineGrads Backend Deployment Guide

Production deployment guide for the GenuineGrads API backend.

## 🚀 Deployment Options

### Option 1: Docker (Recommended)

#### Dockerfile

Create `Dockerfile` in `apps/backend/`:

```dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production=false

# Build the application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma clients
RUN yarn db:generate

# Build TypeScript
RUN yarn build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 backend

# Copy necessary files
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma

USER backend

EXPOSE 4000

CMD ["node", "dist/index.js"]
```

#### docker-compose.yml

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: genuinegrads_shared
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

  api:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "4000:4000"
    environment:
      - NODE_ENV=production
      - PORT=4000
      - JWT_SECRET=${JWT_SECRET}
      - JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
      - SHARED_DATABASE_URL=postgresql://postgres:${POSTGRES_PASSWORD}@postgres:5432/genuinegrads_shared
      - UNIVERSITY_DATABASE_URL=postgresql://postgres:${POSTGRES_PASSWORD}@postgres:5432/genuinegrads_uni_template
      - REDIS_URL=redis://redis:6379
      - HELIUS_API_KEY=${HELIUS_API_KEY}
      - IPFS_API_KEY=${IPFS_API_KEY}
      - MASTER_ENCRYPTION_KEY=${MASTER_ENCRYPTION_KEY}
      - CORS_ORIGIN=${CORS_ORIGIN}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

#### Build and Run

```bash
# Build image
docker-compose build

# Run migrations
docker-compose run api yarn db:push:shared
docker-compose run api yarn db:push:university

# Seed database
docker-compose run api yarn db:seed

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f api
```

---

### Option 2: Traditional VPS (Ubuntu/Debian)

#### 1. Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install Yarn
npm install -g yarn

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install Redis (optional)
sudo apt install -y redis-server

# Install Nginx
sudo apt install -y nginx
```

#### 2. PostgreSQL Setup

```bash
# Switch to postgres user
sudo -u postgres psql

-- Create databases
CREATE DATABASE genuinegrads_shared;
CREATE DATABASE genuinegrads_uni_template;

-- Create user
CREATE USER genuinegrads WITH PASSWORD 'strong_password_here';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE genuinegrads_shared TO genuinegrads;
GRANT ALL PRIVILEGES ON DATABASE genuinegrads_uni_template TO genuinegrads;

-- Exit
\q
```

#### 3. Deploy Application

```bash
# Create app directory
sudo mkdir -p /var/www/genuinegrads-backend
cd /var/www/genuinegrads-backend

# Clone repository (or upload via SCP/SFTP)
git clone <your-repo-url> .

# Install dependencies
yarn install --production=false

# Create .env file
sudo nano .env
# (Paste production environment variables)

# Generate Prisma clients
yarn db:generate

# Run migrations
yarn db:push:shared
yarn db:push:university

# Seed database
yarn db:seed

# Build application
yarn build

# Test run
yarn start
```

#### 4. Process Manager (PM2)

```bash
# Install PM2
npm install -g pm2

# Create ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'genuinegrads-api',
    script: './dist/index.js',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 4000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    max_memory_restart: '500M'
  }]
}
EOF

# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 config
pm2 save

# Setup PM2 startup
pm2 startup
# Follow the instructions from the command output
```

#### 5. Nginx Reverse Proxy

```bash
# Create Nginx config
sudo nano /etc/nginx/sites-available/genuinegrads-api

# Paste configuration:
```

```nginx
server {
    listen 80;
    server_name api.genuinegrads.com;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req zone=api_limit burst=20 nodelay;

    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 90;
    }

    # Health check endpoint (bypass rate limit)
    location /health {
        limit_req off;
        proxy_pass http://localhost:4000/health;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/genuinegrads-api /etc/nginx/sites-enabled/

# Test Nginx config
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

#### 6. SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d api.genuinegrads.com

# Verify auto-renewal
sudo certbot renew --dry-run
```

---

### Option 3: Cloud Platforms

#### Vercel/Netlify (Not recommended for long-running GraphQL servers)

Better options:

#### Railway.app

1. Connect GitHub repository
2. Add PostgreSQL addon
3. Add Redis addon (optional)
4. Configure environment variables
5. Deploy automatically on push

#### Render.com

1. Create new Web Service
2. Connect repository
3. Add PostgreSQL database
4. Add Redis instance
5. Configure environment variables
6. Deploy

#### DigitalOcean App Platform

1. Create new app
2. Connect repository
3. Add managed PostgreSQL database
4. Add managed Redis
5. Configure environment variables
6. Deploy

#### Heroku

```bash
# Install Heroku CLI
curl https://cli-assets.heroku.com/install.sh | sh

# Login
heroku login

# Create app
heroku create genuinegrads-api

# Add PostgreSQL
heroku addons:create heroku-postgresql:hobby-dev

# Add Redis
heroku addons:create heroku-redis:hobby-dev

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your_secret
heroku config:set MASTER_ENCRYPTION_KEY=your_key
# ... (set all required env vars)

# Deploy
git push heroku main

# Run migrations
heroku run yarn db:push:shared
heroku run yarn db:push:university

# Seed database
heroku run yarn db:seed

# View logs
heroku logs --tail
```

---

## 🔒 Security Checklist

- [ ] Change default super admin password
- [ ] Use strong JWT secrets (32+ random bytes)
- [ ] Enable HTTPS/SSL certificates
- [ ] Configure CORS properly
- [ ] Set up firewall (UFW on Ubuntu)
- [ ] Enable PostgreSQL authentication
- [ ] Use environment variables (never commit secrets)
- [ ] Set up database backups
- [ ] Enable rate limiting
- [ ] Configure proper logging
- [ ] Set up monitoring and alerts
- [ ] Disable GraphQL introspection in production
- [ ] Implement API key rotation
- [ ] Use read replicas for database (if high traffic)
- [ ] Set up DDoS protection (Cloudflare)

---

## 📊 Monitoring

### Health Checks

```bash
# API Health
curl https://api.genuinegrads.com/health

# Database Connection
curl https://api.genuinegrads.com/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ __typename }"}'
```

### Logging

PM2 logs:
```bash
pm2 logs genuinegrads-api
```

Docker logs:
```bash
docker-compose logs -f api
```

### Monitoring Tools (Recommended)

- **Uptime Monitoring**: UptimeRobot, Pingdom
- **APM**: New Relic, Datadog, Sentry
- **Log Management**: Papertrail, Loggly, ELK Stack
- **Metrics**: Prometheus + Grafana

---

## 🔄 Database Backups

### Automated Backups

```bash
# Create backup script
cat > /usr/local/bin/backup-genuinegrads.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/genuinegrads"
mkdir -p $BACKUP_DIR

# Backup shared database
pg_dump genuinegrads_shared > $BACKUP_DIR/shared_$DATE.sql

# Backup university template
pg_dump genuinegrads_uni_template > $BACKUP_DIR/uni_template_$DATE.sql

# Compress
gzip $BACKUP_DIR/*.sql

# Delete backups older than 30 days
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete

echo "Backup completed: $DATE"
EOF

chmod +x /usr/local/bin/backup-genuinegrads.sh

# Schedule with cron (daily at 2 AM)
crontab -e
# Add: 0 2 * * * /usr/local/bin/backup-genuinegrads.sh
```

---

## 🚨 Rollback Plan

```bash
# PM2
pm2 stop genuinegrads-api
git checkout <previous-commit>
yarn install
yarn build
pm2 restart genuinegrads-api

# Docker
docker-compose down
git checkout <previous-commit>
docker-compose build
docker-compose up -d
```

---

## 📈 Scaling

### Vertical Scaling
- Increase server RAM/CPU
- Optimize database queries
- Add database indexes
- Enable connection pooling

### Horizontal Scaling
- Use load balancer (Nginx, HAProxy)
- Run multiple API instances
- Use PostgreSQL read replicas
- Implement Redis caching
- Use CDN for static assets

---

## 📞 Support

For deployment issues, contact: devops@genuinegrads.com

