import type { MissionsData } from '@/lib/missions/queries'

export type Student = { id: string; fullName: string }
export type Note = { tone: 'success' | 'error'; text: string } | null
export type Mission = MissionsData['missions'][number]
export type Badge = MissionsData['badges'][number]
export type Undoing = { id: string; mission: Mission; studentName: string }

export const PAUSE = 'M10 5v14M14 5v14'
