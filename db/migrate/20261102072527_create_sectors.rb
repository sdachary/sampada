class CreateSectors < ActiveRecord::Migration[8.1]
  def change
    create_table :sectors do |t|
      t.string :name, null: false
      t.string :color, default: '#6366f1'
      t.timestamps
    end
    add_index :sectors, :name, unique: true

    add_reference :investments, :sector, foreign_key: true, null: true

    # Seed common sectors
    reversible do |dir|
      dir.up do
        sectors = [
          ['Technology', '#6366f1'],
          ['Financial Services', '#059669'],
          ['Energy', '#d97706'],
          ['Healthcare', '#dc2626'],
          ['Consumer Goods', '#7c3aed'],
          ['Industrial', '#475569'],
          ['Materials', '#ea580c'],
          ['Real Estate', '#0891b2'],
          ['Utilities', '#65a30d'],
          ['Telecommunications', '#9333ea'],
          ['Automotive', '#c026d3'],
          ['Other', '#6b7280'],
        ]
        sectors.each { |name, color| Sector.create!(name: name, color: color) }
      end
    end
  end
end