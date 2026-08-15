module Api
  class ApiCredentialsController < Api::BaseController
    def index
      render json: { credentials: current_user.api_credentials.as_json(only: %i[id provider label]) }
    end

    def create
      credential = current_user.api_credentials.create!(credential_params)
      render json: { credential: credential.as_json(only: %i[id provider label]) }, status: :created
    end

    def update
      credential = current_user.api_credentials.find(params[:id])
      credential.update!(credential_params)
      render json: { credential: credential.as_json(only: %i[id provider label]) }
    end

    def destroy
      current_user.api_credentials.find(params[:id]).destroy!
      head :no_content
    end

    private

    def credential_params
      params.require(:api_credential).permit(:provider, :label, :encrypted_value)
    end
  end
end
