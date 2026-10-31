export function normalizeUsername(
  raw: string,
): { ok: true; username: string } | { ok: false; error: 'invalid_username' } {
  const username = raw.trim().toLowerCase()
  if (!/^[a-z0-9._]{3,32}$/.test(username)) {
    return { ok: false, error: 'invalid_username' }
  }
  return { ok: true, username }
}

export function usernameToEmail(username: string): string {
  return `${username}@${process.env.AUTH_EMAIL_DOMAIN ?? 'tram58.local'}`
}
