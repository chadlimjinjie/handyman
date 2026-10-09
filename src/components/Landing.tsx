import { Link } from '@tanstack/react-router'
import { ArrowRight, Award, Check, Hammer, ListChecks, TriangleAlert } from 'lucide-react'
import { Component, Suspense, lazy, useState, type ReactNode } from 'react'
import { buttonVariants } from '@/components/ui/button'
import { loadProgress } from '@/lib/progress'
import { cn } from '@/lib/utils'
import { modules } from '@/modules'

const HeroScene = lazy(() => import('@/landing/HeroScene'))

const how = [
  {
    Icon: ListChecks,
    title: 'Pick a job',
    text: 'Each module is one real household repair, worked through in the right order.',
  },
  {
    Icon: TriangleAlert,
    title: 'Make your mistakes here',
    text: 'A wrong move tells you why it is wrong. Three strikes and you start the job again.',
  },
  {
    Icon: Award,
    title: 'Earn a certificate',
    text: 'Finish a module to get a named certificate you can print or add to LinkedIn.',
  },
]

// The 3D scene is decoration: without WebGL, or if its chunk fails to load, show nothing.
class Optional extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

export function Landing() {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
  const [lit, setLit] = useState(reduced)
  const progress = loadProgress()

  return (
    <main>
      <section className="dark relative isolate overflow-hidden bg-stone-950 text-foreground">
        <div
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(70%_50%_at_50%_75%,rgb(245_158_11/0.3),transparent)] transition-opacity duration-700 lg:bg-[radial-gradient(45%_60%_at_74%_42%,rgb(245_158_11/0.3),transparent)]',
            lit ? 'opacity-100' : 'opacity-0',
          )}
        />
        <div className="mx-auto grid min-h-svh max-w-6xl items-center gap-8 px-4 py-12 lg:grid-cols-2">
          <div className="flex flex-col items-start gap-6">
            <p className="flex items-center gap-2 text-sm font-medium tracking-widest text-amber-400 uppercase">
              <Hammer className="size-4" aria-hidden="true" />
              Handyman Academy
            </p>
            <h1
              className={cn(
                'text-5xl font-semibold tracking-tight text-balance transition-[text-shadow] duration-700 sm:text-6xl',
                lit
                  ? '[text-shadow:0_0_2.5rem_rgb(251_191_36/0.55)]'
                  : '[text-shadow:0_0_2.5rem_transparent]',
              )}
            >
              Learn home repairs by doing them.
            </h1>
            <p className="max-w-md text-lg text-muted-foreground">
              Short, hands-on practice jobs. Get it wrong here instead of up a real ladder, then
              finish a module to earn a certificate.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/modules/$moduleId"
                params={{ moduleId: 'light-bulb' }}
                className={cn(
                  buttonVariants(),
                  'h-11 bg-amber-400 px-5 text-base text-stone-950 hover:bg-amber-300',
                )}
              >
                Change your first bulb
                <ArrowRight aria-hidden="true" />
              </Link>
              <Link
                to="/modules"
                className={cn(buttonVariants({ variant: 'outline' }), 'h-11 px-5 text-base')}
              >
                Browse modules
              </Link>
            </div>
          </div>
          <div aria-hidden="true" className="aspect-[4/3] w-full lg:aspect-square">
            <Optional>
              <Suspense fallback={null}>
                <HeroScene animate={!reduced} onLit={setLit} />
              </Suspense>
            </Optional>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-2xl font-semibold">Pick a job</h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-3">
          {modules.map((mod) => (
            <li key={mod.id}>
              <Link
                to="/modules/$moduleId"
                params={{ moduleId: mod.id }}
                className="flex h-full flex-col gap-2 rounded-xl border p-5 transition outline-none hover:border-amber-500 hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <h3 className="font-medium">{mod.title}</h3>
                <p className="text-sm text-muted-foreground">{mod.brief}</p>
                <span className="mt-auto flex items-center gap-1 pt-3 text-sm font-medium text-amber-700">
                  {progress[mod.id] ? (
                    <>
                      <Check className="size-4" aria-hidden="true" />
                      Completed · play again
                    </>
                  ) : (
                    <>
                      Start
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </>
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-amber-50">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-2xl font-semibold">How it works</h2>
          <ol className="mt-6 grid gap-8 sm:grid-cols-3">
            {how.map(({ Icon, title, text }) => (
              <li key={title} className="flex flex-col gap-2">
                <Icon className="size-8 text-amber-600" aria-hidden="true" />
                <h3 className="font-medium">{title}</h3>
                <p className="text-sm text-stone-600">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <footer className="mx-auto flex max-w-6xl flex-col items-start gap-4 px-4 py-16">
        <h2 className="text-2xl font-semibold">Ready to pick up the tools?</h2>
        <Link to="/modules" className={cn(buttonVariants(), 'h-11 px-5 text-base')}>
          Browse modules
        </Link>
        <p className="text-sm text-muted-foreground">
          Awareness training only. Not a trade licence or WSQ qualification.
        </p>
      </footer>
    </main>
  )
}
