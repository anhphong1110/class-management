export function joinNames(names: string[]): string {
  if (names.length <= 2) return names.join(', ')
  return `${names[0]}, ${names[1]} và ${names.length - 2} bạn khác`
}
