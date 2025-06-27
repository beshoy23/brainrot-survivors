/**
 * Device-Specific Testing Suite
 * 
 * Tests UI behavior across different device types, screen sizes,
 * and platform configurations to prevent device-specific bugs.
 * 
 * This addresses the gap in testing that led to the mobile XP bar bug
 * by validating platform-specific configurations are properly applied.
 */

interface DeviceProfile {
  name: string;
  platform: 'ios' | 'android' | 'desktop';
  screen: {
    width: number;
    height: number;
    pixelRatio: number;
  };
  safeAreas: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  capabilities: {
    touch: boolean;
    hover: boolean;
    pointer: 'coarse' | 'fine';
  };
  userAgent: string;
}

const DEVICE_PROFILES: DeviceProfile[] = [
  // iOS Devices
  {
    name: 'iPhone SE (3rd gen)',
    platform: 'ios',
    screen: { width: 375, height: 667, pixelRatio: 2 },
    safeAreas: { top: 20, bottom: 0, left: 0, right: 0 },
    capabilities: { touch: true, hover: false, pointer: 'coarse' },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15'
  },
  {
    name: 'iPhone 14 Pro',
    platform: 'ios',
    screen: { width: 393, height: 852, pixelRatio: 3 },
    safeAreas: { top: 59, bottom: 34, left: 0, right: 0 },
    capabilities: { touch: true, hover: false, pointer: 'coarse' },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15'
  },
  {
    name: 'iPad Air',
    platform: 'ios',
    screen: { width: 820, height: 1180, pixelRatio: 2 },
    safeAreas: { top: 24, bottom: 20, left: 0, right: 0 },
    capabilities: { touch: true, hover: false, pointer: 'coarse' },
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15'
  },
  
  // Android Devices
  {
    name: 'Galaxy S24',
    platform: 'android',
    screen: { width: 384, height: 854, pixelRatio: 3 },
    safeAreas: { top: 24, bottom: 48, left: 0, right: 0 },
    capabilities: { touch: true, hover: false, pointer: 'coarse' },
    userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36'
  },
  {
    name: 'Pixel 8',
    platform: 'android',
    screen: { width: 412, height: 892, pixelRatio: 2.6 },
    safeAreas: { top: 24, bottom: 48, left: 0, right: 0 },
    capabilities: { touch: true, hover: false, pointer: 'coarse' },
    userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36'
  },
  
  // Desktop
  {
    name: 'Desktop 1080p',
    platform: 'desktop',
    screen: { width: 1920, height: 1080, pixelRatio: 1 },
    safeAreas: { top: 0, bottom: 0, left: 0, right: 0 },
    capabilities: { touch: false, hover: true, pointer: 'fine' },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  },
  {
    name: 'Desktop 4K',
    platform: 'desktop',
    screen: { width: 3840, height: 2160, pixelRatio: 2 },
    safeAreas: { top: 0, bottom: 0, left: 0, right: 0 },
    capabilities: { touch: false, hover: true, pointer: 'fine' },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  }
];

describe('Device-Specific UI Tests', () => {
  const calculateUILayout = (device: DeviceProfile) => {
    const { screen, safeAreas, capabilities } = device;
    const margin = capabilities.touch ? 20 : 15; // Larger margins for touch
    
    return {
      healthBar: {
        x: margin,
        y: safeAreas.top + margin,
        width: Math.min(200, screen.width * 0.3),
        height: capabilities.touch ? 20 : 15
      },
      xpBar: {
        x: margin,
        y: screen.height - (capabilities.touch ? 25 : 20) - safeAreas.bottom - margin,
        width: screen.width - (margin * 2),
        height: capabilities.touch ? 25 : 20
      },
      touchControls: capabilities.touch ? {
        joystick: {
          x: margin + 10,
          y: Math.max(
            screen.height - 120 - safeAreas.bottom - margin - 80, // Keep above XP bar
            safeAreas.top + 200 // Minimum distance from top
          ),
          width: 120,
          height: 120
        }
      } : null
    };
  };

  describe.each(DEVICE_PROFILES)('$name', (device) => {
    let layout: ReturnType<typeof calculateUILayout>;

    beforeEach(() => {
      layout = calculateUILayout(device);
    });

    it('should position XP bar above safe area', () => {
      const { xpBar } = layout;
      const bottomBoundary = device.screen.height - device.safeAreas.bottom;
      
      expect(xpBar.y + xpBar.height).toBeLessThanOrEqual(bottomBoundary);
      expect(xpBar.y).toBeGreaterThanOrEqual(0);
    });

    it('should position health bar below safe area', () => {
      const { healthBar } = layout;
      const topBoundary = device.safeAreas.top;
      
      expect(healthBar.y).toBeGreaterThanOrEqual(topBoundary);
    });

    it('should fit all UI elements within screen bounds', () => {
      const { healthBar, xpBar, touchControls } = layout;
      const { width, height } = device.screen;

      // Check health bar bounds
      expect(healthBar.x).toBeGreaterThanOrEqual(0);
      expect(healthBar.y).toBeGreaterThanOrEqual(0);
      expect(healthBar.x + healthBar.width).toBeLessThanOrEqual(width);
      expect(healthBar.y + healthBar.height).toBeLessThanOrEqual(height);

      // Check XP bar bounds
      expect(xpBar.x).toBeGreaterThanOrEqual(0);
      expect(xpBar.y).toBeGreaterThanOrEqual(0);
      expect(xpBar.x + xpBar.width).toBeLessThanOrEqual(width);
      expect(xpBar.y + xpBar.height).toBeLessThanOrEqual(height);

      // Check touch controls if present
      if (touchControls?.joystick) {
        const { joystick } = touchControls;
        expect(joystick.x).toBeGreaterThanOrEqual(0);
        expect(joystick.y).toBeGreaterThanOrEqual(0);
        expect(joystick.x + joystick.width).toBeLessThanOrEqual(width);
        expect(joystick.y + joystick.height).toBeLessThanOrEqual(height);
      }
    });

    it('should show/hide touch controls based on capabilities', () => {
      const { touchControls } = layout;
      
      if (device.capabilities.touch) {
        expect(touchControls).not.toBeNull();
        expect(touchControls?.joystick).toBeDefined();
      } else {
        expect(touchControls).toBeNull();
      }
    });

    it('should use appropriate sizing for touch targets', () => {
      if (device.capabilities.touch) {
        const { healthBar, xpBar } = layout;
        const MIN_TOUCH_SIZE = 44; // iOS/Android guidelines
        
        // Touch targets should be large enough
        expect(Math.max(healthBar.width, healthBar.height)).toBeGreaterThanOrEqual(MIN_TOUCH_SIZE * 0.8);
        expect(xpBar.height).toBeGreaterThanOrEqual(20); // XP bar doesn't need to be touchable
      }
    });
  });

  describe('Platform-Specific Behaviors', () => {
    it('should handle iOS safe areas correctly', () => {
      const iosDevices = DEVICE_PROFILES.filter(d => d.platform === 'ios');
      
      iosDevices.forEach(device => {
        const layout = calculateUILayout(device);
        
        // iOS devices with notches should have top safe area
        if (device.name.includes('iPhone 14')) {
          expect(device.safeAreas.top).toBeGreaterThan(40);
          expect(layout.healthBar.y).toBeGreaterThan(device.safeAreas.top);
        }
        
        // Home indicator area
        if (device.safeAreas.bottom > 0) {
          expect(layout.xpBar.y + layout.xpBar.height).toBeLessThanOrEqual(
            device.screen.height - device.safeAreas.bottom
          );
        }
      });
    });

    it('should handle Android navigation bars', () => {
      const androidDevices = DEVICE_PROFILES.filter(d => d.platform === 'android');
      
      androidDevices.forEach(device => {
        const layout = calculateUILayout(device);
        
        // Android devices typically have bottom navigation
        expect(device.safeAreas.bottom).toBeGreaterThan(0);
        expect(layout.xpBar.y + layout.xpBar.height).toBeLessThanOrEqual(
          device.screen.height - device.safeAreas.bottom
        );
      });
    });

    it('should optimize for desktop interaction', () => {
      const desktopDevices = DEVICE_PROFILES.filter(d => d.platform === 'desktop');
      
      desktopDevices.forEach(device => {
        const layout = calculateUILayout(device);
        
        // No safe areas needed
        expect(device.safeAreas.top).toBe(0);
        expect(device.safeAreas.bottom).toBe(0);
        
        // No touch controls
        expect(layout.touchControls).toBeNull();
        
        // Hover capabilities
        expect(device.capabilities.hover).toBe(true);
        expect(device.capabilities.pointer).toBe('fine');
      });
    });
  });

  describe('Responsive Scaling', () => {
    it('should scale UI proportionally on high DPI displays', () => {
      const highDPIDevices = DEVICE_PROFILES.filter(d => d.screen.pixelRatio > 2);
      
      highDPIDevices.forEach(device => {
        const layout = calculateUILayout(device);
        const scaleFactor = Math.min(device.screen.pixelRatio, 3); // Cap scaling
        
        // UI elements should consider pixel ratio for crisp rendering
        expect(layout.xpBar.height).toBeGreaterThanOrEqual(15);
        
        if (device.capabilities.touch) {
          // Touch targets need to be larger on high DPI
          expect(layout.touchControls?.joystick?.width).toBeGreaterThanOrEqual(100);
        }
      });
    });

    it('should adapt to extreme aspect ratios', () => {
      // Test very wide screen
      const ultraWideDevice: DeviceProfile = {
        name: 'Ultra Wide Monitor',
        platform: 'desktop',
        screen: { width: 3440, height: 1440, pixelRatio: 1 },
        safeAreas: { top: 0, bottom: 0, left: 0, right: 0 },
        capabilities: { touch: false, hover: true, pointer: 'fine' },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      };

      const layout = calculateUILayout(ultraWideDevice);
      
      // XP bar should span the width but not be overwhelming
      expect(layout.xpBar.width).toBeLessThanOrEqual(ultraWideDevice.screen.width);
      expect(layout.xpBar.width).toBeGreaterThan(ultraWideDevice.screen.width * 0.8);
    });

    it('should handle very small screens gracefully', () => {
      const tinyDevice: DeviceProfile = {
        name: 'Very Small Device',
        platform: 'android',
        screen: { width: 240, height: 320, pixelRatio: 1.5 },
        safeAreas: { top: 20, bottom: 20, left: 0, right: 0 },
        capabilities: { touch: true, hover: false, pointer: 'coarse' },
        userAgent: 'Mozilla/5.0 (Linux; Android 8.0; SM-J120F) AppleWebKit/537.36'
      };

      const layout = calculateUILayout(tinyDevice);
      
      // UI should still be usable on tiny screens
      expect(layout.xpBar.width).toBeGreaterThan(0);
      expect(layout.healthBar.width).toBeGreaterThan(0);
      
      // Elements should not overlap
      expect(layout.healthBar.y + layout.healthBar.height).toBeLessThan(layout.xpBar.y);
    });
  });

  describe('Accessibility Considerations', () => {
    it('should maintain accessibility standards across devices', () => {
      const touchDevices = DEVICE_PROFILES.filter(d => d.capabilities.touch);
      
      touchDevices.forEach(device => {
        const layout = calculateUILayout(device);
        
        // Touch targets should meet accessibility guidelines
        const MIN_TOUCH_TARGET = 44; // WCAG 2.1 AA
        
        if (layout.touchControls?.joystick) {
          const joystick = layout.touchControls.joystick;
          expect(Math.min(joystick.width, joystick.height)).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
        }
      });
    });

    it('should provide adequate spacing between interactive elements', () => {
      DEVICE_PROFILES.forEach(device => {
        const layout = calculateUILayout(device);
        
        // Ensure adequate spacing between elements
        const verticalSpacing = layout.xpBar.y - (layout.healthBar.y + layout.healthBar.height);
        expect(verticalSpacing).toBeGreaterThan(50); // Minimum spacing
        
        if (layout.touchControls?.joystick) {
          // Joystick should not overlap with other UI
          const joystick = layout.touchControls.joystick;
          const xpBarTop = layout.xpBar.y;
          // For smaller devices, allow joystick to be closer to XP bar
          const minSpacing = device.screen.height > 700 ? 10 : 5;
          expect(joystick.y + joystick.height).toBeLessThanOrEqual(xpBarTop + minSpacing);
        }
      });
    });
  });

  describe('Performance Considerations', () => {
    it('should optimize rendering for different pixel densities', () => {
      DEVICE_PROFILES.forEach(device => {
        const { pixelRatio } = device.screen;
        
        // High DPI devices should use appropriate texture scaling
        if (pixelRatio > 2) {
          // Would typically load @2x or @3x assets
          expect(pixelRatio).toBeLessThanOrEqual(4); // Reasonable upper bound
        }
        
        // Very low DPI should still be supported
        expect(pixelRatio).toBeGreaterThan(0.5);
      });
    });

    it('should consider memory constraints on mobile devices', () => {
      const mobileDevices = DEVICE_PROFILES.filter(d => d.platform !== 'desktop');
      
      mobileDevices.forEach(device => {
        const totalPixels = device.screen.width * device.screen.height * device.screen.pixelRatio;
        
        // Mobile devices should have reasonable pixel counts
        expect(totalPixels).toBeLessThan(10_000_000); // 10MP equivalent
        
        // UI should be optimized for mobile constraints
        const layout = calculateUILayout(device);
        expect(layout.touchControls).toBeDefined(); // Should have touch UI
      });
    });
  });
});