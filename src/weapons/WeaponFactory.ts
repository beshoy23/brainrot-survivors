import { Weapon, WeaponConfig } from '../entities/Weapon';
import { BasicWeaponBehavior } from './behaviors/BasicWeaponBehavior';
import { MultiShotBehavior } from './behaviors/MultiShotBehavior';
import { SpreadShotBehavior } from './behaviors/SpreadShotBehavior';
import { GameConfig } from '../config/game';

export enum WeaponType {
  BASIC = 'basic',
  MULTI_SHOT = 'multiShot',
  SPREAD_SHOT = 'spreadShot'
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
      const weapon = this.createWeapon(WeaponType.MULTI_SHOT);
      (weapon.behavior as MultiShotBehavior).setAdditionalShots(multiShotLevel);
      return weapon;
    }
    
    return this.createWeapon(WeaponType.BASIC);
  }
}