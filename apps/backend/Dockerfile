FROM node:18-alpine

# Install dependencies for Prisma and native modules
RUN apk add --no-cache openssl python3 make g++

WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy prisma schemas first (needed for generate)
COPY prisma ./prisma

# Generate Prisma clients
RUN yarn db:generate

# Copy source code
COPY . .

# Build TypeScript
RUN yarn build

# Expose port
EXPOSE 4000

# Start command
CMD ["yarn", "start"]
