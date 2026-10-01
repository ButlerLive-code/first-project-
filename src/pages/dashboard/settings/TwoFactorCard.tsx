import { useState, type FormEvent } from 'react'
import { authCall } from '../../../auth/authCall'
import { authClient } from '../../../auth/client'
import { totpSecret } from '../../../auth/totp'
import { passwordMessage, setupCodeMessage } from '../../../auth/twoFactorError'
import { useAuth } from '../../../auth/useAuth'
import type { Dictionary } from '../../../i18n/en'
import { message, useT, type Message } from '../../../i18n/useT'

// Turning on: password → QR code and key → first code → 10 backup codes.
type Step =
  | { name: 'idle' }
  | { name: 'password'; action: 'enable' | 'disable' }
  | { name: 'scan'; totpURI: string; qr: string; backupCodes: string[] }
  | { name: 'codes'; backupCodes: string[] }

export function TwoFactorCard() {
  const t = useT()
  const { user, refresh } = useAuth()
  const [step, setStep] = useState<Step>({ name: 'idle' })
  const [error, setError] = useState<Message>(null)
  const [busy, setBusy] = useState(false)

  if (!user) return null

  // Moving between steps drops the previous step's error.
  function goTo(next: Step) {
    setError(null)
    setStep(next)
  }

  async function run(action: () => Promise<void>, describe: (t: Dictionary, err: unknown) => string) {
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (err) {
      setError(message((t) => describe(t, err)))
    } finally {
      setBusy(false)
    }
  }

  function handlePassword(e: FormEvent<HTMLFormElement>, action: 'enable' | 'disable') {
    e.preventDefault()
    const password = String(new FormData(e.currentTarget).get('password'))
    void run(async () => {
      if (action === 'disable') {
        await authCall(() => authClient.twoFactor.disable({ password, fetchOptions: { disableSignal: true } }))
        await refresh()
        goTo({ name: 'idle' })
        return
      }
      const setup = await authCall(() => authClient.twoFactor.enable({ password }))
      if (setup.method !== 'totp') throw new Error('Expected TOTP setup data')
      const { totpURI, backupCodes } = setup
      // Loaded on demand: only this step needs the QR encoder.
      const { toDataURL } = await import('qrcode')
      goTo({ name: 'scan', totpURI, qr: await toDataURL(totpURI, { margin: 1, width: 192 }), backupCodes })
    }, passwordMessage)
  }

  function handleCode(e: FormEvent<HTMLFormElement>, backupCodes: string[]) {
    e.preventDefault()
    const code = String(new FormData(e.currentTarget).get('code')).replace(/\s/g, '')
    void run(async () => {
      // The first valid code switches 2FA on for the account.
      await authCall(() => authClient.twoFactor.verifyTotp({ code, fetchOptions: { disableSignal: true } }))
      // twoFactorEnabled changed on the user; re-read it so the card is right once "Done" is pressed.
      await refresh()
      goTo({ name: 'codes', backupCodes })
    }, setupCodeMessage)
  }

  const tf = t.settings.twoFactor

  return (
    <div className="card account-card">
      <h2 className="card-title">{tf.title}</h2>

      {step.name === 'idle' && (
        <>
          <p>{user.twoFactorEnabled ? tf.onText : tf.offText}</p>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => goTo({ name: 'password', action: user.twoFactorEnabled ? 'disable' : 'enable' })}
          >
            {user.twoFactorEnabled ? tf.disable : tf.enable}
          </button>
        </>
      )}

      {step.name === 'password' && (
        <form className="form" onSubmit={(e) => handlePassword(e, step.action)}>
          <label className="field">
            <span>{tf.passwordPrompt}</span>
            <input name="password" type="password" autoComplete="current-password" required />
          </label>
          {error && <p className="form-error">{error(t)}</p>}
          <div className="button-row">
            <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
              {tf.continue}
            </button>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => goTo({ name: 'idle' })}>
              {tf.cancel}
            </button>
          </div>
        </form>
      )}

      {step.name === 'scan' && (
        <form className="form" onSubmit={(e) => handleCode(e, step.backupCodes)}>
          <p>{tf.scan}</p>
          <img src={step.qr} alt={tf.qrAlt} width={192} height={192} />
          <p>
            {tf.secret} <code>{totpSecret(step.totpURI)}</code>
          </p>
          <label className="field">
            <span>{tf.code}</span>
            <input name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={7} required />
          </label>
          {error && <p className="form-error">{error(t)}</p>}
          <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
            {tf.confirm}
          </button>
        </form>
      )}

      {step.name === 'codes' && (
        <>
          <p>
            <b>{tf.backupTitle}</b>
          </p>
          <p>{tf.backupText}</p>
          <ul className="backup-codes">
            {step.backupCodes.map((code) => (
              <li key={code}>
                <code>{code}</code>
              </li>
            ))}
          </ul>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => goTo({ name: 'idle' })}>
            {tf.done}
          </button>
        </>
      )}
    </div>
  )
}
