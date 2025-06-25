#!/usr/bin/env ruby

require 'vips'
require 'json'
require 'fileutils'

puts "🧟‍♂️ Creating Zombie Spritesheets"
puts "==============================="

def process_animation(type, gender, animation, frame_count, target_size = 64)
  base_path = "src/assets/zombies/#{gender}"
  frames = []
  
  puts "   Processing #{gender} #{animation}..."
  
  # Load all frames for this animation
  (1..frame_count).each do |i|
    file_path = "#{base_path}/#{animation} (#{i}).png"
    if File.exist?(file_path)
      frame = Vips::Image.new_from_file(file_path)
      
      # Scale down to target size while maintaining aspect ratio
      scale = target_size.to_f / [frame.width, frame.height].max
      scaled_frame = frame.resize(scale, interpolate: Vips::Interpolate.new('nearest'))
      
      frames << scaled_frame
      print "."
    else
      puts "\n   ⚠️  Missing frame: #{file_path}"
    end
  end
  
  return nil if frames.empty?
  
  # Create horizontal spritesheet
  spritesheet = frames[0]
  frames[1..-1].each do |frame|
    spritesheet = spritesheet.join(frame, 'horizontal')
  end
  
  # Save spritesheet
  output_file = "src/assets/zombie-#{gender}-#{animation.downcase}.png"
  spritesheet.write_to_file(output_file)
  
  puts "\n   ✅ Created: #{output_file} (#{frames.length} frames)"
  
  {
    file: output_file,
    frameWidth: frames[0].width,
    frameHeight: frames[0].height,
    frameCount: frames.length,
    animation: animation.downcase
  }
end

begin
  # Animation frame counts based on what we saw in the directory
  animations = {
    'Idle' => 15,
    'Walk' => 10, 
    'Attack' => 8,
    'Dead' => 12
  }
  
  config = {
    male: {},
    female: {}
  }
  
  # Process male zombie animations
  puts "\n🧟‍♂️ Processing Male Zombie:"
  animations.each do |anim, count|
    result = process_animation('zombie', 'male', anim, count)
    config[:male][anim.downcase.to_sym] = result if result
  end
  
  # Process female zombie animations  
  puts "\n🧟‍♀️ Processing Female Zombie:"
  animations.each do |anim, count|
    result = process_animation('zombie', 'female', anim, count)
    config[:female][anim.downcase.to_sym] = result if result
  end
  
  # Save configuration
  config_file = 'src/assets/zombie-config.json'
  File.write(config_file, JSON.pretty_generate(config))
  
  puts "\n✅ Zombie spritesheets created!"
  puts "📄 Configuration saved: #{config_file}"
  puts ""
  puts "🎬 Animations available:"
  config.each do |gender, anims|
    puts "   #{gender.capitalize}:"
    anims.each do |anim, data|
      puts "     #{anim}: #{data[:frameCount]} frames (#{data[:frameWidth]}x#{data[:frameHeight]})"
    end
  end

rescue => e
  puts "❌ Error: #{e.message}"
  puts e.backtrace[0..2]
end