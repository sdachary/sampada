# Re-encrypt encrypted columns to the current ACTIVE_RECORD_ENCRYPTION_* keys.
#
# Run during a key rotation, AFTER the app has been deployed with the new keys
# and the old keys set as ACTIVE_RECORD_ENCRYPTION_PREVIOUS_* (so old rows are
# still readable). Each value is read then written back, which encrypts it under
# the current key. Once every row is rewritten, remove the PREVIOUS_* vars.
#
#   RAILS_ENV=production bundle exec rake sampada:reencrypt
namespace :sampada do
  desc 'Re-encrypt all encrypted columns to the current encryption keys (run after rotating keys)'
  task reencrypt: :environment do
    Rails.application.eager_load!

    models = ActiveRecord::Base.descendants
              .select { |m| m.respond_to?(:encrypted_attributes) && m.encrypted_attributes.any? }
              .reject { |m| m.abstract_class? }

    if models.empty?
      puts 'No models with encrypted attributes found.'
      next
    end

    models.each do |model|
      columns = model.encrypted_attributes
      puts "Re-encrypting #{model.table_name} (#{model.name}): #{columns.join(', ')}"

      total = 0
      model.find_each do |record|
        columns.each do |column|
          value = record.public_send(column)
          # Assign the decrypted value back; the encrypted type re-serializes it
          # under the current key, marking the attribute dirty so the row rewrites.
          record.public_send("#{column}=", value) unless value.nil?
        end
        record.save! if record.changed?
        total += 1
      end

      puts "  #{total} rows processed for #{model.table_name}"
    end

    puts "\nDone. Once you have verified a sample of rows, remove the " \
         'ACTIVE_RECORD_ENCRYPTION_PREVIOUS_* env vars and redeploy.'
  end
end
