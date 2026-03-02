import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Byrja að setja inn bullgögn...');

  const author1 = await prisma.author.upsert({
    where: { email: 'anna@frettir.is' },
    update: {},
    create: { name: 'Anna Jónsdóttir', email: 'anna@frettir.is' },
  });

  const author2 = await prisma.author.upsert({
    where: { email: 'siggi@frettir.is' },
    update: {},
    create: { name: 'Sigurður Guðmundsson', email: 'siggi@frettir.is' },
  });

  const author3 = await prisma.author.upsert({
    where: { email: 'helga@frettir.is' },
    update: {},
    create: { name: 'Helga Magnúsdóttir', email: 'helga@frettir.is' },
  });

  const articlesData = [];
  for (let i = 1; i <= 12; i++) {
    articlesData.push({
      title: `Frábær frétt númer ${i}`,
      slug: `frabaer-frett-numer-${i}`,
      summary: `Þetta er stuttur inngangur að frétt númer ${i}.`,
      content: `Hér er allt efnið í fréttinni. Þetta er rosalega spennandi lesning sem allir þurfa að sjá. ${i} sinnum betra en annað.`,
      published: true,
      authorId: i % 3 === 0 ? author3.id : i % 2 === 0 ? author2.id : author1.id,
    });
  }

  for (const article of articlesData) {
    await prisma.article.upsert({
      where: { slug: article.slug },
      update: {},
      create: article,
    });
  }

  console.log('Bullgögn komin í grunninn! 🎉');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });