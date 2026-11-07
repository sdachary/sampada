# frozen_string_literal: true

module Api
  class SectorsController < Api::BaseController
    def index
      render_success(Sector.order(:name).as_json(only: %i[id name color]))
    end
  end
end
