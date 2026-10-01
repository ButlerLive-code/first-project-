export interface Post {
  slug: string
  title: string
  excerpt: string
  category: 'Privacy' | 'Guides' | 'Product' | 'Travel'
  date: string
  readMinutes: number
  emoji: string
  body: string[]
}

export const posts: Post[] = [
  {
    slug: 'public-wifi-risks',
    title: 'Why public Wi-Fi is riskier than you think',
    excerpt: 'Airports, cafés and hotels are convenient — and a favourite hunting ground for snoopers. Here is how to stay safe.',
    category: 'Privacy',
    date: '2026-09-18',
    readMinutes: 5,
    emoji: '☕',
    body: [
      'Open Wi-Fi networks rarely encrypt the traffic between your device and the router. Anyone on the same network with the right tools can see which sites you visit and, on unencrypted pages, what you type.',
      'Attackers also set up “evil twin” hotspots with names like “Airport_Free_WiFi”. Once you join, every request passes through their hardware.',
      'A VPN wraps all of your traffic in an encrypted tunnel before it leaves your device, so the café router — or the person spoofing it — only sees scrambled data heading to a LaslesVPN server.',
      'Our rule of thumb: if you did not set up the network yourself, connect to LaslesVPN before you open anything else.',
    ],
  },
  {
    slug: 'choose-fastest-server',
    title: 'How to choose the fastest VPN server',
    excerpt: 'Ping, load and distance all matter. A two-minute guide to picking the right location every time.',
    category: 'Guides',
    date: '2026-09-04',
    readMinutes: 4,
    emoji: '⚡',
    body: [
      'Distance is the biggest factor: the closer the server, the lower the ping. Start with a location in your own country or a neighbouring one.',
      'Next, check the load. A nearby server at 80% load can feel slower than one a little further away at 30%. Our Servers page shows both live.',
      'If you need a specific country for streaming or banking, pick the city in that country with the lowest load.',
      'Still slow? Try switching networks or protocols in the app settings — sometimes the bottleneck is your local connection, not the VPN.',
    ],
  },
  {
    slug: 'laslesvpn-4-2',
    title: 'LaslesVPN 4.2: faster connects and 50+ servers',
    excerpt: 'Our biggest update this year brings one-tap reconnect, a redesigned server list and 30 new locations.',
    category: 'Product',
    date: '2026-08-21',
    readMinutes: 3,
    emoji: '🚀',
    body: [
      'Version 4.2 cuts average connection time in half thanks to a new handshake that reuses keys when you switch networks.',
      'We have added 30 new servers, bringing our network to more than 50 servers in over 30 countries — including new locations in Latin America and Asia Pacific.',
      'The server list now shows live load next to ping, so you can see at a glance where you will get the best speed.',
      'Update today from the Download page or your app store.',
    ],
  },
  {
    slug: 'travel-vpn-checklist',
    title: 'The traveller’s VPN checklist',
    excerpt: 'Going abroad? Set these five things up before you fly and you will stay connected wherever you land.',
    category: 'Travel',
    date: '2026-07-30',
    readMinutes: 6,
    emoji: '✈️',
    body: [
      'Install LaslesVPN on every device you are bringing — phone, laptop and tablet — and sign in while you are still on your home network.',
      'Turn on automatic reconnect so the tunnel comes back up as you hop between hotel, airport and roaming networks.',
      'Note a couple of servers close to your destination and one back home for banking and streaming.',
      'Finally, check your plan covers enough devices for the whole family — Premium includes up to six.',
    ],
  },
  {
    slug: 'no-logs-explained',
    title: 'What “no logs” actually means',
    excerpt: 'Every VPN claims it. Here is exactly what we do and do not record — in plain English.',
    category: 'Privacy',
    date: '2026-07-12',
    readMinutes: 7,
    emoji: '🔒',
    body: [
      'We never record the websites you visit, the files you download, or the content of your traffic.',
      'To run the service we keep the minimum: your account email, your plan, and aggregate server load so we know where to add capacity.',
      'Connection data is held in memory only while you are connected and is discarded when the session ends.',
      'You can read the full details in our Privacy Policy, and you can delete your account at any time.',
    ],
  },
  {
    slug: 'vpn-on-router',
    title: 'Protect your whole home with a VPN router',
    excerpt: 'Smart TVs and consoles cannot run VPN apps. Put LaslesVPN on your router and cover them all.',
    category: 'Guides',
    date: '2026-06-27',
    readMinutes: 8,
    emoji: '📡',
    body: [
      'Many routers support WireGuard or OpenVPN out of the box. Check your router’s admin panel under “VPN client”.',
      'Download a configuration file for your preferred server from your LaslesVPN dashboard and import it on the router.',
      'Every device on your network — including smart TVs and game consoles — will now route through LaslesVPN automatically.',
      'Tip: keep a second, non-VPN Wi-Fi network for devices that need your real location, like local streaming apps.',
    ],
  },
]

export const categories = ['All', 'Privacy', 'Guides', 'Product', 'Travel'] as const

export function getPost(slug: string | undefined) {
  return posts.find((p) => p.slug === slug)
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}
