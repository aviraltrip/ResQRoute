const { createClient } = require('@supabase/supabase-js');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: '.env.local' });

const prisma = new PrismaClient();
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  console.log("Listening...");
  let received = false;
  
  const sub = supabase.channel('public:DistressMessage')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'DistressMessage' }, (payload) => {
      console.log("REALTIME RECEIVED:", payload.new);
      received = true;
    })
    .subscribe((status) => {
      console.log("Sub status:", status);
    });

  setTimeout(async () => {
    console.log("Inserting distress message...");
    const guest = await prisma.guest.findFirst();
    const incident = await prisma.incident.findFirst();
    if(guest && incident) {
      await prisma.distressMessage.create({
        data: {
          incidentId: incident.id,
          guestId: guest.id,
          roomId: guest.roomId,
          text: "Test realtime",
          severity: 5,
          category: "panic"
        }
      });
    }
  }, 2000);

  setTimeout(() => {
    console.log("Success:", received);
    process.exit(received ? 0 : 1);
  }, 5000);
}

run();
