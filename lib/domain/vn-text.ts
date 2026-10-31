export function normalizeVn(text: string): string {
  return text
    .toLowerCase()
    .replace(/đ/g, 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export function matchesSearch(query: string, fields: string[]): boolean {
  const q = normalizeVn(query.trim())
  if (!q) return true
  return fields.some((f) => normalizeVn(f).includes(q))
}

/** Sort key putting the given name (last word) first; compare with localeCompare(…, 'vi'). */
export function givenNameKey(fullName: string): string {
  const name = fullName.trim()
  const given = name.split(/\s+/).slice(-1)[0] ?? ''
  return `${given} ${name}`
}
