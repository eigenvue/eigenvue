/**
 * Tests for URL ↔ state serialization (pure function tests).
 *
 * See Phase7_Implementation.md §25.3 — Unit Tests: URL State.
 */

import { describe, it, expect } from 'vitest';
import {
  parseUrlState,
  serializeUrlState,
} from '@/hooks/useCatalogUrlState';
import { DEFAULT_CATALOG_STATE } from '@/lib/catalog-types';

describe('parseUrlState', () => {
  it('returns defaults for empty params', () => {
    const params = new URLSearchParams();
    const state = parseUrlState(params);
    expect(state.category).toBe('all');
    expect(state.difficulties.size).toBe(0);
    expect(state.searchQuery).toBe('');
    expect(state.sortBy).toBe('name-asc');
  });

  it('parses category', () => {
    const params = new URLSearchParams('category=classical');
    expect(parseUrlState(params).category).toBe('classical');
  });

  it('ignores invalid category', () => {
    const params = new URLSearchParams('category=invalid');
    expect(parseUrlState(params).category).toBe('all');
  });

  it('parses comma-separated difficulties', () => {
    const params = new URLSearchParams('difficulty=beginner,advanced');
    const state = parseUrlState(params);
    expect(state.difficulties.size).toBe(2);
    expect(state.difficulties.has('beginner')).toBe(true);
    expect(state.difficulties.has('advanced')).toBe(true);
  });

  it('ignores invalid difficulties', () => {
    const params = new URLSearchParams('difficulty=beginner,invalid,advanced');
    const state = parseUrlState(params);
    expect(state.difficulties.size).toBe(2);
  });

  it('parses search query (trims and lowercases)', () => {
    const params = new URLSearchParams('q=  Binary  ');
    expect(parseUrlState(params).searchQuery).toBe('binary');
  });

  it('parses sort option', () => {
    const params = new URLSearchParams('sort=difficulty-desc');
    expect(parseUrlState(params).sortBy).toBe('difficulty-desc');
  });

  it('ignores invalid sort option', () => {
    const params = new URLSearchParams('sort=invalid');
    expect(parseUrlState(params).sortBy).toBe('name-asc');
  });
});

describe('serializeUrlState', () => {
  it('returns empty string for default state', () => {
    expect(serializeUrlState(DEFAULT_CATALOG_STATE)).toBe('');
  });

  it('serializes category', () => {
    const state = { ...DEFAULT_CATALOG_STATE, category: 'classical' as const };
    expect(serializeUrlState(state)).toBe('category=classical');
  });

  it('serializes difficulties in sorted order', () => {
    const state = {
      ...DEFAULT_CATALOG_STATE,
      difficulties: new Set(['advanced', 'beginner'] as const),
    };
    expect(serializeUrlState(state)).toBe('difficulty=advanced%2Cbeginner');
  });

  it('serializes search query', () => {
    const state = { ...DEFAULT_CATALOG_STATE, searchQuery: 'sort' };
    expect(serializeUrlState(state)).toBe('q=sort');
  });

  it('serializes sort option', () => {
    const state = { ...DEFAULT_CATALOG_STATE, sortBy: 'difficulty-asc' as const };
    expect(serializeUrlState(state)).toBe('sort=difficulty-asc');
  });

  it('omits default values from URL', () => {
    const state = {
      ...DEFAULT_CATALOG_STATE,
      category: 'classical' as const,
      // difficulties is default (empty)
      // searchQuery is default ("")
      // sortBy is default ("name-asc")
    };
    expect(serializeUrlState(state)).toBe('category=classical');
  });

  it('round-trips: serialize → parse → serialize is idempotent', () => {
    const original = {
      ...DEFAULT_CATALOG_STATE,
      category: 'deep-learning' as const,
      difficulties: new Set(['beginner', 'intermediate'] as const),
      searchQuery: 'neural',
      sortBy: 'difficulty-asc' as const,
    };
    const serialized = serializeUrlState(original);
    const parsed = parseUrlState(new URLSearchParams(serialized));
    const reserialized = serializeUrlState(parsed);
    expect(reserialized).toBe(serialized);
  });
});
