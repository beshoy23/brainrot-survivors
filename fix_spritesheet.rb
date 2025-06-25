#!/usr/bin/env ruby

require 'vips'
require 'json'

puts "🦈 Creating Fixed Shark Spritesheet"
puts "===================================="

assets_dir = 'src/assets'

# Get frame files
frame_files = (0...8).map { |i| "#{assets_dir}/shark-#{i}.png" }.select { |f| File.exist?(f) }

if frame_files.empty?
  puts "❌ No frame files found!"
  exit 1
end

puts "📁 Processing #{frame_files.length} frames"

begin
  # Load and normalize all frames
  frames = []
  frame_files.each_with_index do |file, i|
    frame = Vips::Image.new_from_file(file)
    
    # Ensure RGBA format
    if frame.bands == 3
      frame = frame.bandjoin(255)  # Add full alpha
    elsif frame.bands == 1
      frame = frame.bandjoin([frame, frame, 255])  # Grayscale to RGBA
    end
    
    frames << frame
    print "."
  end
  
  puts "\n🎬 Combining frames into spritesheet..."
  
  # Combine horizontally
  spritesheet = frames[0]
  frames[1..-1].each do |frame|
    spritesheet = spritesheet.join(frame, 'horizontal')
  end
  
  # Save result
  output_file = "#{assets_dir}/shark-spritesheet.png"
  spritesheet.write_to_file(output_file)
  
  puts "✅ Spritesheet saved: #{output_file}"
  puts "   Size: #{spritesheet.width}x#{spritesheet.height}"
  puts "   Frames: #{frame_files.length}"
  
  # Create config
  config = {
    frameWidth: frames[0].width,
    frameHeight: frames[0].height,
    frameCount: frame_files.length,
    frameRate: 8
  }
  
  File.write("#{assets_dir}/shark-config.json", JSON.pretty_generate(config))
  puts "✅ Config updated"

rescue => e
  puts "❌ Error: #{e.message}"
  puts e.backtrace[0..2]
end