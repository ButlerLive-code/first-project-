import type { PlatformId, PlatformText } from './platforms'

const signInStep = {
  title: 'Sign in',
  text: 'Open LaslesVPN and sign in with the email and password you used to create your account.',
}

const connectStep = {
  title: 'Connect',
  text: 'Tap the big Connect button. LaslesVPN picks the fastest server automatically, or choose a location from the list.',
}

export const platformText: Record<PlatformId, PlatformText> = {
  windows: {
    requirements: 'Windows 10 or 11, 64-bit',
    steps: [
      { title: 'Download the installer', text: 'Click “Download for Windows” and save LaslesVPN-Setup.exe.' },
      { title: 'Run the installer', text: 'Double-click the file and confirm the User Account Control prompt. Installation takes under a minute.' },
      signInStep,
      connectStep,
    ],
    troubleshooting: [
      { problem: 'Installer is blocked by SmartScreen', fix: 'Click “More info” → “Run anyway”. Our installer is signed, but new versions may take a few days to build reputation.' },
      { problem: 'Connection drops after sleep', fix: 'Open Settings → Connection and enable “Reconnect automatically”.' },
    ],
  },
  macos: {
    requirements: 'macOS 13 Ventura or later, Intel & Apple silicon',
    steps: [
      { title: 'Download the app', text: 'Click “Download for macOS” and open LaslesVPN.dmg.' },
      { title: 'Move to Applications', text: 'Drag the LaslesVPN icon into the Applications folder, then launch it.' },
      { title: 'Allow the VPN configuration', text: 'macOS will ask to add a VPN configuration. Click “Allow” and enter your Mac password.' },
      signInStep,
      connectStep,
    ],
    troubleshooting: [
      { problem: '“App can’t be opened” warning', fix: 'Right-click the app in Applications and choose Open, then confirm.' },
      { problem: 'VPN configuration missing', fix: 'Go to System Settings → VPN, remove LaslesVPN and relaunch the app to add it again.' },
    ],
  },
  ios: {
    requirements: 'iOS 16 or later',
    steps: [
      { title: 'Get it on the App Store', text: 'Search for “LaslesVPN” on the App Store and tap Get.' },
      { title: 'Allow VPN configurations', text: 'On first launch, tap Allow when iOS asks to add VPN configurations, then confirm with Face ID or your passcode.' },
      signInStep,
      connectStep,
    ],
    troubleshooting: [
      { problem: 'VPN turns off on its own', fix: 'Enable “Connect on Demand” in LaslesVPN settings so iOS keeps the tunnel up.' },
    ],
  },
  android: {
    requirements: 'Android 9 or later',
    steps: [
      { title: 'Get it on Google Play', text: 'Search for “LaslesVPN” on Google Play and tap Install.' },
      { title: 'Grant VPN permission', text: 'On first connect, Android asks for permission to set up a VPN connection. Tap OK.' },
      signInStep,
      connectStep,
    ],
    troubleshooting: [
      { problem: 'Battery saver disconnects the VPN', fix: 'Settings → Apps → LaslesVPN → Battery → set to “Unrestricted”.' },
    ],
  },
  linux: {
    requirements: 'Ubuntu 22.04+, Debian 12+, Fedora 39+',
    steps: [
      { title: 'Download the package', text: 'Download the .deb package (or .rpm for Fedora).' },
      { title: 'Install', text: 'Run “sudo apt install ./laslesvpn_4.0.3_amd64.deb” in the folder you downloaded it to.' },
      { title: 'Sign in', text: 'Run “laslesvpn login” and follow the prompts.' },
      { title: 'Connect', text: 'Run “laslesvpn connect” for the fastest server, or “laslesvpn connect de” for a specific country.' },
    ],
    troubleshooting: [
      { problem: 'Command not found after install', fix: 'Open a new terminal session, or run “hash -r”, so your shell picks up the new binary.' },
    ],
  },
}
