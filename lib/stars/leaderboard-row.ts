/** Một dòng trả về của leaderboard_for_period (số có thể là chuỗi khi qua PostgREST). */
export type LbRow = { student_id: string; full_name: string; avatar_id: string | null; stars: number | string; rank: number | string }
