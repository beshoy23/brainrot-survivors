import { GameConfig } from '../config/game';
import { ENEMY_TYPES } from '../config/enemyTypes';
import { UPGRADES } from '../config/upgrades';

export class GameBalanceAnalyzer {
  
  // Calculate total enemies spawned by time X
  static calculateEnemiesSpawned(seconds: number): {
    total: number;
    byType: Record<string, number>;
    spawnRate: number;
  } {
    let totalEnemies = 0;
    let currentSpawnRate = GameConfig.spawning.baseSpawnRate;
    let time = 0;
    const enemiesByType: Record<string, number> = {};
    
    // Simulate spawn system
    while (time < seconds * 1000) {
      time += currentSpawnRate;
      
      // Get available enemy types at this time
      const availableTypes = Object.values(ENEMY_TYPES).filter(
        type => type.minWaveTime <= time / 1000 && type.spawnWeight > 0
      );
      
      if (availableTypes.length > 0) {
        // Weighted random selection simulation
        const totalWeight = availableTypes.reduce((sum, type) => sum + type.spawnWeight, 0);
        availableTypes.forEach(type => {
          const probability = type.spawnWeight / totalWeight;
          const count = type.spawnGroupSize || 1;
          const expectedSpawns = probability * count;
          
          enemiesByType[type.id] = (enemiesByType[type.id] || 0) + expectedSpawns;
          totalEnemies += expectedSpawns;
        });
      }
      
      // Update spawn rate
      currentSpawnRate = Math.max(
        GameConfig.spawning.minSpawnRate,
        currentSpawnRate * GameConfig.spawning.spawnAcceleration
      );
    }
    
    // Add elite spawns
    const eliteSpawns = Math.floor((seconds - ENEMY_TYPES.elite.minWaveTime) / 60);
    if (eliteSpawns > 0) {
      enemiesByType.elite = eliteSpawns;
      totalEnemies += eliteSpawns;
    }
    
    return {
      total: Math.floor(totalEnemies),
      byType: enemiesByType,
      spawnRate: currentSpawnRate
    };
  }
  
  // Calculate enemy pressure (enemies on screen at once)
  static calculateEnemyPressure(seconds: number): {
    averageOnScreen: number;
    maxOnScreen: number;
    dpsIncoming: number;
  } {
    const spawnData = this.calculateEnemiesSpawned(seconds);
    const averageEnemyLifespan = 5; // seconds (depends on player DPS)
    
    // Enemies on screen = spawn rate * average lifespan
    const spawnPerSecond = 1000 / spawnData.spawnRate;
    const averageOnScreen = spawnPerSecond * averageEnemyLifespan;
    
    // Calculate incoming DPS
    let totalIncomingDPS = 0;
    Object.entries(spawnData.byType).forEach(([typeId, count]) => {
      const enemyType = ENEMY_TYPES[typeId as keyof typeof ENEMY_TYPES];
      if (enemyType) {
        const percentOnScreen = count / spawnData.total;
        const enemiesOfType = averageOnScreen * percentOnScreen;
        totalIncomingDPS += enemiesOfType * (enemyType.damage / 2); // Damage every 0.5s
      }
    });
    
    return {
      averageOnScreen: Math.floor(averageOnScreen),
      maxOnScreen: Math.floor(averageOnScreen * 1.5),
      dpsIncoming: Math.floor(totalIncomingDPS)
    };
  }
  
  // Calculate player power at given upgrade levels
  static calculatePlayerPower(upgradeLevels: Record<string, number>): {
    dps: number;
    survivability: number;
    clearSpeed: number;
  } {
    const baseWeapon = GameConfig.weapons.basic;
    
    // Calculate DPS
    const damageMultiplier = 1 + (upgradeLevels.damage || 0) * 0.25;
    const fireRateMultiplier = 1 + (upgradeLevels.fireRate || 0) * 0.2;
    const projectileCount = 1 + (upgradeLevels.projectileCount || 0);
    
    const damagePerShot = baseWeapon.damage * damageMultiplier;
    const shotsPerSecond = baseWeapon.fireRate * fireRateMultiplier;
    const dps = damagePerShot * shotsPerSecond * projectileCount;
    
    // Calculate survivability
    const maxHealth = GameConfig.player.maxHealth + (upgradeLevels.maxHealth || 0) * 20;
    const damageReduction = 1 - (upgradeLevels.armor || 0) * 0.1;
    const regenPerSecond = (upgradeLevels.healthRegen || 0) / 5;
    const moveSpeedBonus = 1 + (upgradeLevels.moveSpeed || 0) * 0.1;
    
    const survivability = (maxHealth / damageReduction) + (regenPerSecond * 10) + (moveSpeedBonus * 50);
    
    // Clear speed combines DPS with utility
    const xpBonus = 1 + (upgradeLevels.xpBonus || 0) * 0.2;
    const magnetBonus = 1 + (upgradeLevels.xpMagnet || 0) * 0.3;
    const clearSpeed = dps * xpBonus * Math.sqrt(magnetBonus);
    
    return {
      dps: Math.floor(dps),
      survivability: Math.floor(survivability),
      clearSpeed: Math.floor(clearSpeed)
    };
  }
  
  // Generate difficulty curve report
  static generateDifficultyReport(): string {
    const report: string[] = ['=== GAME BALANCE REPORT ===\n'];
    
    // Time checkpoints
    const checkpoints = [30, 60, 120, 180, 300, 600];
    
    report.push('ENEMY SPAWNING OVER TIME:');
    checkpoints.forEach(seconds => {
      const spawn = this.calculateEnemiesSpawned(seconds);
      const pressure = this.calculateEnemyPressure(seconds);
      
      report.push(`\nAt ${seconds}s (${Math.floor(seconds/60)}m ${seconds%60}s):`);
      report.push(`  Total enemies spawned: ${spawn.total}`);
      report.push(`  Spawn interval: ${spawn.spawnRate}ms`);
      report.push(`  Enemies on screen: ~${pressure.averageOnScreen}-${pressure.maxOnScreen}`);
      report.push(`  Incoming DPS: ${pressure.dpsIncoming}`);
      report.push('  Enemy composition:');
      
      Object.entries(spawn.byType).forEach(([type, count]) => {
        const percent = (count / spawn.total * 100).toFixed(1);
        report.push(`    ${type}: ${count.toFixed(0)} (${percent}%)`);
      });
    });
    
    // Player power progression
    report.push('\n\nPLAYER POWER PROGRESSION:');
    const upgradeScenarios = [
      { name: 'No upgrades', levels: {} },
      { name: 'Balanced (all level 1)', levels: { damage: 1, fireRate: 1, moveSpeed: 1, maxHealth: 1 } },
      { name: 'DPS focused', levels: { damage: 3, fireRate: 2, projectileCount: 2 } },
      { name: 'Tank build', levels: { maxHealth: 5, armor: 3, healthRegen: 3 } },
      { name: 'Max build (level 10)', levels: { damage: 5, fireRate: 3, projectileCount: 3, maxHealth: 5, armor: 3 } }
    ];
    
    upgradeScenarios.forEach(scenario => {
      const power = this.calculatePlayerPower(scenario.levels);
      report.push(`\n${scenario.name}:`);
      report.push(`  DPS: ${power.dps}`);
      report.push(`  Survivability: ${power.survivability}`);
      report.push(`  Clear Speed: ${power.clearSpeed}`);
    });
    
    // Balance recommendations
    report.push('\n\nBALANCE ANALYSIS:');
    
    // Check if player power scales with enemy pressure
    const early = this.calculateEnemyPressure(60);
    const mid = this.calculateEnemyPressure(180);
    const late = this.calculateEnemyPressure(600);
    
    const noPower = this.calculatePlayerPower({});
    const midPower = this.calculatePlayerPower({ damage: 2, fireRate: 1, maxHealth: 2 });
    const latePower = this.calculatePlayerPower({ damage: 4, fireRate: 2, projectileCount: 2, maxHealth: 4 });
    
    report.push(`\nDPS vs Incoming Damage:`);
    report.push(`  Early (1m): Player ${noPower.dps} vs Enemy ${early.dpsIncoming} (ratio: ${(noPower.dps/early.dpsIncoming).toFixed(2)})`);
    report.push(`  Mid (3m): Player ${midPower.dps} vs Enemy ${mid.dpsIncoming} (ratio: ${(midPower.dps/mid.dpsIncoming).toFixed(2)})`);
    report.push(`  Late (10m): Player ${latePower.dps} vs Enemy ${late.dpsIncoming} (ratio: ${(latePower.dps/late.dpsIncoming).toFixed(2)})`);
    
    return report.join('\n');
  }
  
  // Calculate time to kill for each enemy type
  static calculateTTK(playerDPS: number): Record<string, number> {
    const ttk: Record<string, number> = {};
    
    Object.entries(ENEMY_TYPES).forEach(([id, enemy]) => {
      ttk[id] = enemy.health / playerDPS;
    });
    
    return ttk;
  }
  
  // Simulate a run to find balance issues
  static simulateRun(durationSeconds: number, upgradeStrategy: 'balanced' | 'dps' | 'tank' = 'balanced'): {
    survivalTime: number;
    finalLevel: number;
    enemiesKilled: number;
    damageDealt: number;
    damageTaken: number;
  } {
    // This would be a more complex simulation
    // For now, return estimated values based on balance
    
    const avgUpgradeLevel = Math.floor(durationSeconds / 30); // Rough estimate
    const upgrades: Record<string, number> = {};
    
    switch (upgradeStrategy) {
      case 'dps':
        upgrades.damage = Math.floor(avgUpgradeLevel * 0.5);
        upgrades.fireRate = Math.floor(avgUpgradeLevel * 0.3);
        upgrades.projectileCount = Math.floor(avgUpgradeLevel * 0.2);
        break;
      case 'tank':
        upgrades.maxHealth = Math.floor(avgUpgradeLevel * 0.4);
        upgrades.armor = Math.floor(avgUpgradeLevel * 0.3);
        upgrades.healthRegen = Math.floor(avgUpgradeLevel * 0.3);
        break;
      default:
        // Balanced
        Object.keys(UPGRADES).forEach(key => {
          upgrades[key] = Math.floor(avgUpgradeLevel / 3);
        });
    }
    
    const power = this.calculatePlayerPower(upgrades);
    const spawn = this.calculateEnemiesSpawned(durationSeconds);
    
    return {
      survivalTime: durationSeconds,
      finalLevel: avgUpgradeLevel,
      enemiesKilled: Math.floor(spawn.total * 0.8),
      damageDealt: power.dps * durationSeconds,
      damageTaken: 1000 // Rough estimate
    };
  }
}