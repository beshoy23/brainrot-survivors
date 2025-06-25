#!/usr/bin/env ruby

require 'vips'
require 'json'

puts "🦈 Creating Shark Spritesheet"
puts "============================="

assets_dir = 'src/assets'

# Check if frame files exist
frame_files = []
(0...8).each do |i|
  file = "#{assets_dir}/shark-#{i}.png"
  if File.exist?(file)
    frame_files << file
  end
end

if frame_files.empty?
  puts "❌ No shark frame files found!"
  exit 1
end

puts "📁 Found #{frame_files.length} frame files"

begin
  # Load first frame to get dimensions
  first_frame = Vips::Image.new_from_file(frame_files[0])
  frame_width = first_frame.width
  frame_height = first_frame.height
  
  puts "   Frame size: #{frame_width}x#{frame_height}"
  
  # Create horizontal spritesheet (all frames in one row)
  sheet_width = frame_width * frame_files.length
  sheet_height = frame_height
  
  puts "🎬 Creating spritesheet: #{sheet_width}x#{sheet_height}"
  
  # Create transparent background
  spritesheet = Vips::Image.black(sheet_width, sheet_height, bands: 4)
  
  # Composite each frame
  frame_files.each_with_index do |file, i|
    frame = Vips::Image.new_from_file(file)
    x_offset = i * frame_width
    
    spritesheet = spritesheet.composite([frame], 'over', x: x_offset, y: 0)
    print "."
  end
  
  # Save spritesheet
  spritesheet_file = "#{assets_dir}/shark-spritesheet.png"
  spritesheet.write_to_file(spritesheet_file)
  
  puts "\n✅ Spritesheet created: #{spritesheet_file}"
  
  # Update config
  config = {
    frameWidth: frame_width,
    frameHeight: frame_height,
    frameCount: frame_files.length,
    frameRate: 8  # Slightly faster animation
  }
  
  File.write("#{assets_dir}/shark-animation.json", JSON.pretty_generate(config))
  
  puts "✅ Animation config updated"
  puts "   #{frame_files.length} frames at #{config[:frameRate]} FPS"

rescue => e
  puts "❌ Error: #{e.message}"
end