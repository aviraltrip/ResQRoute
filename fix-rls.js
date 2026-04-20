const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$executeRawUnsafe(`alter table "DistressMessage" disable row level security;`);
    await prisma.$executeRawUnsafe(`alter table "Guest" disable row level security;`);
    await prisma.$executeRawUnsafe(`grant select on table "Guest" to anon;`);
    await prisma.$executeRawUnsafe(`grant select on table "DistressMessage" to anon;`);
    await prisma.$executeRawUnsafe(`grant select on table "Incident" to anon;`);
    console.log("RLS disabled and anon grants provided", res);
  } catch (e) {
    console.error(e);
  }
}
main().finally(() => process.exit(0));
