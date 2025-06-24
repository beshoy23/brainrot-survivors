export interface WaveConfig {
  minute: number;
  minEnemies: number;
  spawnInterval: number;
  types: string[];
  bossSpawn?: boolean;
  specialEvent?: string;
}

// VS-style wave progression - TRUE VS DENSITY!
export const WAVE_CONFIG: WaveConfig[] = [
  // Minute 0-1: Gentle learning phase (like real VS)
  {
    minute: 0,
    minEnemies: 15, // Start very small like VS
    spawnInterval: 1200,
    types: ['basic']
  },
  
  // Minute 1-2: Gradual introduction 
  {
    minute: 1,
    minEnemies: 40,
    spawnInterval: 800,
    types: ['basic', 'fast'],
    bossSpawn: true
  },
  
  // Minute 2-3: Swarm introduction
  {
    minute: 2,
    minEnemies: 120,
    spawnInterval: 400,
    types: ['basic', 'fast', 'swarm']
  },
  
  // Minute 3-4: Pressure increase
  {
    minute: 3,
    minEnemies: 180,
    spawnInterval: 300,
    types: ['basic', 'fast', 'swarm']
  },
  
  // Minute 4-5: Tank introduction
  {
    minute: 4,
    minEnemies: 250,
    spawnInterval: 250,
    types: ['basic', 'fast', 'swarm', 'tank']
  },
  
  // Minute 5-6: Major challenge
  {
    minute: 5,
    minEnemies: 350,
    spawnInterval: 200,
    types: ['basic', 'fast', 'swarm', 'tank'],
    bossSpawn: true,
    specialEvent: 'elite_wave'
  },
  
  // Minute 6-7: High intensity
  {
    minute: 6,
    minEnemies: 450,
    spawnInterval: 150,
    types: ['basic', 'fast', 'swarm', 'tank']
  },
  
  // Minute 7-8: Extreme density
  {
    minute: 7,
    minEnemies: 550,
    spawnInterval: 120,
    types: ['basic', 'fast', 'swarm', 'tank']
  },
  
  // Minute 8+: VS peak intensity
  {
    minute: 8,
    minEnemies: 650,
    spawnInterval: 100,
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