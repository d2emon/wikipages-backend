import express, { Router } from 'express';
import type { Request, Response } from 'express';
import { assertWriteAccess, isAuthorized } from '../auth';
import { HttpError } from '../errors';
import {
  extractTitle,
  renderMarkdown,
} from '../models/markdown';
import {
  createNote,
  deleteNote,
  listNotes,
  noteExists,
  parseWikiRequestPath,
  readNote,
  upsertNote,
} from '../models/notes';
import type { Note, NoteFormat } from '../models/notes';
import {
  renderHtmlDocument,
  renderIndexPage,
} from '../html';

const router = Router();

router.use(express.text({ type: ['text/markdown', 'text/plain'], limit: '1mb' }));

function makeEtag(note: Note, variant: string): string {
  const stamp = new Date(note.updatedAt).getTime().toString(16);
  return `W/"${note.size.toString(16)}-${stamp}-${variant}"`;
}

function readBodyContent(req: Request): string {
  const body = req.body as unknown;

  if (typeof body === 'string') {
    const contentType = req.get('content-type') ?? '';

    if (contentType.includes('application/json')) {
      try {
        const parsed = JSON.parse(body) as { content?: unknown };
        if (typeof parsed.content === 'string') {
          return parsed.content;
        }
      } catch {
        throw new HttpError(400, 'Invalid JSON');
      }

      throw new HttpError(400, 'JSON needs string content');
    }

    return body;
  }

  if (
    body &&
    typeof body === 'object' &&
    typeof (body as { content?: unknown }).content === 'string'
  ) {
    return (body as { content: string }).content;
  }

  throw new HttpError(400, 'Awaiting Markdown in request body');
}

function readBodySecret(req: Request): boolean | undefined {
  const body = req.body as unknown;

  if (
    body &&
    typeof body === 'object' &&
    typeof (body as { secret?: unknown }).secret === 'boolean'
  ) {
    return (body as { secret: boolean }).secret;
  }

  const header = req.get('x-note-secret');
  if (header === 'true') return true;
  if (header === 'false') return false;

  return undefined;
}

function sendRepresentation(
  req: Request,
  res: Response,
  note: Note,
  format: NoteFormat,
  fragment: boolean,
): void {
  const variant = format === 'md' ? 'md' : fragment ? 'fragment' : 'html';
  const etag = makeEtag(note, variant);

  res.set('ETag', etag);
  res.set('Cache-Control', 'no-cache');
  res.set('X-Content-Type-Options', 'nosniff');

  if (req.get('if-none-match') === etag) {
    res.status(304).end();
    return;
  }

  if (format === 'md') {
    res.set('Content-Type', 'text/markdown; charset=utf-8');
    res.send(note.content);
    return;
  }

  const html = renderMarkdown(note.content);
  res.set('Content-Type', 'text/html; charset=utf-8');

  if (fragment) {
    res.send(html);
    return;
  }

  const title = extractTitle(note.content, note.title);
  res.send(renderHtmlDocument(title, html, { secret: note.secret }));
}

router.use(async (req, res, next) => {
  try {
    const rawPath = req.path;
    const isIndex = rawPath === '/' || rawPath === '';

    if (isIndex) {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        throw new HttpError(405, 'Incorrect method');
      }

      const notes = await listNotes({ allowSecret: isAuthorized(req) });
      res.set('Cache-Control', 'no-cache');
      res.set('Content-Type', 'text/html; charset=utf-8');
      res.send(renderIndexPage(notes));
      return;
    }

    const { path: notePath, format } = parseWikiRequestPath(rawPath);

    if (!format) {
      throw new HttpError(404, 'Add .md or .html ath path end');
    }

    const allowSecret = isAuthorized(req);

    if (req.method === 'GET' || req.method === 'HEAD') {
      const note = await readNote(notePath, { allowSecret });

      if (!note) {
        throw new HttpError(404, 'Note not found');
      }

      sendRepresentation(
        req,
        res,
        note,
        format,
        req.query.fragment === '1' || req.query.fragment === 'true',
      );
      return;
    }

    if (
      req.method === 'PUT' ||
      req.method === 'POST' ||
      req.method === 'DELETE'
    ) {
      assertWriteAccess(req);

      if (req.method === 'DELETE') {
        const deleted = await deleteNote(notePath);

        if (!deleted) {
          throw new HttpError(404, 'Note not found');
        }

        res.status(204).end();
        return;
      }

      const content = readBodyContent(req);
      const secret = readBodySecret(req);

      if (req.method === 'POST') {
        const note = await createNote(notePath, content, secret ?? false);
        res.status(201).json({
          ...note,
          html: renderMarkdown(note.content),
        });
        return;
      }

      const existed = await noteExists(notePath);
      const note = await upsertNote(notePath, content, secret);

      res.status(existed ? 200 : 201).json({
        ...note,
        html: renderMarkdown(note.content),
      });
      return;
    }

    throw new HttpError(405, 'Incorrect method');
  } catch (error) {
    next(error);
  }
});

export default router;
