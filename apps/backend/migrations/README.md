# Database Migrations

This directory contains SQL migration files for updating all university databases when schema changes are made.

## How It Works

When you add new tables or modify the schema in `prisma/university.prisma`, you need to:

1. Create a SQL migration file in this directory
2. Run the migration script to apply changes to all existing university databases

## Creating a New Migration

### Step 1: Update the Schema

Edit `prisma/university.prisma` to add your new table or modify existing tables.

Example:
```prisma
model NewTable {
  id String @id @default(cuid())
  name String
  createdAt DateTime @default(now())
}
```

### Step 2: Generate Prisma Client

Run the following to update the Prisma client:

```bash
yarn db:generate:university
```

### Step 3: Apply to Template Database

Push the schema changes to the template database:

```bash
yarn db:push:university
```

This updates the template database that new universities will use.

### Step 4: Create SQL Migration File

Create a new `.sql` file in this directory with a descriptive name:

```bash
# Example: migrations/add_new_table.sql
```

Write the SQL statements to create/modify tables:

```sql
-- Add NewTable
CREATE TABLE IF NOT EXISTS "new_table" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "new_table_pkey" PRIMARY KEY ("id")
);

-- Add indexes
CREATE INDEX IF NOT EXISTS "new_table_name_idx" ON "new_table"("name");

-- Add foreign keys if needed
ALTER TABLE "new_table"
ADD CONSTRAINT "new_table_userId_fkey"
FOREIGN KEY ("userId")
REFERENCES "users"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
```

### Step 5: Run Migration on All University Databases

Use the migration script to apply changes to all existing university databases:

```bash
npx tsx scripts/run-migration.ts add_new_table.sql
```

This will:
- Connect to all approved university databases
- Apply the SQL migration to each one
- Show a summary of successful/failed migrations

## Migration Script Usage

### Run a specific migration:
```bash
npx tsx scripts/run-migration.ts <filename.sql>
```

### Example:
```bash
npx tsx scripts/run-migration.ts add_verification_log.sql
```

## Best Practices

### 1. Use `IF NOT EXISTS`
Always use `IF NOT EXISTS` when creating tables/indexes to avoid errors if the migration is run multiple times:

```sql
CREATE TABLE IF NOT EXISTS "my_table" (...);
CREATE INDEX IF NOT EXISTS "my_index" ON "my_table"("field");
```

### 2. Handle Existing Data
When modifying existing tables, consider how to handle existing data:

```sql
-- Add a new nullable column first
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phoneNumber" TEXT;

-- Then update existing rows if needed
UPDATE "users" SET "phoneNumber" = 'N/A' WHERE "phoneNumber" IS NULL;

-- Finally make it required if needed
ALTER TABLE "users" ALTER COLUMN "phoneNumber" SET NOT NULL;
```

### 3. Transaction Safety
Wrap related changes in a transaction for safety:

```sql
BEGIN;

-- Your migration statements here
CREATE TABLE ...;
ALTER TABLE ...;

COMMIT;
```

### 4. Test First
Before running on all universities, test your migration on a single database:

```bash
# Connect to a test database
psql -h localhost -U postgres -d genuinegrads_uni_test

# Run your SQL manually
\i migrations/your_migration.sql
```

### 5. Backup
Always ensure databases are backed up before running migrations on production.

## Example Migrations

### Adding a New Table
See: `add_verification_log.sql`

### Adding Columns to Existing Table
```sql
-- Add new columns to students table
ALTER TABLE "students"
ADD COLUMN IF NOT EXISTS "graduationDate" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "honors" TEXT;

-- Add index
CREATE INDEX IF NOT EXISTS "students_graduationDate_idx"
ON "students"("graduationDate");
```

### Adding Relations
```sql
-- Add foreign key relationship
ALTER TABLE "enrollments"
ADD CONSTRAINT "enrollments_advisorId_fkey"
FOREIGN KEY ("advisorId")
REFERENCES "faculty"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
```

## Troubleshooting

### Migration fails on some universities
- Check the error message in the output
- Verify the SQL syntax
- Check if the table/column already exists
- Ensure foreign key references are valid

### "Permission denied" errors
- Verify database connection strings
- Check database user permissions

### "Relation already exists" errors
- Use `IF NOT EXISTS` clauses
- Check if migration was already applied

## Available Migrations

- `add_bulk_minting_support.sql` - Adds BatchIssuanceJob table for bulk certificate minting
- `add_verification_log.sql` - Adds VerificationLog table for tracking certificate verifications

## Notes

- The migration script only updates **APPROVED** universities with non-null database URLs
- Migrations run in parallel for faster execution
- Failed migrations are reported at the end
- Template database (`genuinegrads_uni_template`) must be updated separately using `yarn db:push:university`
