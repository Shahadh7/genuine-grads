#!/bin/bash

# Script to create and initialize a new university database
# Usage: ./scripts/create-university-db.sh <database_name>

if [ -z "$1" ]; then
  echo "Usage: ./scripts/create-university-db.sh <database_name>"
  echo "Example: ./scripts/create-university-db.sh genuinegrads_mit_edu"
  exit 1
fi

DB_NAME=$1
POSTGRES_USER=${POSTGRES_USER:-postgres}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-password}
POSTGRES_HOST=${POSTGRES_HOST:-localhost}
POSTGRES_PORT=${POSTGRES_PORT:-5432}

echo "🔨 Creating university database: $DB_NAME"

# Create the database
createdb -U $POSTGRES_USER -h $POSTGRES_HOST -p $POSTGRES_PORT $DB_NAME 2>/dev/null

if [ $? -eq 0 ]; then
  echo "✅ Database created successfully"
else
  echo "⚠️  Database might already exist, continuing..."
fi

# Push schema to the new database
echo "📋 Pushing schema to database..."
export UNIVERSITY_DATABASE_URL="postgresql://$POSTGRES_USER:$POSTGRES_PASSWORD@$POSTGRES_HOST:$POSTGRES_PORT/$DB_NAME"
yarn db:push:university

if [ $? -eq 0 ]; then
  echo "✅ Schema pushed successfully"
  echo ""
  echo "🎉 Database ready: $DB_NAME"
  echo "📝 Database URL: postgresql://$POSTGRES_USER:***@$POSTGRES_HOST:$POSTGRES_PORT/$DB_NAME"
else
  echo "❌ Failed to push schema"
  exit 1
fi

