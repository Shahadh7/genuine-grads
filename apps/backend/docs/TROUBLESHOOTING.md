# Troubleshooting Guide

Common issues and their solutions.

---

## Database Issues

### ❌ Error: Database does not exist

**Error Message:**
```
Database `genuinegrads_test_edu` does not exist on the database server at `localhost:5432`
```

**Cause:** When a university is approved, the system generates a database URL but doesn't automatically create the PostgreSQL database.

**Solution:**

#### Option 1: Use the automated script (Recommended)

```bash
yarn db:create-uni genuinegrads_test_edu
```

#### Option 2: Manual creation

```bash
# Create the database
createdb genuinegrads_test_edu

# Push the schema
export UNIVERSITY_DATABASE_URL="postgresql://postgres:password@localhost:5432/genuinegrads_test_edu"
yarn db:push:university
```

#### Option 3: Using psql

```bash
psql -U postgres -c "CREATE DATABASE genuinegrads_test_edu;"

# Then push schema
export UNIVERSITY_DATABASE_URL="postgresql://postgres:password@localhost:5432/genuinegrads_test_edu"
yarn db:push:university
```

**How to find the database name:**

The database name is generated from the university domain:
- Domain: `test.edu` → Database: `genuinegrads_test_edu`
- Domain: `mit.edu` → Database: `genuinegrads_mit_edu`
- Domain: `stanford.edu` → Database: `genuinegrads_stanford_edu`

Pattern: `genuinegrads_<domain_with_dots_replaced_by_underscores>`

---

### ❌ Prisma Client Not Generated

**Error Message:**
```
Cannot find module '.prisma/shared'
Cannot find module '.prisma/university'
```

**Solution:**

```bash
yarn db:generate
```

---

### ❌ Database Connection Refused

**Error Message:**
```
Can't reach database server at `localhost:5432`
```

**Solution:**

Make sure PostgreSQL is running:

```bash
# macOS
brew services start postgresql

# Ubuntu/Debian
sudo systemctl start postgresql

# Check if running
pg_isadmin
```

---

### ❌ Authentication Failed for User

**Error Message:**
```
password authentication failed for user "postgres"
```

**Solution:**

1. Update your `.env` file with correct credentials:
```env
SHARED_DATABASE_URL=postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/genuinegrads_shared
```

2. Or reset PostgreSQL password:
```bash
psql -U postgres
ALTER USER postgres PASSWORD 'newpassword';
```

---

## Authentication Issues

### ❌ Invalid or Expired Token

**Error Message:**
```
Not authenticated
```

**Solution:**

1. Get a new access token:
```graphql
mutation Login {
  login(input: {
    email: "your@email.com"
    password: "yourpassword"
  }) {
    accessToken
  }
}
```

2. Update Authorization header:
```json
{
  "Authorization": "Bearer YOUR_NEW_ACCESS_TOKEN"
}
```

---

### ❌ Account Locked

**Error Message:**
```
Account is temporarily locked
```

**Solution:**

Wait 30 minutes, or manually unlock in database:

```sql
UPDATE admins 
SET locked_until = NULL, failed_login_attempts = 0 
WHERE email = 'your@email.com';
```

---

## GraphQL Issues

### ❌ Cannot Query Field on Type

**Error Message:**
```
Cannot query field "someField" on type "SomeType"
```

**Solution:**

1. Check your GraphQL schema in Playground
2. Make sure you're using the correct field names (case-sensitive)
3. Check if field requires authentication

---

### ❌ Variable Type Mismatch

**Error Message:**
```
Variable "$input" of type "InputType!" was provided invalid value
```

**Solution:**

1. Check the input type definition in schema
2. Ensure all required fields are provided
3. Check data types (String, Int, Float, Boolean, etc.)

Example:
```graphql
# ❌ Wrong
mutation {
  registerStudent(input: {
    enrollmentYear: "2024"  # Should be Int, not String
  })
}

# ✅ Correct
mutation {
  registerStudent(input: {
    enrollmentYear: 2024
  })
}
```

---

## Environment Variable Issues

### ❌ Environment Variable Validation Failed

**Error Message:**
```
Invalid environment variables:
JWT_SECRET: String must contain at least 32 character(s)
```

**Solution:**

Generate proper secrets:

```bash
# JWT Secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Refresh Secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Master Encryption Key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Then update your `.env` file.

---

### ❌ Module Not Found

**Error Message:**
```
Cannot find module 'some-package'
```

**Solution:**

```bash
# Reinstall dependencies
rm -rf node_modules
yarn install
```

---

## Port Already in Use

**Error Message:**
```
Error: listen EADDRINUSE: address already in use :::4000
```

**Solution:**

Option 1: Kill the process using port 4000
```bash
# Find process
lsof -i :4000

# Kill it
kill -9 <PID>
```

Option 2: Change port in `.env`
```env
PORT=4001
```

---

## University Approval Workflow

### ❌ University Still Pending After Approval

**Problem:** Approved university but still can't register students

**Solution:**

1. Check university status:
```graphql
query {
  myUniversity {
    id
    status
    databaseUrl
  }
}
```

2. Make sure status is `APPROVED`
3. Create the university database (see Database Issues above)
4. Try registering student again

---

## Student Registration Issues

### ❌ Student Already Exists

**Error Message:**
```
Student already exists in your university
```

**Solution:**

The student with this email, student number, or national ID already exists. Check:

```graphql
query {
  students(search: "john@example.com") {
    id
    email
    studentNumber
  }
}
```

---

### ❌ Wallet Address Invalid

**Error Message:**
```
Invalid Solana wallet address
```

**Solution:**

Make sure the wallet address is a valid base58 Solana public key (44 characters).

Example valid address: `7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU`

---

## Certificate Issuance Issues

### ❌ Student Has No Wallet

**Error Message:**
```
Student does not have a wallet address
```

**Solution:**

Update student with wallet address:

```graphql
mutation {
  updateStudent(
    id: "student_id_here"
    input: {
      walletAddress: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
    }
  ) {
    id
    walletAddress
  }
}
```

---

## Development Issues

### ❌ TypeScript Errors During Development

**Solution:**

```bash
# Regenerate Prisma clients
yarn db:generate

# Restart TypeScript server in your IDE
# VSCode: Cmd+Shift+P → "TypeScript: Restart TS Server"
```

---

### ❌ Hot Reload Not Working

**Solution:**

Restart the dev server:

```bash
# Stop (Ctrl+C)
# Start again
yarn dev
```

---

## Production Issues

### ❌ Server Crashes in Production

**Check logs:**

```bash
# PM2
pm2 logs genuinegrads-api

# Docker
docker-compose logs -f api

# Direct
tail -f logs/err.log
```

**Common causes:**
- Database connection issues
- Out of memory (check PM2 max_memory_restart)
- Unhandled promise rejections
- Invalid environment variables

---

## Getting Help

### Debug Checklist

- [ ] Check server logs
- [ ] Check database connection
- [ ] Verify environment variables
- [ ] Check Prisma client is generated
- [ ] Verify JWT token is valid
- [ ] Check user has correct permissions
- [ ] Test query/mutation in GraphQL Playground

### Useful Commands

```bash
# Check database connection
yarn db:studio:shared

# View server logs
yarn dev  # Watch mode shows all logs

# Check database tables
psql -U postgres -d genuinegrads_shared -c "\dt"

# Test API health
curl http://localhost:4000/health
```

---

## Still Having Issues?

1. Check the documentation:
   - [README.md](./README.md)
   - [QUICKSTART.md](./QUICKSTART.md)
   - [API_EXAMPLES.md](./API_EXAMPLES.md)

2. Check GraphQL Playground schema docs

3. Enable debug logging:
```env
NODE_ENV=development
```

4. File an issue with:
   - Error message
   - Steps to reproduce
   - Environment (OS, Node version, PostgreSQL version)
   - Relevant logs

---

**Remember:** Most issues are related to:
- Missing university database creation
- Invalid/expired JWT tokens
- Wrong environment variables
- Database connection issues

