// The manual-entry key shown next to the QR code: the base32 `secret` of an
// otpauth:// URI, in groups of four for easier typing.
export function totpSecret(totpURI: string): string {
  try {
    const secret = new URL(totpURI).searchParams.get('secret') ?? ''
    return secret.replace(/(.{4})(?=.)/g, '$1 ')
  } catch {
    return ''
  }
}
