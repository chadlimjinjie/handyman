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
    <div className="@container mx-auto flex max-w-4xl flex-col gap-4 p-4 print:h-screen print:max-w-none print:p-[1cm]">
      <div className="flex aspect-[297/210] flex-col items-center justify-center gap-[1.5cqw] rounded-xl border-8 border-double border-amber-600 px-[6cqw] text-center print:aspect-auto print:flex-1">
        <Award className="size-[9cqw] text-amber-600" aria-hidden="true" />
        <p className="text-[1.8cqw] tracking-widest text-muted-foreground uppercase">
          Certificate of Completion
        </p>
        <p className="text-[1.8cqw]">This certifies that</p>
        <p className="text-[5cqw] font-semibold text-balance">{cert.name}</p>
        <p className="text-[1.8cqw]">has successfully completed the training module</p>
        <p className="text-[3cqw] font-medium">{title}</p>
        <p className="mt-[3cqw] text-[1.6cqw] text-muted-foreground">
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
