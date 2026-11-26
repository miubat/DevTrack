import { describe, expect, it } from 'vitest';
import { passwordProblem } from './password-rule.ts';

describe('passwordProblem (NFR-SEC-01)', () => {
  it('accepts 8 and 64 characters with a letter and a digit', () => {
    expect(passwordProblem('abcdef12')).toBeUndefined();
    expect(passwordProblem('a1'.repeat(32))).toBeUndefined();
  });

  it.each([
    ['too short', 'abcde12', 'Use 8 to 64 characters.'],
    ['too long', 'a1'.repeat(32) + 'x', 'Use 8 to 64 characters.'],
    ['no letter', '12345678', 'Include a letter (A-Z or a-z).'],
    ['only non-English letters', 'пароль12', 'Include a letter (A-Z or a-z).'],
    ['no digit', 'abcdefgh', 'Include a digit.'],
  ])('refuses a password that is %s', (_, password, message) => {
    expect(passwordProblem(password)).toBe(message);
  });
});
