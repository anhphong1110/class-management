import { Card } from '@/components/ui/Card'

export function ComingSoon({ title }: { title: string }) {
  return (
    <Card className="relative overflow-hidden">
      <div data-testid="primary-accent" className="absolute inset-x-0 top-0 h-1.5 bg-primary" aria-hidden="true" />
      <h2 className="m-0 font-display text-xl font-extrabold">{title}</h2>
      <p className="m-0 mt-1 text-muted">Trang này đang được xây dựng.</p>
    </Card>
  )
}
