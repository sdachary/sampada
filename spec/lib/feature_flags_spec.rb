require 'rails_helper'

RSpec.describe FeatureFlags do
  let(:user) { create(:user) }

  it 'defaults every flag to enabled' do
    expect(FeatureFlags.all(user: user)).to eq(
      'pdf_import' => true, 'recurring_detection' => true, 'passkeys' => true
    )
  end

  it 'treats unknown features as disabled' do
    expect(FeatureFlags.enabled?('nope', user: user)).to be(false)
  end

  it 'disables a flag via Setting' do
    FeatureFlags.disable('passkeys', user: user)
    expect(Setting.get('passkeys_enabled', user: user)).to eq('off')
    expect(FeatureFlags.enabled?('passkeys', user: user)).to be(false)
    expect(FeatureFlags.all(user: user)['passkeys']).to be(false)
  end

  it 're-enables a flag' do
    FeatureFlags.disable('passkeys', user: user)
    FeatureFlags.enable('passkeys', user: user)
    expect(FeatureFlags.enabled?('passkeys', user: user)).to be(true)
  end

  it 'keeps flags per user' do
    other = create(:user)
    FeatureFlags.disable('pdf_import', user: user)
    expect(FeatureFlags.enabled?('pdf_import', user: other)).to be(true)
  end
end
