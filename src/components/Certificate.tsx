import { Award } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import type { Cert } from '@/lib/progress'

const ISSUER = 'Handyman Academy'

export function Certificate({
  title,
  cert,
  onBack,
}: {
  title: string
  cert: Cert
  onBack: () => void
}) {
  const date = new Date(cert.date)
  const linkedIn = `https://www.linkedin.com/profile/add?${new URLSearchParams({
    startTask: 'CERTIFICATION_NAME',
    name: title,
    organizationName: ISSUER,
    issueYear: String(date.getFullYear()),
    issueMonth: String(date.getMonth() + 1),
    certId: cert.certId,
  })}`

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-4">
      <div className="flex flex-col items-center gap-3 rounded-xl border-4 border-double border-amber-600 px-6 py-12 text-center">
        <Award className="size-12 text-amber-600" aria-hidden="true" />
        <p className="text-sm tracking-widest text-muted-foreground uppercase">
          Certificate of Completion
        </p>
        <p className="text-sm">This certifies that</p>
        <p className="text-3xl font-semibold">{cert.name}</p>
        <p className="text-sm">has successfully completed the training module</p>
        <p className="text-xl font-medium">{title}</p>
        <p className="mt-6 text-sm text-muted-foreground">
          {ISSUER} · {date.toLocaleDateString(undefined, { dateStyle: 'long' })} · ID{' '}
          {cert.certId}
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-3 print:hidden">
        <a href={linkedIn} target="_blank" rel="noreferrer" className={buttonVariants()}>
          Add to LinkedIn profile
        </a>
        <Button variant="outline" onClick={() => window.print()}>
          Download / print
        </Button>
        <Button variant="ghost" onClick={onBack}>
          Back to modules
        </Button>
      </div>
    </div>
  )
}
