export type Role = 'teacher' | 'student'

export type SessionUser = {
  userId: string
  role: Role
  classId: string
  displayName: string
  studentId: string | null
  avatarId: string | null
}
