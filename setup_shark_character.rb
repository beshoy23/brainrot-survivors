#!/usr/bin/env ruby

puts "🦈 Shark Character Setup Script"
puts "================================"
puts ""

# Check if ruby-vips is available
begin
  require 'vips'
  puts "✅ VIPS gem found"
rescue LoadError
  puts "❌ ruby-vips gem not found!"
  puts "Install it with: gem install ruby-vips"
  puts "Or on Ubuntu: sudo apt-get install libvips-dev && gem install ruby-vips"
  exit 1
end

require 'fileutils'

# Step 1: Check for character image
input_files = ['character.gif', 'character.png', 'character.jpg', 'character.jpeg']
input_file = input_files.find { |f| File.exist?(f) }

unless input_file
  puts "📥 Please save the character image as one of:"
  puts "   - character.gif"
  puts "   - character.png" 
  puts "   - character.jpg"
  puts "Then run this script again."
  exit 1
end

puts "📁 Found character image: #{input_file}"

# Step 2: Process the image
puts "\n🔧 Processing character sprite..."

begin
  # Load and process the image (extract first frame if GIF)
  if input_file.end_with?('.gif')
    puts "   Processing animated GIF - extracting first frame..."
    image = Vips::Image.new_from_file("#{input_file}[0]")  # Extract first frame
  else
    image = Vips::Image.new_from_file(input_file)
  end
  puts "   Original size: #{image.width}x#{image.height}"
  
  # Extract character (center crop)
  char_size = [image.width, image.height].min * 0.6  # Take 60% of smaller dimension
  start_x = (image.width - char_size) / 2
  start_y = (image.height - char_size) / 2
  
  character = image.extract_area(start_x, start_y, char_size, char_size)
  
  # Remove beige background
  beige_r, beige_g, beige_b = 245, 222, 179
  tolerance = 40
  
  if character.bands == 3
    character = character.bandjoin(255)
  end
  
  # Create transparency mask
  r_diff = (character[0] - beige_r).abs
  g_diff = (character[1] - beige_g).abs  
  b_diff = (character[2] - beige_b).abs
  
  is_background = (r_diff < tolerance) & (g_diff < tolerance) & (b_diff < tolerance)
  alpha = is_background.ifthenelse(0, 255)
  character = character[0..2].bandjoin(alpha)
  
  # Scale for game use
  game_character = character.resize(40.0 / char_size, interpolate: Vips::Interpolate.new('nearest'))
  
  # Create output directory
  assets_dir = 'src/assets'
  FileUtils.mkdir_p(assets_dir)
  
  # Save processed sprites
  game_sprite = "#{assets_dir}/player-shark.png"
  game_character.write_to_file(game_sprite)
  
  puts "✅ Sprite processed and saved to #{game_sprite}"
  
rescue => e
  puts "❌ Error processing image: #{e.message}"
  exit 1
end

# Step 3: Update the code
puts "\n🎮 Updating game code..."

# Update Player.ts
player_file = 'src/entities/Player.ts'
if File.exist?(player_file)
  content = File.read(player_file)
  
  unless content.include?('this.sprite = scene.add.sprite')
    # Replace graphics with sprite
    updated_content = content.gsub(
      /this\.sprite = scene\.add\.graphics\(\);.*?this\.sprite\.setDepth\(GameConfig\.player\.depth\);/m,
      "this.sprite = scene.add.sprite(0, 0, 'player-shark');
    this.sprite.setScale(1);
    this.sprite.setDepth(GameConfig.player.depth);"
    )
    
    File.write(player_file, updated_content)
    puts "✅ Updated Player.ts to use sprite"
  else
    puts "✅ Player.ts already uses sprites"
  end
else
  puts "⚠️  Player.ts not found - you'll need to update it manually"
end

# Update GameScene.ts to preload the sprite
scene_file = 'src/scenes/GameScene.ts'
if File.exist?(scene_file)
  content = File.read(scene_file)
  
  unless content.include?("load.image('player-shark'")
    if content.include?('preload():')
      # Add to existing preload
      content = content.gsub(
        /(preload\(\):\s*void\s*\{)/,
        "\\1\n    this.load.image('player-shark', 'src/assets/player-shark.png');"
      )
    else
      # Add new preload method
      content = content.gsub(
        /(create\(\):\s*void\s*\{)/,
        "preload(): void {\n    this.load.image('player-shark', 'src/assets/player-shark.png');\n  }\n\n  \\1"
      )
    end
    
    File.write(scene_file, content)
    puts "✅ Updated GameScene.ts to load shark sprite"
  else
    puts "✅ GameScene.ts already loads shark sprite"
  end
else
  puts "⚠️  GameScene.ts not found - you'll need to update it manually"
end

puts "\n🎉 Shark character setup complete!"
puts "🚀 Start the game to see your new shark player!"
puts ""
puts "If the sprite doesn't appear correctly, you may need to adjust:"
puts "- Sprite scale in Player.ts"
puts "- Asset path in GameScene.ts"