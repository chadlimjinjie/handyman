import { useEffect, useState } from 'react'
import { Volume2, VolumeX, X } from 'lucide-react'
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
import { Subtitle } from '@/scene/frame'

const MUTED_KEY = 'handyman-muted'
const canSpeak = 'speechSynthesis' in window

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
  const [muted, setMuted] = useState(() => {
    try {
      return localStorage.getItem(MUTED_KEY) === '1'
    } catch {
      return false
    }
  })

  // The narrator reads the caption. `run.mistakes` is here so a repeated slip is read again.
  useEffect(() => {
    if (muted || !canSpeak) return
    const said = new SpeechSynthesisUtterance(
      failed ? `${run.message} Three strikes. ${mod.fail}` : run.message,
    )
    // the text is British/Singapore English: keeps a non-English default voice off it
    said.lang = 'en-GB'
    speechSynthesis.speak(said)
    return () => speechSynthesis.cancel()
  }, [run.message, run.mistakes, muted, failed, mod.fail])

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
          {canSpeak && (
            <Button
              variant="outline"
              size="icon"
              aria-pressed={muted}
              aria-label={muted ? 'Unmute narrator' : 'Mute narrator'}
              onClick={() => {
                setMuted(!muted)
                try {
                  localStorage.setItem(MUTED_KEY, muted ? '' : '1')
                } catch {
                  // storage blocked: the choice lasts for this module only
                }
              }}
            >
              {muted ? <VolumeX /> : <Volume2 />}
            </Button>
          )}
          <Button variant="outline" onClick={onExit}>
            Exit
          </Button>
        </div>
      </header>

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

      <Subtitle value={run.message}>
        <mod.Scene
          step={run.step}
          slip={run.slip}
          mistakes={run.mistakes}
          onAct={(target) => setRun((r) => act(mod, r, target))}
        />
      </Subtitle>
    </div>
  )
}
