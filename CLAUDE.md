# Brainrot Survivors Project Documentation

## Project Overview
A physics-based brawler game where players kick enemies into devastating chain reactions. **This is NOT a Vampire Survivors clone** - it's a unique physics combat experience built around knockback mechanics and enemy collision chains.

**Play the game**: https://beshoy23.github.io/brainrot-survivors/

*Automatically deploys on every push to master via GitHub Actions*

## Core Game Design

### Physics Brawler Mechanics
1. **Kick-Based Combat**
   - Single attack type: KICKS that launch enemies as projectiles
   - No traditional projectile weapons (arrows, bullets, etc.)
   - All damage comes from kicking enemies into each other
   - Chain reactions create exponential damage multipliers

2. **Enemy-as-Projectile System**
   - Kicked enemies become flying projectiles
   - Different enemy weight classes affect flight physics
   - Flying enemies can hit other enemies for chain damage
   - Dead enemies continue flying and can still cause damage

3. **Movement & Positioning**
   - Single input control (WASD/arrows only)
   - Player positioning critical for chain reaction setups
   - 8-directional movement with no acceleration
   - Spatial puzzle: position enemies for maximum chains

4. **Physics-Driven Progression**
   - XP gems drop from defeated enemies
   - Level-up triggers game pause with kick-focused upgrades
   - All upgrades enhance kick mechanics or physics behavior
   - NO traditional weapon unlocks

5. **Chain Reaction Gameplay Loop**
   - SETUP: Position enemies into dense groups
   - KICK: Launch first enemy into the group
   - CHAIN: Watch enemies collide and multiply damage
   - COMBO: Track consecutive hits with exponential multipliers

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

### Performance Requirements
- Maintain 60 FPS with 200+ enemies
- All files under 100 lines
- Zero runtime object creation
- Memory usage under 50MB
- Load time under 5 seconds

### Automated Balance Testing
- **Progression Balance Tests**: Validate level-up timing and XP requirements
- **Weapon Balance Tests**: Ensure all weapons within 40-60 DPS range
- **Upgrade Balance Tests**: Verify all upgrades provide 15-25% power per level
- **Edge Case Testing**: Handle invalid inputs, extreme values, and error conditions
- **Performance Monitoring**: Track frame time and object counts during testing

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

### ✅ Completed Physics Brawler Features
- **Player Character**: Animated "br br patapim" sprite with kick attack animations
- **Kick Combat System**: 4 distinct kick variations:
  - Basic Kick → Standard horizontal knockback
  - Uppercut → High-arc single-target launcher  
  - Spinning Kick → 360° area crowd control
  - Ground Pound → Massive shockwave devastation
- **Enemy Weight Classes**: 5 physics-based enemy types:
  - Light (Swarm) → Flies far, minimal chain damage
  - Medium (Basic) → Balanced flight and chain damage
  - Heavy (Tank) → Short flight, devastating chain damage
  - Explosive (Elite) → Area damage on impact
  - Each with unique knockback multipliers and chain effects
- **Chain Reaction System**: Enemy-to-enemy collision detection with physics trails
- **Combo System**: Exponential multipliers (1x → 1.5x → 2.25x → 3.38x) for consecutive chains
- **Performance**: Object pooling, spatial grid, 60 FPS with 200+ flying enemies
- **Mobile Support**: Touch controls optimized for kick-based gameplay

### 🥋 Physics Combat Features
- **Movement**: Tactical positioning for maximum chain setups
- **Knockback Physics**: Realistic momentum, decay, and collision detection
- **Visual Effects**: Flying enemy trails, combo counters, chain hit effects
- **Progression**: Kick-focused upgrades only (force, speed, range, chain power)
- **Audio**: Impact sounds and chain reaction feedback

### 🎯 Player Engagement Systems (Phase 1 Complete)
- **Explosive Start**: Fast first level-up with immediate enemy spawns
- **Visual Juice**: Screen shake, particle effects, critical hits with flashy feedback
- **Discovery Mechanics**: Mysterious chests with cinematic reward windows and pause functionality
- **Progression Balance**: Automated testing ensures level 5 in 2-3 minutes (not 11 seconds)
- **Weapon Balance**: All weapons tested and balanced within 40-60 DPS range

### ⚖️ Kick-Focused Upgrade System (Completely Redesigned)
- **Pure Physics Focus**: ZERO traditional weapon upgrades - only kick mechanics
- **Core Kick Upgrades**: 
  - Kick Force → +25% knockback power per level
  - Kick Speed → +20% attack rate per level  
  - Kick Range → +15% reach per level
  - Chain Power → +30% chain reaction force per level
  - Multi-Kick → Hit additional enemies per kick
- **Technique Unlocks**: Uppercut, Spinning Kick, Ground Pound variations
- **Physics Modifications**: Bouncy enemies, sticky combos, explosive chains, magnetic pulls
- **No Traditional Weapons**: Removed whip, garlic, axe, projectiles - 100% kick-based

## Physics Brawler Roadmap

### ✅ Phase 1: Core Physics System (COMPLETE)
- **Kick Combat System**: 4 kick variations with unique physics
- **Enemy Weight Classes**: Light/Medium/Heavy/Explosive physics behavior
- **Chain Reaction System**: Enemy-to-enemy collision and combo multipliers
- **Upgrade System**: 100% kick-focused, no traditional weapons

### 🚧 Phase 2: Physics Modifications (In Progress)
- **Sticky Enemies**: Kicked enemies clump together for bigger projectiles
- **Bouncy Physics**: Enemies bounce off walls and each other multiple times
- **Explosive Chains**: Enemies explode after extended chain reactions
- **Magnetic Kicks**: Pull enemies together before launching devastating kicks

### Phase 3: Environmental Physics
- **Destructible Walls**: Kick enemies through barriers
- **Bounce Pads**: Environmental elements that amplify knockback
- **Physics Puzzles**: Use chain reactions to solve environmental challenges
- **Danger Zones**: Areas where physics behave differently

### Phase 4: Advanced Chain Systems
- **Combo Mastery**: Extended combo system with special techniques
- **Physics Challenges**: Daily challenges focused on chain reactions
- **Leaderboards**: Longest combo chains and highest multipliers
- **Replay System**: Share incredible chain reaction moments

### Long-Term Physics Evolution
- **New Enemy Physics**: Cluster enemies, magnetic enemies, bouncing enemies
- **Advanced Kick Techniques**: Wall kicks, aerial combos, physics manipulations
- **Environmental Storytelling**: Use physics to tell stories through destruction
- **Community Challenges**: Physics-based multiplayer competitions

## Development Status & Testing Strategy

### ✅ Physics System Testing Suite
- **Kick Balance Testing**: Validated all 4 kick types for unique physics behavior
- **Chain Reaction Testing**: Mathematical validation of combo multipliers and chain damage
- **Enemy Physics Testing**: Verified weight class behaviors and knockback calculations
- **Performance Testing**: 60 FPS maintained with 200+ flying enemies and active chains

### 📊 Current Physics Balance Status
- **4 kick variations perfectly balanced** for distinct tactical roles
- **5 enemy weight classes** provide meaningful physics variety
- **Combo system validated** with exponential scaling up to 10x multipliers
- **Zero traditional weapon dependencies** - 100% physics-focused gameplay
- **Performance optimized** for complex chain reaction scenarios

### 🎯 Testing Coverage Gaps (Future Priority)
#### Platform-Specific UI Testing
- **Mobile viewport positioning** - XP bar, health bar, button placement
- **Touch interaction testing** - Virtual joystick, upgrade selection
- **Device-specific configurations** - iPhone vs Android vs tablet layouts
- **Visual regression testing** - Screenshot comparison for UI consistency

#### Integration Testing Needs
- **End-to-end gameplay scenarios** - Full game loop validation
- **Cross-browser compatibility** - Chrome, Safari, Firefox, Edge
- **Performance testing on low-end devices** - Maintain 60 FPS targets
- **Real device testing** - Physical mobile device validation

### 🔧 Physics Testing Architecture
- **Mathematical Simulation**: Pure TypeScript calculations for knockback physics and chain damage
- **Real-time Physics Validation**: Live testing of enemy trajectories and collision detection
- **Browser Console Integration**: Quick testing via `testKickPhysics()` and `testChainReactions()` functions
- **Performance Monitoring**: Track frame rates during complex multi-enemy chain scenarios

## 🥋 IMPORTANT: Game Identity

**This is a PHYSICS BRAWLER, not a Vampire Survivors clone!**

- ❌ NO traditional projectile weapons (arrows, bullets, magic)
- ❌ NO weapon evolution trees or weapon unlocks
- ❌ NO auto-attacking ranged combat
- ✅ 100% KICK-BASED combat with physics knockback
- ✅ Enemy-to-enemy collision chains as primary damage source
- ✅ Tactical positioning for maximum chain reaction setups
- ✅ Unique "br br patapim" character with kick animations

**The core innovation**: Using enemies as projectiles through physics-based kicks!