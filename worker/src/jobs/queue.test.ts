import { describe, expect, it } from 'vitest';
import { outcomeFor } from './queue';

describe('queue retry outcomes', () => {
  it('retries until the attempt cap, then dead-letters', () => {
    expect(outcomeFor(1, 3)).toEqual({ dead: false, retry: true });
    expect(outcomeFor(2, 3)).toEqual({ dead: false, retry: true });
    expect(outcomeFor(3, 3)).toEqual({ dead: true, retry: false });
    expect(outcomeFor(4, 3)).toEqual({ dead: true, retry: false });
  });

  it('max_attempts of 1 fails immediately without retry', () => {
    expect(outcomeFor(1, 1)).toEqual({ dead: true, retry: false });
  });
});
