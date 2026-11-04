import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

export const ROOT_DIR = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(ROOT_DIR, '.env'), quiet: true });

export const PORT = Number(process.env.PORT ?? 3001);

export const WIKI_DATA_DIR = process.env.WIKI_DATA_DIR
  ? path.resolve(process.env.WIKI_DATA_DIR)
  : path.join(ROOT_DIR, 'data', 'wiki');

export const WIKI_API_KEY = process.env.WIKI_API_KEY ?? '';
export const WIKI_MAX_NOTE_BYTES = Number(
  process.env.WIKI_MAX_NOTE_BYTES ?? 1024 * 1024,
);
  