#!/usr/bin/env ruby
# frozen_string_literal: true
#
# Generate dist/emoji-cldr.json from the latest Unicode emoji-test.txt file.
#
# Usage:
#   ruby scripts/generate_emoji_cldr.rb [output-emoji-cldr.json]
#
# By default, output is written to: dist/emoji-cldr.json
#
# If the download fails or yields no emoji entries, the script exits with
# a non-zero status and does NOT touch any existing output file.

require "json"
require "net/http"
require "uri"
require "fileutils"

EMOJI_TEST_URL = "https://unicode.org/Public/emoji/latest/emoji-test.txt"

output_path = ARGV[0] || File.join("dist", "emoji-cldr.json")

def download_emoji_test(url)
  uri = URI(url)

  begin
    response = Net::HTTP.get_response(uri)
  rescue StandardError => e
    warn "Failed to download #{url}: #{e.class}: #{e.message}"
    exit 1
  end

  unless response.is_a?(Net::HTTPSuccess)
    warn "Failed to download #{url}: HTTP #{response.code}"
    exit 1
  end

  body = response.body
  body.force_encoding("UTF-8")
  body
end

def parse_emoji_test(text)
  records = []

  text.each_line do |line|
    line = line.strip
    next if line.empty? || line.start_with?("#")
    next unless line.include?("#")

    _, comment = line.split("#", 2)
    next unless comment

    comment = comment.strip
    next if comment.empty?

    # Comment typically looks like:
    # 😀 grinning face
    # or:
    # 😀 E1.0 grinning face
    parts = comment.split(/\s+/)
    next if parts.length < 2

    emoji = parts[0]
    next if emoji.nil? || emoji.empty?

    # Remove the emoji at the start of the comment.
    rest = comment.sub(/^#{Regexp.escape(emoji)}\s*/, "")

    # Optionally strip version marker like "E1.0 ".
    rest = rest.sub(/\AE[0-9.]+\s+/, "")

    name = rest.strip
    next if name.empty?

    # Derive simple keywords from the name.
    keywords = name.downcase.scan(/[a-z0-9]+/).uniq.sort

    records << {
      "emoji" => emoji,
      "name" => name,
      "keywords" => keywords
    }
  end

  records
end

text = download_emoji_test(EMOJI_TEST_URL)
records = parse_emoji_test(text)

if records.empty?
  warn "Downloaded emoji-test.txt from #{EMOJI_TEST_URL}, but no emoji entries were parsed. Aborting without touching #{output_path}."
  exit 1
end

FileUtils.mkdir_p(File.dirname(output_path))
File.write(output_path, JSON.pretty_generate(records), mode: "w", encoding: "UTF-8")
puts "Wrote #{records.length} emoji entries to #{output_path}"

