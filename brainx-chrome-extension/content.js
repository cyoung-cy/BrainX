// content.js - 현재 페이지 정보 추출 (Markdown 변환)
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.type !== 'GET_PAGE_INFO') return true;

  try {
    const metaDescription =
      document.querySelector('meta[name="description"]')?.content ||
      document.querySelector('meta[property="og:description"]')?.content ||
      '';

    // 선택 영역이 있으면 HTML → Markdown 변환, 없으면 페이지 전체 추출
    let selectedText = '';
    let bodyText = '';

    const selection = window.getSelection();
    const hasSelection = selection && selection.rangeCount > 0 && selection.toString().trim().length > 0;

    if (hasSelection) {
      try {
        const range = selection.getRangeAt(0);
        const fragment = range.cloneContents();
        const wrapper = document.createElement('div');
        wrapper.appendChild(fragment);
        selectedText = nodeToMarkdown(wrapper).replace(/\n{3,}/g, '\n\n').trim();
      } catch {
        selectedText = selection.toString().trim();
      }
    } else {
      try {
        bodyText = extractAsMarkdown();
      } catch {
        bodyText = '';
      }
    }

    sendResponse({
      url: window.location.href,
      title: document.title || window.location.href,
      selectedText,
      metaDescription: bodyText || metaDescription,
    });
  } catch {
    sendResponse({
      url: window.location.href,
      title: document.title || window.location.href,
      selectedText: '',
      metaDescription: '',
    });
  }
  return true;
});

// ─── 메인 콘텐츠 Markdown 추출 ───
function extractAsMarkdown() {
  // 콘텐츠 영역 탐색
  const selectors = [
    'article', 'main', '[role="main"]',
    '.post-content', '.article-content', '.entry-content',
    '.content', '#content', '#main-content',
  ];

  let target = null;
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el && (el.innerText || '').trim().length > 200) {
      target = el;
      break;
    }
  }

  // fallback: body에서 불필요 영역 제거
  if (!target) {
    const clone = document.body.cloneNode(true);
    ['nav', 'header', 'footer', 'aside', 'script', 'style', 'noscript', 'iframe', 'button'].forEach(tag => {
      clone.querySelectorAll(tag).forEach(n => n.remove());
    });
    target = clone;
  }

  return nodeToMarkdown(target).replace(/\n{3,}/g, '\n\n').trim().slice(0, 10000);
}

// ─── 노드 → Markdown 재귀 변환 ───
function nodeToMarkdown(node) {
  if (!node) return '';

  // 텍스트 노드
  if (node.nodeType === 3) {
    return node.textContent.replace(/\n+/g, ' ');
  }
  // 엘리먼트 노드만 처리
  if (node.nodeType !== 1) return '';

  const tag = node.tagName.toLowerCase();

  // 무시할 태그
  const IGNORE = new Set(['script', 'style', 'noscript', 'iframe', 'nav', 'header', 'footer', 'aside', 'button', 'input', 'select', 'textarea', 'svg', 'canvas']);
  if (IGNORE.has(tag)) return '';

  // 숨겨진 요소
  const style = node.getAttribute('style') || '';
  if (style.includes('display:none') || style.includes('display: none') || style.includes('visibility:hidden')) return '';

  const inner = () => Array.from(node.childNodes).map(nodeToMarkdown).join('');

  switch (tag) {
    case 'h1': return `\n\n# ${inner().trim()}\n\n`;
    case 'h2': return `\n\n## ${inner().trim()}\n\n`;
    case 'h3': return `\n\n### ${inner().trim()}\n\n`;
    case 'h4': return `\n\n#### ${inner().trim()}\n\n`;
    case 'h5': return `\n\n##### ${inner().trim()}\n\n`;
    case 'h6': return `\n\n###### ${inner().trim()}\n\n`;

    case 'p':  return `\n\n${inner().trim()}\n\n`;
    case 'br': return '\n';
    case 'hr': return '\n\n---\n\n';

    case 'strong':
    case 'b': {
      const t = inner().trim();
      return t ? `**${t}**` : '';
    }
    case 'em':
    case 'i': {
      const t = inner().trim();
      return t ? `*${t}*` : '';
    }
    case 's':
    case 'del': {
      const t = inner().trim();
      return t ? `~~${t}~~` : '';
    }

    case 'code': {
      if (node.parentElement?.tagName.toLowerCase() === 'pre') return node.textContent;
      return `\`${node.textContent}\``;
    }
    case 'pre': {
      const langClass = node.querySelector('code')?.className || '';
      const lang = (langClass.match(/language-(\w+)/) || [])[1] || '';
      return `\n\n\`\`\`${lang}\n${node.textContent.trim()}\n\`\`\`\n\n`;
    }

    case 'blockquote':
      return '\n\n' + inner().trim().split('\n').map(l => `> ${l}`).join('\n') + '\n\n';

    case 'ul': {
      const items = Array.from(node.children)
        .filter(c => c.tagName.toLowerCase() === 'li')
        .map(li => `- ${nodeToMarkdown(li).trim()}`)
        .join('\n');
      return items ? `\n\n${items}\n\n` : '';
    }
    case 'ol': {
      const items = Array.from(node.children)
        .filter(c => c.tagName.toLowerCase() === 'li')
        .map((li, i) => `${i + 1}. ${nodeToMarkdown(li).trim()}`)
        .join('\n');
      return items ? `\n\n${items}\n\n` : '';
    }
    case 'li': return inner().trim();

    case 'a': {
      const href = node.getAttribute('href') || '';
      const text = inner().trim();
      if (!href || href.startsWith('javascript') || !text) return text;
      try {
        const abs = href.startsWith('http') || href.startsWith('//')
          ? new URL(href, location.href).href
          : href.startsWith('#') ? href : new URL(href, location.href).href;
        return `[${text}](${abs})`;
      } catch {
        return text;
      }
    }

    case 'img': {
      const src = node.getAttribute('src') || '';
      if (!src || src.startsWith('data:')) return node.getAttribute('alt') || '';
      const alt = node.getAttribute('alt') || '';
      try {
        const abs = new URL(src, location.href).href;
        return `![${alt}](${abs})`;
      } catch {
        return alt;
      }
    }

    case 'table': {
      try { return convertTable(node); } catch { return inner(); }
    }

    default:
      return inner();
  }
}

function convertTable(table) {
  const rows = Array.from(table.querySelectorAll('tr'));
  if (!rows.length) return '';
  const toRow = tr =>
    '| ' + Array.from(tr.querySelectorAll('th,td'))
      .map(c => c.innerText.trim().replace(/\|/g, '\\|'))
      .join(' | ') + ' |';
  const colCount = rows[0].querySelectorAll('th,td').length;
  if (!colCount) return '';
  const header = toRow(rows[0]);
  const sep = '| ' + Array(colCount).fill('---').join(' | ') + ' |';
  const body = rows.slice(1).map(toRow).join('\n');
  return `\n\n${header}\n${sep}\n${body}\n\n`;
}
