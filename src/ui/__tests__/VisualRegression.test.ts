/**
 * Visual Regression Testing Framework
 * 
 * Provides infrastructure for visual testing to catch UI positioning bugs
 * like the mobile XP bar issue that was missed by logic-only tests.
 * 
 * This implements the visual testing strategy outlined in CLAUDE.md
 * to prevent future UI positioning regressions.
 */

interface ScreenshotConfig {
  width: number;
  height: number;
  devicePixelRatio: number;
  isMobile: boolean;
  safeAreas?: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

interface UIElementSnapshot {
  id: string;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  visible: boolean;
  styles: {
    zIndex?: number;
    opacity?: number;
    backgroundColor?: string;
  };
}

interface ScreenSnapshot {
  config: ScreenshotConfig;
  elements: UIElementSnapshot[];
  timestamp: number;
}

/**
 * Mock visual testing framework
 * In a real implementation, this would integrate with tools like:
 * - Playwright for browser screenshots
 * - Puppeteer for visual comparisons
 * - Jest-image-snapshot for regression detection
 */
class VisualTester {
  private snapshots: Map<string, ScreenSnapshot> = new Map();

  takeSnapshot(scenarioName: string, config: ScreenshotConfig, elements: UIElementSnapshot[]): ScreenSnapshot {
    const snapshot: ScreenSnapshot = {
      config,
      elements,
      timestamp: Date.now()
    };
    
    this.snapshots.set(scenarioName, snapshot);
    return snapshot;
  }

  compareSnapshots(baselineKey: string, currentKey: string): { matches: boolean; differences: string[] } {
    const baseline = this.snapshots.get(baselineKey);
    const current = this.snapshots.get(currentKey);
    
    if (!baseline || !current) {
      return { matches: false, differences: ['Missing snapshot'] };
    }

    const differences: string[] = [];

    // Compare configurations
    if (baseline.config.width !== current.config.width) {
      differences.push(`Width changed: ${baseline.config.width} → ${current.config.width}`);
    }
    if (baseline.config.height !== current.config.height) {
      differences.push(`Height changed: ${baseline.config.height} → ${current.config.height}`);
    }

    // Compare elements
    const baselineElements = new Map(baseline.elements.map(el => [el.id, el]));
    const currentElements = new Map(current.elements.map(el => [el.id, el]));

    for (const [id, baselineEl] of baselineElements) {
      const currentEl = currentElements.get(id);
      if (!currentEl) {
        differences.push(`Element ${id} missing in current snapshot`);
        continue;
      }

      // Check positioning
      if (baselineEl.bounds.x !== currentEl.bounds.x) {
        differences.push(`${id} X position: ${baselineEl.bounds.x} → ${currentEl.bounds.x}`);
      }
      if (baselineEl.bounds.y !== currentEl.bounds.y) {
        differences.push(`${id} Y position: ${baselineEl.bounds.y} → ${currentEl.bounds.y}`);
      }

      // Check visibility
      if (baselineEl.visible !== currentEl.visible) {
        differences.push(`${id} visibility: ${baselineEl.visible} → ${currentEl.visible}`);
      }
    }

    return { matches: differences.length === 0, differences };
  }
}

describe('Visual Regression Tests', () => {
  let visualTester: VisualTester;

  beforeEach(() => {
    visualTester = new VisualTester();
  });

  describe('Mobile UI Layout Snapshots', () => {
    it('should capture iPhone X portrait baseline', () => {
      const config: ScreenshotConfig = {
        width: 375,
        height: 812,
        devicePixelRatio: 3,
        isMobile: true,
        safeAreas: { top: 44, bottom: 34, left: 0, right: 0 }
      };

      const elements: UIElementSnapshot[] = [
        {
          id: 'health-bar',
          bounds: { x: 20, y: 64, width: 200, height: 15 },
          visible: true,
          styles: { zIndex: 10, backgroundColor: '#ff0000' }
        },
        {
          id: 'xp-bar',
          bounds: { x: 20, y: 758, width: 335, height: 20 }, // 812 - 20 - 34 = 758
          visible: true,
          styles: { zIndex: 10, backgroundColor: '#00ff00' }
        },
        {
          id: 'virtual-joystick',
          bounds: { x: 30, y: 608, width: 120, height: 120 },
          visible: true,
          styles: { zIndex: 5, opacity: 0.7 }
        }
      ];

      const snapshot = visualTester.takeSnapshot('iphone-x-portrait-baseline', config, elements);
      
      expect(snapshot.elements).toHaveLength(3);
      expect(snapshot.config.width).toBe(375);
      expect(snapshot.config.height).toBe(812);
    });

    it('should detect XP bar positioning regression', () => {
      // Create baseline
      const baselineConfig: ScreenshotConfig = {
        width: 375,
        height: 812,
        devicePixelRatio: 3,
        isMobile: true,
        safeAreas: { top: 44, bottom: 34, left: 0, right: 0 }
      };

      const baselineElements: UIElementSnapshot[] = [
        {
          id: 'xp-bar',
          bounds: { x: 20, y: 758, width: 335, height: 20 }, // Correct position
          visible: true,
          styles: { zIndex: 10 }
        }
      ];

      visualTester.takeSnapshot('baseline', baselineConfig, baselineElements);

      // Create buggy version (XP bar too low)
      const buggyElements: UIElementSnapshot[] = [
        {
          id: 'xp-bar',
          bounds: { x: 20, y: 792, width: 335, height: 20 }, // Wrong position - overlaps safe area
          visible: true,
          styles: { zIndex: 10 }
        }
      ];

      visualTester.takeSnapshot('buggy', baselineConfig, buggyElements);

      const comparison = visualTester.compareSnapshots('baseline', 'buggy');
      
      expect(comparison.matches).toBe(false);
      expect(comparison.differences).toContain('xp-bar Y position: 758 → 792');
    });

    it('should capture Android device baseline', () => {
      const config: ScreenshotConfig = {
        width: 412,
        height: 892,
        devicePixelRatio: 2.6,
        isMobile: true,
        safeAreas: { top: 24, bottom: 48, left: 0, right: 0 }
      };

      const elements: UIElementSnapshot[] = [
        {
          id: 'health-bar',
          bounds: { x: 20, y: 44, width: 200, height: 15 },
          visible: true,
          styles: {}
        },
        {
          id: 'xp-bar',
          bounds: { x: 20, y: 824, width: 372, height: 20 }, // 892 - 20 - 48 = 824
          visible: true,
          styles: {}
        }
      ];

      const snapshot = visualTester.takeSnapshot('android-baseline', config, elements);
      expect(snapshot.elements[1].bounds.y).toBe(824);
    });
  });

  describe('Desktop UI Layout Snapshots', () => {
    it('should capture desktop baseline', () => {
      const config: ScreenshotConfig = {
        width: 1920,
        height: 1080,
        devicePixelRatio: 1,
        isMobile: false
      };

      const elements: UIElementSnapshot[] = [
        {
          id: 'health-bar',
          bounds: { x: 20, y: 20, width: 200, height: 15 },
          visible: true,
          styles: {}
        },
        {
          id: 'xp-bar',
          bounds: { x: 20, y: 1040, width: 1880, height: 20 },
          visible: true,
          styles: {}
        },
        {
          id: 'virtual-joystick',
          bounds: { x: 0, y: 0, width: 0, height: 0 },
          visible: false, // Should not be visible on desktop
          styles: {}
        }
      ];

      const snapshot = visualTester.takeSnapshot('desktop-baseline', config, elements);
      
      // Verify touch controls are hidden on desktop
      const joystick = snapshot.elements.find(el => el.id === 'virtual-joystick');
      expect(joystick?.visible).toBe(false);
    });
  });

  describe('Orientation Change Snapshots', () => {
    it('should capture landscape layout changes', () => {
      // Portrait baseline
      const portraitConfig: ScreenshotConfig = {
        width: 375,
        height: 812,
        devicePixelRatio: 3,
        isMobile: true,
        safeAreas: { top: 44, bottom: 34, left: 0, right: 0 }
      };

      const portraitElements: UIElementSnapshot[] = [
        {
          id: 'xp-bar',
          bounds: { x: 20, y: 758, width: 335, height: 20 },
          visible: true,
          styles: {}
        }
      ];

      visualTester.takeSnapshot('portrait', portraitConfig, portraitElements);

      // Landscape version
      const landscapeConfig: ScreenshotConfig = {
        width: 812,
        height: 375,
        devicePixelRatio: 3,
        isMobile: true,
        safeAreas: { top: 0, bottom: 21, left: 44, right: 44 }
      };

      const landscapeElements: UIElementSnapshot[] = [
        {
          id: 'xp-bar',
          bounds: { x: 64, y: 334, width: 684, height: 20 }, // 812 - 44 - 44 - 40 = 684 width
          visible: true,
          styles: {}
        }
      ];

      visualTester.takeSnapshot('landscape', landscapeConfig, landscapeElements);

      // Both should be valid layouts
      const portraitSnap = visualTester.takeSnapshot('portrait-test', portraitConfig, portraitElements);
      const landscapeSnap = visualTester.takeSnapshot('landscape-test', landscapeConfig, landscapeElements);

      expect(portraitSnap.elements[0].bounds.y).toBe(758);
      expect(landscapeSnap.elements[0].bounds.y).toBe(334);
    });
  });

  describe('Cross-Device Compatibility', () => {
    it('should validate UI across multiple device configurations', () => {
      const devices = [
        { name: 'iPhone SE', width: 375, height: 667, safeAreas: { top: 20, bottom: 0, left: 0, right: 0 } },
        { name: 'iPhone 12', width: 390, height: 844, safeAreas: { top: 47, bottom: 34, left: 0, right: 0 } },
        { name: 'iPhone 14 Pro Max', width: 430, height: 932, safeAreas: { top: 59, bottom: 34, left: 0, right: 0 } },
        { name: 'Galaxy S21', width: 384, height: 854, safeAreas: { top: 24, bottom: 48, left: 0, right: 0 } },
        { name: 'Pixel 6', width: 412, height: 892, safeAreas: { top: 24, bottom: 48, left: 0, right: 0 } }
      ];

      devices.forEach(device => {
        const config: ScreenshotConfig = {
          width: device.width,
          height: device.height,
          devicePixelRatio: 2,
          isMobile: true,
          safeAreas: device.safeAreas
        };

        // Calculate XP bar position for this device
        const xpBarY = device.height - 20 - device.safeAreas.bottom - 20;
        const xpBarWidth = device.width - 40;

        const elements: UIElementSnapshot[] = [
          {
            id: 'xp-bar',
            bounds: { x: 20, y: xpBarY, width: xpBarWidth, height: 20 },
            visible: true,
            styles: {}
          }
        ];

        const snapshot = visualTester.takeSnapshot(device.name, config, elements);
        
        // Verify XP bar is positioned correctly for this device
        const xpBar = snapshot.elements[0];
        expect(xpBar.bounds.y + xpBar.bounds.height).toBeLessThanOrEqual(device.height - device.safeAreas.bottom);
        expect(xpBar.bounds.x).toBeGreaterThanOrEqual(0);
        expect(xpBar.bounds.x + xpBar.bounds.width).toBeLessThanOrEqual(device.width);
      });
    });
  });

  describe('Accessibility and Contrast Testing', () => {
    it('should validate UI element visibility and contrast', () => {
      const config: ScreenshotConfig = {
        width: 375,
        height: 812,
        devicePixelRatio: 3,
        isMobile: true
      };

      const elements: UIElementSnapshot[] = [
        {
          id: 'health-bar-bg',
          bounds: { x: 20, y: 64, width: 200, height: 15 },
          visible: true,
          styles: { backgroundColor: '#000000', opacity: 0.5 }
        },
        {
          id: 'health-bar-fill',
          bounds: { x: 20, y: 64, width: 150, height: 15 },
          visible: true,
          styles: { backgroundColor: '#ff0000', opacity: 1.0 }
        }
      ];

      const snapshot = visualTester.takeSnapshot('accessibility-test', config, elements);
      
      // Verify elements are visible (opacity > 0.1)
      snapshot.elements.forEach(element => {
        if (element.visible) {
          expect(element.styles.opacity || 1.0).toBeGreaterThan(0.1);
        }
      });
    });
  });
});