import { randomInt } from 'node:crypto'

/** Bỏ các ký tự dễ nhầm (i, l, o, 0, 1). */
export const TEMP_PASSWORD_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'
export const TEMP_PASSWORD_LENGTH = 10

export function generateTempPassword(rand: (n: number) => number = (n) => randomInt(n)): string {
  let out = ''
  for (let i = 0; i < TEMP_PASSWORD_LENGTH; i++) out += TEMP_PASSWORD_ALPHABET[rand(TEMP_PASSWORD_ALPHABET.length)]
  return out
}
