import { Weapon, WeaponConfig } from '../entities/Weapon';
// ONLY KICK-BASED BEHAVIORS - This is a physics brawler!
import { BrAttackBehavior } from './behaviors/BrAttackBehavior';
import { UppercutBehavior } from './behaviors/UppercutBehavior';
import { SpinningKickBehavior } from './behaviors/SpinningKickBehavior';
import { GroundPoundBehavior } from './behaviors/GroundPoundBehavior';
import { DirectedKickBehavior } from './behaviors/DirectedKickBehavior';

export enum WeaponType {
  // ONLY KICK-BASED WEAPONS - This is a physics brawler!
  BRATTACK = 'brattack',
  DIRECTED_KICK = 'directedKick',
  UPPERCUT = 'uppercut',
  SPINNING_KICK = 'spinningKick',
  GROUND_POUND = 'groundPound'
}

export class WeaponFactory {
  static createWeapon(type: WeaponType): Weapon {
    // Apply global kick upgrades to all kick weapons
    const upgradeManager = (window as any).upgradeManager;
    const kickSpeedMultiplier = upgradeManager ? 
      (1 + (upgradeManager.getUpgradeLevel('kickSpeed') * 0.20)) : 1;
    const kickRangeMultiplier = upgradeManager ? 
      (1 + (upgradeManager.getUpgradeLevel('kickRange') * 0.15)) : 1;
    
    switch (type) {
      case WeaponType.BRATTACK:
        return new Weapon({
          damage: 12, // Damage less important now - it's about the physics!
          fireRate: 1.8 * kickSpeedMultiplier, // Kick speed upgrade
          projectileSpeed: 600, // Fast for instant hit feel
          range: 30 * kickRangeMultiplier, // Kick range upgrade
          behavior: new BrAttackBehavior()
        });
        
      case WeaponType.DIRECTED_KICK:
        return new Weapon({
          damage: 12, // Same stats as BrAttack but with directional control
          fireRate: 1.8 * kickSpeedMultiplier, // Kick speed upgrade
          projectileSpeed: 600, // Fast for instant hit feel
          range: 30 * kickRangeMultiplier, // Kick range upgrade
          behavior: new DirectedKickBehavior()
        });
        
      case WeaponType.UPPERCUT:
        return new Weapon({
          damage: 15, // Higher damage for single-target focused attack
          fireRate: 1.2 * kickSpeedMultiplier, // Apply kick speed
          projectileSpeed: 500,
          range: 35 * kickRangeMultiplier, // Apply kick range
          behavior: new UppercutBehavior()
        });
        
      case WeaponType.SPINNING_KICK:
        return new Weapon({
          damage: 8, // Lower damage per hit since it hits multiple enemies
          fireRate: 2.5 * kickSpeedMultiplier, // Apply kick speed
          projectileSpeed: 400,
          range: 50 * kickRangeMultiplier, // Apply kick range
          behavior: new SpinningKickBehavior()
        });
        
      case WeaponType.GROUND_POUND:
        return new Weapon({
          damage: 10, // Moderate damage with shockwave effect
          fireRate: 3.0 * kickSpeedMultiplier, // Apply kick speed
          projectileSpeed: 300,
          range: 60 * kickRangeMultiplier, // Apply kick range
          behavior: new GroundPoundBehavior()
        });
        
      default:
        // Fallback to basic kick if unknown type
        return new Weapon({
          damage: 12,
          fireRate: 1.8 * kickSpeedMultiplier,
          projectileSpeed: 600,
          range: 30 * kickRangeMultiplier,
          behavior: new BrAttackBehavior()
        });
    }
  }
  
  static createStarterWeapon(): Weapon {
    // Choose between directed kick (mobile) or auto-targeting kick (desktop)
    const isMobile = (window as any).isMobile || false;
    return this.createWeapon(isMobile ? WeaponType.DIRECTED_KICK : WeaponType.BRATTACK);
  }
  
  static createKickVariationWeapons(): Weapon[] {
    const upgradeManager = (window as any).upgradeManager;
    const weapons: Weapon[] = [];
    
    // Choose between directed kick (mobile) or auto-targeting kick (desktop)
    const isMobile = (window as any).isMobile || false;
    weapons.push(this.createWeapon(isMobile ? WeaponType.DIRECTED_KICK : WeaponType.BRATTACK));
    
    // Add unlocked variations
    if (upgradeManager?.getUpgradeLevel('uppercutVariation') > 0) {
      weapons.push(this.createWeapon(WeaponType.UPPERCUT));
    }
    
    if (upgradeManager?.getUpgradeLevel('spinningKickVariation') > 0) {
      weapons.push(this.createWeapon(WeaponType.SPINNING_KICK));
    }
    
    if (upgradeManager?.getUpgradeLevel('groundPoundVariation') > 0) {
      weapons.push(this.createWeapon(WeaponType.GROUND_POUND));
    }
    
    return weapons;
  }
}