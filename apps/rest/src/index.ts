import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { logger } from 'hono/logger';

const app = new Hono();

// Add logger middleware
app.use('*', logger());

// Health check endpoint
app.get('/', (c) => c.text('Discord Regex REST API'));

// POST endpoint to receive JSON data
app.post('/webhook', async (c) => {
  const body = await c.req.json();
  console.log('Received webhook data:', body);
  return c.json({ status: 'success', message: 'Data received' });
});

// Start the server
const port = process.env.PORT || 4000;
serve({
  fetch: app.fetch,
  port: Number(port),
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`);
});