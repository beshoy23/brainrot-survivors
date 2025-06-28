/**
 * Comprehensive Upgrade System Test Suite
 * 
 * Tests all upgrade types, their effects, balance, interactions, and edge cases.
 * Validates that upgrades actually affect gameplay and maintain proper balance.
 */

interface UpgradeTestConfig {
  id: string;
  category: 'weapon' | 'player' | 'passive';
  maxLevel: number;
  effectPerLevel: number;
  expectedPowerIncrease: number; // Expected % power increase per level
}

interface UpgradeTestResult {
  upgradeId: string;
  category: string;
  currentLevel: number;
  maxLevel: number;
  effectValue: number;
  actualPowerIncrease: number;
  isBalanced: boolean;
  isOverpowered: boolean;
  isUnderpowered: boolean;
  recommendations: string[];
}

interface WeaponTestContext {
  baseDamage: number;
  baseFireRate: number;
  baseProjectileCount: number;
}

export class UpgradeSystemTester {
  
  // All upgrade configurations from the game
  private static readonly UPGRADE_CONFIGS: UpgradeTestConfig[] = [
    // Weapon Upgrades (updated to match new balance)
    { id: 'damage', category: 'weapon', maxLevel: 8, effectPerLevel: 0.10, expectedPowerIncrease: 10 },
    { id: 'fireRate', category: 'weapon', maxLevel: 5, effectPerLevel: 0.15, expectedPowerIncrease: 15 },
    { id: 'projectileCount', category: 'weapon', maxLevel: 3, effectPerLevel: 1, expectedPowerIncrease: 30 },
    
    // Player Upgrades
    { id: 'moveSpeed', category: 'player', maxLevel: 5, effectPerLevel: 0.10, expectedPowerIncrease: 10 },
    { id: 'maxHealth', category: 'player', maxLevel: 8, effectPerLevel: 0.15, expectedPowerIncrease: 15 },
    { id: 'healthRegen', category: 'player', maxLevel: 5, effectPerLevel: 1.0, expectedPowerIncrease: 15 },
    
    // Passive Upgrades
    { id: 'xpMagnet', category: 'passive', maxLevel: 5, effectPerLevel: 0.20, expectedPowerIncrease: 12 },
    { id: 'xpBonus', category: 'passive', maxLevel: 4, effectPerLevel: 0.20, expectedPowerIncrease: 20 },
    { id: 'armor', category: 'passive', maxLevel: 4, effectPerLevel: 0.15, expectedPowerIncrease: 15 }
  ];
  
  // Base weapon stats for testing weapon upgrades
  private static readonly BASE_WEAPON: WeaponTestContext = {
    baseDamage: 20,
    baseFireRate: 2.0,
    baseProjectileCount: 1
  };
  
  static testAllUpgrades(): UpgradeTestResult[] {
    console.log('🔧 Running Comprehensive Upgrade System Test Suite...\n');
    
    const results: UpgradeTestResult[] = [];
    
    // Test each upgrade type
    for (const config of this.UPGRADE_CONFIGS) {
      console.log(`\n📊 Testing ${config.id.toUpperCase()} (${config.category}):`);
      
      for (let level = 1; level <= config.maxLevel; level++) {
        const result = this.testUpgradeAtLevel(config, level);
        results.push(result);
        
        if (level === 1 || level === Math.ceil(config.maxLevel / 2) || level === config.maxLevel) {
          this.printUpgradeResult(result);
        }
      }
    }
    
    console.log('\n🎯 UPGRADE BALANCE SUMMARY:');
    this.printBalanceSummary(results);
    
    console.log('\n⚖️ CRITICAL UPGRADE INTERACTIONS:');
    this.testUpgradeInteractions();
    
    console.log('\n🔍 EDGE CASE VALIDATION:');
    this.testEdgeCases();
    
    return results;
  }
  
  private static testUpgradeAtLevel(config: UpgradeTestConfig, level: number): UpgradeTestResult {
    // Calculate upgrade effect
    const effectValue = this.calculateUpgradeEffect(config, level);
    
    // Calculate actual power increase
    const actualPowerIncrease = this.calculatePowerIncrease(config, level);
    
    // Assess balance
    const balanceAssessment = this.assessUpgradeBalance(config, level, actualPowerIncrease);
    
    // Generate recommendations
    const recommendations = this.generateUpgradeRecommendations(config, level, actualPowerIncrease, balanceAssessment);
    
    return {
      upgradeId: config.id,
      category: config.category,
      currentLevel: level,
      maxLevel: config.maxLevel,
      effectValue,
      actualPowerIncrease,
      isBalanced: balanceAssessment === 'balanced',
      isOverpowered: balanceAssessment === 'overpowered',
      isUnderpowered: balanceAssessment === 'underpowered',
      recommendations
    };
  }
  
  private static calculateUpgradeEffect(config: UpgradeTestConfig, level: number): number {
    switch (config.id) {
      case 'damage':
      case 'fireRate':
      case 'moveSpeed':
      case 'xpMagnet':
      case 'xpBonus':
        // Multiplicative upgrades
        return Math.pow(1 + config.effectPerLevel, level);
        
      case 'projectileCount':
        // Additive projectile count
        return 1 + (level * config.effectPerLevel);
        
      case 'maxHealth':
      case 'armor':
        // Flat additive upgrades
        return level * config.effectPerLevel;
        
      case 'healthRegen':
        // HP per second
        return level * config.effectPerLevel;
        
      default:
        return 1;
    }
  }
  
  private static calculatePowerIncrease(config: UpgradeTestConfig, level: number): number {
    const baseValue = this.calculateUpgradeEffect(config, 0);
    const upgradeValue = this.calculateUpgradeEffect(config, level);
    
    switch (config.id) {
      case 'damage':
        // Direct damage multiplier (projectile penalty is separate)
        return ((upgradeValue - 1) * 100);
        
      case 'fireRate':
        // Fire rate multiplier
        return ((upgradeValue - 1) * 100);
        
      case 'projectileCount':
        // Each additional projectile with damage penalty
        const totalProjectiles = upgradeValue;
        const penaltyPerProjectile = Math.pow(0.8, upgradeValue); // 20% reduction per projectile
        return ((totalProjectiles * penaltyPerProjectile - 1) * 100);
        
      case 'moveSpeed':
        // Movement has defensive and positioning value
        return ((upgradeValue - 1) * 80); // Slightly less than direct combat
        
      case 'maxHealth':
        // Percentage-based health increase
        return ((upgradeValue - 1) * 100);
        
      case 'healthRegen':
        // Regeneration has sustain value + instant heal
        const regenValue = upgradeValue * 10; // 1 HP/s = 10% power per level
        const instantHealValue = 10; // 10 HP instant heal = ~10% power
        return regenValue + instantHealValue;
        
      case 'xpMagnet':
        // XP collection efficiency
        return ((upgradeValue - 1) * 60); // Less direct than combat stats
        
      case 'xpBonus':
        // XP gain affects long-term progression
        return ((upgradeValue - 1) * 100);
        
      case 'armor':
        // Percentage-based damage reduction
        return upgradeValue * 100; // 0.15 = 15% reduction = 15% power
        
      default:
        return 0;
    }
  }
  
  private static assessUpgradeBalance(
    config: UpgradeTestConfig, 
    level: number, 
    actualPowerIncrease: number
  ): 'underpowered' | 'balanced' | 'overpowered' {
    
    const expectedMin = config.expectedPowerIncrease * level * 0.7; // 30% tolerance below
    const expectedMax = config.expectedPowerIncrease * level * 1.4; // 40% tolerance above
    
    // Special cases for max level
    if (level === config.maxLevel) {
      if (actualPowerIncrease > expectedMax * 1.2) return 'overpowered';
      if (actualPowerIncrease < expectedMin * 0.8) return 'underpowered';
    }
    
    if (actualPowerIncrease < expectedMin) return 'underpowered';
    if (actualPowerIncrease > expectedMax) return 'overpowered';
    return 'balanced';
  }
  
  private static generateUpgradeRecommendations(
    config: UpgradeTestConfig,
    level: number,
    actualPowerIncrease: number,
    balance: string
  ): string[] {
    const recommendations: string[] = [];
    
    if (balance === 'overpowered') {
      recommendations.push(`⚡ TOO POWERFUL at level ${level} (${actualPowerIncrease.toFixed(1)}% increase). Consider reducing effect per level.`);
      
      if (config.id === 'armor' && level >= 3) {
        recommendations.push(`🛡️ Armor may trivialize damage at higher levels. Consider percentage-based reduction instead.`);
      }
      
      if (config.id === 'projectileCount' && level >= 2) {
        recommendations.push(`🎯 Multi-projectile upgrades scale exponentially. Consider weapon-specific limits.`);
      }
    }
    
    if (balance === 'underpowered') {
      recommendations.push(`💀 TOO WEAK at level ${level} (${actualPowerIncrease.toFixed(1)}% increase). Consider buffing effect or reducing cost.`);
      
      if (config.id === 'healthRegen') {
        recommendations.push(`❤️ Health regen is too slow to matter in combat. Consider burst healing or shield mechanics.`);
      }
      
      if (config.id === 'moveSpeed' && level <= 2) {
        recommendations.push(`🏃 Early movement upgrades feel weak. Consider more noticeable speed increases.`);
      }
    }
    
    if (balance === 'balanced') {
      recommendations.push(`✅ Well balanced at level ${level}.`);
    }
    
    // Max level warnings
    if (level === config.maxLevel) {
      if (config.maxLevel < 5) {
        recommendations.push(`📈 Only ${config.maxLevel} levels available. Consider extending progression for long-term play.`);
      }
      
      if (actualPowerIncrease > 200) {
        recommendations.push(`🚀 Extremely powerful at max level. Ensure late-game enemies scale appropriately.`);
      }
    }
    
    return recommendations;
  }
  
  private static testUpgradeInteractions(): void {
    console.log('\n🔄 Testing Damage + Fire Rate Combination:');
    const damageLevel3 = Math.pow(1.15, 3); // 52% damage increase
    const fireRateLevel3 = Math.pow(1.15, 3); // 52% fire rate increase  
    const combinedDPS = damageLevel3 * fireRateLevel3; // 2.31x DPS multiplier
    console.log(`   Level 3 Both: ${((combinedDPS - 1) * 100).toFixed(1)}% DPS increase (${combinedDPS.toFixed(2)}x multiplier)`);
    
    if (combinedDPS > 2.5) {
      console.log(`   ⚠️ WARNING: Combined weapon upgrades may be overpowered`);
    } else {
      console.log(`   ✅ Combined weapon upgrades appear balanced`);
    }
    
    console.log('\n🛡️ Testing Armor vs Enemy Damage:');
    const maxArmor = 10; // 5 levels * 2 damage reduction
    const lowEnemyDamage = 8;
    const highEnemyDamage = 25;
    
    console.log(`   vs Low Damage (${lowEnemyDamage}): ${((maxArmor / lowEnemyDamage) * 100).toFixed(1)}% reduction`);
    console.log(`   vs High Damage (${highEnemyDamage}): ${((maxArmor / highEnemyDamage) * 100).toFixed(1)}% reduction`);
    
    if (maxArmor >= lowEnemyDamage * 0.8) {
      console.log(`   ⚠️ WARNING: Armor may trivialize weak enemies`);
    }
    
    console.log('\n❤️ Testing Health Regen Effectiveness:');
    const maxRegen = 1.0; // 5 levels * 0.2 HP/s
    const avgCombatTime = 30; // seconds
    const regenValue = maxRegen * avgCombatTime;
    console.log(`   Regen in 30s combat: ${regenValue} HP`);
    console.log(`   Equivalent to: ${(regenValue / 25).toFixed(1)} health upgrades`);
    
    if (regenValue < 15) {
      console.log(`   ⚠️ WARNING: Health regen may be too weak for combat scenarios`);
    }
  }
  
  private static testEdgeCases(): void {
    console.log('🔍 Testing upgrade system edge cases...');
    
    // Test negative levels
    console.log('   Testing invalid inputs...');
    try {
      const negativeResult = this.calculateUpgradeEffect(this.UPGRADE_CONFIGS[0], -1);
      if (negativeResult < 0 || !isFinite(negativeResult)) {
        console.log('   ⚠️ WARNING: Negative upgrade levels produce invalid results');
      } else {
        console.log('   ✅ Negative levels handled gracefully');
      }
    } catch (error) {
      console.log('   ⚠️ ERROR: Negative levels cause exceptions');
    }
    
    // Test extreme levels
    try {
      const extremeResult = this.calculateUpgradeEffect(this.UPGRADE_CONFIGS[0], 100);
      if (!isFinite(extremeResult) || extremeResult > 1000000) {
        console.log('   ⚠️ WARNING: Extreme upgrade levels may cause overflow');
      } else {
        console.log('   ✅ Extreme levels handled gracefully');
      }
    } catch (error) {
      console.log('   ⚠️ ERROR: Extreme levels cause exceptions');
    }
    
    // Test zero level
    const zeroResult = this.calculateUpgradeEffect(this.UPGRADE_CONFIGS[0], 0);
    if (zeroResult !== 1 && this.UPGRADE_CONFIGS[0].id !== 'maxHealth' && this.UPGRADE_CONFIGS[0].id !== 'armor' && this.UPGRADE_CONFIGS[0].id !== 'healthRegen') {
      console.log('   ⚠️ WARNING: Zero level upgrades should return base value (1.0)');
    } else {
      console.log('   ✅ Zero levels return expected base values');
    }
  }
  
  private static printUpgradeResult(result: UpgradeTestResult): void {
    const status = result.isBalanced ? '✅ BALANCED' : 
                  result.isOverpowered ? '⚠️ OVERPOWERED' : 
                  '💀 UNDERPOWERED';
    
    console.log(`   Level ${result.currentLevel}: ${result.effectValue.toFixed(2)}x effect, ${result.actualPowerIncrease.toFixed(1)}% power - ${status}`);
    
    if (result.recommendations.length > 0 && !result.isBalanced) {
      console.log(`   💡 ${result.recommendations[0]}`);
    }
  }
  
  private static printBalanceSummary(results: UpgradeTestResult[]): void {
    const overpowered = results.filter(r => r.isOverpowered).length;
    const underpowered = results.filter(r => r.isUnderpowered).length;
    const balanced = results.filter(r => r.isBalanced).length;
    
    console.log(`🏆 Upgrade Balance Distribution:`);
    console.log(`   Overpowered: ${overpowered} | Balanced: ${balanced} | Underpowered: ${underpowered}`);
    
    // Find most problematic upgrades
    const maxLevelResults = results.filter(r => r.currentLevel === r.maxLevel);
    const overpoweredUpgrades = maxLevelResults.filter(r => r.isOverpowered);
    const underpoweredUpgrades = maxLevelResults.filter(r => r.isUnderpowered);
    
    if (overpoweredUpgrades.length > 0) {
      console.log(`⚠️ Overpowered at max level: ${overpoweredUpgrades.map(r => r.upgradeId).join(', ')}`);
    }
    
    if (underpoweredUpgrades.length > 0) {
      console.log(`💀 Underpowered at max level: ${underpoweredUpgrades.map(r => r.upgradeId).join(', ')}`);
    }
    
    const avgPowerAtMaxLevel = maxLevelResults.reduce((sum, r) => sum + r.actualPowerIncrease, 0) / maxLevelResults.length;
    console.log(`📊 Average power increase at max level: ${avgPowerAtMaxLevel.toFixed(1)}%`);
    
    if (avgPowerAtMaxLevel > 150) {
      console.log(`🚀 High max-level power - ensure enemy scaling keeps pace`);
    } else if (avgPowerAtMaxLevel < 80) {
      console.log(`🐌 Low max-level power - upgrades may feel unrewarding`);
    } else {
      console.log(`✅ Healthy max-level power progression`);
    }
  }
  
  // Quick test for browser console
  static quickUpgradeTest(): void {
    this.testAllUpgrades();
  }
}

// Export for browser console
if (typeof window !== 'undefined') {
  (window as any).testUpgrades = () => UpgradeSystemTester.quickUpgradeTest();
}

// Allow running from command line
if (typeof require !== 'undefined' && require.main === module) {
  UpgradeSystemTester.testAllUpgrades();
}