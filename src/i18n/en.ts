// English UI strings. ru.ts must provide exactly the same keys: the build
// fails on a missing or extra one. Values are strings or small functions
// for strings that embed numbers or names.
export const en = {
  meta: {
    siteName: 'LaslesVPN',
    defaultTitle: 'LaslesVPN',
    defaultDescription: 'Fast, private VPN with servers in 30+ countries. Try it free.',
  },
  language: {
    label: 'Language',
    en: 'English',
    ru: 'Русский',
  },
}

export type Dictionary = typeof en
