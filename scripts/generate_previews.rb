#!/usr/bin/env ruby

require "date"
require "digest"
require "fileutils"
require "optparse"
require "pathname"
require "shellwords"
require "tempfile"
require "yaml"

ROOT = Pathname.new(__dir__).join("..").expand_path
OUTPUT_DIR = ROOT.join("assets/images/previews/generated")
DATA_FILE = ROOT.join("_data/generated_previews.yml")
FONT_CANDIDATES = [
  ENV["PREVIEW_FONT"],
  "/System/Library/Fonts/HelveticaNeue.ttc",
  "/System/Library/Fonts/Helvetica.ttc",
  "/usr/share/fonts/truetype/inter/Inter-Regular.ttf",
  "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
  "/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf"
].compact
DEFAULT_FONT = FONT_CANDIDATES.find { |font| Pathname.new(font).exist? } || "Helvetica"
def executable_on_path?(command)
  ENV.fetch("PATH", "").split(File::PATH_SEPARATOR).any? do |directory|
    File.executable?(File.join(directory, command))
  end
end

MAGICK_COMMAND = ENV["MAGICK_COMMAND"] ||
                 (executable_on_path?("magick") && "magick") ||
                 (executable_on_path?("convert") && "convert")
SITE_LABEL = "manik.cc"
WIDTH = 1200
HEIGHT = 630

options = {
  output_dir: OUTPUT_DIR,
  data_file: DATA_FILE,
  font: DEFAULT_FONT,
  limit: nil,
  verbose: false
}

OptionParser.new do |opts|
  opts.banner = "Usage: ruby scripts/generate_previews.rb [options]"
  opts.on("--output DIR", "Generated preview output directory") { |dir| options[:output_dir] = ROOT.join(dir) }
  opts.on("--data-file FILE", "YAML map consumed by Jekyll") { |file| options[:data_file] = ROOT.join(file) }
  opts.on("--font FONT", "ImageMagick font name or path") { |font| options[:font] = font }
  opts.on("--limit N", Integer, "Generate the first N previews") { |n| options[:limit] = n }
  opts.on("--verbose", "Print every generated file") { options[:verbose] = true }
end.parse!

def front_matter_for(path)
  text = path.read
  return nil unless text.start_with?("---\n")

  match = text.match(/\A---\s*\n(.*?)\n---\s*\n/m)
  return nil unless match

  YAML.safe_load(
    match[1],
    permitted_classes: [Date, Time],
    aliases: true
  ) || {}
rescue Psych::SyntaxError => error
  warn "Skipping #{path.relative_path_from(ROOT)}: #{error.message}"
  nil
end

def site_pages
  patterns = ["*.html", "*.md", "_posts/*.{md,html}", "about/**/*.{md,html}", "more/**/*.{md,html}"]

  patterns.flat_map { |pattern| ROOT.glob(pattern) }
          .select(&:file?)
          .uniq
          .sort
end

def public_path_for(path)
  relative = path.relative_path_from(ROOT).to_s
  return "/" if relative == "index.html"

  relative = relative.delete_suffix("index.html")
  relative = relative.delete_suffix(".html")
  relative = relative.delete_suffix(".md")
  "/#{relative}"
end

def slug_for(path, data)
  url_slug = public_path_for(path).gsub(%r{\A/|/\z}, "").tr("/", "-")
  url_slug = "home" if url_slug.empty?
  slug = data["preview_slug"] || url_slug
  slug.gsub(/[^a-zA-Z0-9_-]+/, "-").gsub(/-+/, "-").downcase
end

def local_image_path(image)
  return nil if image.nil? || image.empty? || image.match?(%r{\Ahttps?://})

  image_path = ROOT.join(image.delete_prefix("/")).cleanpath
  return nil unless image_path.to_s.start_with?(ROOT.to_s)
  return nil unless image_path.file?

  image_path
end

def shell_font_arg(font)
  font_path = Pathname.new(font)
  font_path.absolute? && font_path.exist? ? font_path.to_s : font
end

def run_magick(*args)
  abort "ImageMagick command not found. Install ImageMagick first." unless MAGICK_COMMAND

  success = system(MAGICK_COMMAND, *args)
  abort "ImageMagick failed: #{MAGICK_COMMAND} #{args.shelljoin}" unless success
end

def make_text_png(title, subtitle, font, title_color: "white", subtitle_color: "rgba(255,255,255,0.76)")
  file = Tempfile.new(["preview-text", ".png"])
  file.close

  run_magick(
    "-size", "1000x480",
    "xc:none",
    "(",
    "-background", "none",
    "-size", "1000x380",
    "-font", shell_font_arg(font),
    "-fill", title_color,
    "-pointsize", "88",
    "-interline-spacing", "-8",
    "caption:#{title}",
    ")",
    "-gravity", "northwest",
    "-geometry", "+0+66",
    "-compose", "over",
    "-composite",
    "-font", shell_font_arg(font),
    "-fill", subtitle_color,
    "-pointsize", "42",
    "-gravity", "northwest",
    "-annotate", "+0+0", subtitle,
    file.path
  )

  file
end

def make_image_card(source, output, title, font)
  text = make_text_png(title, SITE_LABEL, font)

  run_magick(
    source.to_s,
    "-auto-orient",
    "-resize", "#{WIDTH}x#{HEIGHT}^",
    "-gravity", "center",
    "-extent", "#{WIDTH}x#{HEIGHT}",
    "(",
    "-size", "#{HEIGHT}x#{WIDTH}",
    "gradient:rgba(0,0,0,0.62)-rgba(0,0,0,0.08)",
    "-rotate", "90",
    ")",
    "-compose", "multiply",
    "-composite",
    "(",
    "-size", "#{WIDTH}x#{HEIGHT}",
    "gradient:rgba(0,0,0,0.46)-rgba(0,0,0,0)",
    ")",
    "-compose", "over",
    "-composite",
    text.path,
    "-gravity", "northwest",
    "-geometry", "+82+78",
    "-compose", "over",
    "-composite",
    "-quality", "92",
    output.to_s
  )
ensure
  text&.unlink
end

def make_plain_card(output, title, font)
  text = make_text_png(
    title,
    SITE_LABEL,
    font,
    title_color: "#3b3b3b",
    subtitle_color: "#656565"
  )

  args = [
    "-size", "#{WIDTH}x#{HEIGHT}",
    "xc:white"
  ]

  args.concat(
    [
    text.path,
    "-gravity", "northwest",
    "-geometry", "+82+78",
    "-compose", "over",
    "-composite",
    "-quality", "92",
    output.to_s
    ]
  )

  run_magick(*args)
ensure
  text&.unlink
end

FileUtils.mkdir_p(options[:output_dir])
FileUtils.mkdir_p(options[:data_file].dirname)

pages = site_pages.filter_map do |path|
  data = front_matter_for(path)
  next unless data && (data["preview_title"] || data["title"])

  {
    path: path,
    title: data["preview_title"] || data["short_title"] || data["title"],
    image: local_image_path(data["preview_image"] || data["image"]),
    slug: slug_for(path, data)
  }
end

pages = pages.first(options[:limit]) if options[:limit]

preview_map = {}

pages.each do |page|
  digest = Digest::SHA1.hexdigest(page[:path].relative_path_from(ROOT).to_s)[0, 8]
  output = options[:output_dir].join("#{page[:slug]}-#{digest}.jpg")
  public_output = "/#{output.relative_path_from(ROOT)}"

  if page[:image]
    make_image_card(page[:image], output, page[:title].to_s, options[:font])
  else
    make_plain_card(output, page[:title].to_s, options[:font])
  end

  preview_map[page[:path].relative_path_from(ROOT).to_s] = public_output
  puts "#{page[:path].relative_path_from(ROOT)} -> #{output.relative_path_from(ROOT)}" if options[:verbose]
end

options[:data_file].write("#{preview_map.sort.to_h.to_yaml}\n")

puts "Generated #{pages.length} previews in #{options[:output_dir].relative_path_from(ROOT)}"
puts "Wrote #{options[:data_file].relative_path_from(ROOT)}"
