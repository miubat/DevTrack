import { describe, expect, it } from 'vitest';
import { returnPath } from './redirect.ts';

describe('returnPath (BUG-AGL-05.3-01)', () => {
  it('returns the page the user asked for', () => {
    expect(returnPath({ from: '/profile' })).toBe('/profile');
  });

  it('keeps the query string', () => {
    expect(returnPath({ from: '/projects?page=2' })).toBe('/projects?page=2');
  });

  it('returns "/" when nothing was saved', () => {
    expect(returnPath(null)).toBe('/');
    expect(returnPath(undefined)).toBe('/');
    expect(returnPath({})).toBe('/');
  });

  it('never sends the user to another site', () => {
    expect(returnPath({ from: 'https://evil.example' })).toBe('/');
    expect(returnPath({ from: '//evil.example' })).toBe('/');
    expect(returnPath({ from: '/\\evil.example' })).toBe('/');
  });

  it('never sends the user back to the login page', () => {
    expect(returnPath({ from: '/login' })).toBe('/');
  });

  it('ignores a value that is not text', () => {
    expect(returnPath({ from: 42 })).toBe('/');
  });
});
