import { lazy } from 'react'
import type { Module } from '@/game/engine'
import { cn } from '@/lib/utils'
import { SceneFrame } from '@/scene/frame'

const FireExtinguisherScene = lazy(() => import('./fire-extinguisher-scene'))

const pass = [
  { letter: 'P', word: 'Pull', after: 3 },
  { letter: 'A', word: 'Aim', after: 4 },
  { letter: 'S', word: 'Squeeze', after: 5 },
  { letter: 'S', word: 'Sweep', after: 6 },
]

// Everything shown here is derived from `step` (index into `steps` below).
function Scene({ step, onAct, slip, mistakes }: Parameters<Module['Scene']>[0]) {
  const holding = step >= 2
  const pinOut = step >= 4
  const burning = step < 7

  const actions = [
    ['alarm', `Fire alarm call point${step >= 1 ? ': ringing' : ''}`],
    // the controls only exist once he has it in his hands
    ...(holding
      ? [
          ['pin', `Safety pin: ${pinOut ? 'pulled out' : 'in place'}`],
          ['lever', `Lever${step >= 6 ? ': squeezed' : pinOut ? '' : ': locked by the pin'}`],
          ['sweep', 'Sweep the nozzle side to side'],
        ]
      : [['powder', 'Dry powder extinguisher']]),
    ['water', 'Water extinguisher'],
    ['foam', 'Foam extinguisher'],
    ['stand-door', `Floor spot by the door${step >= 3 ? ': you are standing here' : ''}`],
    ['stand-corner', 'Floor spot in the far corner'],
    ...(burning ? [['flames', 'Flames']] : []),
    [
      'base',
      burning
        ? `Base of the fire: the burning power strip${step > 4 ? ', nozzle aimed here' : ''}`
        : 'Power strip: scorched, fire out',
    ],
    ['back-away', burning ? 'Door, the only exit: clear' : 'Door: back away to the exit'],
  ]

  return (
    <SceneFrame
      className="bg-orange-50"
      caption={
        <ol aria-label="PASS steps done" className="flex max-w-xs gap-1">
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
      }
      actions={actions}
      onAct={onAct}
    >
      <FireExtinguisherScene
        step={step}
        slip={slip}
        mistakes={mistakes}
        onAct={onAct}
        reduced={matchMedia('(prefers-reduced-motion: reduce)').matches}
      />
    </SceneFrame>
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
