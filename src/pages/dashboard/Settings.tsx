import { usePageMeta } from '../../i18n/usePageMeta'
import { useT } from '../../i18n/useT'
import { DeleteAccountCard } from './settings/DeleteAccountCard'
import { EmailCard } from './settings/EmailCard'
import { PasswordCard } from './settings/PasswordCard'
import { PreferencesCard } from './settings/PreferencesCard'
import { ProfileCard } from './settings/ProfileCard'
import { SessionsCard } from './settings/SessionsCard'
import { TwoFactorCard } from './settings/TwoFactorCard'

export function Settings() {
  const t = useT()
  usePageMeta(t.settings.metaTitle)

  return (
    <div className="account-section account-grid">
      <ProfileCard />
      <EmailCard />
      <PasswordCard />
      <TwoFactorCard />
      <SessionsCard />
      <PreferencesCard />
      <DeleteAccountCard />
    </div>
  )
}
