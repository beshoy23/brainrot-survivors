# Brainrot Survivors Project Documentation

## Project Overview
A Vampire Survivors-inspired game focusing on the core tension-release gameplay loop through movement decisions and upgrade choices.

## Required Features

### Core Gameplay Loop
1. **Movement System**
   - Single input control (WASD/arrows only)
   - Player ~20-30% faster than basic enemies
   - 8-directional movement with no acceleration
   - Creates spatial puzzle of navigating enemy swarms

2. **Enemy System**
   - Direct movement toward player (no pathfinding)
   - NO collision between enemies (phase through each other)
   - Spawn off-screen with increasing frequency
   - Contact damage with continuous health drain
   - Multiple enemy types with different speeds

3. **Combat System**
   - Auto-attacking weapons (no manual aiming)
   - Multiple weapon types with different patterns
   - Weapon evolution/upgrade paths
   - Visual feedback on hits

4. **Progression System**
   - XP gems drop from defeated enemies
   - Level-up triggers game pause
   - Choose from 3-4 random upgrades
   - Weapon and passive ability upgrades
   - Synergies between different upgrades

5. **Tension-Release Cycle**
   - TENSION: Dodge enemies while collecting XP
   - RELEASE: Level-up pause with upgrade choice
   - REWARD: Feel more powerful after upgrade
   - REPEAT: Enemies scale to maintain challenge

## Tech Stack

### Core Technologies
- **Game Engine**: Phaser 3 (WebGL renderer, built-in optimizations)
- **Language**: TypeScript (strict mode enabled)
- **Build Tool**: Vite (fast HMR, minimal config)
- **Architecture**: Entity Component System (ECS) pattern

### Project Structure
```
src/
├── scenes/      # Phaser scenes (Boot, Game, Upgrade)
├── systems/     # Game systems (Movement, Combat, etc.)
├── entities/    # Game objects (Player, Enemy, Weapon)
├── components/  # ECS components (Position, Health, etc.)
├── managers/    # Utilities (PoolManager, SaveManager)
├── config/      # Game configuration files
└── utils/       # Helpers (Vector2, SpatialGrid)
```

## Programming Best Practices

### Code Organization
1. **File Size**: Maximum 100 lines per file
2. **Single Responsibility**: Each class/module has one clear purpose
3. **Modular Systems**: Separate systems that can be modified independently
4. **Configuration Files**: All game values in config files, not hardcoded

### Performance Requirements
1. **Object Pooling**: Pre-allocate ALL game objects (enemies, projectiles, effects)
2. **Spatial Grid**: Use for O(1) collision detection
3. **No Garbage Collection**: Reuse objects, never create/destroy during gameplay
4. **Target Performance**: 60 FPS with 200+ enemies on screen

### TypeScript Standards
1. **Strict Mode**: All strict checks enabled
2. **No Any Types**: Proper typing for all variables
3. **Interfaces**: Define clear contracts between systems
4. **Naming Conventions**:
   - PascalCase for classes/types
   - camelCase for functions/variables
   - UPPER_CASE for constants

### Code Quality
1. **No Long Functions**: Max 5 parameters per function
2. **Clear Names**: Descriptive, no abbreviations
3. **Comments**: Only for complex logic, code should be self-documenting
4. **Immutability**: Prefer immutable operations where possible

### Architecture Principles
1. **ECS Pattern**: Separate data (components) from logic (systems)
2. **Dependency Injection**: Systems receive dependencies, don't create them
3. **Event-Driven**: Use events for loose coupling between systems
4. **Data-Oriented**: Optimize for cache-friendly data access

### Development Workflow
1. **Hot Reload**: Use Vite's HMR for rapid iteration
2. **Debug Mode**: Visual overlays for collision boxes, spawn points
3. **Performance Monitoring**: Track frame time, object counts
4. **Incremental Development**: Build features in small, testable chunks

## Key Design Decisions

### Why No Enemy Collision?
- Prevents pathfinding bottlenecks
- Allows unlimited enemy density
- Creates "liquid" enemy flow
- Massively improves performance

### Why Object Pooling Everything?
- Zero garbage collection during gameplay
- Predictable memory usage
- Smooth performance on low-end devices
- Allows hundreds of entities

### Why ECS Architecture?
- Easy to add new behaviors
- Optimized for many entities
- Clear separation of concerns
- Cache-friendly data layout

## Testing & Validation
- Maintain 60 FPS with 200+ enemies
- All files under 100 lines
- Zero runtime object creation
- Memory usage under 50MB
- Load time under 5 seconds

## Future Considerations
- Save system for progress persistence
- Leaderboards for competitive play
- More weapon types and enemy varieties
- Visual effects and particle systems
- Sound effects and background music