// src/hooks/useSearch.ts
// Hook för sökning med overlay och boolesk logik (AND/OR/NOT, parenteser, wildcard *)

import { useState, useCallback, useMemo } from 'react';
import type { MindNode } from '../types/types';

interface UseSearchOptions {
  nodes: Map<string, MindNode>;
}

interface UseSearchResult {
  isOpen: boolean;
  query: string;
  results: MindNode[];
  resultIds: Set<string>;
  openSearch: () => void;
  closeSearch: () => void;
  setQuery: (query: string) => void;
  confirmSearch: () => string[]; // Returnerar matchande node IDs
}

// Export type alias för användning i andra filer
export type SearchAPI = UseSearchResult;

type Token =
  | { type: 'TERM'; value: string }
  | { type: 'AND' }
  | { type: 'OR' }
  | { type: 'NOT' }
  | { type: 'LPAREN' }
  | { type: 'RPAREN' };

// Tokenisera query till booleska tokens
const tokenize = (raw: string): Token[] => {
  const tokens: Token[] = [];
  const pattern = /\(|\)|\bAND\b|\bOR\b|\bNOT\b|[^()\s]+/gi;
  let match;
  while ((match = pattern.exec(raw)) !== null) {
    const value = match[0];
    const upper = value.toUpperCase();
    if (upper === 'AND' || upper === 'OR' || upper === 'NOT') {
      tokens.push({ type: upper } as Token);
    } else if (value === '(') {
      tokens.push({ type: 'LPAREN' });
    } else if (value === ')') {
      tokens.push({ type: 'RPAREN' });
    } else {
      tokens.push({ type: 'TERM', value });
    }
  }
  return tokens;
};

// Infoga implicit AND mellan termer/paranteser
const insertImplicitAnds = (tokens: Token[]): Token[] => {
  const result: Token[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const current = tokens[i];
    result.push(current);
    if (i === tokens.length - 1) continue;
    const next = tokens[i + 1];
    // Insert AND between: (TERM|RPAREN) and (TERM|LPAREN|NOT) to support "apple NOT banana"
    const currentIsTermOrClose = current.type === 'TERM' || current.type === 'RPAREN';
    const nextIsTermOrOpen = next.type === 'TERM' || next.type === 'LPAREN' || next.type === 'NOT';
    if (currentIsTermOrClose && nextIsTermOrOpen) {
      result.push({ type: 'AND' });
    }
  }
  return result;
};

// Shunting-yard till postfix
const toPostfix = (tokens: Token[]): Token[] => {
  const output: Token[] = [];
  const stack: Token[] = [];
  const precedence: Record<string, number> = { OR: 1, AND: 2, NOT: 3 };

  const tokensWithAnd = insertImplicitAnds(tokens);

  for (const token of tokensWithAnd) {
    if (token.type === 'TERM') {
      output.push(token);
    } else if (token.type === 'AND' || token.type === 'OR' || token.type === 'NOT') {
      while (stack.length > 0) {
        const top = stack[stack.length - 1];
        if (
          (top.type === 'AND' || top.type === 'OR' || top.type === 'NOT') &&
          precedence[top.type] >= precedence[token.type]
        ) {
          output.push(stack.pop()!);
        } else {
          break;
        }
      }
      stack.push(token);
    } else if (token.type === 'LPAREN') {
      stack.push(token);
    } else if (token.type === 'RPAREN') {
      while (stack.length > 0 && stack[stack.length - 1].type !== 'LPAREN') {
        output.push(stack.pop()!);
      }
      stack.pop(); // kasta '('
    }
  }

  while (stack.length > 0) {
    output.push(stack.pop()!);
  }
  return output;
};

const escapeRegex = (value: string) => value.replace(/[-/\\^$+?.()|[\]{}]/g, '\\$&');

const termMatches = (term: string, text: string) => {
  const normalizedTerm = term.toLowerCase();
  const hasWildcard = normalizedTerm.includes('*');
  if (hasWildcard) {
    const pattern = '^.*' + normalizedTerm.split('*').map(escapeRegex).join('.*') + '.*$';
    return new RegExp(pattern, 'i').test(text);
  }
  return text.includes(normalizedTerm);
};

type SearchField =
  | 'title'
  | 'content'
  | 'caption'
  | 'comment'
  | 'ocr'
  | 'tags'
  | 'semantic'
  | 'created'
  | 'updated'
  | 'type'
  | 'copyref'
  | 'copied'
  | 'originalcreated'
  | 'all';

const FIELD_ALIASES: Record<string, SearchField> = {
  type: 'type',
  copyref: 'copyref',
  copy: 'copyref',
  copied: 'copied',
  copiedat: 'copied',
  originalcreated: 'originalcreated',
  originalcreatedat: 'originalcreated',
  title: 'title',
  ti: 'title',
  content: 'content',
  text: 'content',
  body: 'content',
  caption: 'caption',
  cap: 'caption',
  comment: 'comment',
  note: 'comment',
  ocr: 'ocr',
  ocrtext: 'ocr',
  tags: 'tags',
  tag: 'tags',
  semantic: 'semantic',
  sem: 'semantic',
  created: 'created',
  createdat: 'created',
  date: 'created',
  updated: 'updated',
  updatedat: 'updated',
  modified: 'updated',
};

const parseFieldTerm = (raw: string): { field?: SearchField; value: string } => {
  const idx = raw.indexOf(':');
  if (idx <= 0) return { value: raw };
  const fieldKey = raw.slice(0, idx).toLowerCase();
  const value = raw.slice(idx + 1);
  const field = FIELD_ALIASES[fieldKey];
  if (!field) return { value: raw };
  return { field, value };
};

const normalizeDateSearchText = (raw?: string): string => {
  if (!raw) return '';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return raw.toLowerCase();
  }
  const yyyy = String(date.getFullYear());
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const variants = [
    raw,
    `${yyyy}-${mm}-${dd}`,
    `${yyyy}/${mm}/${dd}`,
    `${dd}-${mm}`,
    `${mm}-${dd}`,
    `${dd}/${mm}`,
    `${mm}/${dd}`,
  ];
  return variants.join(' ').toLowerCase();
};

const evaluate = (postfix: Token[], searchable: Record<SearchField, string>): boolean => {
  const stack: boolean[] = [];
  for (const token of postfix) {
    if (token.type === 'TERM') {
      const { field, value } = parseFieldTerm(token.value);
      if (field) {
        const needle = value.trim();
        stack.push(needle.length > 0 ? termMatches(needle, searchable[field]) : false);
      } else {
        stack.push(termMatches(token.value, searchable.all));
      }
    } else if (token.type === 'NOT') {
      const a = stack.pop() ?? false;
      stack.push(!a);
    } else if (token.type === 'AND' || token.type === 'OR') {
      const b = stack.pop() ?? false;
      const a = stack.pop() ?? false;
      stack.push(token.type === 'AND' ? a && b : a || b);
    }
  }
  return stack.pop() ?? false;
};

export function useSearch({ nodes }: UseSearchOptions): UseSearchResult {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');

  // Sök i noder med boolesk logik + fältfilter (title:, content:, caption:, created:, updated:, etc.)
  const results = useMemo(() => {
    if (!query.trim()) return [];

    const tokens = tokenize(query);
    if (tokens.length === 0) return [];
    const postfix = toPostfix(tokens);

    return Array.from(nodes.values()).filter(node => {
      const searchable = {
        title: (node.title || '').toLowerCase(),
        content: (node.content || '').toLowerCase(),
        caption: (node.caption || '').toLowerCase(),
        comment: (node.comment || '').toLowerCase(),
        ocr: (node.ocrText || '').toLowerCase(),
        tags: (node.tags || []).join(' ').toLowerCase(),
        semantic: (node.semanticTags || []).join(' ').toLowerCase(),
        created: normalizeDateSearchText(node.createdAt),
        updated: normalizeDateSearchText(node.updatedAt),
        type: (node.type || '').toLowerCase(),
        copyref: (node.copyRef || '').toLowerCase(),
        copied: normalizeDateSearchText(node.copiedAt),
        originalcreated: normalizeDateSearchText(node.originalCreatedAt),
        all: '',
      } as Record<SearchField, string>;

      searchable.all = [
        searchable.title,
        searchable.content,
        searchable.caption,
        searchable.comment,
        searchable.ocr,
        searchable.tags,
        searchable.semantic,
      ]
        .filter(Boolean)
        .join(' ');

      return evaluate(postfix, searchable);
    });
  }, [nodes, query]);

  const resultIds = useMemo(
    () => new Set(results.map(n => n.id)),
    [results]
  );

  const openSearch = useCallback(() => {
    setIsOpen(true);
    setQuery('');
  }, []);

  const closeSearch = useCallback(() => {
    setIsOpen(false);
    setQuery('');
  }, []);

  const confirmSearch = useCallback(() => {
    const ids = results.map(n => n.id);
    setIsOpen(false);
    setQuery('');
    return ids;
  }, [results]);

  return {
    isOpen,
    query,
    results,
    resultIds,
    openSearch,
    closeSearch,
    setQuery,
    confirmSearch,
  };
}
