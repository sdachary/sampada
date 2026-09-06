#!/usr/bin/env ruby
# Generates a squashed initial migration from db/schema.rb

require 'fileutils'

schema_path = File.join(__dir__, '..', 'db', 'schema.rb')
migration_dir = File.join(__dir__, '..', 'db', 'migrate')
archive_dir = File.join(migration_dir, 'archive')
output_path = File.join(migration_dir, '20260508000000_initial_schema.rb')

schema_content = File.read(schema_path)

# Extract table definitions between define() block
match = schema_content.match(/ActiveRecord::Schema\[(\d+\.\d+)\].define\(.*?version:\s*(\d+)\) do\n(.*?)\nend/m)
raise "Could not parse schema.rb" unless match

rails_version = match[1]
schema_version = match[2]
body = match[3]

# Filter only create_table, add_index, add_foreign_key lines
relevant_lines = body.lines.select { |l|
  l.match?(/^\s*(create_table|add_index|add_foreign_key)/)
}.join

# Build the migration
migration = <<~RUBY
class InitialSchema < ActiveRecord::Migration[#{rails_version}]
  def up
#{relevant_lines.gsub(/^/, '    ')}
  end

  def down
    # Drop all tables in reverse dependency order
    tables = %w[
#{body.scan(/create_table "(\w+)"/).flatten.reverse.map { |t| "      #{t}" }.join("\n")}
    ]
    tables.each do |t|
      drop_table t, if_exists: true rescue nil
    end
  end
end
RUBY

File.write(output_path, migration)
puts "Created: #{output_path}"
puts "Schema version: #{schema_version}"
puts "Tables: #{body.scan(/create_table "(\w+)"/).size}"

# Archive old migrations
FileUtils.mkdir_p(archive_dir)
old_migrations = Dir.glob(File.join(migration_dir, '*.rb')).sort
old_migrations.each do |m|
  FileUtils.mv(m, archive_dir)
  puts "Archived: #{File.basename(m)}"
end

puts "\nDone! #{old_migrations.size} migrations archived to db/migrate/archive/"
puts "Run: bin/rails db:migrate VERSION=20260508000000 to verify"
