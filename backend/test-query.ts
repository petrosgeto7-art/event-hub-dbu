import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Testing category filter for "workshop"...');
  
  const events1 = await prisma.event.findMany({
    where: { category: { slug: 'workshop' } }
  });
  console.log('Result with { category: { slug: ... } }:', events1.length);
  
  const events2 = await prisma.event.findMany({
    where: { category: { is: { slug: 'workshop' } } }
  });
  console.log('Result with { category: { is: { slug: ... } } }:', events2.length);

  const category = await prisma.category.findUnique({ where: { slug: 'workshop' } });
  if (category) {
    const events3 = await prisma.event.findMany({
      where: { categoryId: category.id }
    });
    console.log('Result with categoryId:', events3.length);
  } else {
    console.log('Category not found');
  }
}

main().finally(() => prisma.$disconnect());
