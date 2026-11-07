'use client'

import { useState, useTransition } from 'react'
import { Notice } from '@/components/ui/Notice'
import type { ArchivedClass } from '@/lib/backup/queries'
import { BackupCard } from './data/BackupCard'
import { DangerZone } from './data/DangerZone'
import { card, type Current } from './data/shared'

export function DataSection({
  archived,
  classId,
  current,
  demoCount,
}: {
  archived: ArchivedClass[]
  classId: string
  current: Current
  demoCount: number
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  return (
    <section className={card} aria-labelledby="data-h">
      <h2 id="data-h" className="m-0 font-display text-[22px] font-extrabold">
        Năm học và dữ liệu
      </h2>
      {error && <Notice tone="error">{error}</Notice>}
      {done && <Notice tone="success">{done}</Notice>}

      <BackupCard
        archived={archived}
        classId={classId}
        pending={pending}
        startTransition={startTransition}
        setError={setError}
      />
      <DangerZone
        classId={classId}
        current={current}
        demoCount={demoCount}
        pending={pending}
        startTransition={startTransition}
        setError={setError}
        setDone={setDone}
      />
    </section>
  )
}
