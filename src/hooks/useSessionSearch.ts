// src/hooks/useSessionSearch.ts
// Hook för sökning utanför aktiv session (för att hitta kort att lägga till)

import { useState, useMemo } from 'react';
import type { MindNode, Session } from '../types/types';
import { filterNodesOutsideSession } from '../utils/nodeFilters';

// Återanvänd söklogik från useSearch.ts
type Token =
  | { type: 'TERM'; value: string }
  | { type: 'AND' }
  | { type: 'OR' }
  | { type: 'NOT' }
  | { type: 'LPAREN' }
  | { type: 'RPAREN' };

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

const insertImplicitAnds = (tokens: Token[]): Token[] => {
  const result: Token[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const current = tokens[i];
    result.push(current);
    if (i === tokens.length - 1) continue;
    const next = tokens[i + 1];
    const currentIsTermOrClose = current.type === 'TERM' || current.type === 'RPAREN';
    const nextIsTermOrOpen = next.type === 'TERM' || next.type === 'LPAREN' || next.type === 'NOT';
    if (currentIsTermOrClose && nextIsTermOrOpen) {
      result.push({ type: 'AND' });
    }
  }
  return result;
};

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
      stack.pop();
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

const evaluate = (postfix: Token[], text: string): boolean => {
  const stack: boolean[] = [];
  for (const token of postfix) {
    if (token.type === 'TERM') {
      stack.push(termMatches(token.value, text));
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

interface UseSessionSearchOptions {
  allNodes: MindNode[];
  activeSession: Session | null;
}

interface UseSessionSearchResult {
  query: string;
  setQuery: (query: string) => void;
  results: MindNode[];
}

export function useSessionSearch({ allNodes, activeSession }: UseSessionSearchOptions): UseSessionSearchResult {
  const [query, setQuery] = useState('');

  // Filtrera till kort som INTE är i sessionen
  const outsideNodes = useMemo(
    () => filterNodesOutsideSession(allNodes, activeSession),
    [allNodes, activeSession]
  );

  // Sök i kort utanför sessionen
  const results = useMemo(() => {
    if (!query.trim()) return [];
    if (!activeSession) return []; // Ingen session = ingen "utanför"

    const tokens = tokenize(query);
    if (tokens.length === 0) return [];
    const postfix = toPostfix(tokens);

    return outsideNodes.filter(node => {
      const searchableText = [
        node.title,
        node.content,
        node.ocrText,
        node.comment,
        ...node.tags,
        ...(node.semanticTags || []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return evaluate(postfix, searchableText);
    });
  }, [outsideNodes, query, activeSession]);

  return {
    query,
    setQuery,
    results,
  };
}
