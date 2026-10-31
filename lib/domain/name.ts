export function callName(fullName: string): string {
  return fullName.trim().split(/\s+/).slice(-2).join(' ')
}
