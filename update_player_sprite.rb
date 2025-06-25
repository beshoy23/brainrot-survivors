#!/usr/bin/env ruby

puts "🦈 Updating Player class to use shark sprite..."

player_file = 'src/entities/Player.ts'

unless File.exist?(player_file)
  puts "❌ Error: #{player_file} not found!"
  exit 1
end

# Read the current Player.ts file
content = File.read(player_file)

# Check if it's already using sprites
if content.include?('this.sprite = scene.add.sprite')
  puts "✅ Player class already uses sprites!"
  exit 0
end

puts "🔧 Modifying Player class..."

# Replace the graphics-based player with sprite-based player
updated_content = content.gsub(
  /this\.sprite = scene\.add\.graphics\(\);.*?this\.sprite\.fillCircle\(0, 0, GameConfig\.player\.hitboxRadius\);/m,
  "this.sprite = scene.add.sprite(0, 0, 'player-shark');
    this.sprite.setScale(1); // Adjust scale if needed"
)

# Update the constructor to load the texture in the scene's preload
scene_file = 'src/scenes/GameScene.ts'
if File.exist?(scene_file)
  scene_content = File.read(scene_file)
  
  # Add preload method if it doesn't exist, or update existing one
  if scene_content.include?('preload()')
    puts "📁 Adding sprite loading to existing preload method..."
    scene_content = scene_content.gsub(
      /(preload\(\):\s*void\s*\{)/,
      "\\1\n    this.load.image('player-shark', 'src/assets/player-shark.png');"
    )
  else
    puts "📁 Adding preload method to GameScene..."
    scene_content = scene_content.gsub(
      /(create\(\):\s*void\s*\{)/,
      "preload(): void {\n    this.load.image('player-shark', 'src/assets/player-shark.png');\n  }\n\n  \\1"
    )
  end
  
  File.write(scene_file, scene_content)
  puts "✅ Updated GameScene.ts"
end

# Write the updated Player.ts
File.write(player_file, updated_content)

puts "✅ Player class updated to use shark sprite!"
puts ""
puts "🎮 Instructions:"
puts "1. Save the character image as 'character.png' in the project root"
puts "2. Run: ruby process_character.rb"
puts "3. Start the game to see your shark character!"