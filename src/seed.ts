import fs from 'node:fs/promises';
import path from 'node:path';
import { WIKI_DATA_DIR } from './config';
import { hasAnyNotes } from './models/notes';
import messages from './messages';

const SEED_DIR = path.resolve(__dirname, '../seed');

async function copyTree(source: string, target: string): Promise<void> {
  const entries = await fs.readdir(source, { withFileTypes: true });

  for (const entry of entries) {
    const from = path.join(source, entry.name);
    const to = path.join(target, entry.name);

    if (entry.isDirectory()) {
      await fs.mkdir(to, { recursive: true });
      await copyTree(from, to);
      continue;
    }

    if (entry.isFile()) {
      await fs.mkdir(target, { recursive: true });
      await fs.copyFile(from, to);
    }
  }
}

async function main(): Promise<void> {
  if (await hasAnyNotes()) {
    console.log(messages.WIKI_IS_NOT_EMPTY);
    return;
  }

  try {
    await fs.access(SEED_DIR);
  } catch {
    console.log(messages.SEED_NOT_FOUND);
    return;
  }

  await copyTree(SEED_DIR, WIKI_DATA_DIR);
  console.log(messages.SEED_OK);
}

main().catch((error: unknown) => {
  console.error(messages.SEED_ERROR, error);
  process.exitCode = 1;
});
