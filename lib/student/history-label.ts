export type StarTxLabelInput = {
  kind: string
  note: string | null
  criterion_id: string | null
}

/**
 * Nhãn dòng sổ sao cho học sinh, chép đúng từ view v_my_star_history (20261101000003_views.sql):
 * trừ sao (và hoàn tác của trừ sao) luôn là "Trừ sao"; cộng sao và hoàn tác lấy nhãn tiêu chí cộng sao
 * (của dòng gốc nếu là hoàn tác), rồi ghi chú, rồi "Cộng sao".
 * `original` là dòng bị hoàn tác (reverses_id); `awardLabels` chỉ gồm tiêu chí loại cộng sao.
 */
export function starHistoryLabel(
  tx: StarTxLabelInput,
  original: StarTxLabelInput | null,
  awardLabels: ReadonlyMap<string, string>,
): string {
  if (tx.kind === 'penalty') return 'Trừ sao'
  if (tx.kind === 'reversal' && original?.kind === 'penalty') return 'Trừ sao'
  if (tx.kind === 'award' || tx.kind === 'reversal') {
    const criterionId = original?.criterion_id ?? tx.criterion_id
    const fromCriterion = criterionId ? awardLabels.get(criterionId) : undefined
    const note = original?.note ?? tx.note
    return fromCriterion ?? (note ? note : 'Cộng sao')
  }
  if (tx.kind === 'reserve') return 'Giữ sao đổi quà'
  if (tx.kind === 'release') return 'Hoàn sao đã giữ'
  return 'Đổi quà'
}
