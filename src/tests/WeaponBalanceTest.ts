/**
 * Weapon Balance Test System
 * 
 * Simulates different weapon configurations to validate:
 * - DPS (Damage Per Second) curves
 * - Time To Kill (TTK) against different enemy types
 * - Weapon effectiveness at different player levels
 * - Multi-weapon synergy balance
 * - Clear speed and crowd control efficiency
 */

interface WeaponStats {
  name: string;
  damage: number;
  fireRate: number; // shots per second
  projectileSpeed: number;
  range: number;
  projectileCount?: number; // for multi-shot
  penetration?: number; // enemies hit per projectile
  areaOfEffect?: number; // radius for AoE weapons
  criticalChance?: number;
  criticalMultiplier?: number;
}

interface EnemyTypeForTesting {
  name: string;
  health: number;
  speed: number;
  count: number; // typical count on screen
}

interface WeaponTestResult {
  weaponName: string;
  theoreticalDPS: number;
  effectiveDPS: number; // accounting for accuracy, reload, etc.
  timeToKillBasic: number; // seconds to kill basic enemy
  timeToKillTank: number; // seconds to kill tank enemy
  crowdClearRating: number; // 1-10 scale
  effectivenessAtLevel1: number;
  effectivenessAtLevel5: number;
  balanceScore: 'overpowered' | 'strong' | 'balanced' | 'weak' | 'underpowered';
  recommendations: string[];
}

export class WeaponBalanceTester {
  
  // Enemy types for testing
  private static readonly TEST_ENEMIES: EnemyTypeForTesting[] = [
    { name: 'basic', health: 10, speed: 150, count: 15 },
    { name: 'fast', health: 8, speed: 200, count: 20 },
    { name: 'tank', health: 40, speed: 100, count: 8 },
    { name: 'swarm', health: 5, speed: 180, count: 25 },
    { name: 'elite', health: 80, speed: 120, count: 3 }
  ];
  
  // KICK-BASED WEAPON CONFIGURATIONS TO TEST - This is a physics brawler!
  private static readonly WEAPON_CONFIGS: WeaponStats[] = [
    {
      name: 'Basic Kick (Br Attack)',
      damage: 12,
      fireRate: 1.8, // kicks per second
      projectileSpeed: 600,
      range: 30,
      projectileCount: 1,
      penetration: 1
    },
    {
      name: 'Uppercut Technique',
      damage: 15, // Higher damage for single-target
      fireRate: 1.2,
      projectileSpeed: 500,
      range: 35,
      projectileCount: 1,
      penetration: 1
    },
    {
      name: 'Spinning Kick',
      damage: 8, // Lower per hit but hits multiple
      fireRate: 2.5,
      projectileSpeed: 400,
      range: 50,
      areaOfEffect: 50, // 360 degree attack
      penetration: 999 // hits all in range
    },
    {
      name: 'Ground Pound',
      damage: 10, // Moderate damage with shockwave
      fireRate: 3.0,
      projectileSpeed: 300,
      range: 60,
      areaOfEffect: 60, // shockwave area
      penetration: 999 // hits all in shockwave
    },
    {
      name: 'Multi-Kick (Upgraded)',
      damage: 12, // Same base damage
      fireRate: 1.8,
      projectileSpeed: 600,
      range: 30,
      projectileCount: 2, // Hits multiple enemies per kick
      penetration: 2 // Can hit 2 enemies
    }
  ];
  
  static testAllWeapons(): WeaponTestResult[] {
    console.log('⚔️ Running Weapon Balance Test Suite...\n');
    
    const results: WeaponTestResult[] = [];
    
    for (const weapon of this.WEAPON_CONFIGS) {
      const result = this.testSingleWeapon(weapon);
      results.push(result);
      this.printWeaponResult(result);
    }
    
    console.log('\n📊 WEAPON BALANCE SUMMARY:');
    this.printBalanceSummary(results);
    
    return results;
  }
  
  private static testSingleWeapon(weapon: WeaponStats): WeaponTestResult {
    // Calculate theoretical DPS
    const baseDPS = weapon.damage * weapon.fireRate;
    const critMultiplier = weapon.criticalChance ? 
      (1 + weapon.criticalChance * (weapon.criticalMultiplier || 2 - 1)) : 1;
    const theoreticalDPS = baseDPS * critMultiplier * (weapon.projectileCount || 1);
    
    // Calculate effective DPS (accounting for real-world factors)
    const accuracyFactor = this.calculateAccuracyFactor(weapon);
    const crowdFactor = this.calculateCrowdFactor(weapon);
    const effectiveDPS = theoreticalDPS * accuracyFactor * crowdFactor;
    
    // Time to kill calculations
    const basicEnemy = this.TEST_ENEMIES.find(e => e.name === 'basic')!;
    const tankEnemy = this.TEST_ENEMIES.find(e => e.name === 'tank')!;
    
    const timeToKillBasic = basicEnemy.health / effectiveDPS;
    const timeToKillTank = tankEnemy.health / effectiveDPS;
    
    // Crowd clear rating (1-10)
    const crowdClearRating = this.calculateCrowdClearRating(weapon, effectiveDPS);
    
    // Level-based effectiveness
    const effectivenessAtLevel1 = this.calculateEffectivenessAtLevel(weapon, 1);
    const effectivenessAtLevel5 = this.calculateEffectivenessAtLevel(weapon, 5);
    
    // Balance assessment
    const balanceScore = this.assessWeaponBalance(weapon, effectiveDPS, crowdClearRating);
    
    // Generate recommendations
    const recommendations = this.generateWeaponRecommendations(weapon, {
      theoreticalDPS,
      effectiveDPS,
      timeToKillBasic,
      timeToKillTank,
      crowdClearRating,
      balanceScore
    });
    
    return {
      weaponName: weapon.name,
      theoreticalDPS,
      effectiveDPS,
      timeToKillBasic,
      timeToKillTank,
      crowdClearRating,
      effectivenessAtLevel1,
      effectivenessAtLevel5,
      balanceScore,
      recommendations
    };
  }
  
  private static calculateAccuracyFactor(weapon: WeaponStats): number {
    // Weapons with projectiles have accuracy issues, AoE weapons don't
    if (weapon.areaOfEffect) return 0.95; // AoE weapons almost always hit
    
    // Projectile weapons have accuracy based on speed and range
    const speedFactor = Math.min(weapon.projectileSpeed / 400, 1.2); // Faster = more accurate
    const rangePenalty = weapon.range > 250 ? 0.9 : 1.0; // Long range = less accurate
    
    return Math.min(speedFactor * rangePenalty, 0.95);
  }
  
  private static calculateCrowdFactor(weapon: WeaponStats): number {
    // How well does weapon perform against multiple enemies?
    
    if (weapon.areaOfEffect) {
      // AoE weapons get massive crowd bonuses
      const aoeBonus = Math.min(weapon.areaOfEffect / 50, 3); // Larger AoE = better crowd clear
      return aoeBonus;
    }
    
    if (weapon.penetration && weapon.penetration > 1) {
      // Penetrating weapons get crowd bonuses
      return Math.min(1 + (weapon.penetration - 1) * 0.3, 2.5);
    }
    
    if (weapon.projectileCount && weapon.projectileCount > 1) {
      // Multi-shot gets moderate crowd bonus
      return 1 + (weapon.projectileCount - 1) * 0.2;
    }
    
    return 1; // Single target weapons get no crowd bonus
  }
  
  private static calculateCrowdClearRating(weapon: WeaponStats, effectiveDPS: number): number {
    // Rate from 1-10 how good weapon is at clearing crowds
    
    let rating = 5; // Start neutral
    
    // DPS contribution (30% of rating)
    const dpsScore = Math.min(effectiveDPS / 30, 3); // 30 DPS = max score
    rating += dpsScore * 0.3;
    
    // AoE contribution (40% of rating)
    if (weapon.areaOfEffect) {
      const aoeScore = Math.min(weapon.areaOfEffect / 25, 4); // 100 AoE radius = max score
      rating += aoeScore * 0.4;
    }
    
    // Multi-hit contribution (30% of rating)
    const multiHitScore = Math.min((weapon.penetration || 1) / 3, 3);
    rating += multiHitScore * 0.3;
    
    return Math.min(Math.max(rating, 1), 10);
  }
  
  private static calculateEffectivenessAtLevel(weapon: WeaponStats, level: number): number {
    // How effective is weapon at different player levels?
    // Higher level = better aim, positioning, upgrade bonuses
    
    const basePower = weapon.damage * weapon.fireRate;
    const levelMultiplier = 1 + (level - 1) * 0.2; // 20% better per level
    const upgradeMultiplier = level === 1 ? 1 : 1 + (level - 1) * 0.15; // Simulated upgrades
    
    return basePower * levelMultiplier * upgradeMultiplier;
  }
  
  private static assessWeaponBalance(weapon: WeaponStats, effectiveDPS: number, crowdRating: number): 
    'overpowered' | 'strong' | 'balanced' | 'weak' | 'underpowered' {
    
    // Balance assessment based on multiple factors
    const dpsThresholds = { low: 20, balanced: 40, high: 60, extreme: 80 };
    const crowdThresholds = { low: 3, balanced: 6, high: 8 };
    
    let powerLevel = 0;
    
    // DPS assessment
    if (effectiveDPS >= dpsThresholds.extreme) powerLevel += 3;
    else if (effectiveDPS >= dpsThresholds.high) powerLevel += 2;
    else if (effectiveDPS >= dpsThresholds.balanced) powerLevel += 1;
    else if (effectiveDPS < dpsThresholds.low) powerLevel -= 1;
    
    // Crowd control assessment
    if (crowdRating >= crowdThresholds.high) powerLevel += 2;
    else if (crowdRating >= crowdThresholds.balanced) powerLevel += 1;
    else if (crowdRating < crowdThresholds.low) powerLevel -= 1;
    
    // Convert to balance score
    if (powerLevel >= 4) return 'overpowered';
    if (powerLevel >= 2) return 'strong';
    if (powerLevel >= -1) return 'balanced';
    if (powerLevel >= -2) return 'weak';
    return 'underpowered';
  }
  
  private static generateWeaponRecommendations(weapon: WeaponStats, results: any): string[] {
    const recommendations: string[] = [];
    
    // DPS recommendations
    if (results.effectiveDPS < 20) {
      recommendations.push(`💀 Low DPS (${results.effectiveDPS.toFixed(1)}). Increase damage from ${weapon.damage} to ${weapon.damage + 5} or fire rate from ${weapon.fireRate} to ${(weapon.fireRate * 1.2).toFixed(1)}.`);
    } else if (results.effectiveDPS > 80) {
      recommendations.push(`⚡ Extremely high DPS (${results.effectiveDPS.toFixed(1)}). Consider reducing damage or fire rate to prevent trivializing content.`);
    }
    
    // TTK recommendations
    if (results.timeToKillBasic > 1.5) {
      recommendations.push(`🐌 Slow vs basic enemies (${results.timeToKillBasic.toFixed(1)}s). Players may find combat tedious.`);
    }
    if (results.timeToKillTank > 8) {
      recommendations.push(`🛡️ Too slow vs tanks (${results.timeToKillTank.toFixed(1)}s). Consider armor penetration or damage scaling.`);
    }
    
    // Crowd clear recommendations  
    if (results.crowdClearRating < 4) {
      recommendations.push(`👥 Poor crowd control (${results.crowdClearRating.toFixed(1)}/10). Consider adding AoE, penetration, or multi-shot.`);
    } else if (results.crowdClearRating > 8) {
      recommendations.push(`🌪️ Excellent crowd control (${results.crowdClearRating.toFixed(1)}/10). Monitor for being too dominant.`);
    }
    
    // Balance recommendations
    if (results.balanceScore === 'overpowered') {
      recommendations.push(`⚖️ OVERPOWERED weapon. Reduce damage by 15-20% or fire rate by 10-15%.`);
    } else if (results.balanceScore === 'underpowered') {
      recommendations.push(`⚖️ UNDERPOWERED weapon. Increase damage by 20-25% or add utility (penetration, crit chance).`);
    } else if (results.balanceScore === 'balanced') {
      recommendations.push(`✅ Well balanced weapon. Minor tweaks only if needed.`);
    }
    
    if (recommendations.length === 0) {
      recommendations.push('✅ Weapon appears well balanced across all metrics.');
    }
    
    return recommendations;
  }
  
  private static printWeaponResult(result: WeaponTestResult): void {
    console.log(`\n⚔️ ${result.weaponName.toUpperCase()}`);
    console.log(`   DPS: ${result.effectiveDPS.toFixed(1)} (theoretical: ${result.theoreticalDPS.toFixed(1)})`);
    console.log(`   TTK Basic: ${result.timeToKillBasic.toFixed(1)}s | TTK Tank: ${result.timeToKillTank.toFixed(1)}s`);
    console.log(`   Crowd Clear: ${result.crowdClearRating.toFixed(1)}/10`);
    console.log(`   Balance: ${result.balanceScore.toUpperCase()}`);
    
    if (result.recommendations.length > 0) {
      console.log(`   💡 ${result.recommendations[0]}`);
    }
  }
  
  private static printBalanceSummary(results: WeaponTestResult[]): void {
    const overpowered = results.filter(r => r.balanceScore === 'overpowered').length;
    const underpowered = results.filter(r => r.balanceScore === 'underpowered').length;
    const balanced = results.filter(r => r.balanceScore === 'balanced').length;
    
    console.log(`🏆 Balance Distribution:`);
    console.log(`   Overpowered: ${overpowered} | Balanced: ${balanced} | Underpowered: ${underpowered}`);
    
    const avgDPS = results.reduce((sum, r) => sum + r.effectiveDPS, 0) / results.length;
    console.log(`📊 Average Effective DPS: ${avgDPS.toFixed(1)}`);
    
    const topCrowdClear = results.reduce((max, r) => Math.max(max, r.crowdClearRating), 0);
    const bestCrowdWeapon = results.find(r => r.crowdClearRating === topCrowdClear);
    console.log(`👥 Best Crowd Clear: ${bestCrowdWeapon?.weaponName} (${topCrowdClear.toFixed(1)}/10)`);
    
    if (overpowered > 0 || underpowered > 0) {
      console.log(`\n⚠️ ${overpowered + underpowered} weapons need balance adjustments!`);
    } else {
      console.log(`\n✅ All weapons appear well balanced!`);
    }
  }
  
  // Quick test for browser console
  static quickWeaponTest(): void {
    this.testAllWeapons();
  }
}

// Export for browser console
if (typeof window !== 'undefined') {
  (window as any).testWeapons = () => WeaponBalanceTester.quickWeaponTest();
}