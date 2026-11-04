import express from 'express';
import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { PORT, WIKI_API_KEY, WIKI_DATA_DIR } from './config';
import { HttpError } from './errors';
import apiRoutes from './routes/api';
import wikiRoutes from './routes/wiki';

const app = express();

app.disable('x-powered-by');
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api/notes', apiRoutes);
app.use('/wiki', wikiRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: 'Path not found' });
});

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error:
        err.issues.map((issue) => issue.message).filter(Boolean).join('; ') ||
        'Invalid data',
    });
    return;
  }

  const candidate = err as { type?: string; status?: number };

  if (candidate?.type === 'entity.too.large') {
    res.status(413).json({ error: 'Request body is too large' });
    return;
  }

  if (err instanceof SyntaxError) {
    res.status(400).json({ error: 'Incorrect JSON' });
    return;
  }

  console.error(err);
  res.status(500).json({ error: 'Server internal error' });
};

app.use(errorHandler);

const server = app.listen(PORT, () => {
  console.log(`Wiki backend is running: http://localhost:${PORT}`);
  console.log(`Wiki folder: ${WIKI_DATA_DIR}`);

  if (!WIKI_API_KEY) {
    console.warn(
      '[!] WIKI_API_KEY is not set: write mode off, hidden notes unaviable.',
    );
  } else if (WIKI_API_KEY === 'wiki_dev_key_change_me') {
    console.warn(
      '[!] Using default API key. Please change WIKI_API_KEY in .env.',
    );
  }
});

let shuttingDown = false;

function shutdown(signal: string): void {
  if (shuttingDown) return;
  shuttingDown = true;

  console.log(`Get ${signal}, stopping…`);
  server.close(() => process.exit(0));
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
