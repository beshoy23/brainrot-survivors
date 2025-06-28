/**
 * Core Game Balance Test Suite
 * 
 * Tests fundamental game systems that weren't covered by weapon/upgrade tests:
 * - Enemy speed vs player speed relationships
 * - Enemy scaling over time vs player power scaling
 * - Wave spawn logic vs player capability
 * - XP pickup mechanics and economy
 * - Critical movement and positioning balance
 */

interface EnemyTypeForBalance {
  name: string;
  baseSpeed: number;
  baseHealth: number;
  baseDamage: number;
  spawnWeight: number;
}

interface PlayerProgressionPoint {
  timeMinutes: number;
  level: number;
  estimatedUpgrades: {
    damage: number;
    fireRate: number;
    moveSpeed: number;
    armor: number;
  };
}

interface GameBalanceResult {
  timePoint: string;
  playerSpeed: number;
  enemySpeedRange: string;
  canPlayerEscape: boolean;
  playerDPS: number;
  enemyHealthRange: string;
  killTimeRange: string;
  spawnRate: number;
  spawnCount: number;
  playerSurvivability: 'impossible' | 'hard' | 'balanced' | 'easy' | 'trivial';
  recommendations: string[];
}

export class CoreGameBalanceTester {
  
  // Enemy configurations from the game
  private static readonly ENEMY_TYPES: EnemyTypeForBalance[] = [
    { name: 'basic', baseSpeed: 120, baseHealth: 4, baseDamage: 2, spawnWeight: 0.4 },
    { name: 'fast', baseSpeed: 220, baseHealth: 3, baseDamage: 1, spawnWeight: 0.25 },
    { name: 'tank', baseSpeed: 60, baseHealth: 35, baseDamage: 5, spawnWeight: 0.15 },
    { name: 'swarm', baseSpeed: 140, baseHealth: 2, baseDamage: 1, spawnWeight: 0.15 },
    { name: 'elite', baseSpeed: 100, baseHealth: 120, baseDamage: 8, spawnWeight: 0.05 }
  ];
  
  // Player progression milestones
  private static readonly PROGRESSION_POINTS: PlayerProgressionPoint[] = [
    { timeMinutes: 0, level: 1, estimatedUpgrades: { damage: 0, fireRate: 0, moveSpeed: 0, armor: 0 } },
    { timeMinutes: 1, level: 3, estimatedUpgrades: { damage: 1, fireRate: 0, moveSpeed: 0, armor: 0 } },
    { timeMinutes: 3, level: 6, estimatedUpgrades: { damage: 2, fireRate: 1, moveSpeed: 1, armor: 0 } },
    { timeMinutes: 5, level: 10, estimatedUpgrades: { damage: 3, fireRate: 2, moveSpeed: 2, armor: 1 } },
    { timeMinutes: 8, level: 15, estimatedUpgrades: { damage: 4, fireRate: 3, moveSpeed: 3, armor: 2 } },
    { timeMinutes: 12, level: 20, estimatedUpgrades: { damage: 5, fireRate: 4, moveSpeed: 4, armor: 3 } },
    { timeMinutes: 20, level: 30, estimatedUpgrades: { damage: 6, fireRate: 5, moveSpeed: 5, armor: 4 } }
  ];
  
  static testCoreGameBalance(): GameBalanceResult[] {
    console.log('🎮 Running Core Game Balance Test Suite...\n');
    
    const results: GameBalanceResult[] = [];
    
    for (const point of this.PROGRESSION_POINTS) {
      const result = this.testBalanceAtTimePoint(point);
      results.push(result);
      this.printBalanceResult(result);
    }
    
    console.log('\n📊 CORE BALANCE SUMMARY:');
    this.printCoreSummary(results);
    
    console.log('\n🚨 CRITICAL ISSUES FOUND:');
    this.identifyCriticalIssues(results);
    
    return results;
  }
  
  private static testBalanceAtTimePoint(point: PlayerProgressionPoint): GameBalanceResult {
    // Calculate player stats at this time point
    const basePlayerSpeed = 200;
    const speedUpgrade = 1 + (point.estimatedUpgrades.moveSpeed * 0.1);
    const playerSpeed = basePlayerSpeed * speedUpgrade;
    
    // Calculate player DPS
    const baseDamage = 20;
    const damageMultiplier = 1 + (point.estimatedUpgrades.damage * 0.1);
    const fireRateMultiplier = 1 + (point.estimatedUpgrades.fireRate * 0.15);
    const playerDPS = baseDamage * damageMultiplier * fireRateMultiplier;
    
    // Calculate enemy scaling
    const healthScaling = this.calculateEnemyHealthScaling(point.timeMinutes);
    const damageScaling = this.calculateEnemyDamageScaling(point.timeMinutes);
    
    // Calculate spawn mechanics
    const spawnData = this.calculateSpawnRate(point.timeMinutes);
    
    // Calculate enemy speed ranges with aggression
    const enemySpeeds = this.ENEMY_TYPES.map(enemy => ({
      name: enemy.name,
      minSpeed: enemy.baseSpeed,
      maxSpeed: enemy.baseSpeed * 1.2, // +20% aggression
      scaledHealth: enemy.baseHealth * healthScaling,
      scaledDamage: enemy.baseDamage + damageScaling
    }));
    
    // Determine if player can escape fastest enemies
    const fastestEnemySpeed = Math.max(...enemySpeeds.map(e => e.maxSpeed));
    const canPlayerEscape = playerSpeed > fastestEnemySpeed;
    
    // Calculate kill time ranges
    const killTimes = enemySpeeds.map(enemy => 
      enemy.scaledHealth / playerDPS
    );
    const killTimeRange = `${Math.min(...killTimes).toFixed(1)}s - ${Math.max(...killTimes).toFixed(1)}s`;
    
    // Calculate survivability
    const survivability = this.assessSurvivability(
      point, 
      playerSpeed, 
      fastestEnemySpeed, 
      playerDPS, 
      killTimes, 
      spawnData.spawnRate,
      point.estimatedUpgrades.armor
    );
    
    // Generate recommendations
    const recommendations = this.generateCoreRecommendations(
      point.timeMinutes,
      canPlayerEscape,
      killTimes,
      spawnData,
      survivability
    );
    
    return {
      timePoint: `${point.timeMinutes}min (Lvl ${point.level})`,
      playerSpeed,
      enemySpeedRange: `${Math.min(...enemySpeeds.map(e => e.minSpeed))} - ${fastestEnemySpeed.toFixed(0)}`,
      canPlayerEscape,
      playerDPS,
      enemyHealthRange: `${Math.min(...enemySpeeds.map(e => e.scaledHealth)).toFixed(0)} - ${Math.max(...enemySpeeds.map(e => e.scaledHealth)).toFixed(0)} HP`,
      killTimeRange,
      spawnRate: spawnData.spawnRate,
      spawnCount: spawnData.enemyCount,
      playerSurvivability: survivability,
      recommendations
    };
  }
  
  private static calculateEnemyHealthScaling(minutes: number): number {
    // +10% health every 30 seconds, caps at +100% after 5 minutes
    const scalingIntervals = Math.floor(minutes * 2); // Every 30 seconds
    const healthIncrease = Math.min(scalingIntervals * 0.1, 1.0); // Cap at 100%
    return 1 + healthIncrease;
  }
  
  private static calculateEnemyDamageScaling(minutes: number): number {
    // +1 flat damage every 2 minutes, caps at +10 after 20 minutes
    const damageIntervals = Math.floor(minutes / 2); // Every 2 minutes
    return Math.min(damageIntervals, 10); // Cap at +10 damage
  }
  
  private static calculateSpawnRate(minutes: number): { spawnRate: number, enemyCount: number } {
    // Wave configuration scaling
    const baseInterval = 1200; // 1.2 seconds
    const minInterval = 100; // 0.1 seconds
    const scaleTime = 8 * 60; // 8 minutes in seconds
    
    const currentTime = minutes * 60;
    const progress = Math.min(currentTime / scaleTime, 1);
    
    const spawnInterval = baseInterval - ((baseInterval - minInterval) * progress);
    const spawnRate = 1000 / spawnInterval; // spawns per second
    
    // Enemy count scaling
    const baseCount = 15;
    const maxCount = 650;
    const enemyCount = baseCount + ((maxCount - baseCount) * progress);
    
    return { spawnRate, enemyCount };
  }
  
  private static assessSurvivability(
    point: PlayerProgressionPoint,
    playerSpeed: number,
    fastestEnemySpeed: number,
    playerDPS: number,
    killTimes: number[],
    spawnRate: number,
    armorLevel: number
  ): 'impossible' | 'hard' | 'balanced' | 'easy' | 'trivial' {
    
    let survivalScore = 0;
    
    // Speed factor (can player escape?)
    if (playerSpeed > fastestEnemySpeed * 1.1) survivalScore += 2; // 10% speed advantage
    else if (playerSpeed > fastestEnemySpeed) survivalScore += 1;
    else if (playerSpeed < fastestEnemySpeed * 0.9) survivalScore -= 2; // Can't escape
    else survivalScore -= 1;
    
    // Kill speed factor
    const avgKillTime = killTimes.reduce((a, b) => a + b, 0) / killTimes.length;
    if (avgKillTime < 0.5) survivalScore += 2; // Very fast kills
    else if (avgKillTime < 1.0) survivalScore += 1; // Fast kills
    else if (avgKillTime > 3.0) survivalScore -= 2; // Very slow kills
    else if (avgKillTime > 2.0) survivalScore -= 1; // Slow kills
    
    // Spawn pressure factor
    const killsPerSecond = 1 / avgKillTime;
    const spawnPressure = spawnRate / killsPerSecond;
    if (spawnPressure < 0.5) survivalScore += 2; // Killing faster than spawning
    else if (spawnPressure < 0.8) survivalScore += 1; // Keeping up
    else if (spawnPressure > 2.0) survivalScore -= 2; // Overwhelmed
    else if (spawnPressure > 1.2) survivalScore -= 1; // Struggling
    
    // Armor factor
    const armorReduction = Math.min(armorLevel * 0.15, 0.6);
    if (armorReduction > 0.4) survivalScore += 1; // Good armor
    
    // Convert score to survivability
    if (survivalScore >= 4) return 'trivial';
    if (survivalScore >= 2) return 'easy';
    if (survivalScore >= -1) return 'balanced';
    if (survivalScore >= -3) return 'hard';
    return 'impossible';
  }
  
  private static generateCoreRecommendations(
    minutes: number,
    canEscape: boolean,
    killTimes: number[],
    spawnData: any,
    survivability: string
  ): string[] {
    const recommendations: string[] = [];
    
    if (!canEscape) {
      recommendations.push('🚨 CRITICAL: Player cannot escape fastest enemies! Fast enemies too fast or player too slow.');
    }
    
    const avgKillTime = killTimes.reduce((a, b) => a + b, 0) / killTimes.length;
    if (avgKillTime > 2.0) {
      recommendations.push('⚔️ Enemies too tanky for current player DPS. Consider weapon damage buffs.');
    }
    
    if (survivability === 'impossible') {
      recommendations.push('💀 GAME BREAKING: Impossible difficulty spike. Immediate balance fix needed.');
    } else if (survivability === 'trivial') {
      recommendations.push('😴 TOO EASY: Player overpowered. Consider enemy buffs or player nerfs.');
    }
    
    const spawnPressure = spawnData.spawnRate / (1 / avgKillTime);
    if (spawnPressure > 1.5) {
      recommendations.push('🌊 Spawn rate too high. Player cannot clear enemies fast enough.');
    }
    
    if (minutes >= 5 && survivability === 'balanced') {
      recommendations.push('✅ Good balance maintained through enemy scaling.');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('✅ Core balance appears healthy at this time point.');
    }
    
    return recommendations;
  }
  
  private static printBalanceResult(result: GameBalanceResult): void {
    const escapeStatus = result.canPlayerEscape ? '✅ CAN ESCAPE' : '🚨 CANNOT ESCAPE';
    const survivalEmoji = {
      'impossible': '💀',
      'hard': '😰', 
      'balanced': '✅',
      'easy': '😊',
      'trivial': '😴'
    }[result.playerSurvivability];
    
    console.log(`\n⏰ ${result.timePoint}:`);
    console.log(`   Speed: Player ${result.playerSpeed.toFixed(0)} vs Enemies ${result.enemySpeedRange} - ${escapeStatus}`);
    console.log(`   Combat: ${result.playerDPS.toFixed(1)} DPS vs ${result.enemyHealthRange} - TTK: ${result.killTimeRange}`);
    console.log(`   Spawn: ${result.spawnRate.toFixed(1)}/s rate, ${result.spawnCount.toFixed(0)} total enemies`);
    console.log(`   Survivability: ${survivalEmoji} ${result.playerSurvivability.toUpperCase()}`);
    
    if (result.recommendations.length > 0 && !result.recommendations[0].startsWith('✅')) {
      console.log(`   💡 ${result.recommendations[0]}`);
    }
  }
  
  private static printCoreSummary(results: GameBalanceResult[]): void {
    const impossiblePoints = results.filter(r => r.playerSurvivability === 'impossible').length;
    const trivialPoints = results.filter(r => r.playerSurvivability === 'trivial').length;
    const balancedPoints = results.filter(r => r.playerSurvivability === 'balanced').length;
    const cannotEscapePoints = results.filter(r => !r.canPlayerEscape).length;
    
    console.log(`🏆 Survivability Distribution:`);
    console.log(`   Impossible: ${impossiblePoints} | Balanced: ${balancedPoints} | Trivial: ${trivialPoints}`);
    console.log(`   Cannot Escape Fast Enemies: ${cannotEscapePoints} time points`);
    
    const avgEarlyDPS = results.slice(0, 3).reduce((sum, r) => sum + r.playerDPS, 0) / 3;
    const avgLateDPS = results.slice(-3).reduce((sum, r) => sum + r.playerDPS, 0) / 3;
    console.log(`📊 DPS Progression: Early ${avgEarlyDPS.toFixed(1)} → Late ${avgLateDPS.toFixed(1)} (${((avgLateDPS / avgEarlyDPS - 1) * 100).toFixed(0)}% increase)`);
    
    const earlySpawn = results[1].spawnRate;
    const lateSpawn = results[results.length - 1].spawnRate;
    console.log(`🌊 Spawn Pressure: Early ${earlySpawn.toFixed(1)}/s → Late ${lateSpawn.toFixed(1)}/s (${((lateSpawn / earlySpawn - 1) * 100).toFixed(0)}% increase)`);
  }
  
  private static identifyCriticalIssues(results: GameBalanceResult[]): void {
    const criticalIssues: string[] = [];
    
    // Check if player can ever not escape
    const cannotEscapePoints = results.filter(r => !r.canPlayerEscape);
    if (cannotEscapePoints.length > 0) {
      criticalIssues.push(`🚨 CRITICAL: Player cannot escape fast enemies at ${cannotEscapePoints.length} time points`);
    }
    
    // Check for impossible difficulty spikes
    const impossiblePoints = results.filter(r => r.playerSurvivability === 'impossible');
    if (impossiblePoints.length > 0) {
      criticalIssues.push(`💀 GAME BREAKING: Impossible difficulty at ${impossiblePoints.map(p => p.timePoint).join(', ')}`);
    }
    
    // Check for sustained trivial difficulty
    const trivialSequence = results.slice(-3).every(r => r.playerSurvivability === 'trivial');
    if (trivialSequence) {
      criticalIssues.push(`😴 LATE GAME TOO EASY: Player becomes overpowered in final progression`);
    }
    
    // Check spawn rate vs kill rate balance
    const overwhelmedPoints = results.filter(r => {
      const avgKillTime = 1.5; // Estimate from kill time ranges
      return r.spawnRate > (1 / avgKillTime) * 1.5;
    });
    if (overwhelmedPoints.length > 2) {
      criticalIssues.push(`🌊 SPAWN OVERLOAD: Spawn rate exceeds player capability at multiple points`);
    }
    
    if (criticalIssues.length === 0) {
      console.log('✅ No critical balance issues detected in core systems!');
    } else {
      criticalIssues.forEach(issue => console.log(issue));
    }
  }
  
  // Quick test for browser console
  static quickCoreTest(): void {
    this.testCoreGameBalance();
  }
}

// Export for browser console  
if (typeof window !== 'undefined') {
  (window as any).testCoreBalance = () => CoreGameBalanceTester.quickCoreTest();
}

// Allow running from command line
if (typeof require !== 'undefined' && require.main === module) {
  CoreGameBalanceTester.testCoreGameBalance();
}