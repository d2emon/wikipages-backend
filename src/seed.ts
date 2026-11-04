import fs from 'node:fs/promises';
import path from 'node:path';
import { WIKI_DATA_DIR } from './config';
import { hasAnyNotes } from './models/notes';

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
    console.log('Wiki is not empty — data not seeded.');
    return;
  }

  try {
    await fs.access(SEED_DIR);
  } catch {
    console.log('Folder seed not found — data not seeded.');
    return;
  }

  await copyTree(SEED_DIR, WIKI_DATA_DIR);
  console.log('Data is seeded.');
}

main().catch((error: unknown) => {
  console.error('Cannot seed data:', error);
  process.exitCode = 1;
});
