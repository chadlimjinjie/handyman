import type { Module } from '@/game/engine'
import { fireExtinguisher } from './fire-extinguisher'
import { hangShelf } from './hang-shelf'
import { leakingTap } from './leaking-tap'
import { lightBulb } from './light-bulb'
import { paintWall } from './paint-wall'
import { powerPlug } from './power-plug'
import { unclogSink } from './unclog-sink'

export const modules: Module[] = [
  lightBulb,
  unclogSink,
  paintWall,
  fireExtinguisher,
  powerPlug,
  hangShelf,
  leakingTap,
]
