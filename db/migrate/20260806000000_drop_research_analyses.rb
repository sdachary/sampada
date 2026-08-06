class DropResearchAnalyses < ActiveRecord::Migration[7.2]
  def change
    drop_table :research_analyses, if_exists: true
  end
end
