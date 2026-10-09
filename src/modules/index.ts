import type { Module } from '@/game/engine'
import { fireExtinguisher } from './fire-extinguisher'
import { lightBulb } from './light-bulb'
import { paintWall } from './paint-wall'
import { powerPlug } from './power-plug'
import { unclogSink } from './unclog-sink'

export const modules: Module[] = [lightBulb, unclogSink, paintWall, fireExtinguisher, powerPlug]
