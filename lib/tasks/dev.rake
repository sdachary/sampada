namespace :dev do
  desc 'Create a test user with email/password for development'
  task create_test_user: :environment do
    email = ENV.fetch('TEST_USER_EMAIL', 'test@kubera.local')
    password = ENV.fetch('TEST_USER_PASSWORD', 'password123')

    user = User.find_or_initialize_by(email: email)
    user.password = password
    user.password_confirmation = password
    user.first_name = 'Test'
    user.last_name = 'User'
    user.onboarded = true
    user.storage_backend = 'local'
    user.save!

    puts "Test user created: #{email} / #{password}"
  end
end
