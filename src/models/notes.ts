import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { WIKI_DATA_DIR, WIKI_MAX_NOTE_BYTES } from '../config';
import { HttpError } from '../errors';

const ROOT = path.resolve(WIKI_DATA_DIR);
const MAX_PATH_CHARS = 700;
const MAX_SEGMENT_CHARS = 200;
const collator = new Intl.Collator('ru', { numeric: true, sensitivity: 'base' });

export type NoteFormat = 'md' | 'html';

export type NoteMeta = {
  path: string;
  title: string;
  size: number;
  updatedAt: string;
  secret: boolean;
};

export type Note = NoteMeta & { content: string };

function decodeSegment(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    throw new HttpError(400, 'Incorrect path encoding');
  }
}

export function validateSegment(raw: string): string {
  const segment = raw.normalize('NFC');

  if (!segment) {
    throw new HttpError(400, 'Empty path segment');
  }

  if (segment === '.' || segment === '..') {
    throw new HttpError(400, 'Invalid path segment');
  }

  if (segment.startsWith('.')) {
    throw new HttpError(400, 'Path segment cannot start with "."');
  }

  if (segment !== segment.trim()) {
    throw new HttpError(400, 'Path segment cannot end with " "',
    );
  }

  if (/[\u0000-\u001f\u007f\\/]/.test(segment)) {
    throw new HttpError(400, 'Invalid characters in path');
  }

  if ([...segment].length > MAX_SEGMENT_CHARS) {
    throw new HttpError(400, 'Path segment is too long');
  }

  return segment;
}

export function normalizeNotePath(raw: string): string {
  const trimmed = raw.replace(/^\/+/, '');

  if (!trimmed) {
    throw new HttpError(400, 'Note path is empty');
  }

  if ([...trimmed].length > MAX_PATH_CHARS) {
    throw new HttpError(400, 'Note path is too long');
  }

  return trimmed.split('/').map(validateSegment).join('/');
}

export function parseWikiRequestPath(rawPath: string): {
  path: string;
  format: NoteFormat | null;
} {
  const trimmed = rawPath.replace(/^\/+/, '');

  if (!trimmed) {
    return { path: '', format: null };
  }

  const segments = trimmed.split('/').map(decodeSegment);
  const lastIndex = segments.length - 1;
  let format: NoteFormat | null = null;

  if (segments[lastIndex].endsWith('.md')) {
    format = 'md';
    segments[lastIndex] = segments[lastIndex].slice(0, -3);
  } else if (segments[lastIndex].endsWith('.html')) {
    format = 'html';
    segments[lastIndex] = segments[lastIndex].slice(0, -5);
  }

  return {
    path: segments.map(validateSegment).join('/'),
    format,
  };
}

export function parseApiRequestPath(rawPath: string): string {
  const trimmed = rawPath.replace(/^\/+/, '');

  if (!trimmed) {
    return '';
  }

  return trimmed
    .split('/')
    .map((segment) => validateSegment(decodeSegment(segment)))
    .join('/');
}

function normalizePrefix(raw: string): string {
  const trimmed = raw.replace(/^\/+/, '').replace(/\/+$/, '');

  if (!trimmed) {
    return '';
  }

  return trimmed.split('/').map(validateSegment).join('/');
}

function resolveFile(notePath: string): string {
  const file = `${path.resolve(ROOT, ...notePath.split('/'))}.md`;

  if (!file.startsWith(ROOT + path.sep)) {
    throw new HttpError(400, 'Incorrect note path');
  }

  return file;
}

function sidecarFile(file: string): string {
  return `${file}.meta.json`;
}

function titleFromPath(notePath: string): string {
  return notePath.split('/').pop() ?? notePath;
}

function assertContentSize(content: string): void {
  if (Buffer.byteLength(content, 'utf8') > WIKI_MAX_NOTE_BYTES) {
    throw new HttpError(
      413,
      `Note is bigger than ${Math.floor(WIKI_MAX_NOTE_BYTES / 1024)} KB`,
    );
  }
}

async function fileExists(file: string): Promise<boolean> {
  try {
    const stat = await fs.stat(file);
    return stat.isFile();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return false;
    }

    throw error;
  }
}

async function readSecret(file: string): Promise<boolean> {
  try {
    const raw = await fs.readFile(sidecarFile(file), 'utf8');
    const parsed = JSON.parse(raw) as { secret?: unknown };
    return parsed.secret !== false;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return false;
    }

    console.warn('Note meta read error:', error);
    return true;
  }
}

async function writeSecret(file: string, secret: boolean): Promise<void> {
  const sidecar = sidecarFile(file);

  if (!secret) {
    await fs.rm(sidecar, { force: true });
    return;
  }

  await fs.mkdir(path.dirname(sidecar), { recursive: true });
  await atomicWrite(sidecar, JSON.stringify({ secret: true }));
}

async function atomicWrite(file: string, content: string): Promise<void> {
  const dir = path.dirname(file);
  await fs.mkdir(dir, { recursive: true });

  const temp = path.join(
    dir,
    `.tmp-${process.pid}-${crypto.randomUUID()}`,
  );

  try {
    await fs.writeFile(temp, content, { encoding: 'utf8', mode: 0o600 });
    await fs.rename(temp, file);
  } catch (error) {
    await fs.rm(temp, { force: true });
    throw error;
  }
}

async function pruneEmptyDirs(dir: string): Promise<void> {
  let current = dir;

  while (current.startsWith(ROOT + path.sep)) {
    try {
      await fs.rmdir(current);
    } catch {
      return;
    }

    current = path.dirname(current);
  }
}

async function buildMeta(
  notePath: string,
  file: string,
  secret: boolean,
): Promise<NoteMeta> {
  const stat = await fs.stat(file);

  return {
    path: notePath,
    title: titleFromPath(notePath),
    size: stat.size,
    updatedAt: stat.mtime.toISOString(),
    secret,
  };
}

export async function noteExists(notePath: string): Promise<boolean> {
  return fileExists(resolveFile(notePath));
}

export async function readNote(
  notePath: string,
  options: { allowSecret: boolean },
): Promise<Note | null> {
  const file = resolveFile(notePath);

  if (!(await fileExists(file))) {
    return null;
  }

  const secret = await readSecret(file);

  if (secret && !options.allowSecret) {
    return null;
  }

  const content = await fs.readFile(file, 'utf8');
  const meta = await buildMeta(notePath, file, secret);

  return { ...meta, content };
}

export async function createNote(
  notePath: string,
  content: string,
  secret: boolean,
): Promise<Note> {
  assertContentSize(content);
  const file = resolveFile(notePath);
  await fs.mkdir(path.dirname(file), { recursive: true });

  try {
    await fs.writeFile(file, content, {
      encoding: 'utf8',
      mode: 0o600,
      flag: 'wx',
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
      throw new HttpError(409, 'Note exists');
    }

    throw error;
  }

  try {
    await writeSecret(file, secret);
  } catch (error) {
    await fs.rm(file, { force: true });
    throw error;
  }

  const meta = await buildMeta(notePath, file, secret);
  return { ...meta, content };
}

export async function upsertNote(
  notePath: string,
  content: string,
  secret?: boolean,
): Promise<Note> {
  assertContentSize(content);
  const file = resolveFile(notePath);
  const nextSecret = secret ?? (await readSecret(file));

  await atomicWrite(file, content);
  await writeSecret(file, nextSecret);

  const meta = await buildMeta(notePath, file, nextSecret);
  return { ...meta, content };
}

export async function setNoteSecret(
  notePath: string,
  secret: boolean,
): Promise<'ok' | 'missing'> {
  const file = resolveFile(notePath);

  if (!(await fileExists(file))) {
    return 'missing';
  }

  await writeSecret(file, secret);
  return 'ok';
}

export async function renameNote(
  oldPath: string,
  newPath: string,
): Promise<'ok' | 'missing' | 'conflict'> {
  if (oldPath === newPath) {
    return 'ok';
  }

  const oldFile = resolveFile(oldPath);
  const newFile = resolveFile(newPath);

  if (!(await fileExists(oldFile))) {
    return 'missing';
  }

  if (await fileExists(newFile)) {
    return 'conflict';
  }

  const secret = await readSecret(oldFile);
  await fs.mkdir(path.dirname(newFile), { recursive: true });

  await writeSecret(newFile, secret);

  try {
    await fs.rename(oldFile, newFile);
  } catch (error) {
    await fs.rm(sidecarFile(newFile), { force: true });
    throw error;
  }

  await fs.rm(sidecarFile(oldFile), { force: true });
  await pruneEmptyDirs(path.dirname(oldFile));

  return 'ok';
}

export async function deleteNote(notePath: string): Promise<boolean> {
  const file = resolveFile(notePath);

  try {
    await fs.unlink(file);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return false;
    }

    throw error;
  }

  await fs.rm(sidecarFile(file), { force: true });
  await pruneEmptyDirs(path.dirname(file));

  return true;
}

export async function listNotes(options: {
  allowSecret: boolean;
  prefix?: string;
  limit?: number;
}): Promise<NoteMeta[]> {
  const prefix = normalizePrefix(options.prefix ?? '');
  const notes: NoteMeta[] = [];

  async function walk(dir: string): Promise<void> {
    let entries;

    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return;
      }

      throw error;
    }

    for (const entry of entries) {
      if (entry.name.startsWith('.')) {
        continue;
      }

      const full = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        await walk(full);
        continue;
      }

      if (!entry.isFile() || !entry.name.endsWith('.md')) {
        continue;
      }

      const relative = path.relative(ROOT, full).split(path.sep).join('/');
      const notePath = relative.slice(0, -3);

      if (
        prefix &&
        notePath !== prefix &&
        !notePath.startsWith(`${prefix}/`)
      ) {
        continue;
      }

      const secret = await readSecret(full);
      if (secret && !options.allowSecret) {
        continue;
      }

      const meta = await buildMeta(notePath, full, secret);
      notes.push(meta);
    }
  }

  await walk(ROOT);
  notes.sort((a, b) => collator.compare(a.path, b.path));

  return options.limit ? notes.slice(0, options.limit) : notes;
}

export async function hasAnyNotes(): Promise<boolean> {
  const notes = await listNotes({ allowSecret: true, limit: 1 });
  return notes.length > 0;
}
