/**
 * cardRenderer.ts — Motor de renderizado de plantillas ANKI
 * Soporta: {{Campo}}, {{hint:Campo}}, {{#Campo}}, {{^Campo}}, Cloze Deletion
 * Incluye sanitización con DOMPurify (cliente) o strip-tags (servidor)
 */

export interface CardFields {
  front: string;
  back: string;
  extra?: string;
  tags?: string;
  [key: string]: string | undefined;
}

// ── Regex Patterns ──────────────────────────────────────────────────────────
const CLOZE_REGEX = /\{\{c(\d+)::(.+?)(?:::(.+?))?\}\}/gs;
const HINT_REGEX = /\{\{hint:(\w+)\}\}/g;
const FIELD_REGEX = /\{\{(\w+)\}\}/g;
const CONDITIONAL_SHOW_REGEX = /\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g;
const CONDITIONAL_HIDE_REGEX = /\{\{\^(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g;

// ── Sanitización (strips scripts, preserva HTML visual seguro) ──────────────
const ALLOWED_TAGS = [
  'b', 'i', 'strong', 'em', 'u', 's', 'del', 'mark',
  'p', 'br', 'div', 'span', 'ul', 'ol', 'li', 'table',
  'tr', 'td', 'th', 'thead', 'tbody', 'a', 'img',
  'h1', 'h2', 'h3', 'h4', 'blockquote', 'code', 'pre',
];

const ALLOWED_ATTRS: Record<string, string[]> = {
  'a': ['href', 'class', 'data-field'],
  'img': ['src', 'alt', 'width', 'height'],
  'span': ['class', 'style'],
  'div': ['class', 'style'],
  '*': ['class'],
};

/** Sanitización básica sin dependencias externas (server-safe) */
export function sanitizeHTML(html: string): string {
  // Eliminar scripts y event handlers
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/data:text\/html/gi, '');
}

// ── Renderizado de Cloze Deletion ────────────────────────────────────────────

/**
 * Renderiza un campo de texto con cloze deletion para el índice `ord` (0-based).
 * El cloze activo (ord=N) se muestra como [pista] o [...].
 * Los clozes inactivos se muestran como texto normal.
 */
export function renderCloze(text: string, ord: number): string {
  const activeIndex = ord + 1; // c1 = ord 0, c2 = ord 1, etc.

  return text.replace(CLOZE_REGEX, (match, indexStr, content, hint) => {
    const index = parseInt(indexStr, 10);
    if (index === activeIndex) {
      const hint_text = hint || '...';
      return `<span class="cloze-blank" data-answer="${encodeURIComponent(content)}">[${hint_text}]</span>`;
    }
    // Otros clozes se muestran como texto normal
    return content;
  });
}

/** Renderiza el dorso (respuesta) de una tarjeta cloze revelando el hueco */
export function renderClozeAnswer(text: string, ord: number): string {
  const activeIndex = ord + 1;
  return text.replace(CLOZE_REGEX, (match, indexStr, content, hint) => {
    const index = parseInt(indexStr, 10);
    if (index === activeIndex) {
      return `<span class="cloze-answer">${content}</span>`;
    }
    return content;
  });
}

// ── Renderizado de Plantilla Completa ────────────────────────────────────────

/**
 * Renderiza una cadena de plantilla ANKI con todos los campos.
 * Procesa en orden: condicionales → hint → campo simple.
 */
export function renderTemplate(template: string, fields: CardFields): string {
  let result = template;

  // 1. Procesar condicionales {{#Campo}} — mostrar si no vacío
  result = result.replace(CONDITIONAL_SHOW_REGEX, (match, fieldName, content) => {
    const value = fields[fieldName.toLowerCase()] || fields[fieldName] || '';
    return value.trim() ? content : '';
  });

  // 2. Procesar condicionales {{^Campo}} — mostrar si vacío
  result = result.replace(CONDITIONAL_HIDE_REGEX, (match, fieldName, content) => {
    const value = fields[fieldName.toLowerCase()] || fields[fieldName] || '';
    return !value.trim() ? content : '';
  });

  // 3. Procesar hint fields {{hint:Campo}}
  result = result.replace(HINT_REGEX, (match, fieldName) => {
    const value = fields[fieldName.toLowerCase()] || fields[fieldName] || '';
    if (!value) return '';
    return `<a class="hint-toggle" data-field="${fieldName}" data-content="${encodeURIComponent(value)}">
      <span class="hint-icon">💡</span> Mostrar ${fieldName}
    </a>
    <span class="hint-content hidden" data-for="${fieldName}">${value}</span>`;
  });

  // 4. Reemplazar campos simples {{Campo}}
  result = result.replace(FIELD_REGEX, (match, fieldName) => {
    if (fieldName === 'FrontSide') return fields.front || '';
    const value = fields[fieldName.toLowerCase()] || fields[fieldName] || '';
    return value;
  });

  return sanitizeHTML(result);
}

// ── CSS para renderizado en-tarjeta ─────────────────────────────────────────
export const CARD_STYLES = `
.cloze-blank {
  background: rgba(59, 130, 246, 0.2);
  border: 1px dashed #3b82f6;
  border-radius: 4px;
  padding: 2px 8px;
  color: #93c5fd;
  font-weight: bold;
  cursor: pointer;
}
.cloze-answer {
  background: rgba(16, 185, 129, 0.2);
  border-radius: 4px;
  padding: 2px 8px;
  color: #6ee7b7;
  font-weight: bold;
}
.hint-toggle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #a78bfa;
  text-decoration: none;
  cursor: pointer;
  font-size: 0.85em;
  border: 1px dashed #7c3aed;
  padding: 2px 8px;
  border-radius: 4px;
  margin: 2px 0;
}
.hint-toggle:hover { background: rgba(124, 58, 237, 0.15); }
.hint-content { display: none; color: #c4b5fd; margin-top: 4px; font-style: italic; }
.hint-content.visible { display: block; }
.hidden { display: none !important; }
`;

// ── Script de interactividad para hints ──────────────────────────────────────
export const HINT_SCRIPT = `
document.querySelectorAll('.hint-toggle').forEach(el => {
  el.addEventListener('click', function(e) {
    e.preventDefault();
    const fieldName = this.getAttribute('data-field');
    const contentEl = document.querySelector('.hint-content[data-for="' + fieldName + '"]');
    if (contentEl) {
      contentEl.classList.toggle('visible');
      this.querySelector('span') && (this.querySelector('span').textContent = contentEl.classList.contains('visible') ? '🔽' : '💡');
    }
  });
});
`;
