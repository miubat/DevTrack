import { expect, it } from 'vitest';

// QA only (AGL-07.3): a failing test to check that a failing check blocks the merge.
it('fails on purpose', () => {
  expect(1).toBe(2);
});