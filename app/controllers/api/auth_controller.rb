module Api
  class AuthController < Api::BaseController
    def me
      render json: { user: user_response(current_user) }
    end

    def update_profile
      if current_user.update(profile_params)
        render json: { user: user_response(current_user) }
      else
        render json: { errors: current_user.errors.full_messages }, status: :unprocessable_content
      end
    end

    private

    def user_response(user)
      {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        currency: user.currency,
        onboarded: user.onboarded?
      }
    end

    def profile_params
      params.permit(:first_name, :last_name, :currency)
    end
  end
end
