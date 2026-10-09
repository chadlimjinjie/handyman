import { Clock, Lightbulb, Trash2 } from 'lucide-react'
import type { Module } from '@/game/engine'
import { cn } from '@/lib/utils'
import { Spot } from './spot'

const shelf = [
  { target: 'new-led-e27', label: 'LED 9W', base: 'E27' },
  { target: 'new-100w', label: '100W', base: 'E27' },
  { target: 'new-e14', label: 'LED 5W', base: 'E14' },
]

// Everything drawn here is derived from `step` (index into `steps` below).
function Scene({ step, onAct }: { step: number; onAct: (target: string) => void }) {
  const powerOn = step === 0 || step === 8
  const oldBulbIn = step < 4
  const socketEmpty = step === 4 || step === 5
  const hand = [
    step >= 4 && step <= 6 && 'old bulb',
    step === 5 && 'new LED bulb',
  ].filter(Boolean)

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border bg-amber-50">
      <div className="absolute inset-x-0 top-0 h-[3%] bg-stone-300" />
      <div className="absolute inset-x-0 bottom-0 h-[10%] bg-stone-400" />

      <Spot
        aria-label={
          socketEmpty
            ? 'Empty light socket'
            : oldBulbIn
              ? `Old bulb${step < 2 ? ', hot' : ''}`
              : `New bulb${step === 8 ? ', lit' : ''}`
        }
        onClick={() => onAct(socketEmpty ? 'socket' : 'bulb')}
        className="top-[3%] left-1/2 w-[14%] -translate-x-1/2"
      >
        <span className="h-6 w-0.5 bg-stone-700" />
        <span className="h-3 w-1/3 rounded-sm bg-stone-700" />
        {socketEmpty ? (
          <span className="aspect-square w-3/5" />
        ) : (
          <Lightbulb
            className={cn(
              'size-auto w-3/5 rotate-180',
              step === 8
                ? 'fill-yellow-300 text-yellow-500 drop-shadow-[0_0_12px_gold]'
                : step < 2
                  ? 'text-red-600'
                  : 'text-stone-500',
            )}
          />
        )}
        {step < 2 && <span className="text-red-700">HOT</span>}
      </Spot>
      <p className="absolute top-[6%] left-[60%] rounded border border-stone-400 bg-white px-1.5 py-0.5 text-xs text-stone-700">
        Fixture: E27 · max 60W
      </p>

      <Spot
        aria-label={`Wall switch, ${powerOn ? 'on' : 'off'}`}
        onClick={() => onAct('switch')}
        className="top-[38%] left-[8%] w-[9%] gap-1 p-1"
      >
        <span className="flex aspect-[2/3] w-2/3 rounded border-2 border-stone-500 bg-white p-0.5">
          <span
            className={cn(
              'h-1/2 w-full rounded-sm',
              powerOn ? 'self-start bg-green-600' : 'self-end bg-stone-400',
            )}
          />
        </span>
        {powerOn ? 'ON' : 'OFF'}
      </Spot>

      <Spot
        aria-label="Wait a few minutes"
        onClick={() => onAct('wait')}
        className="top-[14%] left-[80%] w-[10%] gap-1 p-1"
      >
        <Clock className="size-auto w-full" />
        Wait
      </Spot>

      <Spot
        aria-label={step < 3 ? 'Ladder, leaning on the wall' : 'Ladder, under the fixture'}
        onClick={() => onAct('ladder')}
        className={cn(
          'bottom-[8%] h-[52%] w-[12%]',
          step < 3 ? 'left-[84%] rotate-6' : 'left-[44%]',
        )}
      >
        <svg
          viewBox="0 0 40 120"
          preserveAspectRatio="none"
          className="size-full stroke-amber-800"
          strokeWidth="3"
          aria-hidden="true"
        >
          <path d="M8 0V120M32 0V120M8 15H32M8 40H32M8 65H32M8 90H32" />
        </svg>
      </Spot>

      <div className="absolute top-[62%] left-[4%] flex w-[36%] gap-[4%] border-b-4 border-amber-800 pb-1">
        {shelf.map((b) => (
          <Spot
            key={b.target}
            aria-label={`Replacement bulb: ${b.label}, ${b.base} base`}
            onClick={() => onAct(b.target)}
            className={cn(
              'static flex-1 border border-stone-400 bg-white py-1',
              step > 4 && b.target === 'new-led-e27' && 'invisible',
            )}
          >
            <Lightbulb className="size-5" aria-hidden="true" />
            {b.label}
            <span className="text-stone-500">{b.base}</span>
          </Spot>
        ))}
      </div>

      <Spot
        aria-label="Bin"
        onClick={() => onAct('bin')}
        className="bottom-[9%] left-[66%] w-[9%] p-1"
      >
        <Trash2 className="size-auto w-full" />
        Bin
      </Spot>

      <p className="absolute bottom-[2%] left-[4%] text-xs font-medium text-stone-900">
        In hand: {hand.join(' + ') || 'nothing'}
      </p>
    </div>
  )
}

export const lightBulb: Module = {
  id: 'light-bulb',
  title: 'Changing a Light Bulb',
  brief: 'The hallway bulb just blew. Replace it safely.',
  fail: 'On a real job that is a trip to A&E.',
  steps: [
    { target: 'switch', done: 'Power is off. No shock risk now.' },
    { target: 'wait', done: 'The bulb has cooled down.' },
    { target: 'ladder', done: 'Ladder is stable, right under the fixture.' },
    { target: 'bulb', done: 'Old bulb is out. Check its base and wattage.' },
    { target: 'new-led-e27', done: 'E27 base and well under 60W. Good match.' },
    { target: 'socket', done: 'New bulb fitted: snug, not overtightened.' },
    { target: 'bin', done: 'Old bulb disposed of safely.' },
    { target: 'switch', done: "Light's on. Job done!" },
  ],
  mistakes: {
    '0:bulb': 'Zap! The power is still on. Switch it off before touching the bulb.',
    '0:ladder': 'Make it safe first: switch the power off before setting up.',
    '1:bulb': 'Ouch! A bulb that just blew is hot. Give it a few minutes to cool.',
    '1:ladder': 'Let the bulb cool before you climb up to it.',
    '2:bulb': 'You cannot reach it safely. No stretching or chair-balancing: use the ladder.',
    '4:socket': 'Nothing to fit yet. Pick a replacement bulb first.',
    '4:bin': 'Hold on to it for a moment: match its base and wattage to pick the replacement.',
    '5:bin': 'Finish the job up the ladder first: fit the new bulb.',
    '6:switch': 'The old bulb is still in your hand. Dispose of it safely first.',
    'new-100w': '100W is over the 60W maximum on this fixture. That is a fire risk.',
    'new-e14': 'E14 is the small screw base. This fixture takes E27.',
    'new-led-e27': 'You do not need a new bulb at this point.',
    switch: 'Leave the power off until the new bulb is in.',
    wait: 'Nothing to wait for right now.',
    ladder: 'The ladder is already where it needs to be.',
    bin: 'Nothing to throw away yet.',
    bulb: 'The new bulb is in. Leave it alone.',
  },
  Scene,
}
