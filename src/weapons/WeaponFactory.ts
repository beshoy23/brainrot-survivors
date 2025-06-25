import { Weapon, WeaponConfig } from '../entities/Weapon';
import { BasicWeaponBehavior } from './behaviors/BasicWeaponBehavior';
import { MultiShotBehavior } from './behaviors/MultiShotBehavior';
import { VSMultiShotBehavior } from './behaviors/VSMultiShotBehavior';
import { SpreadShotBehavior } from './behaviors/SpreadShotBehavior';
import { AxeBehavior } from './behaviors/AxeBehavior';
import { GarlicBehavior } from './behaviors/GarlicBehavior';
import { WhipBehavior } from './behaviors/WhipBehavior';
import { GameConfig } from '../config/game';

export enum WeaponType {
  BASIC = 'basic',
  MULTI_SHOT = 'multiShot',
  SPREAD_SHOT = 'spreadShot',
  AXE = 'axe',
  GARLIC = 'garlic',
  WHIP = 'whip'
}

export class WeaponFactory {
  static createWeapon(type: WeaponType): Weapon {
    const baseConfig = GameConfig.weapons.basic;
    
    switch (type) {
      case WeaponType.BASIC:
        return new Weapon({
          ...baseConfig,
          behavior: new BasicWeaponBehavior()
        });
        
      case WeaponType.MULTI_SHOT:
        // This will be updated based on upgrade level
        return new Weapon({
          ...baseConfig,
          behavior: new MultiShotBehavior(0)
        });
        
      case WeaponType.SPREAD_SHOT:
        return new Weapon({
          ...baseConfig,
          damage: baseConfig.damage * 0.7, // Slightly less damage per projectile
          behavior: new SpreadShotBehavior(3, 30)
        });
        
      case WeaponType.AXE:
        return new Weapon({
          damage: 35, // Fixed damage for better balance (was baseConfig.damage * 2)
          fireRate: 1, // Slower fire rate
          projectileSpeed: 300,
          range: 200,
          behavior: new AxeBehavior()
        });
        
      case WeaponType.GARLIC:
        return new Weapon({
          damage: 18, // Increased for better area damage (was baseConfig.damage * 0.5)
          fireRate: 2, // Ticks twice per second
          projectileSpeed: 50, // Very slow moving for stationary effect
          range: 20, // Short range for area effect
          behavior: new GarlicBehavior()
        });
        
      case WeaponType.WHIP:
        return new Weapon({
          damage: 28, // Balanced damage (was baseConfig.damage * 1.5)
          fireRate: 1.5, // Medium fire rate
          projectileSpeed: 800, // Very fast for "instant" feel
          range: 150,
          behavior: new WhipBehavior()
        });
        
      default:
        return new Weapon({
          ...baseConfig,
          behavior: new BasicWeaponBehavior()
        });
    }
  }
  
  static createStarterWeapon(): Weapon {
    // Check for multi-shot upgrade and create appropriate weapon
    const upgradeManager = (window as any).upgradeManager;
    const multiShotLevel = upgradeManager ? 
      upgradeManager.getUpgradeLevel('projectileCount') : 0;
    
    if (multiShotLevel > 0) {
      // Use VS-style spread multishot
      const weapon = new Weapon({
        ...GameConfig.weapons.basic,
        behavior: new VSMultiShotBehavior(multiShotLevel)
      });
      return weapon;
    }
    
    return this.createWeapon(WeaponType.BASIC);
  }
}