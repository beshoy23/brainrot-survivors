#!/usr/bin/env ruby

require 'vips'
require 'fileutils'
require 'json'

puts "🦈 Quick Animated Character Setup"
puts "================================="

input_file = 'character.gif'
unless File.exist?(input_file)
  puts "❌ character.gif not found"
  exit 1
end

begin
  # Just extract first 8 frames for a simple idle animation
  max_frames = 8
  puts "📁 Processing first #{max_frames} frames for idle animation..."
  
  # Create output directory
  assets_dir = 'src/assets'
  FileUtils.mkdir_p(assets_dir)
  
  # Get first frame dimensions
  first_frame = Vips::Image.new_from_file("#{input_file}[0]")
  puts "   Original: #{first_frame.width}x#{first_frame.height}"
  
  # Simple crop and scale
  game_size = 32  # Slightly smaller for better performance
  crop_size = [first_frame.width, first_frame.height].min * 0.6
  start_x = (first_frame.width - crop_size) / 2
  start_y = (first_frame.height - crop_size) / 2
  
  actual_frames = 0
  
  # Process frames
  (0...max_frames).each do |i|
    begin
      frame = Vips::Image.new_from_file("#{input_file}[#{i}]")
      
      # Quick process: crop and scale
      processed = frame
        .extract_area(start_x, start_y, crop_size, crop_size)
        .resize(game_size.to_f / crop_size, interpolate: Vips::Interpolate.new('nearest'))
      
      # Save frame
      frame_file = "#{assets_dir}/shark-#{i}.png"
      processed.write_to_file(frame_file)
      actual_frames += 1
      
      print "."
    rescue
      break
    end
  end
  
  puts "\n✅ Processed #{actual_frames} frames"
  
  # Create simple config
  config = {
    frames: actual_frames,
    frameWidth: game_size,
    frameHeight: game_size,
    frameRate: 6
  }
  
  File.write("#{assets_dir}/shark-config.json", JSON.generate(config))
  
  puts "✅ Animation setup complete!"
  puts "   Frames: #{actual_frames}"
  puts "   Size: #{game_size}x#{game_size}"

rescue => e
  puts "❌ Error: #{e.message}"
end