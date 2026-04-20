const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$executeRawUnsafe(`begin;`);
    await prisma.$executeRawUnsafe(`drop publication if exists supabase_realtime;`);
    await prisma.$executeRawUnsafe(`create publication supabase_realtime;`);
    await prisma.$executeRawUnsafe(`alter publication supabase_realtime add table "Guest";`);
    await prisma.$executeRawUnsafe(`alter publication supabase_realtime add table "DistressMessage";`);
    await prisma.$executeRawUnsafe(`commit;`);
    console.log("Supabase Realtime publication enabled for tables Guest and DistressMessage");
  } catch (e) {
    console.error("Warning or Error enabling realtime (you might need to enable it in dashboard):", e.message);
  }
}

main().finally(() => process.exit(0));
