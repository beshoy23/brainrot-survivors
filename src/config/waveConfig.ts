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
  // Minute 0-1: Learning phase
  {
    minute: 0,
    minEnemies: 20,
    spawnInterval: 800,
    types: ['basic']
  },
  
  // Minute 1-2: Introduction of speed
  {
    minute: 1,
    minEnemies: 30,
    spawnInterval: 600,
    types: ['basic', 'fast'],
    bossSpawn: true // First boss at 1:00
  },
  
  // Minute 2-3: Swarm introduction
  {
    minute: 2,
    minEnemies: 40,
    spawnInterval: 500,
    types: ['basic', 'fast', 'swarm']
  },
  
  // Minute 3-4: Pressure increase
  {
    minute: 3,
    minEnemies: 60,
    spawnInterval: 400,
    types: ['basic', 'fast', 'swarm']
  },
  
  // Minute 4-5: Tank introduction
  {
    minute: 4,
    minEnemies: 80,
    spawnInterval: 350,
    types: ['basic', 'fast', 'swarm', 'tank']
  },
  
  // Minute 5-6: Major challenge
  {
    minute: 5,
    minEnemies: 100,
    spawnInterval: 300,
    types: ['basic', 'fast', 'swarm', 'tank'],
    bossSpawn: true,
    specialEvent: 'elite_wave'
  },
  
  // Continue pattern...
  {
    minute: 6,
    minEnemies: 120,
    spawnInterval: 250,
    types: ['basic', 'fast', 'swarm', 'tank']
  },
  
  // Add more waves as needed
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
  
  // For waves beyond configured, scale the last wave
  if (survivalTimeMinutes >= WAVE_CONFIG.length) {
    const lastWave = WAVE_CONFIG[WAVE_CONFIG.length - 1];
    const extraMinutes = survivalTimeMinutes - lastWave.minute;
    
    return {
      ...lastWave,
      minEnemies: lastWave.minEnemies + (extraMinutes * 5),
      spawnInterval: Math.max(300, lastWave.spawnInterval - (extraMinutes * 20))
    };
  }
  
  return config;
}