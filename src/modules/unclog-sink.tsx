import { Brush, Droplets, FlaskConical, Wrench } from 'lucide-react'
import type { Module } from '@/game/engine'
import { cn } from '@/lib/utils'
import { Spot } from './spot'

const shelf = [
  { target: 'brush', label: 'Brush', Icon: Brush },
  { target: 'wrench', label: 'Wrench', Icon: Wrench },
  { target: 'cleaner', label: 'Cleaner', Icon: FlaskConical },
]

// Everything drawn here is derived from `step` (index into `steps` below).
function Scene({ step, onAct }: { step: number; onAct: (target: string) => void }) {
  const sinkFull = step < 2
  const trapOff = step === 2 || step === 3
  const bucketPlaced = step >= 1
  const holding = step === 2 ? 'clogged trap' : step === 3 ? 'clean trap' : 'nothing'

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border bg-sky-50">
      <div className="absolute inset-x-0 bottom-0 h-[8%] bg-stone-400" />
      <div className="absolute inset-x-0 top-[20%] h-[4%] bg-stone-400" />

      <Spot
        aria-label={`Tap${step > 4 ? ', running' : ''}. Sink is ${sinkFull ? 'full of dirty water' : 'empty'}`}
        onClick={() => onAct('tap')}
        className="top-[2%] left-[52%] w-[10%]"
      >
        <span className="h-6 w-1/2 rounded-tl-lg border-t-4 border-l-4 border-stone-500" />
        {step > 4 && <Droplets className="size-4 text-sky-600" aria-hidden="true" />}
        Tap
      </Spot>

      <div className="absolute top-[24%] left-[34%] h-[14%] w-[32%] overflow-hidden rounded-b-2xl border-2 border-t-0 border-stone-500 bg-white">
        {sinkFull && <div className="absolute inset-x-0 bottom-0 h-4/5 bg-stone-500/60" />}
      </div>
      <div className="absolute top-[38%] left-1/2 h-[8%] w-[3%] -translate-x-1/2 bg-stone-500" />
      <div className="absolute top-[52%] left-[58%] h-[3%] w-[42%] bg-stone-500" />

      <Spot
        aria-label={
          trapOff
            ? 'Open drain pipe, trap removed'
            : `Trap, the U-shaped pipe under the sink${step < 2 ? ', clogged' : ''}`
        }
        onClick={() => onAct('trap')}
        className="top-[46%] left-[20%] w-[38%] flex-row justify-end gap-1"
      >
        {trapOff ? 'Refit trap here' : 'Trap'}
        <svg
          viewBox="0 0 60 60"
          className={cn(
            'aspect-square w-[42%] fill-none',
            trapOff ? 'stroke-stone-400' : 'stroke-stone-600',
          )}
          strokeWidth="6"
          strokeDasharray={trapOff ? '4 4' : undefined}
          aria-hidden="true"
        >
          <path d="M30 0V34a10 10 0 0 0 20 0V20H60" />
        </svg>
      </Spot>

      <Spot
        aria-label={
          bucketPlaced
            ? `Bucket under the trap${step > 1 ? ', full of dirty water' : ''}`
            : 'Bucket, by the wall'
        }
        onClick={() => onAct('bucket')}
        className={cn('bottom-[8%] w-[14%]', bucketPlaced ? 'left-[43%]' : 'left-[8%]')}
      >
        Bucket
        <span
          className={cn(
            'aspect-[5/4] w-full rounded-b-lg border-2 border-t-4 border-stone-600',
            step > 1 ? 'bg-stone-500/60' : 'bg-white',
          )}
        />
      </Spot>

      <div className="absolute top-[64%] left-[62%] flex w-[36%] gap-[3%] border-b-4 border-amber-800 pb-1">
        {shelf.map(({ target, label, Icon }) => (
          <Spot
            key={target}
            aria-label={target === 'cleaner' ? 'Chemical drain cleaner' : label}
            onClick={() => onAct(target)}
            className="static flex-1 border border-stone-400 bg-white py-1"
          >
            <Icon className="size-5" aria-hidden="true" />
            {label}
          </Spot>
        ))}
      </div>

      <p className="absolute bottom-[2%] left-[4%] text-xs font-medium text-stone-900">
        In hand: {holding}
      </p>
    </div>
  )
}

export const unclogSink: Module = {
  id: 'unclog-sink',
  title: 'Unclogging a Sink',
  brief:
    'The kitchen sink will not drain. Start by putting something under the U-shaped pipe to catch the water.',
  fail: "On a real job that is a flooded cabinet and a plumber's bill.",
  steps: [
    { target: 'bucket', done: 'Bucket is in place. Now take the U-shaped pipe (the trap) off.' },
    {
      target: 'trap',
      done: 'Trap is off and the dirty water is in the bucket. Now scrub the gunk out of it.',
    },
    { target: 'brush', done: 'Hair and grease cleared out. Now put the trap back on.' },
    { target: 'trap', done: 'Trap is back on, hand-tight. Now run the tap to test it.' },
    { target: 'tap', done: 'Water runs clear and the joints are dry. Job done!' },
  ],
  mistakes: {
    '0:trap':
      'Splash! The trap is full of water and now so is the cabinet. Put the bucket under it first.',
    '0:brush': 'Nothing to clean yet. The clog is inside the U-shaped pipe.',
    '1:brush': 'Nothing to clean yet. The clog is inside the U-shaped pipe.',
    '2:trap': 'Clean it before refitting, or the clog goes straight back in. Use the brush.',
    '2:tap': 'The trap is off. That water goes straight into the cabinet.',
    '3:tap': 'The trap is off. That water goes straight into the cabinet.',
    cleaner:
      'Drain cleaner is caustic: it sits in the trap and splashes on you when you open it. Clear the clog by hand.',
    wrench: 'These are plastic slip nuts: hand-tight only. A wrench cracks them.',
    tap: 'The sink is already full. More water will not shift the clog.',
    bucket: 'The bucket is already where it needs to be.',
    brush: 'The trap is already clean.',
    trap: 'The trap is back on. Test it with the tap.',
  },
  Scene,
}
