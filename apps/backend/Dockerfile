FROM node:20-alpine

# Install dependencies for Prisma and native modules
RUN apk add --no-cache openssl python3 make g++

WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy all source files
COPY . .

# Debug: List what was copied
RUN echo "=== Checking for zk-artifacts ===" && \
    ls -la && \
    if [ -d "zk-artifacts" ]; then \
      echo "✓ zk-artifacts directory found" && \
      ls -lh zk-artifacts/; \
    else \
      echo "✗ zk-artifacts directory NOT found"; \
    fi

# Explicitly ensure zk-artifacts is present
RUN if [ ! -d "zk-artifacts" ] || [ ! -f "zk-artifacts/ach_member_v1_vkey.json" ]; then \
      echo "ERROR: zk-artifacts/ach_member_v1_vkey.json not found!"; \
      echo "This file is required for ZK proof verification."; \
      echo "Please ensure backend/zk-artifacts/ach_member_v1_vkey.json exists before building."; \
      exit 1; \
    fi

# Generate Prisma clients
RUN yarn db:generate

# Build TypeScript
RUN npx tsc -p tsconfig.json

# Expose port
EXPOSE 4000

# Start command
CMD ["yarn", "start"]
