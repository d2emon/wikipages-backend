import MarkdownIt from 'markdown-it';
import sanitizeHtml from 'sanitize-html';
import { ALLOWED_ATTRIBUTES, ALLOWED_SCHEME_BY_TAG, ALLOWED_SCHEMES, ALLOWED_TAGS } from './config';

const markdownIt = new MarkdownIt({
  html: true,
  linkify: true,
  breaks: false,
});

export function renderMarkdown(markdown: string): string {
  const raw = markdownIt.render(markdown);

  return sanitizeHtml(raw, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,
    allowedSchemes: ALLOWED_SCHEMES,
    allowedSchemesByTag: ALLOWED_SCHEME_BY_TAG,
    allowProtocolRelative: false,
    transformTags: {
      a: (tagName, attribs) => {
        const href = attribs.href ?? '';
        const isExternal = /^https?:\/\//i.test(href);

        return {
          tagName,
          attribs: isExternal
            ? { ...attribs, target: '_blank', rel: 'noopener noreferrer' }
            : attribs,
        };
      },
    },
  });
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function extractTitle(markdown: string, fallback: string): string {
  const match = markdown.match(/^\s*#\s+(.+)$/m);
  if (!match) {
    return fallback;
  }

  const title = match[1].replace(/[*_`~]/g, '').trim();
  return title.slice(0, 120) || fallback;
}
