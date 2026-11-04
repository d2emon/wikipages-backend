export const ALLOWED_TAGS = [
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'p',
  'br',
  'hr',
  'blockquote',
  'ul',
  'ol',
  'li',
  'strong',
  'em',
  'del',
  's',
  'code',
  'pre',
  'a',
  'img',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  'input',
];

export const ALLOWED_ATTRIBUTES = {
  a: ['href', 'title', 'rel', 'target'],
  img: ['src', 'alt', 'title', 'width', 'height'],
  input: ['type', 'checked', 'disabled'],
  code: ['class'],
  pre: ['class'],
  th: ['align'],
  td: ['align'],
};
export const ALLOWED_SCHEMES = ['http', 'https', 'mailto'];
export const ALLOWED_SCHEME_BY_TAG = { img: ['http', 'https'] };

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
