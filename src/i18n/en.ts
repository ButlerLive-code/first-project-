// English UI strings. ru.ts must provide exactly the same keys: the build
// fails on a missing or extra one. Values are strings or small functions
// for strings that embed numbers or names.
import type { PlanId } from '../data/plans'

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
  common: {
    sendAnother: 'Send another',
  },
  header: {
    menu: 'Menu',
    about: 'About',
    features: 'Features',
    pricing: 'Pricing',
    testimonials: 'Testimonials',
    help: 'Help',
    myAccount: 'My Account',
    signIn: 'Sign In',
    signUp: 'Sign Up',
  },
  footer: {
    subscribeTitle: 'Subscribe Now for Get Special Features!',
    subscribedBefore: 'Thanks! Special offers will go to ',
    subscribedAfter: ' (demo — nothing was sent).',
    subscribePrompt: "Let's subscribe with us and find the fun.",
    useAnotherEmail: 'Use another email',
    emailPlaceholder: 'Your email',
    emailLabel: 'Email address',
    subscribeButton: 'Subscribe Now',
    about: 'is a private virtual network that has unique features and has high security.',
    product: 'Product',
    download: 'Download',
    pricing: 'Pricing',
    locations: 'Locations',
    server: 'Server',
    countries: 'Countries',
    blog: 'Blog',
    engage: 'Engage',
    faq: 'FAQ',
    tutorials: 'Tutorials',
    aboutUs: 'About Us',
    privacy: 'Privacy Policy',
    terms: 'Terms of Service',
    earnMoney: 'Earn Money',
    affiliate: 'Affiliate',
    becomePartner: 'Become Partner',
  },
  hero: {
    titleBefore: 'Want anything to be easy with ',
    textBefore: 'Provide a network for all your needs with ease and fun using ',
    textAfter: ' discover interesting features from us.',
    cta: 'Get Started',
    users: 'Users',
    locations: 'Locations',
    servers: 'Servers',
  },
  features: {
    title: 'We Provide Many Features You Can Use',
    text: 'You can explore the features that we provide with fun and have their own functions each feature.',
    items: [
      'Powerfull online protection.',
      'Internet without borders.',
      'Supercharged VPN',
      'No specific time limits.',
    ],
  },
  network: {
    title: 'Huge Global Network of Fast VPN',
    textBefore: 'See ',
    textAfter: ' everywhere to make it easier for you when you move locations.',
    mapAlt: 'Map of LaslesVPN servers',
    sponsorsAlt: 'Netflix, Reddit, Amazon, Discord, Spotify',
  },
  pricing: {
    title: 'Choose Your Plan',
    text: "Let's choose the package that is best for you and explore it happily and cheerfully.",
    free: 'Free',
    perMonth: '/ mo',
    select: 'Select',
  },
  plans: {
    free: {
      name: 'Free Plan',
      perks: ['Unlimited Bandwitch', 'Encrypted Connection', 'No Traffic Logs', 'Works on All Devices'],
    },
    standard: {
      name: 'Standard Plan',
      perks: [
        'Unlimited Bandwitch',
        'Encrypted Connection',
        'Yes Traffic Logs',
        'Works on All Devices',
        'Connect Anyware',
      ],
    },
    premium: {
      name: 'Premium Plan',
      perks: [
        'Unlimited Bandwitch',
        'Encrypted Connection',
        'Yes Traffic Logs',
        'Works on All Devices',
        'Connect Anyware',
        'Get New Features',
      ],
    },
  } satisfies Record<PlanId, { name: string; perks: string[] }>,
  testimonials: {
    title: 'Trusted by Thousands of Happy Customer',
    text: 'These are the stories of our customers who have joined us with great pleasure when using this crazy feature.',
    stars: 'stars',
    showReview: (n: number) => `Show review ${n}`,
    previous: 'Previous',
    next: 'Next',
    items: [
      {
        location: 'Warsaw, Poland',
        text: '“Wow... I am very happy to use this VPN, it turned out to be more than my expectations and so far there have been no problems. LaslesVPN always the best”.',
      },
      {
        location: 'Shanxi, China',
        text: '“I like it because I like to travel far and still can connect with high speed.”.',
      },
      {
        location: 'Seoul, South Korea',
        text: '“This is very unusual for my business that currently requires a virtual private network that has high security.”.',
      },
    ],
  },
  loadBar: {
    title: (load: number) => `${load}% load`,
  },
  notFound: {
    metaTitle: 'Page not found',
    title: 'Page not found',
    text: "The page you're looking for doesn't exist or has been moved.",
    back: 'Back to Home',
  },
}

export type Dictionary = typeof en
