import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock phaser before anything else
vi.mock('phaser', () => ({
  default: {
    Scale: {
      ENVELOP: 1,
      FIT: 0,
    },
  },
}));

import { getMobileUiScale, getDeviceType } from './mobileLayout';

describe('mobileLayout', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: false,
      addListener: vi.fn(),
      removeListener: vi.fn(),
    }));
    vi.stubGlobal('innerWidth', 1200);
    vi.stubGlobal('navigator', { maxTouchPoints: 0 });
  });

  it('should return correct device type for mobile', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('coarse') || query.includes('none'),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    }));
    expect(getDeviceType()).toBe('mobile');
  });

  it('should return tablet for medium widths', () => {
    vi.stubGlobal('innerWidth', 750);
    expect(getDeviceType()).toBe('tablet');
  });

  it('should return desktop for large widths', () => {
    vi.stubGlobal('innerWidth', 1200);
    expect(getDeviceType()).toBe('desktop');
  });

  it('should scale appropriately based on width', () => {
    const mockScene = {
      scale: {
        parentSize: { width: 320 },
        width: 320,
      }
    } as any;
    
    expect(getMobileUiScale(mockScene)).toBe(1.6);
    
    mockScene.scale.parentSize.width = 600;
    expect(getMobileUiScale(mockScene)).toBe(1.3);
    
    mockScene.scale.parentSize.width = 1000;
    expect(getMobileUiScale(mockScene)).toBe(1);
  });
});
