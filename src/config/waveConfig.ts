export interface WaveConfig {
  minute: number;
  minEnemies: number;
  spawnInterval: number;
  types: string[];
  bossSpawn?: boolean;
  specialEvent?: string;
}

// Realistic physics-based wave progression - COLLISION OPTIMIZED!
export const WAVE_CONFIG: WaveConfig[] = [
  // Minute 0-1: Small start for collision testing
  {
    minute: 0,
    minEnemies: 8, // Start small for collision physics
    spawnInterval: 1500, // Slower spawning
    types: ['basic']
  },
  
  // Minute 1-2: Gradual introduction 
  {
    minute: 1,
    minEnemies: 15, // Manageable collision count
    spawnInterval: 1000,
    types: ['basic', 'fast'],
    bossSpawn: true
  },
  
  // Minute 2-3: Light swarm introduction
  {
    minute: 2,
    minEnemies: 25, // Realistic for collision detection
    spawnInterval: 800,
    types: ['basic', 'fast', 'swarm']
  },
  
  // Minute 3-4: Moderate pressure
  {
    minute: 3,
    minEnemies: 35, // Still manageable
    spawnInterval: 600,
    types: ['basic', 'fast', 'swarm']
  },
  
  // Minute 4-5: Tank introduction
  {
    minute: 4,
    minEnemies: 45, // Reasonable collision count
    spawnInterval: 500,
    types: ['basic', 'fast', 'swarm', 'tank']
  },
  
  // Minute 5-6: Major challenge
  {
    minute: 5,
    minEnemies: 60, // Higher but still realistic
    spawnInterval: 400,
    types: ['basic', 'fast', 'swarm', 'tank'],
    bossSpawn: true,
    specialEvent: 'elite_wave'
  },
  
  // Minute 6-7: High intensity
  {
    minute: 6,
    minEnemies: 75, // Maximum sustainable for collision
    spawnInterval: 350,
    types: ['basic', 'fast', 'swarm', 'tank']
  },
  
  // Minute 7-8: Peak challenge
  {
    minute: 7,
    minEnemies: 90, // High but performance-safe
    spawnInterval: 300,
    types: ['basic', 'fast', 'swarm', 'tank']
  },
  
  // Minute 8+: Maximum sustainable intensity
  {
    minute: 8,
    minEnemies: 100, // Hard cap for collision performance
    spawnInterval: 250,
    types: ['basic', 'fast', 'swarm', 'tank'],
    bossSpawn: true
  }
];

// Helper to get current wave config
export function getWaveConfig(survivalTimeMinutes: number): WaveConfig {
  // Find the appropriate wave config
  let config = WAVE_CONFIG[0];
  
  for (const wave of WAVE_CONFIG) {
    if (wave.minute <= survivalTimeMinutes) {
      config = wave;
    } else {
      break;
    }
  }
  
  // For waves beyond configured, scale the last wave aggressively
  if (survivalTimeMinutes >= WAVE_CONFIG.length) {
    const lastWave = WAVE_CONFIG[WAVE_CONFIG.length - 1];
    const extraMinutes = survivalTimeMinutes - lastWave.minute;
    
    return {
      ...lastWave,
      minEnemies: lastWave.minEnemies + (extraMinutes * 50), // Much more aggressive scaling
      spawnInterval: Math.max(80, lastWave.spawnInterval - (extraMinutes * 10)) // Faster spawning
    };
  }
  
  return config;
}