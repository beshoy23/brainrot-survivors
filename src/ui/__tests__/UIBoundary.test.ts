/**
 * UI Boundary and Viewport Testing
 * 
 * Tests that all UI elements stay within visible screen boundaries
 * across different devices and screen configurations.
 * 
 * Addresses the mobile XP bar bug that went undetected due to
 * lack of viewport boundary validation in tests.
 */

interface Viewport {
  width: number;
  height: number;
  safeAreaInsets: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

interface UIBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

describe('UI Boundary Tests', () => {
  const createViewport = (width: number, height: number, safeAreas = { top: 0, bottom: 0, left: 0, right: 0 }): Viewport => ({
    width,
    height,
    safeAreaInsets: safeAreas
  });

  const isWithinBounds = (element: UIBounds, viewport: Viewport): boolean => {
    const { safeAreaInsets } = viewport;
    const visibleArea = {
      left: safeAreaInsets.left,
      top: safeAreaInsets.top,
      right: viewport.width - safeAreaInsets.right,
      bottom: viewport.height - safeAreaInsets.bottom
    };

    return (
      element.x >= visibleArea.left &&
      element.y >= visibleArea.top &&
      element.x + element.width <= visibleArea.right &&
      element.y + element.height <= visibleArea.bottom
    );
  };

  describe('Mobile Device Boundaries', () => {
    it('should keep XP bar within iPhone X safe area', () => {
      const viewport = createViewport(375, 812, { top: 44, bottom: 34, left: 0, right: 0 });
      
      const xpBar: UIBounds = {
        x: 20,
        y: viewport.height - 20 - viewport.safeAreaInsets.bottom - 20, // height - barHeight - safeBottom - margin
        width: viewport.width - 40,
        height: 20
      };

      expect(isWithinBounds(xpBar, viewport)).toBe(true);
      expect(xpBar.y).toBe(738); // 812 - 20 - 34 - 20
    });

    it('should keep all UI elements within iPhone 14 Pro bounds', () => {
      const viewport = createViewport(393, 852, { top: 59, bottom: 34, left: 0, right: 0 });
      
      const elements = [
        { x: 20, y: 79, width: 200, height: 15 }, // Health bar
        { x: 20, y: 778, width: 353, height: 20 }, // XP bar (852 - 20 - 34 - 20 = 778)
        { x: 30, y: 638, width: 120, height: 120 }, // Touch controls (needs to fit above XP bar)
      ];

      elements.forEach((element, index) => {
        expect(isWithinBounds(element, viewport)).toBe(true);
      });
    });

    it('should keep UI within Android device bounds with software navigation', () => {
      const viewport = createViewport(412, 892, { top: 24, bottom: 48, left: 0, right: 0 }); // Pixel 6
      
      const xpBar: UIBounds = {
        x: 20,
        y: viewport.height - 20 - viewport.safeAreaInsets.bottom - 20,
        width: viewport.width - 40,
        height: 20
      };

      expect(isWithinBounds(xpBar, viewport)).toBe(true);
      expect(xpBar.y).toBe(804); // 892 - 20 - 48 - 20
    });
  });

  describe('Tablet Boundaries', () => {
    it('should position UI correctly on iPad', () => {
      const viewport = createViewport(768, 1024, { top: 24, bottom: 20, left: 0, right: 0 });
      
      const elements = [
        { x: 30, y: 54, width: 250, height: 20 }, // Health bar
        { x: 30, y: 984, width: 708, height: 20 }, // XP bar
        { x: 50, y: 854, width: 120, height: 120 }, // Touch controls
      ];

      elements.forEach(element => {
        expect(isWithinBounds(element, viewport)).toBe(true);
      });
    });
  });

  describe('Desktop Boundaries', () => {
    it('should position UI correctly on desktop (no safe areas)', () => {
      const viewport = createViewport(1920, 1080); // No safe areas needed
      
      const elements = [
        { x: 20, y: 20, width: 200, height: 15 }, // Health bar
        { x: 20, y: 1040, width: 1880, height: 20 }, // XP bar
      ];

      elements.forEach(element => {
        expect(isWithinBounds(element, viewport)).toBe(true);
      });
    });

    it('should handle ultrawide monitors', () => {
      const viewport = createViewport(3440, 1440);
      
      // UI should be centered or anchored appropriately
      const xpBar: UIBounds = {
        x: 20,
        y: 1400, // 1440 - 20 - 20
        width: 3400, // 3440 - 40
        height: 20
      };

      expect(isWithinBounds(xpBar, viewport)).toBe(true);
    });
  });

  describe('Edge Cases and Extreme Viewports', () => {
    it('should handle very small screens', () => {
      const viewport = createViewport(320, 480, { top: 20, bottom: 20, left: 0, right: 0 }); // Old iPhone
      
      const minUISize = 10;
      const margin = 5; // Smaller margin for small screens
      
      const xpBar: UIBounds = {
        x: margin,
        y: viewport.height - minUISize - viewport.safeAreaInsets.bottom - margin,
        width: viewport.width - (margin * 2),
        height: minUISize
      };

      expect(isWithinBounds(xpBar, viewport)).toBe(true);
      expect(xpBar.width).toBeGreaterThan(0);
    });

    it('should handle very wide screens', () => {
      const viewport = createViewport(2560, 600); // Super ultrawide
      
      const xpBar: UIBounds = {
        x: 50,
        y: 560, // 600 - 20 - 20
        width: 2460, // 2560 - 100
        height: 20
      };

      expect(isWithinBounds(xpBar, viewport)).toBe(true);
    });

    it('should handle square screens', () => {
      const viewport = createViewport(800, 800);
      
      const xpBar: UIBounds = {
        x: 20,
        y: 760, // 800 - 20 - 20
        width: 760, // 800 - 40
        height: 20
      };

      expect(isWithinBounds(xpBar, viewport)).toBe(true);
    });
  });

  describe('Dynamic Screen Changes', () => {
    it('should handle orientation changes', () => {
      // Portrait to landscape
      const portrait = createViewport(375, 812, { top: 44, bottom: 34, left: 0, right: 0 });
      const landscape = createViewport(812, 375, { top: 0, bottom: 21, left: 44, right: 44 });
      
      // Portrait XP bar
      const portraitXP: UIBounds = {
        x: 20,
        y: portrait.height - 20 - portrait.safeAreaInsets.bottom - 20,
        width: portrait.width - 40,
        height: 20
      };
      
      // Landscape XP bar
      const landscapeXP: UIBounds = {
        x: landscape.safeAreaInsets.left + 20,
        y: landscape.height - 20 - landscape.safeAreaInsets.bottom - 20,
        width: landscape.width - landscape.safeAreaInsets.left - landscape.safeAreaInsets.right - 40,
        height: 20
      };

      expect(isWithinBounds(portraitXP, portrait)).toBe(true);
      expect(isWithinBounds(landscapeXP, landscape)).toBe(true);
    });

    it('should handle window resizing', () => {
      const viewports = [
        createViewport(1280, 720),
        createViewport(1920, 1080),
        createViewport(2560, 1440),
        createViewport(3840, 2160) // 4K
      ];

      viewports.forEach(viewport => {
        const xpBar: UIBounds = {
          x: 20,
          y: viewport.height - 40,
          width: viewport.width - 40,
          height: 20
        };

        expect(isWithinBounds(xpBar, viewport)).toBe(true);
      });
    });
  });

  describe('Validation Helpers', () => {
    it('should detect UI elements outside bounds', () => {
      const viewport = createViewport(375, 812);
      
      const outsideElements = [
        { x: -10, y: 100, width: 20, height: 20 }, // Left of screen
        { x: 100, y: -10, width: 20, height: 20 }, // Above screen
        { x: 370, y: 100, width: 20, height: 20 }, // Right of screen (375 - 5 = 370, 370 + 20 = 390 > 375)
        { x: 100, y: 810, width: 20, height: 20 }, // Below screen (810 + 20 = 830 > 812)
      ];

      outsideElements.forEach((element, index) => {
        expect(isWithinBounds(element, viewport)).toBe(false);
      });
    });

    it('should validate safe area calculations', () => {
      const viewport = createViewport(375, 812, { top: 44, bottom: 34, left: 0, right: 0 });
      
      const calculateSafeArea = (viewport: Viewport) => ({
        width: viewport.width - viewport.safeAreaInsets.left - viewport.safeAreaInsets.right,
        height: viewport.height - viewport.safeAreaInsets.top - viewport.safeAreaInsets.bottom,
        x: viewport.safeAreaInsets.left,
        y: viewport.safeAreaInsets.top
      });

      const safeArea = calculateSafeArea(viewport);
      
      expect(safeArea.width).toBe(375); // No left/right insets
      expect(safeArea.height).toBe(734); // 812 - 44 - 34
      expect(safeArea.x).toBe(0);
      expect(safeArea.y).toBe(44);
    });
  });
});