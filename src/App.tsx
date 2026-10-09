import { useState } from 'react'
import { Certificate } from '@/components/Certificate'
import { ModulePlayer } from '@/components/ModulePlayer'
import { Button } from '@/components/ui/button'
import type { Module } from '@/game/engine'
import { loadProgress, saveProgress } from '@/lib/progress'
import { modules } from '@/modules'

type Screen = { name: 'home' } | { name: 'play' | 'cert'; mod: Module }

function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'home' })
  const [progress, setProgress] = useState(loadProgress)
  const home = () => setScreen({ name: 'home' })

  if (screen.name === 'play') {
    const { mod } = screen
    return (
      <ModulePlayer
        mod={mod}
        onExit={home}
        onComplete={(name) => {
          const next = {
            ...progress,
            [mod.id]: {
              name,
              date: new Date().toISOString(),
              certId: crypto.randomUUID().slice(0, 8).toUpperCase(),
            },
          }
          setProgress(next)
          saveProgress(next)
          setScreen({ name: 'cert', mod })
        }}
      />
    )
  }

  if (screen.name === 'cert') {
    return (
      <Certificate
        title={screen.mod.title}
        cert={progress[screen.mod.id]}
        onBack={home}
      />
    )
  }

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-4">
      <header>
        <h1 className="text-2xl font-semibold">Handyman Academy</h1>
        <p className="text-muted-foreground">
          Learn home repairs by doing them. Finish a module to earn a certificate.
        </p>
      </header>
      <ul className="flex flex-col gap-3">
        {modules.map((mod) => (
          <li
            key={mod.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"
          >
            <div>
              <h2 className="font-medium">{mod.title}</h2>
              <p className="text-sm text-muted-foreground">
                {progress[mod.id] ? 'Completed' : mod.brief}
              </p>
            </div>
            <div className="flex gap-2">
              {progress[mod.id] && (
                <Button variant="outline" onClick={() => setScreen({ name: 'cert', mod })}>
                  View certificate
                </Button>
              )}
              <Button onClick={() => setScreen({ name: 'play', mod })}>
                {progress[mod.id] ? 'Play again' : 'Start'}
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </main>
  )
}

export default App
