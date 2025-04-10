import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serveStatic } from 'hono/serve-static';
import { cache } from 'hono/cache';

import { apiRouter } from './routes/api';
import indexHtml from './index.html';

// Define environment bindings
interface Env {
	AI: Ai;
	DOCUMENTS_INDEX: VectorizeIndex;
}

// Create the main app
const app = new Hono<{ Bindings: Env }>();

// Apply middlewares
app.use('*', logger());
app.use('*', cors());

// Serve API routes
app.route('/api', apiRouter);

// Cache static assets
app.use('/static/*', cache({ cacheName: 'assets', cacheControl: 'max-age=86400' }));

// Serve HTML for the root route
app.get('/', (c) => {
	return c.html(indexHtml);
});

// 404 handler for non-matching routes
app.notFound((c) => {
	return c.json({ error: 'Not found', status: 404 }, 404);
});

// Error handler
app.onError((err, c) => {
	console.error(`Error: ${err.message}`);
	return c.json({ error: 'Internal server error', message: err.message, status: 500 }, 500);
});

export default app;
