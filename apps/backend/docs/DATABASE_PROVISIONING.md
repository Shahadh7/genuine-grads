# Database Provisioning Guide

## 🎯 Overview

GenuineGrads uses a **multi-tenant database architecture** where each university gets its own isolated PostgreSQL database. When a super admin approves a university, the system **automatically provisions** a new database.

---

## 🔄 Automatic Provisioning Flow

### What Happens When University is Approved

```
1. Super Admin clicks "Approve University"
   ↓
2. System creates PostgreSQL database
   - Database name: genuinegrads_<domain>
   - Example: mit.edu → genuinegrads_mit_edu
   ↓
3. System initializes database schema
   - Creates all tables (Students, Courses, Certificates, etc.)
   - Sets up indexes and constraints
   ↓
4. System updates university record
   - Status: APPROVED
   - Database URL saved
   ↓
5. University is ready to use!
   - Can register students
   - Can issue certificates
```

---

## 🏗️ Database Architecture

### Shared Central Database
**Name:** `genuinegrads_shared`  
**Contains:**
- Universities registry
- Platform administrators
- Global student index (prevents duplicates)
- Mint activity logs
- Revocation index
- Webhook logs

### Private University Databases
**Name Pattern:** `genuinegrads_<university_domain>`  
**Examples:**
- `genuinegrads_mit_edu` (for MIT)
- `genuinegrads_stanford_edu` (for Stanford)
- `genuinegrads_test_edu` (for Test University)

**Each Contains:**
- Students
- Courses & Enrollments
- Achievements & Badges
- Certificates (cNFT references)
- Certificate templates
- ZKP proof requests
- Batch issuance jobs

---

## ⚙️ How It Works

### 1. Database Creation

The provisioning service (`src/services/database/provisioning.service.ts`) handles:

```typescript
// Step 1: Parse university domain
const domain = "mit.edu";
const databaseName = "genuinegrads_mit_edu";

// Step 2: Create PostgreSQL database
CREATE DATABASE "genuinegrads_mit_edu";

// Step 3: Initialize schema
// Runs: prisma db push --schema=prisma/university.prisma

// Step 4: Return connection info
{
  databaseName: "genuinegrads_mit_edu",
  databaseUrl: "postgresql://...@localhost:5432/genuinegrads_mit_edu",
  success: true
}
```

### 2. Database Connection Pooling

The system maintains a connection pool for university databases:

```typescript
// When university admin makes request:
1. Fetch university record from shared DB
2. Get database URL
3. Create/reuse connection from pool
4. Execute query on university's private database
```

---

## 🔒 Security & Isolation

### Data Isolation
- Each university's data is completely isolated
- No cross-database queries possible
- University admins can only access their own database

### Connection Security
- Database credentials stored in environment variables
- University private keys encrypted with master key
- All connections use SSL in production

### Access Control
- Super Admin: Access to shared database
- University Admin: Access to their university database only
- Students: No direct database access (only via API)

---

## 📊 Database Naming Convention

| University Domain | Database Name |
|------------------|---------------|
| `mit.edu` | `genuinegrads_mit_edu` |
| `stanford.edu` | `genuinegrads_stanford_edu` |
| `harvard.edu` | `genuinegrads_harvard_edu` |
| `oxford.ac.uk` | `genuinegrads_oxford_ac_uk` |
| `test-university.com` | `genuinegrads_test-university_com` |

**Rule:** Replace dots (`.`) and hyphens (`-`) with underscores (`_`), convert to lowercase.

---

## 🛠️ Manual Database Operations

### Check if Database Exists

```typescript
import { checkDatabaseExists } from './services/database/provisioning.service';

const exists = await checkDatabaseExists('genuinegrads_mit_edu');
console.log(exists); // true or false
```

### Create Database Manually (if needed)

```bash
# Using the helper script
yarn db:create-uni genuinegrads_mit_edu

# Or manually
createdb genuinegrads_mit_edu
UNIVERSITY_DATABASE_URL="postgresql://postgres:password@localhost:5432/genuinegrads_mit_edu" \
  yarn db:push:university
```

### Drop Database (Caution!)

```typescript
import { dropUniversityDatabase } from './services/database/provisioning.service';

// This will permanently delete all data!
await dropUniversityDatabase('genuinegrads_test_edu');
```

---

## 🚨 Troubleshooting

### Database Creation Fails

**Error:** `Failed to provision database: permission denied`

**Solution:** Make sure the PostgreSQL user has `CREATEDB` privilege:

```sql
-- Connect as postgres superuser
psql -U postgres

-- Grant CREATEDB privilege
ALTER USER postgres CREATEDB;

-- Or create a new user with CREATEDB
CREATE USER genuinegrads WITH PASSWORD 'secure_password' CREATEDB;
```

### Schema Push Fails

**Error:** `Failed to initialize database schema`

**Solution:**

1. Check if database exists:
```bash
psql -U postgres -l | grep genuinegrads
```

2. Manually push schema:
```bash
UNIVERSITY_DATABASE_URL="postgresql://postgres:password@localhost:5432/genuinegrads_mit_edu" \
  yarn db:push:university
```

### Connection Pool Issues

**Error:** `Too many clients`

**Solution:** Increase PostgreSQL `max_connections`:

```bash
# Edit postgresql.conf
max_connections = 200

# Restart PostgreSQL
sudo systemctl restart postgresql
```

---

## 📈 Monitoring

### Check Active Connections

```sql
SELECT 
  datname as database,
  count(*) as connections
FROM pg_stat_activity
WHERE datname LIKE 'genuinegrads_%'
GROUP BY datname;
```

### Check Database Sizes

```sql
SELECT 
  datname as database,
  pg_size_pretty(pg_database_size(datname)) as size
FROM pg_database
WHERE datname LIKE 'genuinegrads_%'
ORDER BY pg_database_size(datname) DESC;
```

### Connection Pool Status

```typescript
import { getUniversityDbConnectionCount } from './db/university.client';

console.log('Active connections:', getUniversityDbConnectionCount());
```

---

## 🔄 Database Lifecycle

### 1. University Registration
- University record created in shared DB
- Status: `PENDING_APPROVAL`
- Database NOT created yet

### 2. University Approval
- ✅ Database automatically created
- ✅ Schema initialized
- ✅ Status: `APPROVED`
- ✅ Ready to use

### 3. University Active
- Students registered
- Certificates issued
- Data accumulates in private database

### 4. University Suspension
- Status: `SUSPENDED`
- Database preserved but access blocked
- Can be reactivated later

### 5. University Deletion (Future)
- Would require archiving data
- Database dropped after confirmation
- Permanent operation

---

## 💡 Best Practices

### 1. Regular Backups

```bash
# Backup all university databases
for db in $(psql -U postgres -lt | grep genuinegrads_ | cut -d '|' -f 1); do
  pg_dump -U postgres $db > backup_${db}_$(date +%Y%m%d).sql
done
```

### 2. Connection Management

- Reuse connections from pool
- Don't create new connections per request
- Close connections on server shutdown

### 3. Schema Updates

```bash
# Update all university databases
for db in $(psql -U postgres -lt | grep genuinegrads_ | cut -d '|' -f 1); do
  echo "Updating $db..."
  UNIVERSITY_DATABASE_URL="postgresql://postgres:password@localhost:5432/$db" \
    yarn db:push:university
done
```

### 4. Monitoring

- Monitor database sizes
- Track active connections
- Set up alerts for connection limits
- Monitor query performance

---

## 📝 Summary

✅ **Automatic:** Databases created when university approved  
✅ **Isolated:** Each university has separate database  
✅ **Secure:** No cross-university data access  
✅ **Scalable:** Can handle thousands of universities  
✅ **Maintainable:** Consistent schema across all databases  

The system handles all database provisioning automatically - you don't need to manually create databases anymore!

---

## 🆘 Need Help?

Check:
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Common issues
- [README.md](./README.md) - Full documentation
- Server logs for detailed error messages

