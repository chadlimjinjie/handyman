import { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  MAX_MISTAKES,
  act,
  hasFailed,
  hasWon,
  start,
  type Module,
} from '@/game/engine'
import { cn } from '@/lib/utils'

export function ModulePlayer({
  mod,
  onComplete,
  onExit,
}: {
  mod: Module
  onComplete: (name: string) => void
  onExit: () => void
}) {
  const [run, setRun] = useState(() => start(mod))
  const won = hasWon(mod, run)
  const failed = hasFailed(run)

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-4">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-lg font-semibold">{mod.title}</h1>
        <div className="flex items-center gap-3">
          <span
            className="flex"
            role="img"
            aria-label={`${run.mistakes} of ${MAX_MISTAKES} strikes`}
          >
            {Array.from({ length: MAX_MISTAKES }, (_, i) => (
              <X
                key={i}
                className={cn(
                  'size-5',
                  i < run.mistakes ? 'text-destructive' : 'text-muted-foreground/30',
                )}
              />
            ))}
          </span>
          <Button variant="outline" onClick={onExit}>
            Exit
          </Button>
        </div>
      </header>

      <p role="status" className="min-h-10 rounded-lg bg-muted px-3 py-2 text-sm">
        {run.message}
      </p>

      {failed && (
        <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
          <p className="text-sm">Three strikes. {mod.fail}</p>
          <Button onClick={() => setRun(start(mod))}>Try again</Button>
        </div>
      )}

      {won && (
        <form
          className="flex flex-wrap items-end gap-3 rounded-lg border p-4"
          onSubmit={(e) => {
            e.preventDefault()
            const name = new FormData(e.currentTarget).get('name')
            onComplete(String(name).trim())
          }}
        >
          <label className="flex flex-1 flex-col gap-1 text-sm font-medium">
            Module complete! Name for your certificate
            <input
              name="name"
              required
              pattern=".*\S.*"
              maxLength={60}
              autoComplete="name"
              className="h-8 rounded-lg border border-input px-2.5 font-normal outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </label>
          <Button type="submit">Get certificate</Button>
        </form>
      )}

      <mod.Scene
        step={run.step}
        slip={run.slip}
        mistakes={run.mistakes}
        onAct={(target) => setRun((r) => act(mod, r, target))}
      />
    </div>
  )
}
