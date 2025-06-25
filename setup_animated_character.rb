#!/usr/bin/env ruby

require 'vips'
require 'fileutils'
require 'json'

puts "🦈 Animated Character Setup Script"
puts "==================================="
puts ""

# Check if ruby-vips is available
begin
  require 'vips'
  puts "✅ VIPS gem found"
rescue LoadError
  puts "❌ ruby-vips gem not found!"
  puts "Install it with: gem install ruby-vips"
  exit 1
end

# Find the character GIF
input_file = 'character.gif'
unless File.exist?(input_file)
  puts "📥 Please save the character GIF as 'character.gif' in this directory"
  exit 1
end

puts "📁 Found character GIF: #{input_file}"

begin
  # Load the GIF to get frame count
  puts "🔧 Analyzing GIF animation..."
  
  # Get number of frames by trying to load each frame
  frame_count = 0
  loop do
    begin
      test_frame = Vips::Image.new_from_file("#{input_file}[#{frame_count}]")
      frame_count += 1
    rescue
      break
    end
  end
  
  puts "   Found #{frame_count} animation frames"
  
  if frame_count == 0
    puts "❌ No frames found in GIF"
    exit 1
  end
  
  # Load first frame to get dimensions
  first_frame = Vips::Image.new_from_file("#{input_file}[0]")
  puts "   Original size: #{first_frame.width}x#{first_frame.height}"
  
  # Process each frame
  puts "🎬 Processing animation frames..."
  
  # Create output directory
  assets_dir = 'src/assets'
  FileUtils.mkdir_p(assets_dir)
  
  frames = []
  game_size = 40
  
  # Calculate crop area (center the character)
  char_size = [first_frame.width, first_frame.height].min * 0.7
  start_x = (first_frame.width - char_size) / 2
  start_y = (first_frame.height - char_size) / 2
  
  # Process each frame
  (0...frame_count).each do |i|
    puts "   Processing frame #{i + 1}/#{frame_count}..."
    
    # Load frame
    frame = Vips::Image.new_from_file("#{input_file}[#{i}]")
    
    # Crop character
    cropped = frame.extract_area(start_x, start_y, char_size, char_size)
    
    # Remove background (approximate beige color)
    beige_r, beige_g, beige_b = 245, 222, 179
    tolerance = 40
    
    if cropped.bands == 3
      cropped = cropped.bandjoin(255)
    end
    
    # Create transparency mask
    r_diff = (cropped[0] - beige_r).abs
    g_diff = (cropped[1] - beige_g).abs  
    b_diff = (cropped[2] - beige_b).abs
    
    is_background = (r_diff < tolerance) & (g_diff < tolerance) & (b_diff < tolerance)
    alpha = is_background.ifthenelse(0, 255)
    processed_frame = cropped[0..2].bandjoin(alpha)
    
    # Scale for game
    final_frame = processed_frame.resize(game_size.to_f / char_size, interpolate: Vips::Interpolate.new('nearest'))
    
    # Save frame
    frame_file = "#{assets_dir}/player-shark-frame-#{i.to_s.rjust(3, '0')}.png"
    final_frame.write_to_file(frame_file)
    
    frames << {
      key: "player-shark-frame-#{i.to_s.rjust(3, '0')}",
      file: "src/assets/player-shark-frame-#{i.to_s.rjust(3, '0')}.png"
    }
  end
  
  puts "✅ Processed #{frame_count} animation frames"
  
  # Create spritesheet for better performance
  puts "📄 Creating spritesheet..."
  
  # Calculate spritesheet dimensions
  cols = Math.ceil(Math.sqrt(frame_count))
  rows = Math.ceil(frame_count.to_f / cols)
  sheet_width = cols * game_size
  sheet_height = rows * game_size
  
  # Create spritesheet
  spritesheet = Vips::Image.black(sheet_width, sheet_height, bands: 4)
  
  frames.each_with_index do |frame_info, i|
    frame_img = Vips::Image.new_from_file(frame_info[:file])
    
    col = i % cols
    row = i / cols
    x = col * game_size
    y = row * game_size
    
    # Composite frame onto spritesheet
    spritesheet = spritesheet.composite([frame_img], 'over', x: x, y: y)
  end
  
  spritesheet_file = "#{assets_dir}/player-shark-spritesheet.png"
  spritesheet.write_to_file(spritesheet_file)
  
  # Create animation config JSON
  anim_config = {
    spritesheet: {
      image: 'src/assets/player-shark-spritesheet.png',
      frameWidth: game_size,
      frameHeight: game_size
    },
    animations: {
      idle: {
        frames: (0...frame_count).to_a,
        frameRate: 8, # 8 FPS for smooth idle animation
        repeat: -1    # Loop forever
      }
    },
    frameCount: frame_count,
    cols: cols,
    rows: rows
  }
  
  config_file = "#{assets_dir}/player-shark-config.json"
  File.write(config_file, JSON.pretty_generate(anim_config))
  
  puts "✅ Created spritesheet: #{spritesheet_file}"
  puts "✅ Created animation config: #{config_file}"
  
  # Clean up individual frame files (we have the spritesheet now)
  frames.each do |frame_info|
    File.delete(frame_info[:file]) if File.exist?(frame_info[:file])
  end
  
  puts "🧹 Cleaned up individual frame files"

rescue => e
  puts "❌ Error: #{e.message}"
  exit 1
end

puts "\n🎮 Next steps:"
puts "1. Update GameScene.ts to load the spritesheet"
puts "2. Update Player.ts to use animated sprite" 
puts "3. Set up the idle animation"
puts ""
puts "Animation details:"
puts "- #{frame_count} frames"
puts "- #{game_size}x#{game_size} pixels per frame"
puts "- 8 FPS animation speed"
puts "- Loops continuously for idle state"