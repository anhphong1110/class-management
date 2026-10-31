import { describe, expect, it } from 'vitest'
import { groupBatches, type TxRow } from '@/lib/stars/history'

const labels = new Map([['c1', 'Giúp đỡ bạn bè']])
const actors = new Map([['u1', 'Cô Khanh']])

function row(p: Partial<TxRow> & { id: string; student_id: string; batch_id: string }): TxRow {
  return {
    delta: 2,
    kind: 'award',
    criterion_id: 'c1',
    note: 'Rất nhiệt tình',
    reverses_id: null,
    actor_id: 'u1',
    created_at: '2026-11-01T01:00:00Z',
    ...p,
  }
}

const original = [
  row({ id: 't1', student_id: 's1', batch_id: 'b1' }),
  row({ id: 't2', student_id: 's2', batch_id: 'b1' }),
  row({ id: 't3', student_id: 's3', batch_id: 'b1' }),
]

describe('groupBatches', () => {
  it('gom ba dòng cùng batch thành một StarBatch và ghép lý do', () => {
    const out = groupBatches(original, labels, actors)
    expect(out).toHaveLength(1)
    expect(out[0]).toMatchObject({
      batchId: 'b1',
      studentIds: ['s1', 's2', 's3'],
      delta: 2,
      kind: 'award',
      reason: 'Giúp đỡ bạn bè – Rất nhiệt tình',
      actorName: 'Cô Khanh',
      reversed: false,
    })
  })

  it('bỏ phần rỗng khi ghép lý do', () => {
    const out = groupBatches([row({ id: 't1', student_id: 's1', batch_id: 'b1', note: '  ' })], labels, actors)
    expect(out[0].reason).toBe('Giúp đỡ bạn bè')
    const noCrit = groupBatches([row({ id: 't1', student_id: 's1', batch_id: 'b1', criterion_id: null })], labels, actors)
    expect(noCrit[0].reason).toBe('Rất nhiệt tình')
  })

  it('batch có hoàn tác được đánh dấu reversed và batch hoàn tác có lý do Hoàn tác', () => {
    const noNote = original.map((r) => ({ ...r, note: null }))
    const reversal = noNote.map((r, i) =>
      row({
        id: `r${i}`,
        student_id: r.student_id,
        batch_id: 'b2',
        delta: -2,
        kind: 'reversal',
        criterion_id: null,
        note: null,
        reverses_id: r.id,
        created_at: '2026-11-01T02:00:00Z',
      }),
    )
    const out = groupBatches([...noNote, ...reversal], labels, actors)
    expect(out.map((b) => b.batchId)).toEqual(['b2', 'b1'])
    const [rev, orig] = out
    expect(orig.reversed).toBe(true)
    expect(rev.kind).toBe('reversal')
    expect(rev.reversed).toBe(false)
    expect(rev.delta).toBe(-2)
    expect(rev.reason).toBe('Hoàn tác: Giúp đỡ bạn bè')
    expect(rev.studentIds).toEqual(['s1', 's2', 's3'])
  })

  it('tên người thực hiện mặc định khi không rõ', () => {
    const out = groupBatches([row({ id: 't1', student_id: 's1', batch_id: 'b1', actor_id: null })], labels, actors)
    expect(out[0].actorName).toBe('Cô giáo')
  })
})
