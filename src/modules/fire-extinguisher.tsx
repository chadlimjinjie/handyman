import { BellRing, DoorOpen, FireExtinguisher, Flame, MoveHorizontal } from 'lucide-react'
import type { Module } from '@/game/engine'
import { cn } from '@/lib/utils'
import { Spot } from './spot'

const shelf = [
  { target: 'powder', label: 'Dry powder' },
  { target: 'water', label: 'Water' },
  { target: 'foam', label: 'Foam' },
]

const pass = [
  { letter: 'P', word: 'Pull', after: 3 },
  { letter: 'A', word: 'Aim', after: 4 },
  { letter: 'S', word: 'Squeeze', after: 5 },
  { letter: 'S', word: 'Sweep', after: 6 },
]

// Everything drawn here is derived from `step` (index into `steps` below).
function Scene({ step, onAct }: { step: number; onAct: (target: string) => void }) {
  const alarmOn = step >= 1
  const holding = step >= 2
  const inPosition = step >= 3
  const pinOut = step >= 4
  const spraying = step === 6
  const burning = step < 7

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border bg-orange-50">
      <div className="absolute inset-x-0 bottom-0 h-[8%] bg-stone-400" />

      <ol
        aria-label="PASS steps done"
        className="absolute top-[3%] left-[60%] flex w-[37%] justify-between gap-1"
      >
        {pass.map(({ letter, word, after }) => (
          <li
            key={word}
            aria-label={`${word}: ${step > after ? 'done' : 'not yet'}`}
            className={cn(
              'flex flex-1 flex-col items-center rounded border text-xs',
              step > after
                ? 'border-red-700 bg-red-600 text-white'
                : 'border-stone-400 bg-white text-stone-500',
            )}
          >
            <span className="text-base font-bold">{letter}</span>
            {word}
          </li>
        ))}
      </ol>

      <Spot
        aria-label={burning ? 'Door, the only exit, clear' : 'Door: back away to the exit'}
        onClick={() => onAct('back-away')}
        className="bottom-[8%] left-[2%] w-[13%] rounded-b-none border-2 border-b-0 border-stone-500 bg-white py-2"
      >
        <DoorOpen className="size-auto w-3/5" aria-hidden="true" />
        Exit
      </Spot>

      <Spot
        aria-label={`Fire alarm call point${alarmOn ? ', ringing' : ''}`}
        onClick={() => onAct('alarm')}
        className="top-[8%] left-[20%] w-[11%] gap-1 p-1"
      >
        <BellRing
          className={cn('size-auto w-3/5', alarmOn ? 'text-red-600' : 'text-stone-500')}
          aria-hidden="true"
        />
        {alarmOn ? 'Ringing' : 'Alarm'}
      </Spot>

      <div className="absolute top-[26%] left-[34%] flex w-[24%] gap-[4%] border-b-4 border-amber-800 pb-1">
        {shelf.map(({ target, label }) => (
          <Spot
            key={target}
            aria-label={`${label} extinguisher`}
            onClick={() => onAct(target)}
            className={cn(
              'static flex-1 border border-stone-400 bg-white py-1',
              holding && target === 'powder' && 'invisible',
            )}
          >
            <FireExtinguisher className="size-5 text-red-600" aria-hidden="true" />
            {label}
          </Spot>
        ))}
      </div>

      {holding && (
        <div className="absolute top-[48%] left-[18%] flex w-[36%] gap-[4%] rounded-lg border border-stone-400 bg-white/80 p-1">
          <Spot
            aria-label={`Safety pin, ${pinOut ? 'pulled out' : 'in place'}`}
            onClick={() => onAct('pin')}
            className="static flex-1 py-1"
          >
            <span
              className={cn(
                'size-4 rounded-full border-2',
                pinOut ? 'border-dashed border-stone-400' : 'border-amber-500',
              )}
            />
            Pin
          </Spot>
          <Spot
            aria-label={`Lever${step >= 6 ? ', squeezed' : pinOut ? '' : ', locked by the pin'}`}
            onClick={() => onAct('lever')}
            className="static flex-1 py-1"
          >
            <FireExtinguisher
              className={cn('size-5', step >= 6 ? 'text-red-600' : 'text-stone-600')}
              aria-hidden="true"
            />
            Lever
          </Spot>
          <Spot
            aria-label="Sweep the nozzle side to side"
            onClick={() => onAct('sweep')}
            className="static flex-1 py-1"
          >
            <MoveHorizontal className="size-5" aria-hidden="true" />
            Sweep
          </Spot>
        </div>
      )}

      <div className="absolute top-[54%] left-[58%] h-[3%] w-[26%] bg-amber-800" />
      {burning && (
        <Spot
          aria-label="Flames"
          onClick={() => onAct('flames')}
          className="top-[60%] left-[62%] w-[18%]"
        >
          <Flame
            className={cn(
              'size-auto w-3/5 fill-orange-400 text-red-600',
              spraying && 'opacity-50',
            )}
            aria-hidden="true"
          />
          Flames
        </Spot>
      )}
      <Spot
        aria-label={
          burning
            ? `Base of the fire: the burning power strip${step > 4 ? ', nozzle aimed here' : ''}`
            : 'Power strip, scorched, fire out'
        }
        onClick={() => onAct('base')}
        className="bottom-[8%] left-[60%] w-[22%] pt-1"
      >
        {burning ? 'Base' : 'Out'}
        <span className="h-2 w-full rounded-sm bg-stone-800" />
      </Spot>

      {[
        { target: 'stand-door', label: 'By the door', className: 'left-[18%]' },
        { target: 'stand-corner', label: 'Far corner', className: 'left-[85%]' },
      ].map(({ target, label, className }) => {
        const here = inPosition && target === 'stand-door'
        return (
          <Spot
            key={target}
            aria-label={`Floor spot: ${label.toLowerCase()}${here ? ', you are standing here' : ''}`}
            onClick={() => onAct(target)}
            className={cn(
              'bottom-[9%] w-[13%] border-2 border-dashed border-stone-500 py-1',
              here && 'border-solid border-sky-700 bg-sky-100',
              className,
            )}
          >
            {here ? 'You' : label}
          </Spot>
        )
      })}

      <p className="absolute bottom-[2%] left-[4%] text-xs font-medium text-stone-900">
        In hand: {holding ? 'dry powder extinguisher' : 'nothing'}
      </p>
    </div>
  )
}

const ALARM_FIRST =
  'Raise the alarm first. If the extinguisher fails, help is already on the way.'
const CONDUCTS =
  'That one is water-based and the power strip is live: the jet carries the current back to you. Use dry powder.'
const POSITION_FIRST = 'Get into position first: stand where the door is behind you.'
const PULL_FIRST = 'Nothing will come out. Pull the pin first.'
const AIM_FIRST =
  'Aim before you squeeze. You only have about 10 seconds of powder: do not waste it.'
const ALREADY_AIMED = 'The nozzle is already on the base. Keep it there.'
const ITS_OUT = 'The fire is out. Back away to the door, facing it.'

export const fireExtinguisher: Module = {
  id: 'fire-extinguisher',
  title: 'Using a Fire Extinguisher',
  brief:
    'The power strip under the workbench has caught fire. It is small and the door is clear. Raise the alarm first.',
  fail: 'On a real fire that is the moment to get out and leave it to SCDF.',
  steps: [
    {
      target: 'alarm',
      done: 'Alarm raised and 995 called. The fire is smaller than a waste bin and your exit is clear, so you can fight it. Pick an extinguisher.',
    },
    {
      target: 'powder',
      done: 'Dry powder does not conduct: safe on live electrics. Now stand with the door behind you.',
    },
    {
      target: 'stand-door',
      done: 'Exit at your back, a couple of metres from the fire. Now P: pull the pin.',
    },
    { target: 'pin', done: 'Pin is out and the lever is unlocked. Now A: aim.' },
    {
      target: 'base',
      done: 'Nozzle is on the base of the fire, where the fuel is. Now S: squeeze the lever.',
    },
    {
      target: 'lever',
      done: 'Powder is flowing. A small extinguisher is empty in about 10 seconds. Now S: sweep.',
    },
    {
      target: 'sweep',
      done: 'Side to side across the base, and the flames are out. Do not turn your back on it: back away to the door.',
    },
    {
      target: 'back-away',
      done: 'You backed out facing it, in case it flares up again. Job done! Get the extinguisher replaced. And if a fire ever does not go out: leave, close the door, wait for SCDF.',
    },
  ],
  mistakes: {
    '0:powder': ALARM_FIRST,
    '0:water': ALARM_FIRST,
    '0:foam': ALARM_FIRST,
    '0:stand-door': ALARM_FIRST,
    '0:back-away': 'Nobody else knows yet. Raise the alarm on your way.',
    '1:stand-door': 'You have nothing to fight it with. Pick an extinguisher first.',
    '2:pin': POSITION_FIRST,
    '2:lever': POSITION_FIRST,
    '2:sweep': POSITION_FIRST,
    '3:lever': 'The lever will not move: the pin locks it. Pull the pin first.',
    '3:base': PULL_FIRST,
    '3:flames': PULL_FIRST,
    '3:sweep': PULL_FIRST,
    '4:lever': AIM_FIRST,
    '4:sweep': AIM_FIRST,
    '5:base': ALREADY_AIMED,
    '5:sweep': 'Nothing is coming out yet. Squeeze the lever.',
    '6:base': ALREADY_AIMED,
    '7:base': ITS_OUT,
    '7:lever': ITS_OUT,
    '7:sweep': ITS_OUT,
    water: CONDUCTS,
    foam: CONDUCTS,
    'stand-corner': 'From there the fire is between you and the only exit. Keep the door behind you.',
    flames:
      'Not the flames: the powder passes straight through them and the fuel keeps burning. Aim at the base.',
    base: 'You have nothing to aim yet.',
    alarm: 'The alarm is already ringing.',
    'stand-door': 'You are already in position.',
    pin: 'The pin is already out.',
    lever: 'You are already squeezing. Keep it squeezed and sweep.',
    'back-away':
      'Getting out is always the right call on a real fire. This one is small and your exit is clear, so practise putting it out.',
  },
  Scene,
}
