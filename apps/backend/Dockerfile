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

# Debug: list files to verify tsconfig.json is copied
RUN ls -la && cat tsconfig.json

# Generate Prisma clients
RUN yarn db:generate

# Build TypeScript
RUN npx tsc -p tsconfig.json

# Expose port
EXPOSE 4000

# Start command
CMD ["yarn", "start"]
