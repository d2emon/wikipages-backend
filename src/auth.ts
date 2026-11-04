import crypto from 'node:crypto';
import type { Request } from 'express';
import { WIKI_API_KEY } from './config';
import { HttpError } from './errors';

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);

  if (left.length !== right.length) {
    return false;
  }

  return crypto.timingSafeEqual(left, right);
}

function extractKey(req: Request): string | undefined {
  const header = req.get('x-api-key');
  if (header) {
    return header.trim();
  }

  const authorization = req.get('authorization');
  if (authorization?.toLowerCase().startsWith('bearer ')) {
    return authorization.slice(7).trim();
  }

  return undefined;
}

export function isAuthorized(req: Request): boolean {
  if (!WIKI_API_KEY) {
    return false;
  }

  const key = extractKey(req);
  return Boolean(key && safeEqual(key, WIKI_API_KEY));
}

export function assertWriteAccess(req: Request): void {
  if (!WIKI_API_KEY) {
    throw new HttpError(
      503,
      'Write mode off: set WIKI_API_KEY in environment variables.',
    );
  }

  if (!isAuthorized(req)) {
    throw new HttpError(401, 'API-key is required');
  }
}
