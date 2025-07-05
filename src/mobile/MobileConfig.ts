export const MobileConfig = {
  // Touch control settings
  controls: {
    virtualJoystick: {
      size: 120,
      opacity: 0.5,
      activeOpacity: 0.8,
      deadZone: 0.15,
      fixedPosition: true,
      position: { x: 100, y: -150 }, // Relative to bottom-left
      dynamicPosition: false // Fixed positioning to prevent UI conflicts
    },
    touchSensitivity: 1.0,
    hapticFeedback: true,
    swipeThreshold: 50
  },

  // UI scaling for mobile
  ui: {
    scaleFactor: 1.5, // Base scale multiplier for all UI
    fontSize: {
      small: '16px',
      medium: '20px',
      large: '28px',
      xlarge: '36px'
    },
    buttonMinSize: 48, // Minimum touch target size (dp)
    safeAreaInsets: {
      top: 20,
      bottom: 20,
      left: 10,
      right: 10
    },
    healthBarHeight: 30,
    xpBarHeight: 20,
    // UI exclusion zones to prevent overlapping
    exclusionZones: {
      joystickArea: { x: 0, y: 0, width: 220, height: 220 }, // Bottom-left
      kickButtonArea: { x: -140, y: 0, width: 140, height: 140 }, // Bottom-right (relative to screen width)
      pauseButtonArea: { x: -80, y: 0, width: 80, height: 80 } // Top-right (relative to screen width)
    }
  },

  // Performance settings
  performance: {
    maxEnemies: 100, // Reduced from 200 for mobile
    maxProjectiles: 50,
    maxParticles: 30,
    damageNumberLimit: 10, // Max concurrent damage numbers
    targetFPS: 30, // Can be 30 or 60
    autoQuality: true,
    shadowsEnabled: false,
    particleQuality: 'low' // low, medium, high
  },

  // Game adjustments for mobile
  gameplay: {
    sessionLength: 600000, // 10 minutes in ms
    autoAim: true,
    magnetRangeBonus: 1.2, // 20% larger pickup range
    enemySpeedReduction: 0.9, // 10% slower enemies
    touchToMove: false, // Alternative control scheme
    autoPauseOnBackground: true
  },

  // Mobile platform features
  platform: {
    vibrationEnabled: true,
    vibrationPatterns: {
      damage: [0, 50],
      levelUp: [0, 100, 50, 100],
      pickup: [0, 20],
      enemyKill: [0, 10]
    },
    cloudSaveEnabled: false,
    adsEnabled: false,
    batteryOptimization: true
  },

  // Responsive breakpoints
  breakpoints: {
    small: 480,   // Most phones in portrait
    medium: 768,  // Tablets and phones in landscape
    large: 1024   // Large tablets
  }
};

// Helper to get appropriate config based on screen size
export function getMobileUIScale(): number {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const minDimension = Math.min(width, height);
  
  if (minDimension < MobileConfig.breakpoints.small) {
    return MobileConfig.ui.scaleFactor * 1.2;
  } else if (minDimension < MobileConfig.breakpoints.medium) {
    return MobileConfig.ui.scaleFactor;
  } else {
    return MobileConfig.ui.scaleFactor * 0.8;
  }
}

// Get safe area adjusted dimensions
export function getSafeAreaDimensions() {
  const insets = MobileConfig.ui.safeAreaInsets;
  return {
    width: window.innerWidth - insets.left - insets.right,
    height: window.innerHeight - insets.top - insets.bottom,
    offsetX: insets.left,
    offsetY: insets.top
  };
}