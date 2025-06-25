export const GameConfig = {
  player: {
    speed: 200,
    maxHealth: 120, // VS-style: slightly higher base health
    hitboxRadius: 14,
    depth: 10 // Player appears above enemies (8) and weapon effects (4-6)
  },
  enemies: {
    basic: {
      speed: 150,
      health: 10,
      damage: 10,
      hitboxRadius: 10
    }
  },
  spawning: {
    initialDelay: 500,
    baseSpawnRate: 1000,
    spawnAcceleration: 0.98,
    minSpawnRate: 300,
    spawnDistance: 100
  },
  pickups: {
    xpGem: {
      value: 1,
      magnetRange: 120,
      moveSpeed: 300,
      collectRadius: 20
    }
  },
  progression: {
    baseXPRequired: 10,
    xpMultiplier: 1.5,
    xpGemDropChance: 1.0
  },
  camera: {
    smoothFactor: 0.1
  },
  weapons: {
    basic: {
      damage: 20, // Reduced from 25 for better balance
      fireRate: 2, // 2 shots per second
      projectileSpeed: 500,
      range: 300
    }
  }
};