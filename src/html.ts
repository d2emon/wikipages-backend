import {
  escapeHtml,
} from './models/markdown';
import type { NoteMeta } from './models/notes';

function encodePath(notePath: string): string {
  return notePath.split('/').map(encodeURIComponent).join('/');
}
  
export const PAGE_STYLES = `
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0 auto;
    max-width: 860px;
    padding: 40px 22px 80px;
    background: #14110e;
    color: #ece2d0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
    font-size: 16px;
    line-height: 1.7;
  }
  a { color: #c8a24a; }
  header { margin-bottom: 28px; font-size: 0.85rem; }
  header a { text-decoration: none; }
  h1, h2, h3, h4 { font-family: "Iowan Old Style", Palatino, Georgia, serif; font-weight: 600; line-height: 1.25; }
  h1 { font-size: 2rem; }
  h2 { margin-top: 1.6em; border-bottom: 1px solid #3b3127; padding-bottom: 0.25em; }
  code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 0.88em; background: rgba(255,255,255,0.06); border: 1px solid #3b3127; border-radius: 5px; padding: 1px 5px; }
  pre { overflow: auto; padding: 14px; background: #1a1612; border: 1px solid #3b3127; border-radius: 10px; }
  pre code { padding: 0; border: 0; background: none; }
  blockquote { margin-left: 0; padding-left: 16px; border-left: 3px solid #4d4032; color: #c9bda8; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #3b3127; padding: 7px 10px; text-align: left; }
  img { max-width: 100%; height: auto; border-radius: 8px; }
  .badge { display: inline-block; margin-left: 8px; padding: 1px 8px; border: 1px solid #c96a5a; border-radius: 999px; color: #c96a5a; font-size: 0.72rem; }
  .notes { padding-left: 1.2em; }
  .notes li { margin: 0.35em 0; }
  .muted { color: #9a8b75; }
  input[type="checkbox"] { accent-color: #c8a24a; }
`;

export function renderHtmlDocument(
    title: string,
    bodyHtml: string,
    options: { secret?: boolean } = {},
  ): string {
    const badge = options.secret
      ? '<span class="badge">скрытая заметка</span>'
      : '';
  
    return `<!doctype html>
  <html lang="ru">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src http: https:; base-uri 'none'; form-action 'none'" />
    <title>${escapeHtml(title)}</title>
    <style>${PAGE_STYLES}</style>
  </head>
  <body>
    <header><a href="/wiki">← To all notes</a>${badge}</header>
    <main class="markdown-body">
  ${bodyHtml}
    </main>
  </body>
  </html>`;
}
  
function renderItems(notes: NoteMeta[]): string {
  return notes
    .map((note) => {
      const href = `/wiki/${encodePath(note.path)}.html`;
      const badge = note.secret
        ? '<span class="badge">скрытая</span>'
        : '';
      const title = note.path
        .split('/')
        .map((segment) => escapeHtml(segment))
        .join(' / ');
    
      return `<li><a href="${href}">${title}</a>${badge}</li>`;
    })
    .join('\n');
}
  
export function renderIndexPage(notes: NoteMeta[]): string {
  const items = renderItems(notes);
  return `<!doctype html>
  <html lang="ru">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'" />
    <title>Wiki</title>
    <style>
      :root { color-scheme: dark; }
      * { box-sizing: border-box; }
      body { max-width: 860px; margin: 0 auto; padding: 40px 22px 80px; background: #14110e; color: #ece2d0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; line-height: 1.7; }
      a { color: #c8a24a; }
      h1 { font-family: "Iowan Old Style", Palatino, Georgia, serif; font-weight: 600; }
      .muted { color: #9a8b75; }
      .badge { display: inline-block; margin-left: 8px; padding: 1px 8px; border: 1px solid #c96a5a; border-radius: 999px; color: #c96a5a; font-size: 0.72rem; }
      .notes { padding-left: 1.2em; }
      .notes li { margin: 0.35em 0; }
    </style>
  </head>
  <body>
    <h1>Wiki</h1>
    <p class="muted">Markdown-notes. Formats: <code>.md</code> — source, <code>.html</code> — page.</p>
    <p class="muted">total: ${notes.length}</p>
    <ul class="notes">
  ${items || '<li class="muted">Empty. Add note via API.</li>'}
    </ul>
  </body>
  </html>`;
}
  