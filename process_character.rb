#!/usr/bin/env ruby

require 'vips'
require 'fileutils'

puts "🦈 Processing shark character sprite..."

# Check if character image exists
input_file = 'character.png'
unless File.exist?(input_file)
  puts "❌ Error: #{input_file} not found!"
  puts "Please save the character image as 'character.png' in the project root"
  exit 1
end

begin
  # Load the image
  puts "📁 Loading character image..."
  image = Vips::Image.new_from_file(input_file)
  puts "   Original size: #{image.width}x#{image.height}"
  
  # The character appears to be roughly in the center of the image
  # Let's extract just the shark character (estimated bounds)
  char_width = 200   # Approximate character width
  char_height = 150  # Approximate character height
  
  # Calculate center crop
  start_x = (image.width - char_width) / 2
  start_y = (image.height - char_height) / 2
  
  puts "🔧 Extracting character sprite..."
  character = image.extract_area(start_x, start_y, char_width, char_height)
  
  # Remove the beige background color (approximately #F5DEB3)
  puts "🎨 Removing background..."
  
  # Convert beige background to transparent
  # Target the beige color range
  beige_r = 245
  beige_g = 222  
  beige_b = 179
  tolerance = 30
  
  # Create mask for background removal
  mask = character.copy
  
  # Simple background removal by color range
  # This creates an alpha channel where beige areas become transparent
  if character.bands == 3
    # Add alpha channel
    character = character.bandjoin(255)
  end
  
  # Create transparency mask for beige areas
  r_diff = (character[0] - beige_r).abs
  g_diff = (character[1] - beige_g).abs  
  b_diff = (character[2] - beige_b).abs
  
  # Pixels close to beige color become transparent
  is_background = (r_diff < tolerance) & (g_diff < tolerance) & (b_diff < tolerance)
  alpha = is_background.ifthenelse(0, 255)
  
  # Apply the alpha mask
  character = character[0..2].bandjoin(alpha)
  
  puts "📏 Resizing for game use..."
  
  # Scale down to game size (our current player is about 20px radius = 40px diameter)
  game_size = 40
  scale_factor = game_size.to_f / [char_width, char_height].max
  
  final_character = character.resize(scale_factor, interpolate: Vips::Interpolate.new('nearest'))
  
  puts "   Final size: #{final_character.width}x#{final_character.height}"
  
  # Create assets directory if it doesn't exist
  assets_dir = 'src/assets'
  FileUtils.mkdir_p(assets_dir) unless Dir.exist?(assets_dir)
  
  # Save the processed sprite
  output_file = "#{assets_dir}/player-shark.png"
  puts "💾 Saving processed sprite to #{output_file}..."
  final_character.write_to_file(output_file)
  
  # Also create a larger version for UI/menus
  ui_character = character.resize(2.0, interpolate: Vips::Interpolate.new('nearest'))
  ui_output = "#{assets_dir}/player-shark-large.png"
  ui_character.write_to_file(ui_output)
  
  puts "✅ Character processing complete!"
  puts "   Game sprite: #{output_file}"
  puts "   UI sprite: #{ui_output}"
  puts ""
  puts "🎮 Next steps:"
  puts "   1. Update Player class to use sprite instead of circle"
  puts "   2. Load sprite in Phaser scene"
  puts "   3. Enjoy your shark character!"

rescue Vips::Error => e
  puts "❌ VIPS Error: #{e.message}"
  puts "Make sure ruby-vips is installed: gem install ruby-vips"
rescue StandardError => e
  puts "❌ Error: #{e.message}"
  exit 1
end