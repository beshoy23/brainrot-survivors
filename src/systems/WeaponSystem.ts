import { Scene } from 'phaser';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { Weapon } from '../entities/Weapon';
import { Projectile } from '../entities/Projectile';
import { PoolManager } from '../managers/PoolManager';
import { WeaponFactory, WeaponType } from '../weapons/WeaponFactory';
import { Vector2 } from '../utils/Vector2';
import { WeaponEffectSystem } from './WeaponEffectSystem';
import { ScreenShake } from '../utils/ScreenShake';
import { ParticleEffects } from '../utils/ParticleEffects';
import { ComboSystem } from './ComboSystem';

export interface EnemyDeathCallback {
  (x: number, y: number): void;
}

export interface DamageDealtCallback {
  (damage: number): void;
}

export class WeaponSystem {
  private weapons: Weapon[] = [];
  private projectilePool: PoolManager<Projectile>;
  private activeProjectiles: Set<Projectile> = new Set();
  public onEnemyDeath?: EnemyDeathCallback;
  public onDamageDealt?: DamageDealtCallback;
  private weaponEffectSystem?: WeaponEffectSystem;
  private screenShake?: ScreenShake;
  private particleEffects?: ParticleEffects;
  private comboSystem: ComboSystem;

  constructor(private scene: Scene) {
    // Initialize projectile pool
    this.projectilePool = new PoolManager(
      () => new Projectile(scene),
      (projectile) => projectile.reset(),
      100 // Increased for multi-shot
    );
    
    // Initialize combo system
    this.comboSystem = new ComboSystem(scene);
    
    // Create kick variation weapons based on unlocked upgrades
    const kickWeapons = WeaponFactory.createKickVariationWeapons();
    kickWeapons.forEach(weapon => this.addWeapon(weapon));
  }
  
  setWeaponEffectSystem(effectSystem: WeaponEffectSystem): void {
    this.weaponEffectSystem = effectSystem;
  }
  
  setVisualEffects(screenShake: ScreenShake, particleEffects: ParticleEffects): void {
    this.screenShake = screenShake;
    this.particleEffects = particleEffects;
  }
  
  getComboSystem(): ComboSystem {
    return this.comboSystem;
  }

  addWeapon(weapon: Weapon): void {
    this.weapons.push(weapon);
  }
  
  updateWeaponsForUpgrades(): void {
    // Update kick variations based on unlocked upgrades
    this.updateKickVariations();
    
    // Rebuild all kick weapons with current upgrade values
    this.refreshKickWeapons();
  }
  
  refreshKickWeapons(): void {
    // Recreate all kick weapons to apply current upgrade multipliers
    const currentKickTypes = this.weapons
      .filter(weapon => ['brattack', 'uppercut', 'spinningkick', 'groundpound']
        .includes(this.getWeaponTypeFromBehavior(weapon.behavior)))
      .map(weapon => this.getWeaponTypeFromBehavior(weapon.behavior));
    
    // Remove old kick weapons
    this.weapons = this.weapons.filter(weapon => 
      !['brattack', 'uppercut', 'spinningkick', 'groundpound']
        .includes(this.getWeaponTypeFromBehavior(weapon.behavior)));
    
    // Recreate kick weapons with updated stats
    currentKickTypes.forEach(kickType => {
      switch (kickType) {
        case 'brattack':
          this.addWeapon(WeaponFactory.createWeapon(WeaponType.BRATTACK));
          break;
        case 'uppercut':
          this.addWeapon(WeaponFactory.createWeapon(WeaponType.UPPERCUT));
          break;
        case 'spinningkick':
          this.addWeapon(WeaponFactory.createWeapon(WeaponType.SPINNING_KICK));
          break;
        case 'groundpound':
          this.addWeapon(WeaponFactory.createWeapon(WeaponType.GROUND_POUND));
          break;
      }
    });
  }
  
  updateKickVariations(): void {
    const upgradeManager = (window as any).upgradeManager;
    if (!upgradeManager) return;
    
    // Get current kick variation weapons
    const currentKickTypes = new Set(this.weapons
      .filter(weapon => ['brattack', 'uppercut', 'spinningkick', 'groundpound']
        .includes(weapon.behavior.constructor.name.toLowerCase().replace('behavior', '')))
      .map(weapon => this.getWeaponTypeFromBehavior(weapon.behavior)));
    
    // Check for newly unlocked variations
    const shouldHaveUppercut = upgradeManager.getUpgradeLevel('uppercutVariation') > 0;
    const shouldHaveSpinning = upgradeManager.getUpgradeLevel('spinningKickVariation') > 0;
    const shouldHaveGroundPound = upgradeManager.getUpgradeLevel('groundPoundVariation') > 0;
    
    // Add missing kick variations
    if (shouldHaveUppercut && !currentKickTypes.has('uppercut')) {
      this.addWeapon(WeaponFactory.createWeapon(WeaponType.UPPERCUT));
    }
    if (shouldHaveSpinning && !currentKickTypes.has('spinningkick')) {
      this.addWeapon(WeaponFactory.createWeapon(WeaponType.SPINNING_KICK));
    }
    if (shouldHaveGroundPound && !currentKickTypes.has('groundpound')) {
      this.addWeapon(WeaponFactory.createWeapon(WeaponType.GROUND_POUND));
    }
  }
  
  private getWeaponTypeFromBehavior(behavior: any): string {
    const behaviorName = behavior.constructor.name.toLowerCase();
    if (behaviorName.includes('uppercut')) return 'uppercut';
    if (behaviorName.includes('spinning')) return 'spinningkick';
    if (behaviorName.includes('ground')) return 'groundpound';
    if (behaviorName.includes('brattack')) return 'brattack';
    return 'unknown';
  }

  update(deltaTime: number, currentTime: number, player: Player, enemies: Enemy[]): void {
    // Update all active projectiles
    const projectilesToRemove: Projectile[] = [];
    
    this.activeProjectiles.forEach(projectile => {
      const expired = projectile.update(deltaTime);
      
      if (expired || !projectile.sprite.active) {
        projectilesToRemove.push(projectile);
      } else {
        // Check collision with enemies
        enemies.forEach(enemy => {
          if (!enemy.sprite.active || enemy.isDying) return;
          
          const dx = projectile.x - enemy.x;
          const dy = projectile.y - enemy.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          // Use actual enemy hitbox radius + projectile radius (default 5)
          const projectileRadius = projectile.radius || 5;
          const collisionDistance = enemy.hitboxRadius + projectileRadius;
          
          if (distance < collisionDistance) {
            // Validate damage is a valid number
            let damage = isNaN(projectile.damage) || !isFinite(projectile.damage) 
              ? 0 : projectile.damage;
            
            if (damage <= 0) {
              console.warn('Invalid projectile damage:', projectile.damage);
              projectilesToRemove.push(projectile);
              return; // Use return instead of continue in forEach
            }
            
            // CRITICAL HIT SYSTEM - 15% chance for 2x damage
            const isCritical = Math.random() < 0.15;
            if (isCritical) {
              damage *= 2;
            }
            
            const wasDying = enemy.isDying;
            const isDead = enemy.takeDamage(damage);
            
            // Apply knockback for kick-based projectiles (even if enemy dies!)
            if ((projectile.weaponType === 'brattack' || projectile.weaponType === 'uppercut' || 
                 projectile.weaponType === 'spinningkick' || projectile.weaponType === 'groundpound') && !wasDying) {
              // Reset combo for new kick sequence
              this.comboSystem.resetCombo();
              
              // Calculate knockback based on kick type
              this.applyKickKnockback(projectile.weaponType, enemy, player);
              
              // Handle explosive enemies
              if (enemy.enemyType.explosiveRadius && enemy.enemyType.explosiveDamage) {
                this.createExplosion(enemy.x, enemy.y, enemy.enemyType.explosiveRadius, 
                                   enemy.enemyType.explosiveDamage, enemies);
              }
              
              // Add extra screen shake for knockback hits
              if (this.screenShake) {
                this.screenShake.shake(4, 120);
              }
            }
            
            // Only create damage number and callbacks if enemy wasn't already dying
            if (!wasDying) {
              // VS-style damage number popup with critical support
              this.createDamageNumber(enemy.x, enemy.y, damage, isCritical);
              
              // Visual feedback based on hit type
              if (isCritical && this.particleEffects) {
                this.particleEffects.createCriticalHitEffect(enemy.x, enemy.y);
                if (this.screenShake) {
                  this.screenShake.shake(5, 100); // Stronger shake for crits
                }
              } else if (this.particleEffects) {
                // Calculate hit direction for spark effect
                const hitAngle = Math.atan2(enemy.y - projectile.y, enemy.x - projectile.x);
                this.particleEffects.createHitSpark(enemy.x, enemy.y, hitAngle);
              }
              
              // Track damage dealt
              if (this.onDamageDealt) {
                this.onDamageDealt(damage);
              }
              
              if (isDead) {
                // Enemy died - notify callback (only once)
                if (this.onEnemyDeath) {
                  this.onEnemyDeath(enemy.x, enemy.y);
                }
              }
            }
            
            if (!isDead) {
              // Flash red on hit (Graphics objects use fillStyle, not tint)
              if (enemy.sprite instanceof Phaser.GameObjects.Graphics) {
                // Redraw with tint effect
                const originalColor = enemy.enemyType.color;
                enemy.sprite.clear();
                enemy.sprite.fillStyle(0xff6666, 1);
                enemy.drawEnemy();
                
                this.scene.time.delayedCall(100, () => {
                  if (enemy.sprite.active) {
                    enemy.sprite.clear();
                    enemy.sprite.fillStyle(originalColor, 1);
                    enemy.drawEnemy();
                  }
                });
              }
            }
            
            projectilesToRemove.push(projectile);
          }
        });
      }
    });
    
    // Remove expired projectiles
    projectilesToRemove.forEach(projectile => {
      this.activeProjectiles.delete(projectile);
      this.projectilePool.release(projectile);
    });
    
    // Fire weapons using their behaviors
    const playerPos = player.getPosition();
    
    this.weapons.forEach(weapon => {
      if (!weapon.canFire(currentTime)) return;
      
      // Use weapon behavior to determine projectiles
      const projectileFires = weapon.behavior.fire(
        playerPos,
        enemies,
        this.projectilePool,
        weapon.getDamage(),
        weapon.range,
        player,
        this.weaponEffectSystem
      );
      
      // Fire each projectile
      projectileFires.forEach(({ projectile, startX, startY, targetX, targetY, speed, visuals, followTarget, liveTarget }) => {
        projectile.fire(
          startX ?? playerPos.x, // Use custom start or player position
          startY ?? playerPos.y,
          targetX,
          targetY,
          weapon.getDamage(),
          visuals,
          speed ?? weapon.projectileSpeed, // Use custom speed or weapon's speed
          followTarget,
          liveTarget
        );
        
        this.activeProjectiles.add(projectile);
      });
      
      if (projectileFires.length > 0) {
        weapon.updateFireTime(currentTime);
      }
    });
    
    // Check for enemy-to-enemy collisions from knockback
    this.checkKnockbackCollisions(enemies, player);
    
    // Update combo system
    this.comboSystem.update();
  }

  reset(): void {
    this.activeProjectiles.forEach(projectile => {
      this.projectilePool.release(projectile);
    });
    this.activeProjectiles.clear();
    
    // Reset combo system
    this.comboSystem.forceReset();
  }
  
  private checkKnockbackCollisions(enemies: Enemy[], player: Player): void {
    // Find all enemies that are currently being knocked back (including dead ones!)
    const knockedBackEnemies = enemies.filter(enemy => 
      enemy.sprite.active && enemy.isKnockedBack
    );
    
    // Check each knocked-back enemy against all other enemies
    knockedBackEnemies.forEach(projectileEnemy => {
      enemies.forEach(targetEnemy => {
        // Skip self, inactive, dying, or already knocked-back enemies
        if (projectileEnemy === targetEnemy || 
            !targetEnemy.sprite.active || 
            targetEnemy.isDying ||
            targetEnemy.isKnockedBack) {
          return;
        }
        
        // Calculate distance between enemies
        const dx = projectileEnemy.x - targetEnemy.x;
        const dy = projectileEnemy.y - targetEnemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Check collision using combined hitbox radii
        const collisionDistance = projectileEnemy.hitboxRadius + targetEnemy.hitboxRadius;
        
        if (distance < collisionDistance && distance > 0) {
          // Add to combo system for chain hits
          this.comboSystem.addChainHit();
          
          // Apply chain damage with weight class AND combo multipliers
          const baseChainDamage = 1;
          const chainMultiplier = projectileEnemy.enemyType.chainDamageMultiplier || 1.0;
          const comboMultiplier = this.comboSystem.getCurrentMultiplier();
          const chainDamage = baseChainDamage * chainMultiplier * comboMultiplier;
          const isDead = targetEnemy.takeDamage(chainDamage);
          
          // Create damage number for chain hit with combo indicator
          this.createDamageNumber(targetEnemy.x, targetEnemy.y, chainDamage, false, true);
          
          // Apply secondary knockback (even if enemy dies from chain hit!)
          // ALWAYS push away from player, not based on collision direction
          const playerPos = player.getPosition();
          const toDx = targetEnemy.x - playerPos.x;
          const toDy = targetEnemy.y - playerPos.y;
          const toPlayerDistance = Math.sqrt(toDx * toDx + toDy * toDy);
          
          // Calculate chain force with upgrades
          const upgradeManager = (window as any).upgradeManager;
          const chainForceMultiplier = upgradeManager ? 
            (1 + (upgradeManager.getUpgradeLevel('chainPower') * 0.30)) : 1;
          
          const baseChainForce = 400;
          const chainForce = baseChainForce * chainForceMultiplier;
          const knockbackX = (toDx / toPlayerDistance) * chainForce;
          const knockbackY = (toDy / toPlayerDistance) * chainForce;
          targetEnemy.applyKnockback(knockbackX, knockbackY);
          
          // Visual effects for chain hit (special chain effect)
          if (this.particleEffects) {
            const hitAngle = Math.atan2(dy, dx);
            this.particleEffects.createChainHitEffect(targetEnemy.x, targetEnemy.y, hitAngle);
          }
          
          if (this.screenShake) {
            this.screenShake.shake(3, 80); // Weaker shake for chain hits
          }
          
          // Track damage dealt
          if (this.onDamageDealt) {
            this.onDamageDealt(chainDamage);
          }
          
          // Track enemy death
          if (isDead && this.onEnemyDeath) {
            this.onEnemyDeath(targetEnemy.x, targetEnemy.y);
          }
        }
      });
    });
  }
  
  private applyKickKnockback(weaponType: string, enemy: Enemy, player: Player): void {
    const playerPos = player.getPosition();
    const dx = enemy.x - playerPos.x;
    const dy = enemy.y - playerPos.y;
    const playerDistance = Math.sqrt(dx * dx + dy * dy);
    
    // Get upgrade multipliers
    const upgradeManager = (window as any).upgradeManager;
    const forceMultiplier = upgradeManager ? 
      (1 + (upgradeManager.getUpgradeLevel('kickForce') * 0.25)) : 1;
    
    const weightMultiplier = enemy.enemyType.kickMultiplier || 1.0;
    
    let knockbackX = 0;
    let knockbackY = 0;
    
    switch (weaponType) {
      case 'brattack':
        // Standard horizontal knockback
        const basicForce = 800 * forceMultiplier * weightMultiplier;
        knockbackX = (dx / playerDistance) * basicForce;
        knockbackY = (dy / playerDistance) * basicForce;
        break;
        
      case 'uppercut':
        // Upward arc knockback - less horizontal, more vertical
        const uppercutForce = 900 * forceMultiplier * weightMultiplier;
        knockbackX = (dx / playerDistance) * uppercutForce * 0.6; // Reduced horizontal
        knockbackY = (dy / playerDistance) * uppercutForce * 0.4 - uppercutForce * 0.7; // Strong upward component
        break;
        
      case 'spinningkick':
        // Radial knockback from player position
        const spinForce = 700 * forceMultiplier * weightMultiplier;
        knockbackX = (dx / playerDistance) * spinForce;
        knockbackY = (dy / playerDistance) * spinForce;
        break;
        
      case 'groundpound':
        // Powerful outward knockback with slight randomness
        const poundForce = 1000 * forceMultiplier * weightMultiplier;
        const randomAngle = (Math.random() - 0.5) * 0.3; // Small random variation
        const angle = Math.atan2(dy, dx) + randomAngle;
        knockbackX = Math.cos(angle) * poundForce;
        knockbackY = Math.sin(angle) * poundForce;
        break;
        
      default:
        // Fallback to basic knockback
        const defaultForce = 800 * forceMultiplier * weightMultiplier;
        knockbackX = (dx / playerDistance) * defaultForce;
        knockbackY = (dy / playerDistance) * defaultForce;
        break;
    }
    
    enemy.applyKnockback(knockbackX, knockbackY);
  }
  
  private createExplosion(x: number, y: number, radius: number, damage: number, enemies: Enemy[]): void {
    // Find all enemies within explosion radius
    enemies.forEach(enemy => {
      if (!enemy.sprite.active || enemy.isDying) return;
      
      const dx = enemy.x - x;
      const dy = enemy.y - y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance <= radius) {
        // Apply explosion damage
        enemy.takeDamage(damage);
        this.createDamageNumber(enemy.x, enemy.y, damage);
        
        // Apply explosive knockback (always away from explosion center)
        if (distance > 0) {
          const explosiveForce = 600;
          const knockbackX = (dx / distance) * explosiveForce;
          const knockbackY = (dy / distance) * explosiveForce;
          enemy.applyKnockback(knockbackX, knockbackY);
        }
        
        // Track damage dealt
        if (this.onDamageDealt) {
          this.onDamageDealt(damage);
        }
        
        // Track enemy death
        if (enemy.health <= 0 && this.onEnemyDeath) {
          this.onEnemyDeath(enemy.x, enemy.y);
        }
      }
    });
    
    // Create massive explosion visual effect
    if (this.particleEffects) {
      // Create multiple explosion rings
      for (let i = 0; i < 3; i++) {
        setTimeout(() => {
          this.createExplosionRing(x, y, radius * (0.3 + i * 0.35));
        }, i * 100);
      }
    }
    
    // Massive screen shake for explosion
    if (this.screenShake) {
      this.screenShake.shake(8, 200);
    }
  }
  
  private createExplosionRing(x: number, y: number, radius: number): void {
    const ring = this.scene.add.graphics();
    ring.setPosition(x, y);
    ring.setDepth(60); // Above everything
    
    // Draw explosion ring
    ring.lineStyle(4, 0xFF6600, 1); // Orange explosion
    ring.strokeCircle(0, 0, radius);
    
    // Animate ring expansion and fade
    this.scene.tweens.add({
      targets: ring,
      alpha: 0,
      scaleX: 1.5,
      scaleY: 1.5,
      duration: 300,
      ease: 'Power2',
      onComplete: () => ring.destroy()
    });
  }
  
  private createDamageNumber(x: number, y: number, damage: number, isCritical: boolean = false, isCombo: boolean = false): void {
    // VS-style damage number popup with combo support
    let fontSize = '16px';
    let color = '#ffff00'; // Yellow for normal
    let displayText = Math.round(damage).toString();
    
    if (isCritical) {
      fontSize = '20px';
      color = '#ff3333'; // Red for crits
    } else if (isCombo) {
      fontSize = '18px';
      color = '#FF6600'; // Orange for combo hits
      const multiplier = this.comboSystem.getCurrentMultiplier();
      if (multiplier > 1) {
        displayText += ` x${multiplier.toFixed(1)}`;
      }
    }
    
    const damageText = this.scene.add.text(x, y - 10, displayText, {
      fontSize: fontSize,
      color: color,
      stroke: '#000000',
      strokeThickness: 3,
      fontFamily: 'Arial Black, Arial',
      fontStyle: 'bold'
    });
    damageText.setOrigin(0.5);
    damageText.setDepth(100); // High depth to appear above everything
    
    // Random slight offset for multiple hits
    const offsetX = (Math.random() - 0.5) * 20;
    const offsetY = (Math.random() - 0.5) * 10;
    
    // VS-style animation: float up and fade out
    let targetY = y - 40 + offsetY;
    let targetScale = 1.2;
    
    if (isCritical) {
      targetY = y - 50 + offsetY;
      targetScale = 1.5;
    } else if (isCombo) {
      targetY = y - 45 + offsetY;
      targetScale = 1.3;
    }
    
    this.scene.tweens.add({
      targets: damageText,
      x: x + offsetX,
      y: targetY,
      alpha: 0,
      scaleX: targetScale,
      scaleY: targetScale,
      duration: 700,
      ease: 'Power2',
      onComplete: () => damageText.destroy()
    });
    
    // Add extra pop effect for criticals and combos
    if (isCritical) {
      damageText.setScale(1.5);
      this.scene.tweens.add({
        targets: damageText,
        scaleX: 1,
        scaleY: 1,
        duration: 100,
        ease: 'Back.out'
      });
    } else if (isCombo) {
      damageText.setScale(1.3);
      this.scene.tweens.add({
        targets: damageText,
        scaleX: 1,
        scaleY: 1,
        duration: 120,
        ease: 'Back.out'
      });
    }
  }
}