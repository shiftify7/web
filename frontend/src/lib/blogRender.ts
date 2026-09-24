/** Shared Markdown → HTML used by public blog listing, article, and CRM preview. */
export function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function tocFromMarkdown(src = '') {
  return src.split('\n')
    .filter((l) => /^## /.test(l))
    .map((l) => {
      const title = l.replace(/^##\s+/, '').trim();
      return { id: slugify(title), title };
    });
}

export function renderMarkdown(src = '') {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const lines = src.replace(/\r\n/g, '\n').split('\n');
  let html = '';
  let list: '' | 'ul' | 'ol' = '';
  const flush = () => {
    if (list) {
      html += list === 'ol' ? '</ol>' : '</ul>';
      list = '';
    }
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flush();
      continue;
    }
    if (/^---+$/.test(line.trim())) {
      flush();
      html += '<hr/>';
      continue;
    }
    if (/^### /.test(line)) {
      flush();
      html += `<h3>${inline(line.slice(4))}</h3>`;
      continue;
    }
    if (/^## /.test(line)) {
      flush();
      html += `<h2 id="${slugify(line.slice(3))}">${inline(line.slice(3))}</h2>`;
      continue;
    }
    if (/^# /.test(line)) {
      flush();
      html += `<h2>${inline(line.slice(2))}</h2>`;
      continue;
    }
    if (/^> /.test(line)) {
      flush();
      html += `<blockquote>${inline(line.slice(2))}</blockquote>`;
      continue;
    }
    if (/^[-*] /.test(line)) {
      if (list !== 'ul') {
        flush();
        html += '<ul>';
        list = 'ul';
      }
      html += `<li>${inline(line.slice(2))}</li>`;
      continue;
    }
    if (/^\d+\. /.test(line)) {
      if (list !== 'ol') {
        flush();
        html += '<ol>';
        list = 'ol';
      }
      html += `<li>${inline(line.replace(/^\d+\.\s/, ''))}</li>`;
      continue;
    }
    flush();
    html += `<p>${inline(line)}</p>`;
  }
  flush();
  return html;

  function inline(s: string) {
    return esc(s)
      .replace(/!\[([^\]]*)\]\((https?:\/\/[^)]+)\)/g, '<img src="$2" alt="$1" />')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" rel="noopener">$1</a>');
  }
}

export function sanitizePreviewHtml(html = '') {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/on\w+=("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript:/gi, '');
}

export function articleHtml(post: { content?: string; contentMode?: string }) {
  if (post.contentMode === 'html') return sanitizePreviewHtml(post.content || '');
  return renderMarkdown(post.content || '');
}
