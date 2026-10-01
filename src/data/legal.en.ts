import type { LegalDoc } from './legal'

export const privacy: LegalDoc = {
  title: 'Privacy Policy',
  updated: '2026-09-01',
  intro:
    'Your privacy is the reason LaslesVPN exists. This policy explains what we collect, why, and the choices you have.',
  sections: [
    {
      id: 'collect',
      title: 'What we collect',
      paragraphs: [
        'Account data: your name, email address and the plan you choose.',
        'Payment data is handled by our payment processor; we never see or store your full card number.',
        'Aggregate service data: total bandwidth and load per server, which cannot be linked to any individual user.',
      ],
    },
    {
      id: 'never',
      title: 'What we never collect',
      paragraphs: [
        'We do not log browsing history, traffic destinations, DNS queries, or the content of your traffic.',
        'We do not store the IP address you connect from once your session ends.',
      ],
    },
    {
      id: 'use',
      title: 'How we use your data',
      paragraphs: [
        'To provide and bill for the service, to send essential account emails, and — only if you subscribe — to send product news.',
        'We do not sell or rent personal data to anyone.',
      ],
    },
    {
      id: 'rights',
      title: 'Your rights',
      paragraphs: [
        'You can access, correct, export or delete your account data at any time from your dashboard or by contacting support.',
        'If you are in the EU or UK you also have the right to lodge a complaint with your local data protection authority.',
      ],
    },
    {
      id: 'contact',
      title: 'Contact',
      paragraphs: ['Questions about this policy? Reach our privacy team through the Help Center.'],
    },
  ],
}

export const terms: LegalDoc = {
  title: 'Terms of Service',
  updated: '2026-09-01',
  intro:
    'These terms govern your use of LaslesVPN. By creating an account you agree to them, so please read them carefully.',
  sections: [
    {
      id: 'account',
      title: 'Your account',
      paragraphs: [
        'You must provide accurate information and keep your password secure. You are responsible for activity on your account.',
        'Each plan covers a set number of simultaneous devices: Free 1, Standard 3, Premium 6.',
      ],
    },
    {
      id: 'billing',
      title: 'Plans & billing',
      paragraphs: [
        'Paid plans renew automatically each month or year until cancelled. You can change or cancel at any time from your dashboard.',
        'Yearly plans are billed upfront at a discounted rate equal to ten monthly payments.',
      ],
    },
    {
      id: 'use',
      title: 'Acceptable use',
      paragraphs: [
        'Do not use LaslesVPN for illegal activity, to send spam, to attack other networks, or to infringe the rights of others.',
        'We may suspend accounts that violate these rules to protect our users and network.',
      ],
    },
    {
      id: 'liability',
      title: 'Liability',
      paragraphs: [
        'We work hard to keep the service fast and available, but it is provided “as is” without guarantees of uninterrupted access.',
      ],
    },
    {
      id: 'changes',
      title: 'Changes to these terms',
      paragraphs: [
        'If we make material changes we will notify you by email at least 30 days before they take effect.',
      ],
    },
  ],
}
