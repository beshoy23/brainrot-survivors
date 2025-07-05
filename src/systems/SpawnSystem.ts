import { Scene } from 'phaser';
import { Enemy } from '../entities/Enemy';
import { PoolManager } from '../managers/PoolManager';
import { GameConfig } from '../config/game';
import { Vector2 } from '../utils/Vector2';
import { getAvailableEnemyTypes, getRandomEnemyType, ENEMY_TYPES } from '../config/enemyTypes';
import { EnemyTypeId } from '../enemies/EnemyType';
import { getWaveConfig, WaveConfig } from '../config/waveConfig';

export class SpawnSystem {
  private lastSpawnTime: number = 0;
  private enemyPool: PoolManager<Enemy>;
  private survivalTime: number = 0;
  private lastEliteSpawn: number = 0;
  private eliteSpawnInterval: number = 60000; // 60 seconds
  private currentWave: WaveConfig;
  private rapidSpawnMode: boolean = false;
  private lastRapidSpawn: number = 0;
  private rapidSpawnInterval: number = 100; // 100ms for quota filling

  constructor(private scene: Scene) {
    // Create enemy pool
    this.enemyPool = new PoolManager(
      () => new Enemy(scene),
      (enemy) => enemy.reset(),
      150 // Realistic pool size for collision physics
    );
    
    // Initialize with first wave
    this.currentWave = getWaveConfig(0);
  }

  update(currentTime: number, playerPos: Vector2): void {
    this.survivalTime = currentTime;
    
    // Update current wave based on time
    const currentMinute = Math.floor(this.survivalTime / 60000);
    this.currentWave = getWaveConfig(currentMinute);
    
    // Get active enemy count
    const activeEnemies = this.getActiveEnemies().length;
    
    // VS-style spawn logic
    if (activeEnemies < this.currentWave.minEnemies) {
      // RAPID SPAWN MODE - fill quota quickly with bursts
      this.rapidSpawnMode = true;
      if (currentTime - this.lastRapidSpawn >= this.rapidSpawnInterval) {
        this.lastRapidSpawn = currentTime;
        this.spawnBurst(playerPos);
      }
    } else {
      // NORMAL SPAWN MODE - respects wave interval
      this.rapidSpawnMode = false;
      if (currentTime - this.lastSpawnTime >= this.currentWave.spawnInterval) {
        this.lastSpawnTime = currentTime;
        this.spawnWaveEnemies(playerPos);
      }
    }
    
    // Boss spawns at minute marks
    if (this.currentWave.bossSpawn && currentTime - this.lastEliteSpawn >= this.eliteSpawnInterval) {
      this.lastEliteSpawn = currentTime;
      this.spawnElite(playerPos);
    }
    
    // Clean up dead enemies - but only if they're not playing death animation
    const enemies = this.getActiveEnemies();
    const enemiesToRelease: Enemy[] = [];
    
    enemies.forEach(enemy => {
      if (enemy.sprite.active && enemy.health <= 0 && !enemy.isDying) {
        enemiesToRelease.push(enemy);
      }
    });
    
    // Release after iteration to avoid modifying collection during iteration
    enemiesToRelease.forEach(enemy => {
      this.releaseEnemy(enemy);
    });
  }

  private spawnBurst(playerPos: Vector2): void {
    // VS-style burst spawning to fill quota quickly
    const activeEnemies = this.getActiveEnemies().length;
    const deficit = this.currentWave.minEnemies - activeEnemies;
    
    if (deficit <= 0) return;
    
    // Spawn burst of enemies - scale with deficit size and time
    const timeMinutes = this.survivalTime / 60000;
    const burstPercent = timeMinutes < 1 ? 0.08 : 0.15; // Gentler in first minute
    const burstSize = Math.min(deficit, Math.max(1, Math.ceil(deficit * burstPercent)));
    const availableTypes = this.getAvailableTypesForWave();
    if (availableTypes.length === 0) return;
    
    for (let i = 0; i < burstSize; i++) {
      const enemyType = getRandomEnemyType(availableTypes);
      this.spawnSingleEnemy(playerPos, enemyType);
    }
  }
  
  private spawnWaveEnemies(playerPos: Vector2): void {
    // Normal spawn - pick ONE random type from the wave
    const availableTypes = this.getAvailableTypesForWave();
    if (availableTypes.length === 0) return;
    
    // VS actually spawns ONE enemy type at a time when above minimum
    const enemyType = getRandomEnemyType(availableTypes);
    
    // VS-style swarm spawning: spawn groups with coordinated movement
    if (enemyType.id === EnemyTypeId.SWARM) {
      this.spawnSwarmGroup(playerPos, enemyType);
    } else {
      this.spawnSingleEnemy(playerPos, enemyType);
    }
  }
  
  private getAvailableTypesForWave(): any[] {
    const currentTimeSeconds = this.survivalTime / 1000;
    
    // Get enemy types based on current wave config AND time gates
    return this.currentWave.types
      .map(typeName => {
        // Map wave type names to actual enemy configs
        switch(typeName) {
          case 'basic': return ENEMY_TYPES.basic;
          case 'fast': return ENEMY_TYPES.fast;
          case 'swarm': return ENEMY_TYPES.swarm;
          case 'tank': return ENEMY_TYPES.tank;
          case 'elite': return ENEMY_TYPES.elite;
          default: return null;
        }
      })
      .filter(type => {
        // Filter by time gates and spawn weight
        return type !== null && 
               type.minWaveTime <= currentTimeSeconds && 
               type.spawnWeight > 0;
      });
  }
  
  private spawnSingleEnemy(playerPos: Vector2, enemyType: any): void {
    const enemy = this.enemyPool.acquire();
    
    // Calculate spawn position (off-screen)
    // Add small random offset to angle to prevent exact overlaps
    const baseAngle = Math.random() * Math.PI * 2;
    const angleOffset = (Math.random() - 0.5) * 0.1; // ±0.05 radians
    const angle = baseAngle + angleOffset;
    
    // Ensure enemies spawn outside viewport regardless of player position
    const screenRadius = Math.sqrt(
      Math.pow(this.scene.scale.width / 2, 2) + 
      Math.pow(this.scene.scale.height / 2, 2)
    );
    const minDistance = screenRadius + GameConfig.spawning.spawnDistance;
    
    // Add random distance variation to prevent clustering
    const distanceVariation = Math.random() * 50; // 0-50 pixel variation
    const distance = minDistance + distanceVariation;
    
    const x = playerPos.x + Math.cos(angle) * distance;
    const y = playerPos.y + Math.sin(angle) * distance;
    
    // Validate position is not NaN
    if (isNaN(x) || isNaN(y)) {
      console.error('Invalid spawn position:', { x, y, playerPos });
      enemy.spawn(playerPos.x + 500, playerPos.y, enemyType); // Fallback position
      return;
    }
    
    // Apply progressive health scaling based on survival time
    const scaledEnemyType = this.applyHealthScaling(enemyType);
    
    enemy.spawn(x, y, scaledEnemyType);
  }
  
  private spawnSwarmGroup(playerPos: Vector2, enemyType: any): void {
    // VS-style: spawn 8-12 swarm enemies in a line formation
    const swarmSize = 8 + Math.floor(Math.random() * 5); // 8-12 enemies
    
    // Pick a random side of the screen to spawn from
    const side = Math.floor(Math.random() * 4); // 0=top, 1=right, 2=bottom, 3=left
    const screenW = this.scene.scale.width;
    const screenH = this.scene.scale.height;
    
    let startX, startY, angle;
    
    switch(side) {
      case 0: // Top - sweep downward
        startX = playerPos.x - screenW/3 + Math.random() * (screenW * 2/3);
        startY = playerPos.y - screenH/2 - 100;
        angle = Math.PI/2 + (Math.random() - 0.5) * 0.5; // Roughly downward
        break;
      case 1: // Right - sweep leftward  
        startX = playerPos.x + screenW/2 + 100;
        startY = playerPos.y - screenH/3 + Math.random() * (screenH * 2/3);
        angle = Math.PI + (Math.random() - 0.5) * 0.5; // Roughly leftward
        break;
      case 2: // Bottom - sweep upward
        startX = playerPos.x - screenW/3 + Math.random() * (screenW * 2/3);
        startY = playerPos.y + screenH/2 + 100;
        angle = -Math.PI/2 + (Math.random() - 0.5) * 0.5; // Roughly upward
        break;
      default: // Left - sweep rightward
        startX = playerPos.x - screenW/2 - 100;
        startY = playerPos.y - screenH/3 + Math.random() * (screenH * 2/3);
        angle = (Math.random() - 0.5) * 0.5; // Roughly rightward
        break;
    }
    
    // Spawn swarm in formation
    for (let i = 0; i < swarmSize; i++) {
      const enemy = this.enemyPool.acquire();
      
      // Spread enemies in a line formation
      const spacing = 30; // Distance between swarm members
      const offsetX = (i - swarmSize/2) * spacing * Math.cos(angle + Math.PI/2);
      const offsetY = (i - swarmSize/2) * spacing * Math.sin(angle + Math.PI/2);
      
      const finalX = startX + offsetX;
      const finalY = startY + offsetY;
      
      // Apply progressive health scaling for swarm enemies too
      const scaledEnemyType = this.applyHealthScaling(enemyType);
      enemy.spawn(finalX, finalY, scaledEnemyType, angle);
      // All swarm members move in the same direction
    }
    
    // VS-style swarm spawned successfully
  }
  
  private applyHealthScaling(enemyType: any): any {
    const survivalTimeSeconds = this.survivalTime / 1000;
    
    // Progressive health scaling: +10% health every 30 seconds, caps at +100% after 5 minutes
    const healthScaleIntervals = Math.floor(survivalTimeSeconds / 30); // Every 30 seconds
    const healthMultiplier = 1 + Math.min(healthScaleIntervals * 0.1, 1.0); // Cap at +100%
    
    // VS-style damage scaling: +1 flat damage every 2 minutes, caps at +10 after 20 minutes
    const damageScaleIntervals = Math.floor(survivalTimeSeconds / 120); // Every 2 minutes
    const damageBonus = Math.min(damageScaleIntervals, 10); // Cap at +10 damage
    
    // Create a copy of the enemy type with scaled stats
    const scaledType = { ...enemyType };
    scaledType.health = Math.ceil(enemyType.health * healthMultiplier);
    scaledType.damage = enemyType.damage + damageBonus;
    
    return scaledType;
  }
  
  private spawnElite(playerPos: Vector2): void {
    // Spawn an elite enemy
    this.spawnSingleEnemy(playerPos, ENEMY_TYPES.elite);
    
    // Visual/audio feedback for elite spawn could go here
  }

  spawnEnemyAt(x: number, y: number, enemyType: any): Enemy {
    // Public method for manual enemy spawning (e.g., initial enemies)
    const enemy = this.enemyPool.acquire();
    enemy.spawn(x, y, enemyType);
    return enemy;
  }

  getActiveEnemies(): Enemy[] {
    return this.enemyPool.getActive();
  }

  releaseEnemy(enemy: Enemy): void {
    this.enemyPool.release(enemy);
  }

  reset(): void {
    this.enemyPool.releaseAll();
    this.lastSpawnTime = 0;
    this.currentWave = getWaveConfig(0);
    this.rapidSpawnMode = false;
  }
}