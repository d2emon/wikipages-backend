import { Router } from 'express';
import { z } from 'zod';
import { assertWriteAccess, isAuthorized } from '../auth';
import { HttpError } from '../errors';
import { renderMarkdown } from '../models/markdown';
import {
    createNote,
    deleteNote,
    listNotes,
    normalizeNotePath,
    noteExists,
    parseApiRequestPath,
    readNote,
    renameNote,
    setNoteSecret,
    upsertNote,
} from '../models/notes';

const router = Router();

const createSchema = z.object({
  path: z.string().min(1, 'Укажите путь').max(700),
  content: z.string(),
  secret: z.boolean().optional(),
});

const updateSchema = z.object({
  content: z.string(),
  secret: z.boolean().optional(),
});

const patchSchema = z
  .object({
    path: z.string().min(1, 'Укажите новый путь').max(700).optional(),
    secret: z.boolean().optional(),
  })
  .refine((value) => value.path !== undefined || value.secret !== undefined, {
    message: 'Нужно передать path или secret',
  });

const batchSchema = z.object({
  paths: z.array(z.string().min(1).max(700)).min(1).max(200),
  html: z.boolean().optional(),
});

router.get('/', async (req, res) => {
  const prefix =
    typeof req.query.prefix === 'string' ? req.query.prefix : '';
  const limitValue = Number(req.query.limit);
  const limit =
    Number.isInteger(limitValue) && limitValue > 0
      ? Math.min(limitValue, 5000)
      : undefined;

  const notes = await listNotes({
    allowSecret: isAuthorized(req),
    prefix,
    limit,
  });

  res.json({ notes });
});

router.post('/batch', async (req, res) => {
  const input = batchSchema.parse(req.body);
  const allowSecret = isAuthorized(req);

  const notes = await Promise.all(
    input.paths.map(async (rawPath) => {
      const notePath = normalizeNotePath(rawPath);
      const note = await readNote(notePath, { allowSecret });

      if (!note) {
        return { path: notePath, exists: false };
      }

      return {
        path: notePath,
        exists: true,
        title: note.title,
        content: note.content,
        html: input.html ? renderMarkdown(note.content) : undefined,
        secret: note.secret,
        size: note.size,
        updatedAt: note.updatedAt,
      };
    }),
  );

  res.json({ notes });
});

router.post('/', async (req, res) => {
  assertWriteAccess(req);
  const input = createSchema.parse(req.body);
  const notePath = normalizeNotePath(input.path);
  const note = await createNote(
    notePath,
    input.content,
    input.secret ?? false,
  );

  res.status(201).json({
    ...note,
    html: renderMarkdown(note.content),
  });
});

router.use(async (req, res, next) => {
  try {
    const rawPath = req.path;

    if (rawPath === '/' || rawPath === '') {
      throw new HttpError(404, 'Путь заметки не указан');
    }

    const notePath = parseApiRequestPath(rawPath);
    const allowSecret = isAuthorized(req);

    if (req.method === 'GET' || req.method === 'HEAD') {
      const note = await readNote(notePath, { allowSecret });

      if (!note) {
        throw new HttpError(404, 'Заметка не найдена');
      }

      res.json({
        ...note,
        html: renderMarkdown(note.content),
      });
      return;
    }

    if (
      req.method !== 'PUT' &&
      req.method !== 'PATCH' &&
      req.method !== 'DELETE'
    ) {
      throw new HttpError(405, 'Метод не поддерживается');
    }

    assertWriteAccess(req);

    if (req.method === 'DELETE') {
      const deleted = await deleteNote(notePath);

      if (!deleted) {
        throw new HttpError(404, 'Заметка не найдена');
      }

      res.status(204).end();
      return;
    }

    if (req.method === 'PUT') {
      const input = updateSchema.parse(req.body);
      const existed = await noteExists(notePath);
      const note = await upsertNote(notePath, input.content, input.secret);

      res.status(existed ? 200 : 201).json({
        ...note,
        html: renderMarkdown(note.content),
      });
      return;
    }

    const input = patchSchema.parse(req.body);
    let activePath = notePath;

    if (input.path !== undefined) {
      const newPath = normalizeNotePath(input.path);
      const result = await renameNote(activePath, newPath);

      if (result === 'conflict') {
        throw new HttpError(
          409,
          'Заметка с таким путём уже существует',
        );
      }

      if (result === 'missing') {
        throw new HttpError(404, 'Заметка не найдена');
      }

      activePath = newPath;
    }

    if (input.secret !== undefined) {
      const result = await setNoteSecret(activePath, input.secret);

      if (result === 'missing') {
        throw new HttpError(404, 'Заметка не найдена');
      }
    }

    const note = await readNote(activePath, { allowSecret: true });

    if (!note) {
      throw new HttpError(404, 'Заметка не найдена');
    }

    res.json({
      ...note,
      html: renderMarkdown(note.content),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
