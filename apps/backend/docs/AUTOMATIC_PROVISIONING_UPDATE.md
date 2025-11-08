# 🎉 Automatic Database Provisioning - Update

## What Changed?

The backend now **automatically creates university databases** when a super admin approves a university!

---

## ✅ Before (Manual)

```bash
# Super admin approves university
mutation ApproveUniversity { ... }

# ❌ Error: Database does not exist

# Manual fix required:
createdb genuinegrads_mit_edu
yarn db:push:university

# ✅ Now works
```

---

## 🚀 After (Automatic)

```bash
# Super admin approves university
mutation ApproveUniversity { 
  approveUniversity(universityId: "...") {
    id
    status    # ← Automatically APPROVED
    databaseUrl  # ← Database created!
  }
}

# ✅ Everything works immediately!
# No manual database creation needed
```

---

## 🏗️ What Happens Automatically

When you click **"Approve University"**:

### Step 1: Database Creation ✅
```
Creates: genuinegrads_<domain>
Example: genuinegrads_mit_edu
```

### Step 2: Schema Initialization ✅
```
- Creates all tables
- Sets up indexes
- Initializes constraints
```

### Step 3: Ready to Use ✅
```
- Register students
- Issue certificates
- Everything works!
```

---

## 📁 New Files Created

### 1. `src/services/database/provisioning.service.ts`
**Purpose:** Handles automatic database provisioning

**Key Functions:**
- `provisionUniversityDatabase()` - Creates DB and initializes schema
- `checkDatabaseExists()` - Check if DB exists
- `dropUniversityDatabase()` - Delete DB (use carefully!)

### 2. `DATABASE_PROVISIONING.md`
Complete guide to the multi-tenant database architecture

### 3. `scripts/create-university-db.ts`
Manual database creation script (for special cases)

---

## 🔧 Updated Files

### 1. `src/graphql/resolvers/mutations/university.mutations.ts`

**Before:**
```typescript
async approveUniversity(...) {
  // TODO: Provision university private database
  // For now, we'll assume the database is manually created
  
  return updated;
}
```

**After:**
```typescript
async approveUniversity(...) {
  // ✅ Automatically provision database
  const provisionResult = await provisionUniversityDatabase(university.domain);
  
  if (!provisionResult.success) {
    throw new GraphQLError('Failed to provision database');
  }
  
  return updated;
}
```

### 2. `package.json`
Added new script: `yarn db:create-uni <database_name>`

---

## 🎯 Usage

### Normal Flow (Automatic)

```graphql
# 1. Register University
mutation RegisterUniversity {
  registerUniversity(input: {
    name: "Test University"
    domain: "test.edu"
    # ...
  }) {
    id
    status  # PENDING_APPROVAL
  }
}

# 2. Approve University (Database created automatically!)
mutation ApproveUniversity {
  approveUniversity(universityId: "clx123") {
    id
    status       # APPROVED ✅
    databaseUrl  # postgresql://...@localhost:5432/genuinegrads_test_edu ✅
    databaseName # genuinegrads_test_edu ✅
  }
}

# 3. Register Student (Works immediately!)
mutation RegisterStudent {
  registerStudent(input: {
    email: "student@test.edu"
    fullName: "John Doe"
    # ...
  }) {
    id
    email
  }
}
```

### Manual Database Creation (If Needed)

```bash
# Only use if automatic provisioning fails
yarn db:create-uni genuinegrads_custom_name
```

---

## 🔒 Security & Permissions

### Required PostgreSQL Permissions

The database user needs `CREATEDB` privilege:

```sql
-- Grant CREATEDB to existing user
ALTER USER postgres CREATEDB;

-- Or create new user with CREATEDB
CREATE USER genuinegrads WITH PASSWORD 'secure_password' CREATEDB;
```

### Update `.env` if needed:

```env
SHARED_DATABASE_URL=postgresql://genuinegrads:secure_password@localhost:5432/genuinegrads_shared
UNIVERSITY_DATABASE_URL=postgresql://genuinegrads:secure_password@localhost:5432/genuinegrads_uni_template
```

---

## 📊 Logs & Monitoring

### During Approval, You'll See:

```
[INFO] Starting university approval process
  universityId: clx123
  domain: test.edu
  
[INFO] Provisioning university database
  domain: test.edu
  
[INFO] Creating PostgreSQL database
  databaseName: genuinegrads_test_edu
  
[INFO] Database created successfully
  
[INFO] Initializing database schema
  
[INFO] Database schema initialized successfully
  
[INFO] Database provisioned successfully
  universityId: clx123
  databaseName: genuinegrads_test_edu
  
[INFO] ✅ University approved successfully
  domain: test.edu
  databaseName: genuinegrads_test_edu
```

---

## 🚨 Error Handling

### If Database Creation Fails:

```json
{
  "errors": [{
    "message": "Failed to provision database: permission denied to create database",
    "extensions": {
      "code": "INTERNAL_SERVER_ERROR"
    }
  }]
}
```

**Solution:** Check PostgreSQL permissions (see Security section above)

### If Schema Initialization Fails:

```json
{
  "errors": [{
    "message": "Failed to provision database: relation already exists",
    "extensions": {
      "code": "INTERNAL_SERVER_ERROR"
    }
  }]
}
```

**Solution:** Database already exists. Either:
1. Drop it: `dropdb genuinegrads_test_edu`
2. Or skip to next step

---

## 🧪 Testing

### Test the Automatic Provisioning:

```bash
# 1. Start server
yarn dev

# 2. Login as super admin
# 3. Register a test university
# 4. Approve the university
# 5. Check logs - should see database creation
# 6. Verify database exists:
psql -U postgres -l | grep genuinegrads_test_edu

# 7. Check database has tables:
psql -U postgres -d genuinegrads_test_edu -c "\dt"

# Should see: students, courses, certificates, etc.
```

---

## 📚 Related Documentation

- **[DATABASE_PROVISIONING.md](./DATABASE_PROVISIONING.md)** - Complete database architecture guide
- **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** - Common issues and solutions
- **[README.md](./README.md)** - Full project documentation

---

## 🎊 Benefits

✅ **No Manual Steps** - Database created automatically  
✅ **Faster Onboarding** - Universities ready immediately  
✅ **Fewer Errors** - No forgetting to create database  
✅ **Better Logging** - Clear audit trail of provisioning  
✅ **Rollback Support** - Can undo if needed  

---

## 🔄 Migration for Existing Universities

If you have universities approved before this update:

```typescript
// Option 1: Manually create their databases
yarn db:create-uni genuinegrads_existing_university_edu

// Option 2: Re-approve them (if status allows)
// This will trigger automatic provisioning
```

---

## 💡 Pro Tips

1. **Check database exists before approval:**
   ```sql
   SELECT datname FROM pg_database WHERE datname LIKE 'genuinegrads_%';
   ```

2. **Monitor database sizes:**
   ```sql
   SELECT datname, pg_size_pretty(pg_database_size(datname))
   FROM pg_database
   WHERE datname LIKE 'genuinegrads_%';
   ```

3. **Backup before testing:**
   ```bash
   pg_dumpall -U postgres > backup_$(date +%Y%m%d).sql
   ```

---

## ✅ Summary

**The system now handles everything automatically when you approve a university!**

No more manual database creation. Just approve the university and it's ready to use! 🚀

---

**Questions?** Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) or server logs.

