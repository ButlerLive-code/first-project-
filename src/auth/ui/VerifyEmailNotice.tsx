import { useState } from 'react'
import { errorMessage } from '../../api/errorMessage'
import { message, useT, type Message } from '../../i18n/useT'
import { authCall } from '../authCall'
import { authClient } from '../client'
import { useAuth } from '../useAuth'

// "Confirm your email" banner with a resend button, for signed-in users whose
// email is not confirmed yet. Renders nothing otherwise.
export function VerifyEmailNotice() {
  const t = useT()
  const { user } = useAuth()
  const [status, setStatus] = useState<Message>(null)
  const [busy, setBusy] = useState(false)

  if (!user || user.emailVerified) return null
  const email = user.email

  async function resend() {
    setBusy(true)
    try {
      await authCall(() => authClient.sendVerificationEmail({ email }))
      setStatus(message((t) => t.verifyNotice.sent))
    } catch (err) {
      setStatus(message((t) => errorMessage(t, err)))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="notice" role="status">
      <p>
        {t.verifyNotice.textBefore}
        <b>{email}</b>
        {t.verifyNotice.textAfter}
        {status && <> {status(t)}</>}
      </p>
      <button type="button" className="btn btn-outline" onClick={resend} disabled={busy}>
        {t.verifyNotice.resend}
      </button>
    </div>
  )
}
