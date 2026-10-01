export interface FaqItem {
  q: string
  a: string
  link?: { label: string; to: string }
}

export interface FaqCategory {
  title: string
  items: FaqItem[]
}

export const faq: FaqCategory[] = [
  {
    title: 'General',
    items: [
      {
        q: 'What is LaslesVPN?',
        a: 'LaslesVPN is a private virtual network that encrypts your internet traffic and routes it through our secure servers, hiding your IP address and protecting you on public Wi-Fi.',
      },
      {
        q: 'How many devices can I use?',
        a: 'Free covers 1 device, Standard up to 3, and Premium up to 6 devices at the same time.',
        link: { label: 'Compare plans', to: '/#pricing' },
      },
      {
        q: 'Which platforms are supported?',
        a: 'Windows, macOS, iOS, Android and Linux. All apps share one account.',
        link: { label: 'Download apps', to: '/download' },
      },
    ],
  },
  {
    title: 'Billing',
    items: [
      {
        q: 'Is the Free plan really free?',
        a: 'Yes. Free has no time limit and no credit card is required. Upgrade any time to unlock more devices and premium locations.',
      },
      {
        q: 'Can I switch plans later?',
        a: 'Absolutely. Change your plan from your account dashboard — the new plan applies immediately.',
        link: { label: 'Go to dashboard', to: '/dashboard' },
      },
      {
        q: 'Do you offer a yearly discount?',
        a: 'Yearly billing gives you 2 months free compared with paying monthly.',
      },
    ],
  },
  {
    title: 'Technical',
    items: [
      {
        q: 'Will a VPN slow down my connection?',
        a: 'Any VPN adds a small overhead, but connecting to a nearby, lightly loaded server keeps it minimal. Check live ping and load on the Servers page.',
        link: { label: 'See servers', to: '/servers' },
      },
      {
        q: 'Which servers can I use on my plan?',
        a: 'Free and Standard plans include our core locations; Premium unlocks every server, including Asia Pacific and Middle East.',
        link: { label: 'Browse locations', to: '/locations' },
      },
      {
        q: 'The app won’t connect. What should I do?',
        a: 'Try another server, switch networks, and make sure you’re on the latest version. Each platform guide has a troubleshooting section.',
        link: { label: 'Setup guides', to: '/tutorials' },
      },
    ],
  },
  {
    title: 'Privacy',
    items: [
      {
        q: 'Do you keep logs of my activity?',
        a: 'We never log the websites you visit or the content of your traffic.',
        link: { label: 'Read our Privacy Policy', to: '/privacy' },
      },
      {
        q: 'What encryption do you use?',
        a: 'AES-256 encryption with modern tunnelling protocols, the same standard trusted by banks and security experts.',
      },
    ],
  },
]
