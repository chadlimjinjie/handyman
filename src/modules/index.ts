import type { Module } from '@/game/engine'
import { lightBulb } from './light-bulb'
import { unclogSink } from './unclog-sink'

export const modules: Module[] = [lightBulb, unclogSink]
