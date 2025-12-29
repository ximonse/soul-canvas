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
  | 'link'
  | 'ocr'
  | 'tags'
  | 'semantic'
  | 'created'
  | 'updated'
  | 'type'
  | 'copyref'
  | 'copied'
  | 'originalcreated'
  | 'value'
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
  link: 'link',
  url: 'link',
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
  value: 'value',
  val: 'value',
  v: 'value',
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
        if (needle.length === 0) {
          // Field without value: match if field has any content (e.g., "copyref:" finds all copies)
          stack.push(searchable[field].length > 0);
        } else {
          stack.push(termMatches(needle, searchable[field]));
        }
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
        link: (node.link || '').toLowerCase(),
        ocr: (node.ocrText || '').toLowerCase(),
        tags: (node.tags || []).join(' ').toLowerCase(),
        semantic: (node.semanticTags || []).join(' ').toLowerCase(),
        created: normalizeDateSearchText(node.createdAt),
        updated: normalizeDateSearchText(node.updatedAt),
        type: (node.type || '').toLowerCase(),
        copyref: (node.copyRef || '').toLowerCase(),
        copied: normalizeDateSearchText(node.copiedAt),
        originalcreated: normalizeDateSearchText(node.originalCreatedAt),
        value: node.value !== undefined ? String(node.value) : '',
        all: '',
      } as Record<SearchField, string>;

      searchable.all = [
        searchable.title,
        searchable.content,
        searchable.caption,
        searchable.comment,
        searchable.link,
        searchable.ocr,
        searchable.tags,
        searchable.semantic,
        searchable.type,
        searchable.copyref,
        searchable.copied,
        searchable.originalcreated,
        searchable.created,
        searchable.updated,
        searchable.value,
        // Include field names to allow finding cards by typing "val" or "crea"
        node.value !== undefined ? 'value' : '',
        node.link ? 'link' : '',
        'created',
        'updated',
        'type'
      ]
        .filter(Boolean)
        .join(' ');

      // Custom check for value field to support > < operators
      const checkFieldMatch = (field: SearchField, needle: string, haystack: string) => {
        if (field === 'value') {
          const nodeVal = parseInt(haystack, 10);
          if (isNaN(nodeVal)) return false; // Node has no value set

          // Parse operator and limit
          const match = needle.match(/^([<>]=?)?(\d*)$/);
          if (match) {
            const operator = match[1] || '';
            const limitStr = match[2];

            // If only operator (e.g. "value:>"), return true (match all with value)
            if (operator && !limitStr) return true;

            // If only number (or empty)
            if (!operator) {
              return limitStr ? nodeVal === parseInt(limitStr, 10) : true;
            }

            const limit = parseInt(limitStr, 10);
            if (isNaN(limit)) return true; // Should be handled above, but safety

            switch (operator) {
              case '>': return nodeVal > limit;
              case '<': return nodeVal < limit;
              case '>=': return nodeVal >= limit;
              case '<=': return nodeVal <= limit;
            }
          }
        }
        return termMatches(needle, haystack);
      }

      // We need to override the standard evaluate to inject our custom matcher?
      // Actually, evaluate calls termMatches. We can modify evaluate or termMatches.
      // But termMatches is outside. Let's move the logic into evaluate's closure or rewrite evaluate.

      const evaluateWithCustomLogic = (postfixStack: Token[]): boolean => {

        const stack: boolean[] = [];
        for (const token of postfixStack) {
          if (token.type === 'TERM') {
            const { field, value } = parseFieldTerm(token.value);
            if (field) {
              // Explicit field search
              stack.push(checkFieldMatch(field, value, searchable[field]));
            } else {
              // General search "all"
              const needle = token.value;

              // Special heuristic: If searching for a single digit 1-6, prioritize Value
              // and avoid matching dates (e.g. "3" matching "2023").
              if (needle.match(/^[1-6]$/)) {
                const digit = parseInt(needle, 10);
                const hasValue = (node.value === digit);

                // Also check specific text fields (title, content, tags) but NOT dates
                const textMatch = [
                  searchable.title,
                  searchable.content,
                  searchable.caption,
                  searchable.comment,
                  searchable.tags
                ].some(txt => termMatches(needle, txt));

                stack.push(hasValue || textMatch);
              } else {
                stack.push(termMatches(needle, searchable.all));
              }
            }
          } else if (token.type === 'NOT') {
            stack.push(!(stack.pop() ?? false));
          } else if (token.type === 'AND' || token.type === 'OR') {
            const b = stack.pop() ?? false;
            const a = stack.pop() ?? false;
            stack.push(token.type === 'AND' ? a && b : a || b);
          }
        }
        return stack.pop() ?? false;
      };

      return evaluateWithCustomLogic(postfix);
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
