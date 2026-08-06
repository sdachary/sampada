require "sidekiq/web"

Rails.application.routes.draw do
  mount Sidekiq::Web => "/sidekiq"

  get "up" => "health#show", as: :rails_health_check

  # API Auth
  scope '/api/v1', module: 'api' do
    get 'auth/me', to: 'auth#me'
    patch 'auth/profile', to: 'auth#update_profile'
  end

  # DPDP
  scope '/api/v1', module: 'api', as: 'api' do
    post 'dpdp/consent', to: 'dpdp#consent'
    get 'dpdp/consent', to: 'dpdp#consent_status'
    post 'dpdp/erasure', to: 'dpdp#erasure'
    post 'dpdp/cancel-deletion', to: 'dpdp#cancel_deletion'
    post 'dpdp/full-export', to: 'dpdp#full_export'
    post 'dpdp/grievance', to: 'dpdp#grievance'
  end

  # Conversations
  resources :conversations, only: [:index, :show, :create, :destroy] do
    resources :messages, only: [:index, :create]
  end

  # API v1
  scope '/api/v1', module: 'api', as: 'api' do
    resources :debts, only: [:index, :show, :create, :update, :destroy]
    resources :debt_payoffs do
      member do
        post :simulate
      end
    end
    resources :payoff_plans
    resources :portfolios, only: [:index, :show, :create, :update, :destroy] do
      member do
        post :rebalance
        get :prices
      end
    end
    resources :investments, only: [:index, :create, :update, :destroy]
    resources :dividend_sips, only: [:index, :show, :create, :update, :destroy] do
      member do
        get :suggest
      end
    end
    resource :journey, only: [:show], controller: 'journey' do
      get :progress
      get :net_worth
    end
    resources :net_worth_snapshots, only: [:index, :show]
    resources :recurring_expenses, only: [:index, :show, :create, :update, :destroy] do
      collection do
        get :calendar
      end
      member do
        get :calendar
      end
    end
    resources :notifications, only: [:index, :update] do
      collection { post :mark_all_read }
    end
    get "dashboard", to: "dashboard#show"
    get "dashboard/projection", to: "dashboard#projection"

    resources :budget_categories, only: [:index, :create, :update, :destroy] do
      collection { post :seed }
    end
    resources :transactions, only: [:index, :show, :create, :update, :destroy] do
      collection { get :monthly_totals }
    end
    resources :budgets, only: [:index, :show, :create, :update, :destroy] do
      collection { get :overview }
    end

    get 'exports', to: 'exports#index'
    post 'exports/csv', to: 'exports#csv'
    post 'exports/json', to: 'exports#export_json'
    scope 'exports', controller: 'exports' do
      get :debts
      get :portfolios
      get :transactions
      get :net_worth
    end
    scope 'reports', controller: 'reports' do
      get :annual
      get :cash_flow_forecast
      get :anomalies
      get :goal_charts
      get :net_worth
    end

    resources :households, only: [:index, :show, :create, :update, :destroy] do
      member do
        get :members
        post :invite
        delete :leave
        get :dashboard
      end
    end

    resources :trips, only: [:index, :show, :create, :update, :destroy] do
      resources :trip_members, only: [:index, :create, :destroy], controller: 'trip_members'
      resources :trip_expenses, only: [:index, :create, :destroy], controller: 'trip_expenses'
      resources :trip_settlements, only: [:index, :create], controller: 'trip_settlements'
    end

    resources :api_credentials, only: [:index, :create, :update, :destroy]
  end
end
