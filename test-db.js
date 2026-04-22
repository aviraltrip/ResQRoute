const { PrismaClient } = require('@prisma/client');

async function testConnection(url) {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: url,
      },
    },
  });

  try {
    console.log(`Testing URL: ${url.replace(/:[^:@]+@/, ':***@')}`);
    await prisma.$connect();
    console.log('Success!');
    const count = await prisma.hotel.count();
    console.log(`Hotels: ${count}`);
    await prisma.$disconnect();
    return true;
  } catch (e) {
    console.error('Failed:', e.message);
    return false;
  }
}

async function main() {
  const directUrl = "postgresql://postgres:akshatavani@db.nvdgplyjlnzlfytarisx.supabase.co:5432/postgres";
  const poolerUrl = "postgresql://postgres.nvdgplyjlnzlfytarisx:akshatavani@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1";
  
  await testConnection(directUrl);
  console.log('\n------------------\n');
  await testConnection(poolerUrl);
}

main();
