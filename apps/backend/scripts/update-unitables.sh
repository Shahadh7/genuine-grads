   cd /home/mohamed-shahadh/PROJECTS/genuinegrads/apps/backend  # already here in your shell

   # set the connection string for this university
   export UNIVERSITY_DATABASE_URL="postgres://mohamed-shahadh:1250%40Chammak@localhost:5432/genuinegrads_bcas_lk"

   # if Prisma has never tracked the earlier migrations for this database,
   # baseline them first (only needed once per DB):
   npx prisma migrate resolve --applied 20251108191756_add_blockchain_fields --schema=prisma/university.prisma
   npx prisma migrate resolve --applied 20251108223610_add_tx_signatures --schema=prisma/university.prisma

   # now apply the new achievements migration
   npx prisma migrate deploy --schema=prisma/university.prisma