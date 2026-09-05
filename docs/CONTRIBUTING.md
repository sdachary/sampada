# Contributing to Sampada

## Philosophy

Sampada follows one rule: **debt first, then wealth.** Every contribution should serve this philosophy. Features that undermine the debt-first priority won't be merged regardless of technical quality.

## How to Contribute

1. Fork the repo
2. Create a feature branch (`git checkout -b feat/my-feature`)
3. Make your changes
4. Run tests (`bin/rails test`)
5. Run RuboCop (`bundle exec rubocop`)
6. Open a PR

## Secrets

Secrets live in `secrets.enc.env`, encrypted via sops — see `.sops.yaml`.
This is the **only** secret store. The old Rails encrypted-credentials path
(`config/credentials.yml.enc`) has been removed; do not add secrets there. For local
development, copy `.env.example` to `.env` and fill in non-secret defaults; secrets are
decrypted into `.env` at deploy time by `deploy.sh`.

## What We Accept

- Bug fixes and security patches (always welcome)
- New financial data providers (Yahoo Finance, Twelve Data, Alpha Vantage adapters)
- Debt payoff strategy improvements
- AI model provider integrations
- International market support
- UI/UX improvements that stay true to the philosophy
- Test coverage improvements

## What We Don't Accept

- Features that encourage taking on debt for investing
- Gamification that prioritizes investing over debt payoff
- Ads, affiliate links, or sponsored features
- Telemetry or data collection without explicit user consent
- AI features that require paid subscriptions

## Code Standards

- Ruby 3.3+, Rails 7.2+
- RSpec for tests (with FactoryBot and SimpleCov)
- ViewComponents + Tailwind CSS for UI
- RuboCop with sampada config (see `.rubocop.yml`)
- No external bank sync — all data is user-entered

## First Time?

Look for issues tagged `good-first-issue` or ask in the discussions.
