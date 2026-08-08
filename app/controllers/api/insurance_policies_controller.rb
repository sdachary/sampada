class Api::InsurancePoliciesController < Api::BaseController
  def index
    policies = current_user.insurance_policies.order(created_at: :desc)
    policies = policies.active if params[:active]
    render_success(policies.map { |p| policy_json(p) })
  end

  def show
    policy = current_user.insurance_policies.find(params[:id])
    render_success(policy_json(policy))
  end

  def create
    policy = current_user.insurance_policies.create!(policy_params)
    render_success(policy_json(policy), status: :created)
  end

  def update
    policy = current_user.insurance_policies.find(params[:id])
    policy.update!(policy_params)
    render_success(policy_json(policy))
  end

  def destroy
    current_user.insurance_policies.find(params[:id]).destroy!
    render_success({}, message: "Policy deleted")
  end

  private

  def policy_params
    params.permit(:policy_type, :provider_name, :premium_amount, :premium_frequency,
                  :coverage_amount, :renewal_date, :notes)
  end

  def policy_json(p)
    { id: p.id, policy_type: p.policy_type, provider_name: p.provider_name,
      premium_amount: p.premium_amount.to_f, premium_frequency: p.premium_frequency,
      coverage_amount: p.coverage_amount&.to_f, renewal_date: p.renewal_date,
      notes: p.notes, created_at: p.created_at }
  end
end
