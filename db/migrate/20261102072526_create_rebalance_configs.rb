class CreateRebalanceConfigs < ActiveRecord::Migration[8.1]
  def change
    create_table :rebalance_configs do |t|
      t.references :portfolio, null: false, foreign_key: true, index: { unique: true }, type: :uuid

      # Core config
      t.decimal :contribution, precision: 14, scale: 2, default: 21000.0
      t.decimal :dividend_ratio, precision: 3, scale: 2, default: 0.6
      t.decimal :growth_ratio, precision: 3, scale: 2, default: 0.4

      # Dip / momentum
      t.decimal :dip_threshold, precision: 4, scale: 2, default: -0.10
      t.decimal :dip_boost, precision: 4, scale: 2, default: 1.25
      t.decimal :trend_down_penalty, precision: 4, scale: 2, default: 0.5
      t.decimal :momentum_tilt, precision: 4, scale: 2, default: 0.25

      # Guards
      t.decimal :max_position_weight, precision: 4, scale: 2, default: 0.10
      t.decimal :max_sector_weight, precision: 4, scale: 2, default: 0.25
      t.decimal :max_add_share, precision: 4, scale: 2, default: 0.30
      t.decimal :fee_reserve_pct, precision: 5, scale: 3, default: 0.003
      t.decimal :min_order_value, precision: 10, scale: 2, default: 500.0
      t.integer :max_orders, default: 8

      # Target mode
      t.string :target_mode, default: 'equal'

      t.timestamps
    end
  end
end