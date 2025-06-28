/**
 * Progression Balance Test
 * 
 * Tests the player progression timing to ensure good game feel:
 * - First level-up should happen within 20-40 seconds (hook timing)
 * - Level 5 should take 2-3 minutes (not 11 seconds!)
 * - Enemy density should be challenging but not overwhelming
 */

import { GameConfig } from '../config/game';
import { getWaveConfig } from '../config/waveConfig';

interface ProgressionTestResult {
  timeToFirstLevelUp: number;
  timeToLevel5: number;
  enemyDensityAtStart: number;
  enemyDensityAt1Min: number;
  xpRequiredTotal: number;
  averageKillsPerSecond: number;
  balanceScore: 'excellent' | 'good' | 'needs_adjustment' | 'poor';
  recommendations: string[];
}

export class ProgressionBalanceTester {
  
  static testProgression(simulationTimeMs: number = 180000): ProgressionTestResult {
    const results: ProgressionTestResult = {
      timeToFirstLevelUp: 0,
      timeToLevel5: 0,
      enemyDensityAtStart: 0,
      enemyDensityAt1Min: 0,
      xpRequiredTotal: 0,
      averageKillsPerSecond: 0,
      balanceScore: 'poor',
      recommendations: []
    };
    
    // Simulate player progression
    let currentLevel = 1;
    let currentXP = 0;
    let totalXPNeeded = 0;
    let timeMs = 0;
    let totalKills = 0;
    
    // Calculate XP requirements for levels 1-5
    for (let level = 1; level < 5; level++) {
      const xpForThisLevel = this.calculateXPRequired(level);
      totalXPNeeded += xpForThisLevel;
    }
    results.xpRequiredTotal = totalXPNeeded;
    
    // Simulate game progression
    const deltaTime = 100; // 100ms steps
    let killsThisSecond = 0;
    let secondCounter = 0;
    
    while (timeMs < simulationTimeMs && currentLevel < 5) {
      timeMs += deltaTime;
      secondCounter += deltaTime;
      
      // Get current wave configuration
      const currentMinute = Math.floor(timeMs / 60000);
      const waveConfig = getWaveConfig(currentMinute);
      
      // Record enemy density
      if (timeMs === deltaTime) {
        results.enemyDensityAtStart = waveConfig.minEnemies;
      }
      if (Math.abs(timeMs - 60000) < deltaTime) {
        results.enemyDensityAt1Min = waveConfig.minEnemies;
      }
      
      // Simulate combat (simplified)
      const averageKillsPerSecond = this.simulateKillRate(waveConfig, currentLevel);
      const killsThisStep = (averageKillsPerSecond * deltaTime) / 1000;
      
      currentXP += killsThisStep;
      totalKills += killsThisStep;
      killsThisSecond += killsThisStep;
      
      // Check for level up
      const xpNeeded = this.calculateXPRequired(currentLevel);
      if (currentXP >= xpNeeded) {
        currentXP -= xpNeeded;
        currentLevel++;
        
        // Record timing milestones
        if (currentLevel === 2 && results.timeToFirstLevelUp === 0) {
          results.timeToFirstLevelUp = timeMs;
        }
        if (currentLevel === 5 && results.timeToLevel5 === 0) {
          results.timeToLevel5 = timeMs;
          break;
        }
      }
      
      // Calculate average kills per second
      if (secondCounter >= 1000) {
        secondCounter = 0;
        killsThisSecond = 0;
      }
    }
    
    results.averageKillsPerSecond = totalKills / (timeMs / 1000);
    results.balanceScore = this.evaluateBalance(results);
    results.recommendations = this.generateRecommendations(results);
    
    return results;
  }
  
  private static calculateXPRequired(level: number): number {
    return Math.floor(
      GameConfig.progression.baseXPRequired * 
      Math.pow(GameConfig.progression.xpMultiplier, level - 1)
    );
  }
  
  private static simulateKillRate(waveConfig: any, playerLevel: number): number {
    // Simplified kill rate simulation based on:
    // - Enemy density (more enemies = more potential kills)
    // - Player level (higher level = more damage/weapons)
    // - Spawn rate (how fast enemies appear)
    
    const baseKillRate = 2; // kills per second for level 1 player
    const levelMultiplier = 1 + (playerLevel - 1) * 0.3; // 30% increase per level
    const densityFactor = Math.min(waveConfig.minEnemies / 20, 3); // More enemies = more kills, capped
    const spawnFactor = 1000 / waveConfig.spawnInterval; // Faster spawning = more targets
    
    return baseKillRate * levelMultiplier * densityFactor * spawnFactor;
  }
  
  private static evaluateBalance(results: ProgressionTestResult): 'excellent' | 'good' | 'needs_adjustment' | 'poor' {
    const firstLevelUpSecs = results.timeToFirstLevelUp / 1000;
    const level5Mins = results.timeToLevel5 / 60000;
    
    // Ideal ranges based on game design research
    const idealFirstLevelUp = firstLevelUpSecs >= 15 && firstLevelUpSecs <= 45; // 15-45 seconds
    const idealLevel5Timing = level5Mins >= 1.5 && level5Mins <= 4; // 1.5-4 minutes
    const idealEnemyDensity = results.enemyDensityAtStart >= 15 && results.enemyDensityAtStart <= 25;
    
    const goodFactors = [idealFirstLevelUp, idealLevel5Timing, idealEnemyDensity].filter(Boolean).length;
    
    if (goodFactors === 3) return 'excellent';
    if (goodFactors === 2) return 'good';
    if (goodFactors === 1) return 'needs_adjustment';
    return 'poor';
  }
  
  private static generateRecommendations(results: ProgressionTestResult): string[] {
    const recommendations: string[] = [];
    const firstLevelUpSecs = results.timeToFirstLevelUp / 1000;
    const level5Mins = results.timeToLevel5 / 60000;
    
    // First level-up timing
    if (firstLevelUpSecs < 15) {
      recommendations.push(`First level-up too fast (${firstLevelUpSecs.toFixed(1)}s). Increase baseXPRequired or reduce enemy density.`);
    } else if (firstLevelUpSecs > 45) {
      recommendations.push(`First level-up too slow (${firstLevelUpSecs.toFixed(1)}s). Decrease baseXPRequired or increase enemy density.`);
    }
    
    // Level 5 timing
    if (level5Mins < 1.5) {
      recommendations.push(`Level 5 reached too quickly (${level5Mins.toFixed(1)} min). Increase XP requirements or reduce kill rate.`);
    } else if (level5Mins > 4) {
      recommendations.push(`Level 5 takes too long (${level5Mins.toFixed(1)} min). Reduce XP requirements or increase kill rate.`);
    }
    
    // Enemy density
    if (results.enemyDensityAtStart < 15) {
      recommendations.push(`Starting enemy density too low (${results.enemyDensityAtStart}). May not create enough immediate tension.`);
    } else if (results.enemyDensityAtStart > 25) {
      recommendations.push(`Starting enemy density too high (${results.enemyDensityAtStart}). May overwhelm new players.`);
    }
    
    // Kill rate
    if (results.averageKillsPerSecond < 1) {
      recommendations.push(`Kill rate too low (${results.averageKillsPerSecond.toFixed(1)}/sec). Combat may feel sluggish.`);
    } else if (results.averageKillsPerSecond > 5) {
      recommendations.push(`Kill rate too high (${results.averageKillsPerSecond.toFixed(1)}/sec). May create chaos instead of strategy.`);
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Balance looks good! Continue monitoring with real player data.');
    }
    
    return recommendations;
  }
  
  // Helper method for running quick balance checks
  static quickBalanceCheck(): void {
    console.log('🎮 Running Progression Balance Test...\n');
    
    const results = this.testProgression();
    
    console.log('📊 PROGRESSION BALANCE RESULTS:');
    console.log(`⏱️  First Level-Up: ${(results.timeToFirstLevelUp / 1000).toFixed(1)} seconds`);
    console.log(`🎯 Level 5 Reached: ${(results.timeToLevel5 / 60000).toFixed(1)} minutes`);
    console.log(`👹 Starting Enemies: ${results.enemyDensityAtStart}`);
    console.log(`👹 1-Minute Enemies: ${results.enemyDensityAt1Min}`);
    console.log(`💀 Average Kill Rate: ${results.averageKillsPerSecond.toFixed(1)} per second`);
    console.log(`📈 Total XP Required: ${results.xpRequiredTotal.toFixed(0)}`);
    console.log(`🏆 Balance Score: ${results.balanceScore.toUpperCase()}\n`);
    
    console.log('💡 RECOMMENDATIONS:');
    results.recommendations.forEach((rec, i) => {
      console.log(`${i + 1}. ${rec}`);
    });
  }
}

// Export for use in browser console or test runners
if (typeof window !== 'undefined') {
  (window as any).testProgression = () => ProgressionBalanceTester.quickBalanceCheck();
}

// Run test immediately if called directly (for Node.js testing)
if (typeof require !== 'undefined' && require.main === module) {
  ProgressionBalanceTester.quickBalanceCheck();
}