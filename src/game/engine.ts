import type { ReactNode } from 'react'

export type Step = { target: string; done: string }

export type Module = {
  id: string
  title: string
  brief: string
  /** Shown after "Three strikes." when the run is lost. */
  fail: string
  steps: Step[]
  /** Why a click is wrong, keyed by "stepIndex:target" or just "target". */
  mistakes: Record<string, string>
  Scene: (props: { step: number; onAct: (target: string) => void }) => ReactNode
}

export type Run = { step: number; mistakes: number; message: string }

export const MAX_MISTAKES = 3

export const start = (mod: Pick<Module, 'brief'>): Run => ({
  step: 0,
  mistakes: 0,
  message: mod.brief,
})

export const hasWon = (mod: Pick<Module, 'steps'>, run: Run) =>
  run.step >= mod.steps.length

export const hasFailed = (run: Run) => run.mistakes >= MAX_MISTAKES

export function act(
  mod: Pick<Module, 'steps' | 'mistakes'>,
  run: Run,
  target: string,
): Run {
  if (hasWon(mod, run) || hasFailed(run)) return run
  const step = mod.steps[run.step]
  if (target === step.target) {
    return { ...run, step: run.step + 1, message: step.done }
  }
  return {
    ...run,
    mistakes: run.mistakes + 1,
    message:
      mod.mistakes[`${run.step}:${target}`] ??
      mod.mistakes[target] ??
      "That's not the right move yet.",
  }
}
