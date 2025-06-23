# Brainrot Survivors Development Plan

## Technology Stack

### Core Engine: Phaser 3
- **Why**: Excellent performance with WebGL, built-in object pooling, spatial hashing for collisions
- **Benefits**: 
  - Handles hundreds of sprites efficiently
  - Built-in physics we can disable for custom movement
  - Excellent sprite batching
  - Active community and documentation

### Language: TypeScript
- **Why**: Type safety, better IDE support, easier refactoring
- **Benefits**:
  - Catch errors at compile time
  - Better code organization with interfaces
  - Easier to maintain and scale

### Build Tool: Vite
- **Why**: Fast HMR, minimal config, excellent TS support
- **Benefits**:
  - Near-instant hot reload
  - Built-in optimization
  - Easy asset handling

## Architecture Design

### Core Principles
1. **Entity Component System (ECS) Pattern**
   - Separate data from logic
   - Highly performant for many entities
   - Easy to add new behaviors

2. **Object Pooling Everything**
   - Pre-allocate enemies, projectiles, effects
   - Never garbage collect during gameplay
   - Reuse all game objects

3. **Modular Systems**
   - Each system in its own file (<100 lines)
   - Clear interfaces between systems
   - Easy to modify/extend

## Project Structure

```
brainrot-survivors/
├── src/
│   ├── main.ts                    # Entry point, game initialization
│   ├── scenes/
│   │   ├── BootScene.ts           # Asset loading
│   │   ├── MenuScene.ts           # Main menu
│   │   ├── GameScene.ts           # Core gameplay
│   │   └── UpgradeScene.ts        # Level-up UI
│   ├── systems/
│   │   ├── MovementSystem.ts      # Player/enemy movement
│   │   ├── SpawnSystem.ts         # Enemy wave spawning
│   │   ├── CollisionSystem.ts     # Spatial grid collision
│   │   ├── DamageSystem.ts        # Health and damage
│   │   ├── WeaponSystem.ts        # Weapon behavior
│   │   ├── PickupSystem.ts        # XP gems and items
│   │   └── UpgradeSystem.ts       # Level-up logic
│   ├── entities/
│   │   ├── Player.ts              # Player specific logic
│   │   ├── Enemy.ts               # Base enemy class
│   │   ├── Weapon.ts              # Base weapon class
│   │   └── Pickup.ts              # XP gems, items
│   ├── components/
│   │   ├── Position.ts            # x, y coordinates
│   │   ├── Velocity.ts            # dx, dy movement
│   │   ├── Health.ts              # current/max health
│   │   ├── Damage.ts              # damage dealing
│   │   └── Sprite.ts              # visual representation
│   ├── managers/
│   │   ├── PoolManager.ts         # Object pooling
│   │   ├── WaveManager.ts         # Enemy wave timing
│   │   ├── UIManager.ts           # HUD updates
│   │   └── SaveManager.ts         # Progress saving
│   ├── config/
│   │   ├── enemies.ts             # Enemy definitions
│   │   ├── weapons.ts             # Weapon definitions
│   │   ├── upgrades.ts            # Upgrade definitions
│   │   └── waves.ts               # Wave patterns
│   └── utils/
│       ├── SpatialGrid.ts         # Collision optimization
│       ├── Vector2.ts             # 2D math helpers
│       └── Random.ts              # Seeded randomization
├── assets/
│   ├── sprites/
│   ├── audio/
│   └── fonts/
├── tests/
│   └── systems/
└── public/
    └── index.html
```

## Implementation Phases

### Phase 1: Core Movement (Week 1)
1. **Player Controller**
   - WASD/arrow key input
   - Smooth 8-directional movement
   - Speed configuration

2. **Basic Enemy**
   - Direct movement toward player
   - No collision between enemies
   - Object pooling setup

3. **Collision System**
   - Spatial grid for performance
   - Player-enemy detection only
   - Continuous damage on contact

### Phase 2: Combat Loop (Week 2)
1. **Auto-Attacking Weapon**
   - Simple projectile system
   - Automatic targeting
   - Damage application

2. **Enemy Spawning**
   - Off-screen spawn points
   - Time-based waves
   - Increasing density

3. **Health & Death**
   - Player health bar
   - Enemy health/death
   - Game over state

### Phase 3: Progression System (Week 3)
1. **XP & Leveling**
   - XP gem drops
   - Collection mechanics
   - Level-up triggers

2. **Upgrade UI**
   - Pause on level-up
   - 3-4 random choices
   - Apply upgrade effects

3. **Multiple Weapons**
   - 2-3 weapon types
   - Upgrade paths
   - Stacking effects

### Phase 4: Polish & Content (Week 4)
1. **Enemy Variety**
   - Different speeds/health
   - Special behaviors
   - Visual variety

2. **Weapon Variety**
   - 5-6 weapon types
   - Evolution system
   - Visual effects

3. **Game Feel**
   - Screen shake
   - Particle effects
   - Sound effects
   - Score/timer

## Performance Optimizations

### Rendering
- **Sprite Batching**: Use same texture atlas for all enemies
- **Culling**: Only render on-screen entities
- **Static Background**: No animated tiles

### Logic
- **Spatial Grid**: O(1) collision checks
- **Object Pooling**: Zero garbage collection
- **Fixed Timestep**: Predictable performance

### Memory
- **Pre-allocation**: All pools created at start
- **Reuse Everything**: Never create/destroy in game loop
- **Minimal State**: Components hold only essential data

## Code Quality Standards

### File Organization
- **Max 100 lines per file**
- **Single responsibility**
- **Clear imports/exports**

### Naming Conventions
- **PascalCase**: Classes, types
- **camelCase**: Functions, variables
- **UPPER_CASE**: Constants
- **Descriptive names**: No abbreviations

### Documentation
- **JSDoc for public APIs**
- **README for each system**
- **Inline comments for complex logic**

### Testing Strategy
- **Unit tests**: Core systems
- **Integration tests**: System interactions
- **Performance tests**: Frame rate monitoring

## Development Workflow

1. **Version Control**
   - Feature branches
   - Meaningful commits
   - PR reviews (if team)

2. **Development**
   - Hot reload for quick iteration
   - Debug overlays for systems
   - Performance monitoring

3. **Build Pipeline**
   - TypeScript compilation
   - Asset optimization
   - Minification for production

## Success Metrics

### Performance
- **60 FPS with 200+ enemies**
- **<16ms frame time**
- **<50MB memory usage**

### Code Quality
- **No file >100 lines**
- **<5 parameters per function**
- **90%+ test coverage on systems**

### Player Experience
- **<5 second load time**
- **Instant input response**
- **Clear visual feedback**

## Next Steps

1. Set up project with Vite + Phaser + TypeScript
2. Implement basic movement system
3. Create enemy spawning with object pools
4. Add collision detection with spatial grid
5. Build upgrade system UI
6. Iterate on game feel