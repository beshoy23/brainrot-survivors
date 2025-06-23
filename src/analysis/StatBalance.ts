import { GameConfig } from '../config/game';
import { UPGRADES } from '../config/upgrades';
import { ENEMY_TYPES } from '../config/enemyTypes';

interface BalanceMetrics {
  xpPerMinute: number;
  levelsPerMinute: number;
  upgradesPerLevel: number;
  powerGrowthRate: number;
  difficultyGrowthRate: number;
  balanceRatio: number; // Player power vs enemy difficulty
}

export class StatBalanceAnalyzer {
  
  // Analyze XP economy
  static analyzeXPEconomy(timeSeconds: number): {
    totalXP: number;
    levelsGained: number;
    xpPerMinute: number;
    avgSecondsPerLevel: number;
  } {
    // Calculate enemies killed (rough estimate)
    const spawn = this.getEnemySpawnData(timeSeconds);
    const killRate = 0.8; // Assume 80% kill rate
    const enemiesKilled = Math.floor(spawn.total * killRate);
    
    // XP per enemy (base)
    const xpPerEnemy = GameConfig.pickups.xpGem.value;
    const totalXP = enemiesKilled * xpPerEnemy;
    
    // Calculate levels gained
    let currentLevel = 1;
    let currentXP = 0;
    let xpSpent = 0;
    
    while (xpSpent < totalXP) {
      const xpRequired = Math.floor(
        GameConfig.progression.baseXPRequired * 
        Math.pow(GameConfig.progression.xpMultiplier, currentLevel - 1)
      );
      
      if (xpSpent + xpRequired <= totalXP) {
        xpSpent += xpRequired;
        currentLevel++;
      } else {
        break;
      }
    }
    
    return {
      totalXP,
      levelsGained: currentLevel - 1,
      xpPerMinute: (totalXP / timeSeconds) * 60,
      avgSecondsPerLevel: currentLevel > 1 ? timeSeconds / (currentLevel - 1) : 0
    };
  }
  
  // Calculate game balance over time
  static calculateBalance(checkpoints: number[] = [30, 60, 120, 180, 300, 600]): BalanceMetrics[] {
    return checkpoints.map(seconds => {
      const xpData = this.analyzeXPEconomy(seconds);
      const enemyPressure = this.calculateEnemyPressure(seconds);
      const playerPower = this.estimatePlayerPower(xpData.levelsGained);
      
      // Growth rates
      const powerGrowthRate = playerPower / seconds;
      const difficultyGrowthRate = enemyPressure / seconds;
      
      return {
        xpPerMinute: xpData.xpPerMinute,
        levelsPerMinute: (xpData.levelsGained / seconds) * 60,
        upgradesPerLevel: 3, // Average choices
        powerGrowthRate,
        difficultyGrowthRate,
        balanceRatio: playerPower / enemyPressure
      };
    });
  }
  
  // Generate comprehensive balance report
  static generateBalanceReport(): string {
    const report: string[] = ['=== STAT BALANCE REPORT ===\n'];
    
    // XP Economy
    report.push('XP ECONOMY ANALYSIS:');
    const xpCheckpoints = [60, 180, 300, 600];
    
    xpCheckpoints.forEach(seconds => {
      const xp = this.analyzeXPEconomy(seconds);
      report.push(`\nAt ${seconds}s (${Math.floor(seconds/60)}m):`);
      report.push(`  Total XP earned: ${xp.totalXP}`);
      report.push(`  Levels gained: ${xp.levelsGained}`);
      report.push(`  XP per minute: ${xp.xpPerMinute.toFixed(0)}`);
      report.push(`  Avg seconds per level: ${xp.avgSecondsPerLevel.toFixed(1)}`);
    });
    
    // Upgrade Distribution
    report.push('\n\nUPGRADE ECONOMY:');
    const totalUpgrades = Object.keys(UPGRADES).length;
    const maxLevels = Object.values(UPGRADES).reduce((sum, u) => sum + u.maxLevel, 0);
    
    report.push(`  Total upgrade types: ${totalUpgrades}`);
    report.push(`  Total upgrade levels available: ${maxLevels}`);
    report.push(`  Levels needed to max everything: ${maxLevels}`);
    
    // Time to max calculations
    const avgUpgradesPerLevel = 1; // One upgrade per level
    const levelsToMax = maxLevels / avgUpgradesPerLevel;
    const xpToMax = this.calculateTotalXPForLevel(levelsToMax);
    const enemiesForXP = xpToMax / GameConfig.pickups.xpGem.value;
    
    report.push(`  Estimated time to max build: ${this.estimateTimeForEnemies(enemiesForXP)}s`);
    
    // Power Curve Analysis
    report.push('\n\nPOWER CURVE ANALYSIS:');
    const balanceData = this.calculateBalance();
    
    balanceData.forEach((data, index) => {
      const time = [30, 60, 120, 180, 300, 600][index];
      report.push(`\n${time}s (${Math.floor(time/60)}m):`);
      report.push(`  Levels/minute: ${data.levelsPerMinute.toFixed(2)}`);
      report.push(`  Power growth: ${data.powerGrowthRate.toFixed(2)}/s`);
      report.push(`  Difficulty growth: ${data.difficultyGrowthRate.toFixed(2)}/s`);
      report.push(`  Balance ratio: ${data.balanceRatio.toFixed(2)} ${this.getBalanceAssessment(data.balanceRatio)}`);
    });
    
    // Stat Effectiveness Analysis
    report.push('\n\nSTAT EFFECTIVENESS:');
    const statEffectiveness = this.analyzeStatEffectiveness();
    
    Object.entries(statEffectiveness).forEach(([stat, data]) => {
      report.push(`\n${stat}:`);
      report.push(`  Value per level: ${data.valuePerLevel}`);
      report.push(`  Impact score: ${data.impactScore.toFixed(2)}`);
      report.push(`  Recommendation: ${data.recommendation}`);
    });
    
    return report.join('\n');
  }
  
  // Analyze effectiveness of each stat/upgrade
  private static analyzeStatEffectiveness(): Record<string, {
    valuePerLevel: string;
    impactScore: number;
    recommendation: string;
  }> {
    return {
      damage: {
        valuePerLevel: '+25% damage',
        impactScore: 10, // Highest impact
        recommendation: 'Essential - directly scales all DPS'
      },
      fireRate: {
        valuePerLevel: '+20% attack speed',
        impactScore: 8,
        recommendation: 'High value - multiplicative with damage'
      },
      projectileCount: {
        valuePerLevel: '+1 projectile',
        impactScore: 9,
        recommendation: 'Excellent - best against crowds'
      },
      moveSpeed: {
        valuePerLevel: '+10% speed',
        impactScore: 6,
        recommendation: 'Moderate - improves survivability'
      },
      maxHealth: {
        valuePerLevel: '+20 HP',
        impactScore: 5,
        recommendation: 'Good early, less valuable late'
      },
      healthRegen: {
        valuePerLevel: '+0.2 HP/s',
        impactScore: 4,
        recommendation: 'Low impact - consider buffing'
      },
      xpMagnet: {
        valuePerLevel: '+30% range',
        impactScore: 7,
        recommendation: 'Quality of life - speeds progression'
      },
      xpBonus: {
        valuePerLevel: '+20% XP',
        impactScore: 8,
        recommendation: 'Compound effect - very strong'
      },
      armor: {
        valuePerLevel: '-10% damage',
        impactScore: 6,
        recommendation: 'Solid defensive option'
      }
    };
  }
  
  // Helper functions
  private static getEnemySpawnData(seconds: number): { total: number } {
    let total = 0;
    let time = 0;
    let spawnRate = GameConfig.spawning.baseSpawnRate;
    
    while (time < seconds * 1000) {
      time += spawnRate;
      total++;
      spawnRate = Math.max(
        GameConfig.spawning.minSpawnRate,
        spawnRate * GameConfig.spawning.spawnAcceleration
      );
    }
    
    return { total };
  }
  
  private static calculateEnemyPressure(seconds: number): number {
    // Simplified pressure calculation
    const spawnData = this.getEnemySpawnData(seconds);
    const spawnRate = spawnData.total / seconds;
    return spawnRate * 10; // Rough pressure metric
  }
  
  private static estimatePlayerPower(levels: number): number {
    // Assume balanced upgrade distribution
    const avgUpgradeLevel = levels / Object.keys(UPGRADES).length;
    return 100 + (avgUpgradeLevel * 50); // Rough power metric
  }
  
  private static calculateTotalXPForLevel(targetLevel: number): number {
    let totalXP = 0;
    for (let level = 1; level < targetLevel; level++) {
      totalXP += Math.floor(
        GameConfig.progression.baseXPRequired * 
        Math.pow(GameConfig.progression.xpMultiplier, level - 1)
      );
    }
    return totalXP;
  }
  
  private static estimateTimeForEnemies(enemyCount: number): number {
    // Rough estimate based on spawn rates
    return enemyCount * 2; // Simplified
  }
  
  private static getBalanceAssessment(ratio: number): string {
    if (ratio < 0.5) return '(TOO HARD)';
    if (ratio < 0.8) return '(Challenging)';
    if (ratio < 1.2) return '(Balanced)';
    if (ratio < 1.5) return '(Easy)';
    return '(TOO EASY)';
  }
  
  // Generate tuning recommendations
  static generateTuningRecommendations(): string[] {
    const recommendations: string[] = [];
    
    // Analyze current balance
    const balance = this.calculateBalance();
    const midGame = balance[2]; // 2 minutes
    const lateGame = balance[4]; // 5 minutes
    
    // Check progression speed
    if (midGame.levelsPerMinute < 2) {
      recommendations.push('- Increase XP drops or reduce level requirements');
    }
    if (midGame.levelsPerMinute > 4) {
      recommendations.push('- Reduce XP drops or increase level requirements');
    }
    
    // Check difficulty curve
    if (lateGame.balanceRatio < 0.8) {
      recommendations.push('- Reduce enemy spawn acceleration or increase player power scaling');
    }
    if (lateGame.balanceRatio > 1.5) {
      recommendations.push('- Increase enemy health/damage scaling or add harder enemy types');
    }
    
    // Check specific stats
    const regen = UPGRADES.healthRegen;
    if (regen.getValue(5) < 2) {
      recommendations.push('- Health regen too weak, consider buffing to 0.5 HP/s per level');
    }
    
    return recommendations;
  }
}