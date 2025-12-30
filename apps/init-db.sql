-- Create the genuinegrads database (alias for shared)
-- Note: genuinegrads_shared is created by default via POSTGRES_DB env var
-- This creates an alias database for backward compatibility
CREATE DATABASE genuinegrads;

-- Create the university template database
CREATE DATABASE genuinegrads_uni_template;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE genuinegrads TO genuinegrads;
GRANT ALL PRIVILEGES ON DATABASE genuinegrads_shared TO genuinegrads;
GRANT ALL PRIVILEGES ON DATABASE genuinegrads_uni_template TO genuinegrads;
