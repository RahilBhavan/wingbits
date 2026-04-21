import { describe, expect, it } from 'vitest';
import { inkFgBg } from '../../src/ui/tui/ink-text-props.js';

describe('inkFgBg', () => {
  it('omits undefined', () => {
    expect(inkFgBg(undefined)).toEqual({});
    expect(inkFgBg('red')).toEqual({ color: 'red' });
    expect(inkFgBg('red', '#fff')).toEqual({ color: 'red', backgroundColor: '#fff' });
  });
});
