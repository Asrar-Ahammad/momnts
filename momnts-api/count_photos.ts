import { prisma } from "./src/lib/prisma.js";

async function run() {
  const counts = await prisma.photo.groupBy({
    by: ['event_id'],
    _count: { id: true }
  });
  console.log(JSON.stringify(counts, null, 2));
}
run().catch(console.error).finally(() => prisma.$disconnect());
