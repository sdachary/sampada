import { useState, useEffect } from 'react'
import { useAuth } from '../lib/useAuth'
import { api } from '../lib/api'
import { useNavigate } from 'react-router-dom'
import { registerServiceWorker, subscribeToPush, unsubscribeFromPush, isPushSupported, isPushSubscribed } from '../lib/push'
import { Card, Button, Input, Select, InputField, Badge, PageHeader, ToastHost, toast } from '../components/ui'
import { credentialToJSON, jsonToCredentialOptions, isPasskeySupported } from '../lib/passkeys'

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
    <div style={{ display: 'grid', gap: 20 }}>
      <PageHeader
        title="Settings"
        num="017 / 016"
      >
        <p style={{ fontSize: 13, color: 'var(--muted)' }}>Account preferences and profile.</p>
      </PageHeader>

      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>Profile</p>
          <Button variant="ghost" size="sm" onClick={() => setEditing(!editing)}>
            {editing ? 'Cancel' : 'Edit'}
          </Button>
        </div>

        {editing ? (
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
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
            <Button onClick={handleSave} style={{ alignSelf: 'flex-start' }}>Save</Button>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            <div>
              <p style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>Name</p>
              <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>{user?.first_name} {user?.last_name}</p>
            </div>
            <div>
              <p style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>Email</p>
              <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>{user?.email}</p>
            </div>
            <div>
              <p style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>Currency</p>
              <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>{user?.currency || 'INR'}</p>
            </div>
          </div>
        )}
      </Card>

      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>
            AI Assistant <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(powered by your key)</span>
          </p>
          <Badge variant={aiConfigured ? 'success' : 'warning'} style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
            {aiConfigured ? 'On' : 'Off'}
          </Badge>
        </div>
        <p style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 12 }}>
          {aiConfigured
            ? `Using ${aiProvider === 'gemini' ? 'Google Gemini' : aiProvider === 'grok' ? 'xAI Grok' : aiProvider === 'openrouter' ? 'OpenRouter' : 'OpenAI'} — chat in Conversations.`
            : 'Chat is disabled by default. Connect a Gemini, Grok, or any OpenAI-compatible key to enable AI answers.'}
        </p>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: aiConfigured ? 10 : 0 }}>
          {!aiConfigured && (
            <>
              <Select value={aiForm.provider} onChange={e => setAiForm(f => ({ ...f, provider: e.target.value }))} placeholder="Select provider…" options={[
                { value: 'openai', label: 'OpenAI' },
                { value: 'gemini', label: 'Google Gemini' },
                { value: 'grok', label: 'xAI Grok' },
                { value: 'openrouter', label: 'OpenRouter' },
              ]} style={{ flex: 1, minWidth: 160 }} />
              <Input type="password" placeholder="API key" value={aiForm.api_key} onChange={e => setAiForm(f => ({ ...f, api_key: e.target.value }))} style={{ flex: 2, minWidth: 220 }} />
              <Button onClick={saveAi} disabled={!aiForm.provider || !aiForm.api_key}>Enable</Button>
            </>
          )}
          {aiConfigured && (
            <Button variant="ghost" size="sm" onClick={disableAi} style={{ color: 'var(--accent)', borderColor: 'var(--accent)' }}>
              Disable
            </Button>
          )}
        </div>
        {aiError && <p style={{ fontSize: 12, color: 'var(--accent)', marginBottom: 8 }}>{aiError}</p>}
      </Card>

      {passkeySupported && (
        <Card>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', marginBottom: 8 }}>Security</p>
          <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>Passkeys let you sign in without a password using your device's biometrics or PIN.</p>

          {passkeys.length === 0 ? (
            <p style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 8 }}>No passkeys registered yet.</p>
          ) : (
            <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
              {passkeys.map(p => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--bg)', borderRadius: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 16 }}>🔐</span>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{p.label}</p>
                      <p style={{ fontSize: 11, color: 'var(--muted)' }}>
                        {p.transport === 'platform' ? 'Built into this device' : 'Security key'}
                        {p.last_used_at && ` · Last used ${new Date(p.last_used_at).toLocaleDateString()}`}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deletePasskey(p.id)}
                    style={{ color: 'var(--accent)', borderColor: 'var(--accent)' }}
                    disabled={passkeys.length <= 1}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}

          {!addingPasskey ? (
            <Button variant="secondary" size="sm" onClick={() => setAddingPasskey(true)} style={{ alignSelf: 'flex-start' }}>
              Add passkey
            </Button>
          ) : (
            <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
              <InputField
                label="Label (optional)"
                placeholder="e.g. MacBook Pro, YubiKey"
                value={newPasskeyLabel}
                onChange={e => setNewPasskeyLabel(e.target.value)}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <Button size="sm" onClick={addPasskey} loading={addingPasskey}>
                  {addingPasskey ? 'Registering…' : 'Continue'}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { setAddingPasskey(false); setNewPasskeyLabel('') }}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      <Card>
        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', marginBottom: 8 }}>Data & Privacy</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button variant="ghost" size="sm" onClick={handleExport}>Download full export</Button>
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/privacy')}>Privacy controls</Button>
        </div>
      </Card>

      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>API Keys</p>
          <Button variant="ghost" size="sm" onClick={() => setShowAdd(!showAdd)}>
            {showAdd ? 'Cancel' : 'Add'}
          </Button>
        </div>

        {showAdd && (
          <div style={{ display: 'grid', gap: 10, marginBottom: 12 }}>
            <Select value={newCred.provider} onChange={e => setNewCred(c => ({ ...c, provider: e.target.value }))} placeholder="Select provider…" options={PROVIDERS} />
            <Input placeholder="Label (optional)" value={newCred.label} onChange={e => setNewCred(c => ({ ...c, label: e.target.value }))} />
            <Input placeholder="API key / token" value={newCred.encrypted_value} onChange={e => setNewCred(c => ({ ...c, encrypted_value: e.target.value }))} />
            <Button onClick={addCredential} style={{ alignSelf: 'flex-start' }}>Save</Button>
          </div>
        )}

        {credentials.length === 0 ? (
          <p style={{ fontSize: 12.5, color: 'var(--muted)' }}>No API keys configured yet.</p>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {credentials.map(c => (
              <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--bg)', borderRadius: 6 }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{c.label || PROVIDERS.find(p => p.value === c.provider)?.label || c.provider}</p>
                  <p style={{ fontSize: 11, color: 'var(--muted)' }}>{c.provider}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => deleteCredential(c.id)} style={{ color: 'var(--accent)', borderColor: 'var(--accent)' }}>Remove</Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {pushSupported && (
        <Card style={{ borderLeft: '3px solid var(--success)' }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>Push Notifications</p>
          <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>Get notified about debt reminders and SIP alerts.</p>
          <Button variant={pushSubscribed ? 'ghost' : 'primary'} size="sm" onClick={togglePush} style={{ background: pushSubscribed ? 'transparent' : undefined, borderColor: pushSubscribed ? 'var(--border)' : undefined, color: pushSubscribed ? 'var(--accent)' : undefined }}>
            {pushSubscribed ? 'Disable' : 'Enable'}
          </Button>
        </Card>
      )}

      <Card style={{ borderLeft: '3px solid var(--faint)' }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>Logout</p>
        <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>Sign out of your account.</p>
        <Button variant="ghost" size="sm" onClick={() => { logout(); navigate('/') }} style={{ color: 'var(--accent)', borderColor: 'var(--accent)' }}>
          Sign out
        </Button>
      </Card>

      <ToastHost />
    </div>
  )
}