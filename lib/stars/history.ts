export type TxRow = {
  id: string
  batch_id: string
  student_id: string
  delta: number
  kind: string
  criterion_id: string | null
  note: string | null
  reverses_id: string | null
  actor_id: string | null
  created_at: string
}

export type StarBatch = {
  batchId: string
  studentIds: string[]
  delta: number
  kind: 'award' | 'penalty' | 'reversal'
  reason: string
  at: string
  actorName: string
  reversed: boolean
}

const SHOWN = new Set(['award', 'penalty', 'reversal'])

function reasonOf(first: TxRow, criteriaLabels: Map<string, string>): string {
  const label = first.criterion_id ? criteriaLabels.get(first.criterion_id) : undefined
  return [label?.trim(), first.note?.trim()].filter((p): p is string => !!p).join(' – ')
}

/**
 * Gom các dòng sổ theo batch_id, mới nhất trước. `rows` cần chứa cả batch gốc của mỗi batch hoàn tác
 * thì mới ghép được lý do "Hoàn tác: …"; thiếu thì chỉ ghi "Hoàn tác".
 */
export function groupBatches(
  rows: TxRow[],
  criteriaLabels: Map<string, string>,
  actorNames: Map<string, string>,
): StarBatch[] {
  const byBatch = new Map<string, TxRow[]>()
  const batchOfTx = new Map<string, string>()
  for (const r of rows) {
    batchOfTx.set(r.id, r.batch_id)
    if (!SHOWN.has(r.kind)) continue
    const list = byBatch.get(r.batch_id)
    if (list) list.push(r)
    else byBatch.set(r.batch_id, [r])
  }

  const reversedBatches = new Set<string>()
  for (const r of rows) {
    if (r.kind === 'reversal' && r.reverses_id) {
      const target = batchOfTx.get(r.reverses_id)
      if (target) reversedBatches.add(target)
    }
  }

  const reasons = new Map<string, string>()
  for (const [batchId, list] of byBatch) {
    if (list[0].kind !== 'reversal') reasons.set(batchId, reasonOf(list[0], criteriaLabels))
  }

  const out: StarBatch[] = []
  for (const [batchId, list] of byBatch) {
    const first = list[0]
    const kind = first.kind as StarBatch['kind']
    let reason: string
    if (kind === 'reversal') {
      const original = first.reverses_id ? batchOfTx.get(first.reverses_id) : undefined
      const base = original ? reasons.get(original) : undefined
      reason = base ? `Hoàn tác: ${base}` : 'Hoàn tác'
    } else {
      reason = reasons.get(batchId) ?? ''
    }
    out.push({
      batchId,
      studentIds: [...new Set(list.map((r) => r.student_id))],
      delta: first.delta,
      kind,
      reason,
      at: first.created_at,
      actorName: (first.actor_id && actorNames.get(first.actor_id)) || 'Cô giáo',
      reversed: reversedBatches.has(batchId),
    })
  }
  return out.sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
}

export type StudentNameInfo = { fullName: string; rollNo: number; archived: boolean }
export type StarBatchView = StarBatch & { studentNames: string[] }

/** Tên học sinh của một batch: bạn đang học theo số thứ tự trước, bạn đã lưu trữ sau; id không tìm thấy bị bỏ. */
export function orderedStudentNames(ids: string[], info: Map<string, StudentNameInfo>): string[] {
  return ids
    .map((id) => info.get(id))
    .filter((s): s is StudentNameInfo => !!s)
    .sort((a, b) => Number(a.archived) - Number(b.archived) || a.rollNo - b.rollNo)
    .map((s) => s.fullName)
}
