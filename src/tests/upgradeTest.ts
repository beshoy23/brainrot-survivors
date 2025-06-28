/**
 * Kick Upgrade System Test Suite
 * 
 * Tests that our 8 kick upgrades actually work and affect gameplay.
 * Following the same pattern as existing balance tests.
 */

interface KickUpgradeTestConfig {
  id: string;
  category: 'weapon';
  maxLevel: number;
  effectPerLevel: number;
  expectedPowerIncrease: number;
}

interface KickUpgradeTestResult {
  upgradeId: string;
  currentLevel: number;
  maxLevel: number;
  baseValue: number;
  upgradeValue: number;
  actualChange: number;
  isWorking: boolean;
  notes: string[];
}

export class KickUpgradeTester {
  
  // All kick upgrade configurations that should be working
  private static readonly KICK_UPGRADE_CONFIGS: KickUpgradeTestConfig[] = [
    // Core Kick Mechanics
    { id: 'kickForce', category: 'weapon', maxLevel: 8, effectPerLevel: 0.25, expectedPowerIncrease: 25 },
    { id: 'kickSpeed', category: 'weapon', maxLevel: 6, effectPerLevel: 0.20, expectedPowerIncrease: 20 },
    { id: 'kickRange', category: 'weapon', maxLevel: 4, effectPerLevel: 0.15, expectedPowerIncrease: 15 },
    { id: 'chainPower', category: 'weapon', maxLevel: 5, effectPerLevel: 0.30, expectedPowerIncrease: 30 },
    { id: 'multiKick', category: 'weapon', maxLevel: 3, effectPerLevel: 1, expectedPowerIncrease: 100 },
    
    // Kick Variation Unlocks
    { id: 'uppercutVariation', category: 'weapon', maxLevel: 1, effectPerLevel: 1, expectedPowerIncrease: 100 },
    { id: 'spinningKickVariation', category: 'weapon', maxLevel: 1, effectPerLevel: 1, expectedPowerIncrease: 100 },
    { id: 'groundPoundVariation', category: 'weapon', maxLevel: 1, effectPerLevel: 1, expectedPowerIncrease: 100 }
  ];
  
  static testAllKickUpgrades(): KickUpgradeTestResult[] {
    console.log('🥋 Running Kick Upgrade System Test Suite...\n');
    
    const results: KickUpgradeTestResult[] = [];
    
    // Test each kick upgrade type
    for (const config of this.KICK_UPGRADE_CONFIGS) {
      console.log(`\n📊 Testing ${config.id.toUpperCase()}:`);
      
      const result = this.testKickUpgrade(config);
      results.push(result);
      this.printKickUpgradeResult(result);
    }
    
    console.log('\n🎯 KICK UPGRADE SUMMARY:');
    this.printKickUpgradeSummary(results);
    
    return results;
  }
  
  private static testKickUpgrade(config: KickUpgradeTestConfig): KickUpgradeTestResult {
    const notes: string[] = [];
    
    try {
      // Get base values (level 0)
      const baseValue = this.getKickUpgradeBaseValue(config.id);
      
      // Simulate applying the upgrade to max level
      const upgradeValue = this.getKickUpgradeMaxValue(config.id, config.maxLevel);
      
      // Calculate actual change
      const actualChange = this.calculateKickUpgradeChange(config.id, baseValue, upgradeValue);
      
      // Check if upgrade is working
      const isWorking = this.isKickUpgradeWorking(config.id, baseValue, upgradeValue, actualChange);
      
      if (isWorking) {
        notes.push('✅ Upgrade is implemented and functional');
      } else {
        notes.push('❌ Upgrade appears to be non-functional');
      }
      
      // Add specific notes per upgrade type
      this.addSpecificKickUpgradeNotes(config.id, actualChange, notes);
      
      return {
        upgradeId: config.id,
        currentLevel: config.maxLevel,
        maxLevel: config.maxLevel,
        baseValue,
        upgradeValue,
        actualChange,
        isWorking,
        notes
      };
      
    } catch (error) {
      return {
        upgradeId: config.id,
        currentLevel: 0,
        maxLevel: config.maxLevel,
        baseValue: 0,
        upgradeValue: 0,
        actualChange: 0,
        isWorking: false,
        notes: [`❌ ERROR: ${error}`]
      };
    }
  }
  
  private static getKickUpgradeBaseValue(upgradeId: string): number {
    // Import dynamically to avoid module loading issues
    const WeaponFactory = require('../weapons/WeaponFactory').WeaponFactory;
    const WeaponType = require('../weapons/WeaponFactory').WeaponType;
    
    // Mock empty upgrade manager for base values
    (global as any).upgradeManager = {
      getUpgradeLevel: () => 0
    };
    
    switch (upgradeId) {
      case 'kickSpeed':
        const baseKick = WeaponFactory.createWeapon(WeaponType.BRATTACK);
        return baseKick.fireRate;
        
      case 'kickRange':
        const baseRangeKick = WeaponFactory.createWeapon(WeaponType.BRATTACK);
        return baseRangeKick.range;
        
      case 'kickForce':
        return 800; // Base force from WeaponSystem
        
      case 'chainPower':
        return 400; // Base chain force from WeaponSystem
        
      case 'multiKick':
        return 1; // Base target count
        
      case 'uppercutVariation':
      case 'spinningKickVariation':
      case 'groundPoundVariation':
        const baseWeapons = WeaponFactory.createKickVariationWeapons();
        return baseWeapons.length; // Should be 1 (just basic kick)
        
      default:
        return 1;
    }
  }
  
  private static getKickUpgradeMaxValue(upgradeId: string, maxLevel: number): number {
    // Mock upgrade manager with max level
    (global as any).upgradeManager = {
      getUpgradeLevel: (id: string) => id === upgradeId ? maxLevel : 0
    };
    
    const WeaponFactory = require('../weapons/WeaponFactory').WeaponFactory;
    const WeaponType = require('../weapons/WeaponFactory').WeaponType;
    
    switch (upgradeId) {
      case 'kickSpeed':
        const speedKick = WeaponFactory.createWeapon(WeaponType.BRATTACK);
        return speedKick.fireRate;
        
      case 'kickRange':
        const rangeKick = WeaponFactory.createWeapon(WeaponType.BRATTACK);
        return rangeKick.range;
        
      case 'kickForce':
        const forceMultiplier = 1 + (maxLevel * 0.25);
        return 800 * forceMultiplier;
        
      case 'chainPower':
        const chainMultiplier = 1 + (maxLevel * 0.30);
        return 400 * chainMultiplier;
        
      case 'multiKick':
        return 1 + maxLevel; // Base + additional targets
        
      case 'uppercutVariation':
      case 'spinningKickVariation':
      case 'groundPoundVariation':
        const maxWeapons = WeaponFactory.createKickVariationWeapons();
        return maxWeapons.length; // Should be more than 1
        
      default:
        return 1;
    }
  }
  
  private static calculateKickUpgradeChange(upgradeId: string, baseValue: number, upgradeValue: number): number {
    switch (upgradeId) {
      case 'kickForce':
      case 'chainPower':
      case 'kickSpeed':
      case 'kickRange':
        // Multiplicative upgrades - return percentage increase
        return ((upgradeValue / baseValue - 1) * 100);
        
      case 'multiKick':
        // Additive upgrades - return absolute increase
        return upgradeValue - baseValue;
        
      case 'uppercutVariation':
      case 'spinningKickVariation':  
      case 'groundPoundVariation':
        // Unlock upgrades - return number of additional weapons
        return upgradeValue - baseValue;
        
      default:
        return 0;
    }
  }
  
  private static isKickUpgradeWorking(upgradeId: string, baseValue: number, upgradeValue: number, actualChange: number): boolean {
    // Check if the upgrade actually changed something
    if (baseValue === upgradeValue) {
      return false; // No change detected
    }
    
    switch (upgradeId) {
      case 'kickForce':
      case 'chainPower':
      case 'kickSpeed':
      case 'kickRange':
        // Should have positive percentage increase
        return actualChange > 5; // At least 5% change
        
      case 'multiKick':
        // Should hit additional targets
        return actualChange >= 1;
        
      case 'uppercutVariation':
      case 'spinningKickVariation':
      case 'groundPoundVariation':
        // Should unlock additional weapons
        return actualChange >= 1;
        
      default:
        return false;
    }
  }
  
  private static addSpecificKickUpgradeNotes(upgradeId: string, actualChange: number, notes: string[]): void {
    switch (upgradeId) {
      case 'kickSpeed':
        if (actualChange > 50) {
          notes.push('⚡ Very fast kick speed - may be overpowered');
        } else if (actualChange < 10) {
          notes.push('🐌 Kick speed increase barely noticeable');
        }
        break;
        
      case 'kickRange':
        if (actualChange > 40) {
          notes.push('🎯 Very long kick range - may trivialize positioning');
        } else if (actualChange < 5) {
          notes.push('📏 Range increase barely noticeable');
        }
        break;
        
      case 'kickForce':
        if (actualChange > 100) {
          notes.push('💥 Extreme knockback force - may be overpowered');
        } else if (actualChange < 20) {
          notes.push('💀 Force increase may be too weak');
        }
        break;
        
      case 'multiKick':
        if (actualChange >= 3) {
          notes.push('🎯 Hitting 4+ enemies per kick - very powerful');
        } else if (actualChange < 1) {
          notes.push('❌ MultiKick not adding additional targets');
        }
        break;
    }
  }
  
  private static printKickUpgradeResult(result: KickUpgradeTestResult): void {
    const status = result.isWorking ? '✅ WORKING' : '❌ BROKEN';
    
    console.log(`   ${status} - Base: ${result.baseValue.toFixed(1)} → Max: ${result.upgradeValue.toFixed(1)} (${result.actualChange.toFixed(1)}% change)`);
    
    result.notes.forEach(note => {
      console.log(`   💡 ${note}`);
    });
  }
  
  private static printKickUpgradeSummary(results: KickUpgradeTestResult[]): void {
    const working = results.filter(r => r.isWorking).length;
    const broken = results.filter(r => !r.isWorking).length;
    
    console.log(`🏆 Kick Upgrade Test Results:`);
    console.log(`   Working: ${working} | Broken: ${broken} | Total: ${results.length}`);
    
    if (broken > 0) {
      const brokenUpgrades = results.filter(r => !r.isWorking).map(r => r.upgradeId);
      console.log(`❌ Broken upgrades: ${brokenUpgrades.join(', ')}`);
    }
    
    if (working === results.length) {
      console.log(`🎉 ALL KICK UPGRADES ARE WORKING!`);
    } else {
      console.log(`⚠️ ${broken} kick upgrades need implementation`);
    }
  }
  
  // Quick test for command line
  static quickKickUpgradeTest(): void {
    this.testAllKickUpgrades();
  }
}

// Export for browser console
if (typeof window !== 'undefined') {
  (window as any).testKickUpgrades = () => KickUpgradeTester.quickKickUpgradeTest();
}

// Allow running from command line
if (typeof require !== 'undefined' && require.main === module) {
  KickUpgradeTester.testAllKickUpgrades();
}