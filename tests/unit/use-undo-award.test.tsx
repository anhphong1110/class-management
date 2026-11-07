import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { StarBatchView } from '@/lib/stars/history'
import { useUndoAward } from '@/app/(teacher)/thi-dua/use-undo-award'

function batch(over: Partial<StarBatchView> & { batchId: string }): StarBatchView {
  return {
    kind: 'award',
    delta: 2,
    studentIds: ['a', 'b'],
    studentNames: ['A', 'B'],
    reason: 'x',
    at: '2026-01-01T00:00:00Z',
    actorName: 'Cô',
    reversed: false,
    ...over,
  } as StarBatchView
}

const old = batch({ batchId: 'old' })
const arming = { knownIds: ['old'], studentIds: ['b', 'a'], points: 2, isAdd: true }

describe('useUndoAward', () => {
  it('chỉ có lượt hoàn tác khi batches làm mới chứa lượt mới khớp', () => {
    const { result, rerender } = renderHook(({ b }) => useUndoAward(b, vi.fn()), { initialProps: { b: [old] } })
    expect(result.current.undoCtx).toBeNull()
    act(() => result.current.arm(arming))
    expect(result.current.undoCtx).not.toBeNull()
    expect(result.current.undoTarget).toBeNull()
    rerender({ b: [batch({ batchId: 'new' }), old] })
    expect(result.current.undoTarget?.batchId).toBe('new')
  })

  it('bỏ qua lượt không khớp hoặc đã hoàn tác', () => {
    const { result, rerender } = renderHook(({ b }) => useUndoAward(b, vi.fn()), { initialProps: { b: [old] } })
    act(() => result.current.arm(arming))
    rerender({
      b: [
        batch({ batchId: 'rev', reversed: true }),
        batch({ batchId: 'pts', delta: 3 }),
        batch({ batchId: 'kind', kind: 'penalty', delta: -2 }),
        batch({ batchId: 'who', studentIds: ['a'] }),
        old,
      ],
    })
    expect(result.current.undoTarget).toBeNull()
  })

  it('gọi hành động hoàn tác đúng một lần rồi xóa ngữ cảnh', () => {
    const undo = vi.fn()
    const { result } = renderHook(() => useUndoAward([batch({ batchId: 'new' }), old], undo))
    act(() => result.current.arm(arming))
    act(() => result.current.undoLast())
    expect(undo).toHaveBeenCalledTimes(1)
    expect(undo).toHaveBeenCalledWith('new')
    expect(result.current.undoCtx).toBeNull()
    act(() => result.current.undoLast())
    expect(undo).toHaveBeenCalledTimes(1)
  })

  it('không gọi gì khi chưa có lượt khớp', () => {
    const undo = vi.fn()
    const { result } = renderHook(() => useUndoAward([old], undo))
    act(() => result.current.arm(arming))
    act(() => result.current.undoLast())
    expect(undo).not.toHaveBeenCalled()
  })

  it('xóa khi dismiss', () => {
    const undo = vi.fn()
    const { result } = renderHook(() => useUndoAward([batch({ batchId: 'new' }), old], undo))
    act(() => result.current.arm(arming))
    expect(result.current.undoTarget).not.toBeNull()
    act(() => result.current.dismiss())
    expect(result.current.undoCtx).toBeNull()
    expect(result.current.undoTarget).toBeNull()
    expect(undo).not.toHaveBeenCalled()
  })
})
