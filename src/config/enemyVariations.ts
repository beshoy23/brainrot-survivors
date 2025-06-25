// Configuration for enemy visual variations

export const EnemyVariationConfig = {
  // Color variation ranges
  color: {
    hueShiftRange: 0.1,          // Maximum hue shift (±10%)
    saturationMin: 0.7,          // Minimum saturation multiplier
    saturationMax: 1.3,          // Maximum saturation multiplier
    brightnessMin: 0.8,          // Minimum brightness multiplier
    brightnessMax: 1.2,          // Maximum brightness multiplier
    aggressionThreshold: 0.7,    // Aggression level for special coloring
    aggressionSatBoost: 1.3,     // Saturation boost for aggressive enemies
    aggressionBrightness: 0.85   // Brightness multiplier for aggressive enemies
  },
  
  // Size variation ranges
  size: {
    scaleMin: 0.9,               // Minimum scale multiplier
    scaleMax: 1.1,               // Maximum scale multiplier
    swarmScaleBase: 0.8,         // Base scale for swarm enemies
    swarmScaleRange: 0.4,        // Additional scale range for swarm
    tankScaleBase: 0.95,         // Minimum scale for tanks
    eliteMinScale: 1.0           // Minimum scale for elites
  },
  
  // Feature appearance thresholds
  features: {
    alphaBase: 0.3,              // Base alpha for features
    alphaRange: 0.4,             // Additional alpha range
    basicScarThreshold: 0.5,     // Chance for basic enemy scars
    fastTrailThreshold: 0.3,     // Chance for fast enemy trails
    tankArmorThreshold: 0.4,     // Chance for tank armor lines
    tankRustThreshold: 0.7,      // Chance for tank rust spots
    eliteCrystalThreshold: 0.5   // Chance for elite crystals
  },
  
  // Biome thresholds (matching terrain generation)
  biome: {
    rockyThreshold: 0.6,         // Above this = rocky biome
    wetThreshold: 0.3,           // Below this = wet biome
    rockyBrightness: 1.1,        // Brightness multiplier for rocky biome
    rockySaturation: 0.9,        // Saturation multiplier for rocky biome
    wetBrightness: 1.2,          // Brightness multiplier for wet biome
    wetSaturation: 1.1,          // Saturation multiplier for wet biome
    wetHueShift: 0.1             // Hue shift for wet biome
  },
  
  // Animation settings
  animation: {
    swarmGlowSpeed: 0.003,       // Glow animation speed
    swarmGlowAggressionMin: 0.6  // Minimum aggression for glow effect
  },
  
  // Noise generation settings
  noise: {
    positionScale: 0.01,         // Scale for position-based noise
    timeScale: 0.0001,           // Scale for time-based noise
    biomeScale: 0.001,           // Scale for biome sampling
    phaseScale: 0.01             // Scale for animation phase noise
  }
};

// Helper function to get variation value within range
export function getVariationInRange(base: number, variation: number, min: number, max: number): number {
  const value = base + (variation - 0.5) * 2 * (max - min) / 2;
  return Math.max(min, Math.min(max, value));
}