import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import xss from 'xss';

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const app = new Hono();

const authorSchema = z.object({
  name: z.string().min(1, 'Nafn má ekki vera tómt').max(100, 'Nafn of langt'),
  email: z.string().email('Ógilt netfang').max(100, 'Netfang of langt'),
});

const articleSchema = z.object({
  title: z.string().min(1, 'Titill má ekki vera tómur').max(255, 'Titill of langur'),
  slug: z.string().min(1, 'Slug má ekki vera tómt').max(255, 'Slug of langt'),
  summary: z.string().min(1, 'Inngangur má ekki vera tómur').max(500, 'Inngangur of langur'),
  content: z.string().min(1, 'Efni má ekki vera tómt'),
  published: z.boolean().default(false),
  authorId: z.number().int().positive('Höfundur verður að vera valinn (id)'),
});

app.get('/', (c) => c.text('Velkomin í Fréttavef API! Skoðaðu /authors eða /articles.'));

app.get('/authors', async (c) => {
  try {
    const limit = Number(c.req.query('limit')) || 10;
    const offset = Number(c.req.query('offset')) || 0;

    const [authors, total] = await Promise.all([
      prisma.author.findMany({ skip: offset, take: limit }),
      prisma.author.count(),
    ]);

    return c.json({ data: authors, paging: { limit, offset, total } }, 200);
  } catch {
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

app.get('/authors/:id', async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) return c.json({ error: 'Ógilt auðkenni' }, 400);

  try {
    const author = await prisma.author.findUnique({ where: { id } });
    if (!author) return c.json({ error: 'Höfundur fannst ekki' }, 404);
    return c.json(author, 200);
  } catch (error) {
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

app.post('/authors', zValidator('json', authorSchema, (result, c) => {
  if (!result.success) return c.json({ error: 'Ógild gögn', details: result.error.format() }, 400);
}), async (c) => {
  const body = c.req.valid('json');
  try {
    const newAuthor = await prisma.author.create({
      data: { name: xss(body.name), email: xss(body.email) },
    });
    return c.json(newAuthor, 201);
  } catch (error) {
    return c.json({ error: 'Villa við skráningu, gæti verið að netfang sé þegar til' }, 500);
  }
});

app.put('/authors/:id', zValidator('json', authorSchema, (result, c) => {
  if (!result.success) return c.json({ error: 'Ógild gögn', details: result.error.format() }, 400);
}), async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) return c.json({ error: 'Ógilt auðkenni' }, 400);
  const body = c.req.valid('json');

  try {
    const updatedAuthor = await prisma.author.update({
      where: { id },
      data: { name: xss(body.name), email: xss(body.email) },
    });
    return c.json(updatedAuthor, 200);
  } catch (error) {
    return c.json({ error: 'Höfundur fannst ekki' }, 404);
  }
});

app.delete('/authors/:id', async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) return c.json({ error: 'Ógilt auðkenni' }, 400);

  try {
    await prisma.author.delete({ where: { id } });
    return new Response(null, { status: 204 });
  } catch (error) {
    return c.json({ error: 'Höfundur fannst ekki' }, 404);
  }
});

app.get('/articles', async (c) => {
  try {
    const limit = Number(c.req.query('limit')) || 10;
    const offset = Number(c.req.query('offset')) || 0;

    const [articles, total] = await Promise.all([
      prisma.article.findMany({ 
        skip: offset, 
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { author: true }
      }),
      prisma.article.count(),
    ]);

    return c.json({ data: articles, paging: { limit, offset, total } }, 200);
  } catch (error) {
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

app.get('/articles/:slug', async (c) => {
  const slug = c.req.param('slug');

  try {
    const article = await prisma.article.findUnique({ 
      where: { slug },
      include: { author: true } 
    });
    
    if (!article) return c.json({ error: 'Frétt fannst ekki' }, 404);
    return c.json(article, 200);
  } catch (error) {
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

app.post('/articles', zValidator('json', articleSchema, (result, c) => {
  if (!result.success) return c.json({ error: 'Ógild gögn', details: result.error.format() }, 400);
}), async (c) => {
  const body = c.req.valid('json');

  try {
    const newArticle = await prisma.article.create({
      data: {
        title: xss(body.title),
        slug: xss(body.slug),
        summary: xss(body.summary),
        content: xss(body.content),
        published: body.published,
        authorId: body.authorId,
      },
    });
    return c.json(newArticle, 201);
  } catch (error) {
    return c.json({ error: 'Villa við skráningu, gæti verið að slug sé þegar til' }, 500);
  }
});

app.put('/articles/:id', zValidator('json', articleSchema, (result, c) => {
  if (!result.success) return c.json({ error: 'Ógild gögn', details: result.error.format() }, 400);
}), async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) return c.json({ error: 'Ógilt auðkenni' }, 400);
  const body = c.req.valid('json');

  try {
    const updatedArticle = await prisma.article.update({
      where: { id },
      data: {
        title: xss(body.title),
        slug: xss(body.slug),
        summary: xss(body.summary),
        content: xss(body.content),
        published: body.published,
        authorId: body.authorId,
      },
    });
    return c.json(updatedArticle, 200);
  } catch (error) {
    return c.json({ error: 'Frétt fannst ekki' }, 404);
  }
});

app.delete('/articles/:id', async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) return c.json({ error: 'Ógilt auðkenni' }, 400);

  try {
    await prisma.article.delete({ where: { id } });
    return new Response(null, { status: 204 });
  } catch (error) {
    return c.json({ error: 'Frétt fannst ekki' }, 404);
  }
});

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
console.log(`🚀 Vefþjónn keyrir á http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port
});