/**
 * Tests for the pure filter/sort functions.
 *
 * These test the exported pure functions (matchesSearch, filterAlgorithms,
 * sortAlgorithms) WITHOUT React rendering — they are pure logic tests.
 *
 * See Phase7_Implementation.md §25.2 — Unit Tests: Filter Logic.
 */

import { describe, it, expect } from 'vitest';
import {
  matchesSearch,
  filterAlgorithms,
  sortAlgorithms,
} from '@/hooks/useCatalogFilters';
import { type AlgorithmMeta } from '@/shared/types/step';
import { DEFAULT_CATALOG_STATE } from '@/lib/catalog-types';

/** Minimal valid AlgorithmMeta fixture factory. */
function makeMeta(overrides: Partial<AlgorithmMeta>): AlgorithmMeta {
  return {
    id: 'test-algo',
    name: 'Test Algorithm',
    category: 'classical',
    description: { short: 'A test algorithm.', long: 'A longer description.' },
    complexity: { time: 'O(n)', space: 'O(1)', level: 'beginner' },
    visual: { layout: 'array-with-pointers' },
    inputs: { schema: {}, defaults: {}, examples: [] },
    code: { implementations: { pseudocode: '' }, defaultLanguage: 'pseudocode' },
    education: { keyConcepts: [], pitfalls: [], quiz: [], resources: [] },
    seo: { keywords: [], ogDescription: '' },
    prerequisites: [],
    related: [],
    author: 'test',
    version: '1.0.0',
    ...overrides,
  } as AlgorithmMeta;
}

describe('matchesSearch', () => {
  const algo = makeMeta({
    name: 'Binary Search',
    id: 'binary-search',
    description: { short: 'Efficient search in sorted arrays.', long: '' },
    seo: { keywords: ['divide and conquer', 'log n'], ogDescription: '' },
  });

  it('matches empty query (returns true for all)', () => {
    expect(matchesSearch(algo, '')).toBe(true);
  });

  it('matches by name (case-insensitive)', () => {
    expect(matchesSearch(algo, 'binary')).toBe(true);
    expect(matchesSearch(algo, 'search')).toBe(true);
  });

  it('matches by short description', () => {
    expect(matchesSearch(algo, 'sorted')).toBe(true);
  });

  it('matches by id', () => {
    expect(matchesSearch(algo, 'binary-search')).toBe(true);
  });

  it('matches by keyword', () => {
    expect(matchesSearch(algo, 'divide')).toBe(true);
    expect(matchesSearch(algo, 'log n')).toBe(true);
  });

  it('returns false for non-matching query', () => {
    expect(matchesSearch(algo, 'quantum')).toBe(false);
  });
});

describe('sortAlgorithms', () => {
  const algos = [
    makeMeta({ name: 'Zebra Sort', complexity: { time: 'O(n)', space: 'O(1)', level: 'beginner' } }),
    makeMeta({ name: 'Alpha Search', complexity: { time: 'O(n)', space: 'O(1)', level: 'advanced' } }),
    makeMeta({ name: 'Middle Path', complexity: { time: 'O(n)', space: 'O(1)', level: 'intermediate' } }),
  ];

  it('sorts by name ascending', () => {
    const sorted = sortAlgorithms(algos, 'name-asc');
    expect(sorted.map((a) => a.name)).toEqual([
      'Alpha Search',
      'Middle Path',
      'Zebra Sort',
    ]);
  });

  it('sorts by name descending', () => {
    const sorted = sortAlgorithms(algos, 'name-desc');
    expect(sorted.map((a) => a.name)).toEqual([
      'Zebra Sort',
      'Middle Path',
      'Alpha Search',
    ]);
  });

  it('sorts by difficulty ascending', () => {
    const sorted = sortAlgorithms(algos, 'difficulty-asc');
    expect(sorted.map((a) => a.complexity.level)).toEqual([
      'beginner',
      'intermediate',
      'advanced',
    ]);
  });

  it('sorts by difficulty descending', () => {
    const sorted = sortAlgorithms(algos, 'difficulty-desc');
    expect(sorted.map((a) => a.complexity.level)).toEqual([
      'advanced',
      'intermediate',
      'beginner',
    ]);
  });

  it('does not mutate the input array', () => {
    const original = [...algos];
    sortAlgorithms(algos, 'name-desc');
    expect(algos.map((a) => a.name)).toEqual(original.map((a) => a.name));
  });

  it('uses name as secondary key when difficulty ties', () => {
    const sameDiff = [
      makeMeta({ name: 'Zebra', complexity: { time: 'O(n)', space: 'O(1)', level: 'beginner' } }),
      makeMeta({ name: 'Alpha', complexity: { time: 'O(n)', space: 'O(1)', level: 'beginner' } }),
    ];
    const sorted = sortAlgorithms(sameDiff, 'difficulty-asc');
    expect(sorted.map((a) => a.name)).toEqual(['Alpha', 'Zebra']);
  });
});

describe('filterAlgorithms', () => {
  const algos = [
    makeMeta({ id: 'a', category: 'classical', complexity: { time: 'O(n)', space: 'O(1)', level: 'beginner' } }),
    makeMeta({ id: 'b', category: 'deep-learning', complexity: { time: 'O(n)', space: 'O(n)', level: 'advanced' } }),
    makeMeta({ id: 'c', category: 'classical', complexity: { time: 'O(n log n)', space: 'O(n)', level: 'intermediate' } }),
  ];

  it('returns all when no filters active', () => {
    const result = filterAlgorithms(algos, DEFAULT_CATALOG_STATE);
    expect(result.length).toBe(3);
  });

  it('filters by category', () => {
    const result = filterAlgorithms(algos, {
      ...DEFAULT_CATALOG_STATE,
      category: 'classical',
    });
    expect(result.length).toBe(2);
    expect(result.every((a) => a.category === 'classical')).toBe(true);
  });

  it('filters by difficulty', () => {
    const result = filterAlgorithms(algos, {
      ...DEFAULT_CATALOG_STATE,
      difficulties: new Set(['beginner'] as const),
    });
    expect(result.length).toBe(1);
    expect(result[0].id).toBe('a');
  });

  it('empty difficulty set shows all (no filtering)', () => {
    const result = filterAlgorithms(algos, {
      ...DEFAULT_CATALOG_STATE,
      difficulties: new Set(),
    });
    expect(result.length).toBe(3);
  });

  it('combines category + difficulty (AND logic)', () => {
    const result = filterAlgorithms(algos, {
      ...DEFAULT_CATALOG_STATE,
      category: 'classical',
      difficulties: new Set(['intermediate'] as const),
    });
    expect(result.length).toBe(1);
    expect(result[0].id).toBe('c');
  });

  it('empty search query matches ALL algorithms', () => {
    const result = filterAlgorithms(algos, {
      ...DEFAULT_CATALOG_STATE,
      searchQuery: '',
    });
    expect(result.length).toBe(3);
  });
});
