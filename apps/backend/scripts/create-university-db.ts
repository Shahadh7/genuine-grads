#!/usr/bin/env tsx
import { execSync } from 'child_process';
import { config } from 'dotenv';

// Load environment variables
config();

const dbName = process.argv[2];

if (!dbName) {
  console.error('Usage: yarn create-uni-db <database_name>');
  console.error('Example: yarn create-uni-db genuinegrads_mit_edu');
  process.exit(1);
}

const POSTGRES_USER = process.env.POSTGRES_USER || 'postgres';
const POSTGRES_PASSWORD = process.env.POSTGRES_PASSWORD || 'password';
const POSTGRES_HOST = process.env.POSTGRES_HOST || 'localhost';
const POSTGRES_PORT = process.env.POSTGRES_PORT || '5432';

console.log(`🔨 Creating university database: ${dbName}`);

try {
  // Create the database
  execSync(`createdb -U ${POSTGRES_USER} -h ${POSTGRES_HOST} -p ${POSTGRES_PORT} ${dbName}`, {
    stdio: 'inherit',
  });
  console.log('✅ Database created successfully');
} catch (error: any) {
  if (error.message.includes('already exists')) {
    console.log('⚠️  Database already exists, continuing...');
  } else {
    console.error('❌ Failed to create database:', error.message);
    process.exit(1);
  }
}

try {
  // Push schema to the new database
  console.log('📋 Pushing schema to database...');
  const databaseUrl = `postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${dbName}`;
  
  execSync('yarn db:push:university', {
    stdio: 'inherit',
    env: {
      ...process.env,
      UNIVERSITY_DATABASE_URL: databaseUrl,
    },
  });
  
  console.log('✅ Schema pushed successfully');
  console.log('');
  console.log(`🎉 Database ready: ${dbName}`);
  console.log(`📝 Database URL: postgresql://${POSTGRES_USER}:***@${POSTGRES_HOST}:${POSTGRES_PORT}/${dbName}`);
} catch (error) {
  console.error('❌ Failed to push schema');
  process.exit(1);
}

