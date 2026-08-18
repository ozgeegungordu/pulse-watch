import { describe, expect, it, vi } from 'vitest';
import { formatDuration, formatRelativeTime, formatResponseMs } from './format';

describe('format utilities', () => {
  it('formats measured values and missing values', () => {
    expect(formatResponseMs(123)).toBe('123 ms');
    expect(formatResponseMs(null)).toBe('—');
  });

  it('formats relative time', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-18T00:01:00Z'));
    expect(formatRelativeTime('2026-08-18T00:00:00Z')).toBe('1m ago');
    vi.useRealTimers();
  });

  it('formats durations', () => {
    expect(formatDuration('2026-08-18T00:00:00Z', '2026-08-18T01:05:00Z')).toBe('1h 5m');
  });
});
