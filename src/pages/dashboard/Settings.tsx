import { usePageMeta } from '../../i18n/usePageMeta'
import { useT } from '../../i18n/useT'
import { DeleteAccountCard } from './settings/DeleteAccountCard'
import { PreferencesCard } from './settings/PreferencesCard'
import { ProfileCard } from './settings/ProfileCard'

export function Settings() {
  const t = useT()
  usePageMeta(t.settings.metaTitle)

  return (
    <div className="account-section account-grid">
      <ProfileCard />
      <PreferencesCard />
      <DeleteAccountCard />
    </div>
  )
}
