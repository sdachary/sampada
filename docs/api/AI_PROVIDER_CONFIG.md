# Runtime-Switchable AI Provider Configuration

Sampada lets each user switch their AI provider (OpenAI, Gemini, Grok,
OpenRouter) **at runtime** through `Setting` rows — no redeploy required.

## The four `Setting` keys (per user)

| Setting key   | Purpose                                                        | Fallback |
|---------------|----------------------------------------------------------------|----------|
| `ai_provider` | Which preset to use (`openai`, `gemini`, `grok`, `openrouter`). | — (required to enable AI) |
| `ai_api_key`  | The provider API key for the chosen preset.                    | `ENV["OPENAI_ACCESS_TOKEN"]` |
| `ai_uri`      | Base URI for the OpenAI-compatible endpoint.                   | `ENV["OPENAI_URI_BASE"]` → `http://localhost:11434/v1` (Ollama) |
| `ai_model`    | Model name to request.                                         | `ENV["OPENAI_MODEL"]` → `gemma:2b` |

All four are read per-user via `Setting.get(key, user:)` in
`app/services/ai/provider.rb`. The `ai_uri` / `ai_model` fallbacks are
environment variables; `ai_api_key` similarly falls back to
`ENV["OPENAI_ACCESS_TOKEN"]`.

> **Note on `api_token` fallback:** when an explicit `ai_provider` is set but
> `ai_api_key` is empty, `Ai::Provider#api_token` falls back to
> `ENV["OPENAI_ACCESS_TOKEN"]` as a last resort. The `Setting` always takes
> priority over the env var. This is intentional (env as last resort, Setting
> wins) and is acceptable for solo/private deployments. In multi-user
> production you should set `ai_api_key` per user rather than rely on the
> shared env token.

## Provider presets

`Ai::Provider.presets` (in `app/services/ai/provider.rb`):

| Preset      | URI                                                          | Default model        |
|-------------|-------------------------------------------------------------|----------------------|
| `openai`    | `https://api.openai.com/v1`                                 | `gpt-4o-mini`        |
| `gemini`    | `https://generativelanguage.googleapis.com/v1beta/openai/`  | `gemini-1.5-flash`   |
| `grok`      | `https://api.x.ai/v1`                                       | `grok-beta`          |
| `openrouter`| `https://openrouter.ai/api/v1`                              | `openai/gpt-4o-mini` |

Setting `ai_uri` / `ai_model` explicitly overrides the preset defaults.

## How AI is enabled/disabled

`Ai::Provider#configured?` returns true only when **all** of:

- `ai_provider` is present, **and**
- `api_token` is present, **and**
- `ai_uri` is present, **and**
- `ai_model` is present.

If not configured, the AI feature is disabled and `AiService` falls back to
rule-based responses. There is no global "AI on" toggle — configuration is
purely the presence of these per-user `Setting` rows.

## Switching providers at runtime (no deploy)

Two equivalent paths, both writing the same `Setting` rows:

### Via the API

```bash
# Switch to Gemini with an API key
curl -X PUT /api/v1/ai_settings \
  -d provider=gemini -d api_key=<KEY> -d model=gemini-1.5-flash

# Clear all AI settings (disables AI)
curl -X DELETE /api/v1/ai_settings
```

### Via the Settings UI

The AI card in the app writes the same four `Setting` keys through
`Api::AiSettingsController`. Changing `ai_provider` + `ai_api_key` takes effect
immediately for the next request — the controller reads `Setting` on every
call, so there is no cached config to invalidate.

> Because `Ai::Provider` reads `Setting.get(...)` on each `#call`, a provider
> change is picked up on the very next AI request with no restart or deploy.

## Controller surface

- `app/controllers/api/ai_settings_controller.rb`
  - `GET  /api/v1/ai_settings` — current provider/configured state + presets
  - `PUT  /api/v1/ai_settings` — set provider (+ optional key/uri/model)
  - `DELETE /api/v1/ai_settings` — clear all AI settings
- `app/services/ai/provider.rb` — resolves the client + `configured?`
