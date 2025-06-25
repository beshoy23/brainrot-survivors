# Brainrot Survivors Project Documentation

## Project Overview
A Vampire Survivors-inspired game focusing on the core tension-release gameplay loop through movement decisions and upgrade choices.

**Play the game**: https://beshoy23.github.io/brainrot-survivors/

*Automatically deploys on every push to master via GitHub Actions*

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

## Deployment & CI/CD

### Automatic Deployment
- **GitHub Actions**: Automatic build and deploy on every push to master
- **Asset Management**: All sprites and assets automatically included in builds
- **Zero Manual Steps**: No need for manual deployment or asset synchronization
- **Live Updates**: Changes appear at https://beshoy23.github.io/brainrot-survivors/ within minutes

### Build Configuration
- **Vite Build Tool**: Optimized production builds with asset bundling
- **Public Assets**: Game sprites stored in `public/` for proper inclusion
- **GitHub Pages**: Configured for workflow-based deployment
- **Base Path**: Properly configured for GitHub Pages subdirectory

## Current Implementation Status

### ✅ Completed Features
- **Player Character**: Animated warrior sprite with idle/run animations and proper scaling
- **Diverse Enemies**: 5 distinct enemy types with unique visuals:
  - Basic → Male zombies (red tint) with death animations
  - Fast → Female zombies (cyan tint) with death animations  
  - Tank → Black warriors (dark tint) with fade-out deaths
  - Elite → Red lancers (purple tint) with fade-out deaths
  - Swarm → Yellow monks (yellow tint) with fade-out deaths
- **Visual Polish**: Proper depth layering, garlic aura below player, death animations
- **Collision System**: Dying enemies don't damage player during death animations
- **Weapon Effects**: Authentic VS-style garlic aura and whip slash visuals
- **Performance**: Object pooling, spatial grid, 60 FPS with 200+ enemies
- **Mobile Support**: Touch controls, responsive UI, mobile-optimized

### 🎮 Gameplay Features
- **Movement**: 8-directional WASD/arrow controls with mobile virtual joystick
- **Combat**: Auto-attacking weapons (projectiles, garlic aura, whip)
- **Progression**: XP collection, level-up upgrades, weapon evolution
- **Balance**: VS-style scaling difficulty and upgrade system
- **Audio**: Death sounds and weapon feedback

## Future Considerations
- Save system for progress persistence
- Leaderboards for competitive play
- Additional weapon types and enemy varieties
- Enhanced visual effects and particle systems
- Extended sound effects and background music