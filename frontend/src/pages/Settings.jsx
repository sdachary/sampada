import { useState, useEffect } from 'react'
import { useAuth } from '../lib/useAuth'
import { api } from '../lib/api'
import { useNavigate } from 'react-router-dom'
import { registerServiceWorker, subscribeToPush, unsubscribeFromPush, isPushSupported, isPushSubscribed } from '../lib/push'
import { Card, Button, Input, Select, InputField, Badge, PageHeader, ToastHost, toast } from '../components/ui'
import { credentialToJSON, jsonToCredentialOptions, isPasskeySupported } from '../lib/passkeys'
import { Reveal } from '../lib/motion-primitives'

const PROVIDERS = [
  { value: 'zerodha', label: 'Zerodha' },
  { value: 'groww', label: 'Groww' },
  { value: 'angel_one', label: 'Angel One' },
  { value: 'upstox', label: 'Upstox' },
  { value: 'icici', label: 'ICICI Direct' },
  { value: 'hdfc_sec', label: 'HDFC Securities' },
  { value: 'kotak_sec', label: 'Kotak Securities' },
  { value: 'other', label: 'Other' },
]

export default function Settings() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    currency: user?.currency || 'INR',
  })
  const [credentials, setCredentials] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [newCred, setNewCred] = useState({ provider: '', label: '', encrypted_value: '' })
  const [aiProvider, setAiProvider] = useState('')
  const [aiConfigured, setAiConfigured] = useState(false)
  const [aiForm, setAiForm] = useState({ provider: '', api_key: '' })
  const [aiError, setAiError] = useState('')
  const [pushSupported, setPushSupported] = useState(false)
  const [pushSubscribed, setPushSubscribed] = useState(false)
  const [swReg, setSwReg] = useState(null)

  // Passkeys
  const [passkeys, setPasskeys] = useState([])
  const [passkeySupported, setPasskeySupported] = useState(false)
  const [addingPasskey, setAddingPasskey] = useState(false)
  const [newPasskeyLabel, setNewPasskeyLabel] = useState('')

  const fetchPasskeys = async () => {
    try {
      const { credentials } = await api.request('/api/v1/auth/passkeys')
      setPasskeys(credentials)
    } catch (e) {
      if (e.status !== 501) console.error('Failed to fetch passkeys:', e)
    }
  }

  useEffect(() => { fetchCredentials() }, [])

  useEffect(() => {
    api.request('/api/v1/ai_settings').then(d => {
      setAiProvider(d.provider || '')
      setAiConfigured(!!d.configured)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    isPushSupported().then(supported => {
      setPushSupported(supported)
      if (supported) {
        registerServiceWorker().then(reg => {
          setSwReg(reg)
          isPushSubscribed(reg).then(setPushSubscribed)
        })
      }
    })
    isPasskeySupported().then(setPasskeySupported)
  }, [])

  useEffect(() => {
    if (passkeySupported) fetchPasskeys()
  }, [passkeySupported])

  const togglePush = async () => {
    if (!swReg) return
    if (pushSubscribed) {
      await unsubscribeFromPush(swReg)
      setPushSubscribed(false)
      toast('Push notifications disabled')
    } else {
      const sub = await subscribeToPush(swReg)
      if (sub) {
        setPushSubscribed(true)
        toast('Push notifications enabled')
      }
    }
  }

  const saveAi = async () => {
    setAiError('')
    try {
      await api.request('/api/v1/ai_settings', {
        method: 'PUT',
        body: JSON.stringify({ provider: aiForm.provider, api_key: aiForm.api_key }),
      })
      setAiProvider(aiForm.provider)
      setAiConfigured(true)
      setAiForm({ provider: '', api_key: '' })
      toast('AI assistant enabled')
    } catch (e) { setAiError(e.message) }
  }

  const disableAi = async () => {
    try {
      await api.request('/api/v1/ai_settings', { method: 'DELETE' })
      setAiConfigured(false)
      setAiProvider('')
      toast('AI assistant disabled')
    } catch { toast('Failed to disable AI') }
  }

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSave = async () => {
    try {
      await api.request('/api/v1/auth/profile', { method: 'PATCH', body: JSON.stringify(form) })
      toast('Profile updated')
      setEditing(false)
    } catch (e) { toast(e.message) }
  }

  const handleExport = async () => {
    try {
      const res = await api.raw('/api/v1/dpdp/full-export', { method: 'POST' })
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `sampada-full-export-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      toast('Full export downloaded')
    } catch { toast('Export failed') }
  }

  const fetchCredentials = async () => {
    try {
      const data = await api.request('/api/v1/api_credentials')
      setCredentials(data.credentials)
    } catch { /* ignore */ }
  }

  const addCredential = async () => {
    if (!newCred.provider || !newCred.encrypted_value) return
    try {
      await api.request('/api/v1/api_credentials', {
        method: 'POST',
        body: JSON.stringify({ api_credential: newCred }),
      })
      setShowAdd(false)
      setNewCred({ provider: '', label: '', encrypted_value: '' })
      fetchCredentials()
      toast('API key added')
    } catch (e) { toast(e.message) }
  }

  const deleteCredential = async (id) => {
    try {
      await api.request(`/api/v1/api_credentials/${id}`, { method: 'DELETE' })
      fetchCredentials()
      toast('API key removed')
    } catch (e) { toast(e.message) }
  }

  const addPasskey = async () => {
    if (!passkeySupported) return
    setAddingPasskey(true)
    try {
      const { options } = await api.request('/api/v1/auth/passkeys/register/options')
      const publicKey = jsonToCredentialOptions(options)
      const credential = await navigator.credentials.create({ publicKey })
      if (!credential) {
        setAddingPasskey(false)
        return
      }
      const credentialJSON = credentialToJSON(credential)
      const label = newPasskeyLabel || 'This device'
      await api.request('/api/v1/auth/passkeys/register', {
        method: 'POST',
        body: JSON.stringify({ credential: credentialJSON, label })
      })
      setNewPasskeyLabel('')
      setAddingPasskey(false)
      toast('Passkey added')
      fetchPasskeys()
    } catch (err) {
      if (err.name === 'NotAllowedError' || err.name === 'AbortError') {
        // User dismissed - silent
      } else {
        toast(err.message || 'Failed to add passkey')
      }
      setAddingPasskey(false)
    }
  }

  const deletePasskey = async (id) => {
    try {
      await api.request(`/api/v1/auth/passkeys/${id}`, { method: 'DELETE' })
      toast('Passkey removed')
      fetchPasskeys()
    } catch (e) { toast(e.message) }
  }

  return (
    <div className="space-y-5">
      <Reveal delay={0}>
        <PageHeader
          title="Settings"
          num="017 / 016"
        >
          <p className="text-sm text-muted">Account preferences and profile.</p>
        </PageHeader>
      </Reveal>

      <Reveal delay={50}>
        <Card className="card-shell card-shell--interactive card-core--pad-lg">
          <div className="flex justify-between items-center mb-3">
            <p className="text-sm font-semibold text-ink">Profile</p>
            <Button variant="ghost" size="sm" onClick={() => setEditing(!editing)}>
              {editing ? 'Cancel' : 'Edit'}
            </Button>
          </div>

          {editing ? (
            <div className="space-y-3">
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 mobile:grid-cols-1">
                <InputField label="First Name" value={form.first_name} onChange={set('first_name')} />
                <InputField label="Last Name" value={form.last_name} onChange={set('last_name')} />
              </div>
              <InputField label="Currency">
                <Select value={form.currency} onChange={set('currency')} options={[
                  { value: 'INR', label: 'INR (₹)' },
                  { value: 'USD', label: 'USD ($)' },
                  { value: 'EUR', label: 'EUR (€)' },
                ]} />
              </InputField>
              <Button onClick={handleSave} className="w-full sm:w-auto">Save</Button>
            </div>
          ) : (
            <div className="space-y-2">
              <div>
                <p className="text-2xs font-semibold uppercase tracking-wider text-muted mb-1">Name</p>
                <p className="text-base font-medium text-ink">{user?.first_name} {user?.last_name}</p>
              </div>
              <div>
                <p className="text-2xs font-semibold uppercase tracking-wider text-muted mb-1">Email</p>
                <p className="text-base font-medium text-ink">{user?.email}</p>
              </div>
              <div>
                <p className="text-2xs font-semibold uppercase tracking-wider text-muted mb-1">Currency</p>
                <p className="text-base font-medium text-ink">{user?.currency || 'INR'}</p>
              </div>
            </div>
          )}
        </Card>
      </Reveal>

      <Reveal delay={100}>
        <Card className="card-shell card-shell--interactive card-core--pad-lg">
          <div className="flex justify-between items-center mb-3">
            <p className="text-sm font-semibold text-ink flex items-center gap-2">
              AI Assistant <span className="font-normal text-muted text-sm">(powered by your key)</span>
            </p>
            <Badge variant={aiConfigured ? 'success' : 'warning'} className="text-2xs uppercase tracking-wider">
              {aiConfigured ? 'On' : 'Off'}
            </Badge>
          </div>
          <p className="text-sm text-muted mb-3">
            {aiConfigured
              ? `Using ${aiProvider === 'gemini' ? 'Google Gemini' : aiProvider === 'grok' ? 'xAI Grok' : aiProvider === 'openrouter' ? 'OpenRouter' : 'OpenAI'} — chat in Conversations.`
              : 'Chat is disabled by default. Connect a Gemini, Grok, or any OpenAI-compatible key to enable AI answers.'}
          </p>

          <div className="flex gap-2 flex-wrap mb-2">
            {!aiConfigured && (
              <>
                <Select value={aiForm.provider} onChange={e => setAiForm(f => ({ ...f, provider: e.target.value }))} placeholder="Select provider…" options={[
                  { value: 'openai', label: 'OpenAI' },
                  { value: 'gemini', label: 'Google Gemini' },
                  { value: 'grok', label: 'xAI Grok' },
                  { value: 'openrouter', label: 'OpenRouter' },
                ]} className="flex-1 min-w-[160px]" />
                <div className="flex-1 min-w-[220px] relative">
                  <Input type="password" placeholder="API key" value={aiForm.api_key} onChange={e => setAiForm(f => ({ ...f, api_key: e.target.value }))} aria-invalid={!!aiError} />
                  {aiError && <p className="field__error" role="alert">{aiError}</p>}
                </div>
                <Button onClick={saveAi} disabled={!aiForm.provider || !aiForm.api_key}>Enable</Button>
              </>
            )}
            {aiConfigured && (
              <Button variant="ghost" size="sm" onClick={disableAi} className="text-accent border-accent">
                Disable
              </Button>
            )}
          </div>
        </Card>
      </Reveal>

      {passkeySupported && (
        <Reveal delay={150}>
          <Card className="card-shell card-shell--interactive card-core--pad-lg">
            <p className="text-sm font-semibold text-ink mb-2">Security</p>
            <p className="text-sm text-muted mb-3">Passkeys let you sign in without a password using your device's biometrics or PIN.</p>

            {passkeys.length === 0 ? (
              <p className="text-sm text-muted mb-2">No passkeys registered yet.</p>
            ) : (
              <div className="space-y-2 mb-3">
                {passkeys.map(p => (
                  <div key={p.id} className="flex justify-between items-center px-3 py-2 bg-bg rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl" aria-hidden="true"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></span>
                      <div>
                        <p className="text-base font-medium text-ink">{p.label}</p>
                        <p className="text-xs text-muted">
                          {p.transport === 'platform' ? 'Built into this device' : 'Security key'}
                          {p.last_used_at && ` · Last used ${new Date(p.last_used_at).toLocaleDateString()}`}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deletePasskey(p.id)}
                      className="text-accent border-accent"
                      disabled={passkeys.length <= 1}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {!addingPasskey ? (
              <Button variant="secondary" size="sm" onClick={() => setAddingPasskey(true)} className="w-full sm:w-auto">
                Add passkey
              </Button>
            ) : (
              <div className="space-y-2 mt-2">
                <InputField
                  label="Label (optional)"
                  placeholder="e.g. MacBook Pro, YubiKey"
                  value={newPasskeyLabel}
                  onChange={e => setNewPasskeyLabel(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={addPasskey} loading={addingPasskey} className="flex-1">
                    {addingPasskey ? 'Registering…' : 'Continue'}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => { setAddingPasskey(false); setNewPasskeyLabel('') }} className="flex-1">
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </Reveal>
      )}

      <Reveal delay={200}>
        <Card className="card-shell card-shell--interactive card-core--pad-lg">
          <p className="text-sm font-semibold text-ink mb-2">Data & Privacy</p>
          <div className="flex gap-2 flex-wrap">
            <Button variant="ghost" size="sm" onClick={handleExport}>Download full export</Button>
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/privacy')}>Privacy controls</Button>
          </div>
        </Card>
      </Reveal>

      <Reveal delay={250}>
        <Card className="card-shell card-shell--interactive card-core--pad-lg">
          <div className="flex justify-between items-center mb-3">
            <p className="text-sm font-semibold text-ink">API Keys</p>
            <Button variant="ghost" size="sm" onClick={() => setShowAdd(!showAdd)}>
              {showAdd ? 'Cancel' : 'Add'}
            </Button>
          </div>

          {showAdd && (
            <div className="space-y-2 mb-3">
              <Select value={newCred.provider} onChange={e => setNewCred(c => ({ ...c, provider: e.target.value }))} placeholder="Select provider…" options={PROVIDERS} />
              <Input placeholder="Label (optional)" value={newCred.label} onChange={e => setNewCred(c => ({ ...c, label: e.target.value }))} />
              <Input placeholder="API key / token" value={newCred.encrypted_value} onChange={e => setNewCred(c => ({ ...c, encrypted_value: e.target.value }))} />
              <Button onClick={addCredential} className="w-full sm:w-auto">Add key</Button>
            </div>
          )}

          {credentials.length === 0 ? (
            <p className="text-sm text-muted">No API keys configured yet.</p>
          ) : (
            <div className="space-y-2">
              {credentials.map(c => (
                <div key={c.id} className="flex justify-between items-center px-3 py-2 bg-bg rounded-lg">
                  <div>
                    <p className="text-base font-medium text-ink">{c.label || PROVIDERS.find(p => p.value === c.provider)?.label || c.provider}</p>
                    <p className="text-xs text-muted">{c.provider}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => deleteCredential(c.id)} className="text-accent border-accent">Remove</Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </Reveal>

      {pushSupported && (
        <Reveal delay={300}>
          <Card className="card-shell card-shell--interactive card-core--pad-lg border-l-3 border-l-success">
            <p className="text-sm font-semibold text-ink mb-1">Push Notifications</p>
            <p className="text-sm text-muted mb-2">Get notified about debt reminders and SIP alerts.</p>
            <Button
              variant={pushSubscribed ? 'ghost' : 'primary'}
              size="sm"
              onClick={togglePush}
              className={pushSubscribed ? 'text-accent border-border bg-transparent' : ''}
            >
              {pushSubscribed ? 'Disable' : 'Enable'}
            </Button>
          </Card>
        </Reveal>
      )}

      <Reveal delay={350}>
        <Card className="card-shell card-shell--interactive card-core--pad-lg border-l-3 border-l-faint">
          <p className="text-sm font-semibold text-ink mb-1">Logout</p>
          <p className="text-sm text-muted mb-2">Sign out of your account.</p>
          <Button variant="ghost" size="sm" onClick={() => { logout(); navigate('/') }} className="text-accent border-accent">
            Sign out
          </Button>
        </Card>
      </Reveal>

      <ToastHost />
    </div>
  )
}