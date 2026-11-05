// Passkeys WebAuthn helpers — base64url ↔ ArrayBuffer encoding
// No dependencies, native WebAuthn Level 3 APIs

export function base64urlToBuffer(base64url) {
  if (!base64url) return null
  const padding = '='.repeat((4 - (base64url.length % 4)) % 4)
  const base64 = (base64url + padding).replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(base64)
  const buffer = new ArrayBuffer(binary.length)
  const view = new Uint8Array(buffer)
  for (let i = 0; i < binary.length; i++) view[i] = binary.charCodeAt(i)
  return buffer
}

export function bufferToBase64url(buffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function credentialToJSON(credential) {
  if (!credential) return null
  const response = credential.response
  const out = {
    id: credential.id,
    rawId: bufferToBase64url(credential.rawId),
    type: credential.type,
    response: {}
  }

  if (response instanceof AuthenticatorAttestationResponse) {
    out.response = {
      attestationObject: bufferToBase64url(response.attestationObject),
      clientDataJSON: bufferToBase64url(response.clientDataJSON),
      transports: credential.getTransports ? credential.getTransports() : []
    }
  } else if (response instanceof AuthenticatorAssertionResponse) {
    out.response = {
      authenticatorData: bufferToBase64url(response.authenticatorData),
      clientDataJSON: bufferToBase64url(response.clientDataJSON),
      signature: bufferToBase64url(response.signature),
      userHandle: response.userHandle ? bufferToBase64url(response.userHandle) : null
    }
  }

  if (credential.authenticatorAttachment) out.authenticatorAttachment = credential.authenticatorAttachment
  return out
}

export function jsonToCredentialOptions(json) {
  if (!json) return null
  const options = { ...json }

  if (options.challenge) options.challenge = base64urlToBuffer(options.challenge)
  if (options.user?.id) options.user.id = base64urlToBuffer(options.user.id)
  if (options.excludeCredentials) {
    options.excludeCredentials = options.excludeCredentials.map(c => ({
      ...c,
      id: base64urlToBuffer(c.id)
    }))
  }
  if (options.allowCredentials) {
    options.allowCredentials = options.allowCredentials.map(c => ({
      ...c,
      id: base64urlToBuffer(c.id)
    }))
  }

  return options
}

export async function isPasskeySupported() {
  if (typeof window === 'undefined') return false
  if (!window.PublicKeyCredential) return false

  try {
    const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
    return available
  } catch {
    return false
  }
}

export async function isConditionalMediationSupported() {
  if (typeof window === 'undefined') return false
  if (!window.PublicKeyCredential) return false

  try {
    const available = await PublicKeyCredential.isConditionalMediationAvailable()
    return available
  } catch {
    return false
  }
}