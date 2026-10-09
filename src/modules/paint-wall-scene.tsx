import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { Color, DoubleSide, MathUtils } from 'three'
import type { Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D, Vector3 } from 'three'
import {
  Box,
  DARK,
  Hit,
  Label,
  Rod,
  STEEL,
  Stage,
  StageCanvas,
  Target,
  WOOD,
  useEased,
  useSlip,
  v3,
  visit,
  type SceneProps,
} from '@/scene/stage'
import { paintPose, slipEffect, type Pose } from './paint-wall-pose'

const { clamp, lerp, smoothstep } = MathUtils

// World: metres, x right, y up, the wall is the plane z = 0 facing the camera. The stretch
// being painted runs X0..X1 and Y0..Y1; the tools are on two shelves to the right of it.
const CAM = v3(0.05, 1.62, 5.1)
const LOOK = v3(0.05, 1.02, 0)
const X0 = -2.2
const X1 = 1
const Y0 = 0.12
const Y1 = 2.4
const WIDE = X1 - X0
const TALL = Y1 - Y0
// the roller lays the wall in this many vertical strips
const STRIPS = 16
const HOLES = [v3(-1.6, 1.9, 0), v3(-0.6, 0.8, 0), v3(0.3, 1.7, 0)]
const SWITCH = [0.62, 1.2] as const
const EDGES = [v3(X0, Y0, 0), v3(X0, Y1, 0), v3(X1, Y1, 0), v3(X1, Y0, 0), v3(X0, Y0, 0)]

const SLOTS = [1.3, 1.57, 1.84, 2.11]
const SHELVES = [1.45, 0.85]
const home = (shelf: number, slot: number) => v3(SLOTS[slot], SHELVES[shelf], 0.14)
const HOME = {
  filler: home(0, 0),
  sandpaper: home(0, 1),
  cloth: home(0, 2),
  tape: home(0, 3),
  primer: home(1, 0),
  stick: home(1, 1),
  brush: home(1, 2),
  roller: home(1, 3),
}
const NAMES = ['Filler', 'Sand', 'Cloth', 'Tape', 'Primer', 'Stir', 'Brush', 'Roller']

const CAN = v3(-0.9, 0.13, 0.8)
const TRAY = v3(0.05, 0.03, 0.8)
const WATER = v3(0.78, 0, 0.8)
const POUR_AT = v3(TRAY.x - 0.34, 0.52, TRAY.z)
const IN_TRAY = v3(TRAY.x, 0.1, TRAY.z)
const IN_WATER = v3(WATER.x, 0.2, WATER.z)

const SECONDS: Partial<Record<keyof Pose, number>> = {
  sheetDown: 1.3,
  filled: 2.6,
  sanded: 2.6,
  wiped: 2.2,
  taped: 2,
  primed: 2.6,
  stirred: 2.2,
  trayFull: 2.6,
  cutIn: 3.4,
  rolled: 4,
  laidOff: 3.4,
  dry: 2.4,
  reloaded: 1.2,
  coat2: 4,
  washed: 2.8,
}

const OLD = '#d6d3d1'
const COAT1 = new Color('#99f6e4')
const COAT2 = new Color('#2dd4bf')
const SETTLED = new Color('#134e4a')
const WHITE = new Color('#fafaf9')
const RINSE = new Color('#7dd3fc')

const progress = (v: number, a: number, b: number) => clamp((v - a) / (b - a), 0, 1)
// the moment a tool working its way along the three holes reaches hole `j`
const reached = (v: number, j: number) => smoothstep(v, 0.17 + j * 0.3, 0.27 + j * 0.3)

// a point `u` of the way along a run of straight legs
function along(points: Vector3[], u: number, out: Vector3) {
  const f = clamp(u, 0, 1) * (points.length - 1)
  const i = Math.min(points.length - 2, Math.floor(f))
  return out.lerpVectors(points[i], points[i + 1], f - i)
}

// A tool leaves its place for `to` and comes back as `w` goes 0, 1, 0, swinging out from the wall.
function send(tool: Object3D, from: Vector3, to: Vector3, w: number) {
  tool.position.lerpVectors(from, to, w)
  tool.position.z += Math.sin(w * Math.PI) * 0.3
}

const skin = (o: Object3D) => (o as Mesh).material as MeshStandardMaterial & MeshBasicMaterial
const to = v3(0, 0, 0)
const rest = v3(0, 0, 0)
const paint = new Color()

function Scene({ step, slip, mistakes, onAct, reduced }: SceneProps) {
  const sheet = useRef<Mesh>(null)
  const holes = useRef<Group>(null)
  const blobs = useRef<Group>(null)
  const patches = useRef<Group>(null)
  const dust = useRef<Mesh>(null)
  const tapeRun = useRef<Mesh>(null)
  const tapeFrame = useRef<Group>(null)
  const bands = useRef<Group>(null)
  const strips = useRef<Group>(null)
  const minute = useRef<Group>(null)
  const can = useRef<Group>(null)
  const canTop = useRef<Mesh>(null)
  const pour = useRef<Mesh>(null)
  const trayPaint = useRef<Mesh>(null)
  const water = useRef<Mesh>(null)
  const sleeve = useRef<Mesh>(null)
  const stripes = useRef<Group>(null)
  const lap = useRef<Mesh>(null)
  const drips = useRef<Group>(null)
  const tools = useRef<Partial<Record<keyof typeof HOME, Group | null>>>({})
  const tool = (name: keyof typeof HOME) => (g: Group | null) => {
    tools.current[name] = g
  }

  const eased = useEased(paintPose, step, reduced, SECONDS)
  const fx = useSlip({ slip, mistakes, reduced }, slip ? slipEffect(step, slip) : '', 0.02)

  useFrame(({ camera, clock }) => {
    const c = eased.current
    const f = fx.current
    const t = clock.elapsedTime
    const it = tools.current as Record<keyof typeof HOME, Group>

    const down = smoothstep(c.sheetDown, 0, 1)
    sheet.current!.scale.set(lerp(0.4, 3.6, down), lerp(0.12, 0.012, down), lerp(0.3, 1.9, down))
    sheet.current!.position.set(lerp(-1.7, -0.55, down), lerp(0.06, 0.006, down), lerp(0.8, 0.98, down))

    // Filler goes in proud, is sanded flush, and is then sealed with primer, one hole at a time.
    send(it.filler, HOME.filler, along(HOLES, progress(c.filled, 0.2, 0.8), to), visit(c.filled, 0, 0.2, 0.8, 1))
    along(HOLES, progress(c.sanded, 0.2, 0.8), to)
    to.setX(to.x + Math.cos(t * 20) * 0.05).setY(to.y + Math.sin(t * 20) * 0.05)
    send(it.sandpaper, HOME.sandpaper, to, visit(c.sanded, 0, 0.2, 0.8, 1))
    send(it.primer, HOME.primer, along(HOLES, progress(c.primed, 0.2, 0.8), to), visit(c.primed, 0, 0.2, 0.8, 1))
    holes.current!.children.forEach((hole, j) => {
      hole.visible = reached(c.filled, j) < 0.5
    })
    blobs.current!.children.forEach((blob, j) => {
      const r = Math.max(0.001, reached(c.filled, j))
      blob.scale.set(r, r, lerp(1, 0.12, reached(c.sanded, j)))
    })
    patches.current!.children.forEach((patch, j) => {
      patch.scale.setScalar(Math.max(0.001, reached(c.primed, j)))
    })

    // sanding leaves the wall dusty until the cloth has been over it
    const wipe = progress(c.wiped, 0.2, 0.8)
    to.set(lerp(X0 + 0.2, X1 - 0.2, wipe), 1.25 + Math.sin(wipe * Math.PI * 3) * 0.8, 0)
    send(it.cloth, HOME.cloth, to, visit(c.wiped, 0, 0.2, 0.8, 1))
    skin(dust.current!).opacity = smoothstep(c.sanded, 0.2, 1) * (1 - smoothstep(c.wiped, 0.2, 0.9)) * 0.4

    // The tape runs along the skirting and round the switch; peeling it is the same in reverse.
    const run = progress(c.taped, 0.2, 0.8)
    to.set(X0 + run * WIDE, Y0, 0)
    send(it.tape, HOME.tape, to, visit(c.taped, 0, 0.2, 0.8, 1))
    tapeRun.current!.scale.x = Math.max(0.001, run * WIDE)
    tapeRun.current!.position.x = X0 + (run * WIDE) / 2
    tapeFrame.current!.scale.setScalar(Math.max(0.001, smoothstep(c.taped, 0.75, 0.95)))

    // Stirring brings the settled pigment up; then some is poured into the tray.
    const tip = visit(c.trayFull, 0.05, 0.3, 0.7, 0.95)
    can.current!.position.lerpVectors(CAN, POUR_AT, tip)
    can.current!.rotation.z = -tip * 1.35
    skin(canTop.current!).color.lerpColors(SETTLED, COAT2, smoothstep(c.stirred, 0.2, 0.9))
    pour.current!.visible = tip > 0.9
    trayPaint.current!.scale.z = Math.max(0.001, smoothstep(c.trayFull, 0.3, 0.8))
    trayPaint.current!.visible = c.trayFull > 0.3
    to.set(CAN.x + Math.cos(t * 9) * 0.05, CAN.y + 0.06, CAN.z + Math.sin(t * 9) * 0.05)
    send(it.stick, HOME.stick, to, visit(c.stirred, 0, 0.2, 0.8, 1))

    // Cutting in: the brush goes round the edges, leaving a band the roller cannot reach.
    const round = progress(c.cutIn, 0.12, 0.9)
    const rinse = visit(c.washed, 0, 0.2, 0.4, 0.6)
    if (rinse > 0) send(it.brush, HOME.brush, IN_WATER, rinse)
    else send(it.brush, HOME.brush, along(EDGES, round, to), visit(c.cutIn, 0, 0.12, 0.9, 1))
    const [left, top, right, bottom] = bands.current!.children
    const side = (band: Object3D, u: number, y: number, x: number, grow: number) => {
      if (y) {
        band.scale.y = Math.max(0.001, u * TALL)
        band.position.y = y + (grow * u * TALL) / 2
      } else {
        band.scale.x = Math.max(0.001, u * WIDE)
        band.position.x = x + (grow * u * WIDE) / 2
      }
    }
    side(left, progress(round, 0, 0.25), Y0, 0, 1)
    side(top, progress(round, 0.25, 0.5), 0, X0, 1)
    side(right, progress(round, 0.5, 0.75), Y1, 0, -1)
    side(bottom, progress(round, 0.75, 1), 0, X1, -1)

    // The roller lives in the tray once it is out. Coat one goes on in a W, is laid off top to
    // bottom, and coat two goes over it once it is dry.
    const first = progress(c.rolled, 0.15, 0.85)
    const second = progress(c.coat2, 0.15, 0.85)
    const even = smoothstep(c.laidOff, 0.15, 0.85)
    const wet = smoothstep(c.rolled, 0, 0.3) * (1 - c.dry)
    rest.lerpVectors(HOME.roller, IN_TRAY, smoothstep(c.rollerOut, 0, 1))
    // working it up and down the ramp to load it
    const ramp =
      Math.sin(c.rollerOut * Math.PI * 4) * (1 - c.rollerOut) +
      Math.sin(c.reloaded * Math.PI * 4) * Math.sin(c.reloaded * Math.PI)
    rest.setZ(rest.z + ramp * 0.1)
    const laying = c.laidOff > 0 && c.laidOff < 1
    const pass = laying ? c.laidOff : c.coat2 > 0 && c.coat2 < 1 ? c.coat2 : c.rolled
    const u = progress(pass, 0.15, 0.85)
    if (laying) to.set(X0 + 0.1 + (Math.floor(u * 8) / 7) * (WIDE - 0.2), Y1 - 0.15 - ((u * 8) % 1) * (TALL - 0.3), 0)
    else to.set(X0 + u * WIDE, 1.26 + Math.sin(u * Math.PI * 7) * 0.95, 0)
    const scrub = visit(c.washed, 0.4, 0.6, 0.8, 1)
    if (scrub > 0) send(it.roller, rest, IN_WATER, scrub)
    else send(it.roller, rest, to, pass < 1 ? visit(pass, 0, 0.15, 0.85, 1) : 0)
    skin(sleeve.current!)
      .color.lerpColors(WHITE, COAT2, smoothstep(c.rollerOut, 0.5, 1))
      .lerp(WHITE, smoothstep(c.washed, 0.6, 0.9))

    paint.copy(COAT1).lerp(COAT2, smoothstep(c.coat2, 0.1, 0.9)).multiplyScalar(1 - 0.12 * wet)
    for (const band of bands.current!.children) skin(band).color.copy(paint)
    strips.current!.children.forEach((strip, i) => {
      const cover = clamp(first * STRIPS - i, 0, 1)
      const h = cover * TALL
      strip.visible = cover > 0.001
      // the W leaves gaps and thin patches; laying off closes them
      strip.scale.set(lerp(0.6, 1.01, even), Math.max(0.001, h), 1)
      strip.position.y = i % 2 ? Y1 - h / 2 : Y0 + h / 2
      const mat = skin(strip)
      mat.color.copy(COAT1).lerp(COAT2, clamp(second * STRIPS - i, 0, 1)).multiplyScalar(1 - 0.12 * wet)
      mat.roughness = lerp(0.9, 0.3, wet)
    })

    // the wait: hours go by on the clock while the first coat dries
    minute.current!.rotation.z = -c.dry * Math.PI * 6.6
    skin(water.current!).color.lerpColors(RINSE, COAT1, smoothstep(c.washed, 0.2, 0.9))

    // what a slip leaves on the wall, or on the floor
    const k = f.k
    const fade = Math.sin(Math.PI * k)
    stripes.current!.visible = (f.kind === 'streak' || f.kind === 'patchy') && k > 0
    for (const stripe of stripes.current!.children) {
      stripe.scale.x = f.kind === 'patchy' ? 0.3 : 1
      skin(stripe).opacity = fade
    }
    lap.current!.visible = f.kind === 'lap' && k > 0
    skin(lap.current!).opacity = fade * 0.8
    drips.current!.visible = f.kind === 'drip' && k > 0
    drips.current!.children.forEach((drop, i) => {
      const fall = clamp((1 - k) * 2.2 - i * 0.15, 0, 1)
      drop.position.y = lerp(1.3, 0.03, fall * fall)
      const flat = smoothstep(fall, 0.9, 1)
      drop.scale.set(1 + flat * 2, 1 - flat * 0.8, 1 + flat * 2)
    })

    camera.position.copy(CAM)
    camera.lookAt(LOOK)
  })

  return (
    <Stage value={onAct}>
      <ambientLight intensity={1.2} />
      <directionalLight
        castShadow
        intensity={1.5}
        position={[-2, 4.5, 5]}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-3.5}
        shadow-camera-right={3.5}
        shadow-camera-top={3.5}
        shadow-camera-bottom={-1.5}
        shadow-bias={-0.002}
      />

      {/* carpet, the wall being painted with its skirting, and the panel the shelves are on */}
      <Box size={[5.6, 0.04, 3.4]} color="#a8a29e" position={[0, -0.02, 1.5]} />
      <Target still target="wall" position={[(X0 + X1) / 2, (Y0 + Y1) / 2, -0.02]}>
        <Box size={[WIDE, TALL, 0.04]} color={OLD} />
      </Target>
      <Box size={[WIDE, 0.5, 0.04]} color="#fafaf9" position={[(X0 + X1) / 2, Y1 + 0.25, -0.02]} />
      <Box size={[WIDE, Y0, 0.06]} color="#fafaf9" position={[(X0 + X1) / 2, Y0 / 2, -0.01]} />
      <Box size={[0.36, 2.9, 0.04]} color="#e7e5e4" position={[X0 - 0.18, 1.45, -0.02]} />
      <Box size={[1.6, 2.9, 0.08]} color="#e7e5e4" position={[X1 + 0.8, 1.45, 0]} />
      <Box size={[0.17, 0.17, 0.02]} color="#fafaf9" position={[SWITCH[0], SWITCH[1], 0.01]} />
      <Box size={[0.05, 0.08, 0.02]} color="#e7e5e4" position={[SWITCH[0], SWITCH[1], 0.022]} />

      {/* holes, the filler in them and the primed patches over it */}
      <group ref={holes}>
        {HOLES.map((h) => (
          <Rod key={h.x} r={0.022} len={0.004} color={DARK} position={[h.x, h.y, 0.002]} rotation={[Math.PI / 2, 0, 0]} />
        ))}
      </group>
      <group ref={blobs}>
        {HOLES.map((h) => (
          <group key={h.x} position={[h.x, h.y, 0.003]} scale={0.001}>
            <Rod r={0.075} len={0.03} color="#fafaf9" position={[0, 0, 0.015]} rotation={[Math.PI / 2, 0, 0]} />
          </group>
        ))}
      </group>
      <group ref={patches}>
        {HOLES.map((h) => (
          <mesh key={h.x} position={[h.x, h.y, 0.008]} scale={0.001}>
            <planeGeometry args={[0.24, 0.24]} />
            <meshStandardMaterial color="#f1f5f9" />
          </mesh>
        ))}
      </group>
      <mesh ref={dust} position={[(X0 + X1) / 2, (Y0 + Y1) / 2, 0.012]}>
        <planeGeometry args={[WIDE, TALL]} />
        <meshBasicMaterial color="#a8a29e" transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* paint: the cut-in bands round the edge, then the rolled strips */}
      <group ref={bands}>
        {[
          [X0 + 0.06, Y0, 0.12, 1],
          [X0, Y1 - 0.06, 1, 0.12],
          [X1 - 0.06, Y1, 0.12, 1],
          [X1, Y0 + 0.06, 1, 0.12],
        ].map(([x, y, w, h], i) => (
          <mesh key={i} position={[x, y, 0.014]} scale={[w === 1 ? 0.001 : 1, h === 1 ? 0.001 : 1, 1]}>
            <planeGeometry args={[w, h]} />
            <meshStandardMaterial />
          </mesh>
        ))}
      </group>
      <group ref={strips}>
        {Array.from({ length: STRIPS }, (_, i) => (
          <mesh key={i} visible={false} position={[X0 + ((i + 0.5) * WIDE) / STRIPS, Y0, 0.016]}>
            <planeGeometry args={[WIDE / STRIPS, 1]} />
            <meshStandardMaterial />
          </mesh>
        ))}
      </group>

      {/* masking tape: along the top of the skirting and round the switch */}
      <mesh ref={tapeRun} position={[X0, Y0 - 0.01, 0.024]} scale={[0.001, 1, 1]}>
        <boxGeometry args={[1, 0.06, 0.004]} />
        <meshStandardMaterial color="#3b82f6" />
      </mesh>
      <group ref={tapeFrame} position={[SWITCH[0], SWITCH[1], 0.024]} scale={0.001}>
        {[-0.1, 0.1].map((d) => (
          <Box key={d} size={[0.24, 0.04, 0.004]} color="#3b82f6" position={[0, d, 0]} />
        ))}
        {[-0.1, 0.1].map((d) => (
          <Box key={d} size={[0.04, 0.24, 0.004]} color="#3b82f6" position={[d, 0, 0]} />
        ))}
      </group>

      {/* shelves of tools */}
      {SHELVES.map((y) => (
        <Box key={y} size={[1.16, 0.03, 0.3]} color={WOOD} position={[1.705, y - 0.015, 0.19]} />
      ))}
      {NAMES.map((text, i) => (
        <Label key={text} text={text} h={0.06} position={[SLOTS[i % 4], SHELVES[i >> 2] - 0.075, 0.342]} />
      ))}
      <Target ref={tool('filler')} target="filler">
        <Rod r={0.07} len={0.1} color="#fafaf9" position={[0, 0.05, 0]} />
        <Rod r={0.073} len={0.025} color="#2563eb" position={[0, 0.11, 0]} />
        <Hit size={[0.24, 0.3, 0.22]} position={[0, 0.1, 0]} />
      </Target>
      <Target ref={tool('sandpaper')} target="sandpaper">
        <Box size={[0.15, 0.07, 0.09]} color="#b45309" position={[0, 0.035, 0]} />
        <Hit size={[0.24, 0.3, 0.22]} position={[0, 0.1, 0]} />
      </Target>
      <Target ref={tool('cloth')} target="cloth">
        <Box size={[0.17, 0.05, 0.13]} color="#7dd3fc" position={[0, 0.025, 0]} />
        <Hit size={[0.24, 0.3, 0.22]} position={[0, 0.1, 0]} />
      </Target>
      <Target ref={tool('tape')} target="tape">
        <mesh castShadow position={[0, 0.08, 0]}>
          <torusGeometry args={[0.055, 0.024, 10, 24]} />
          <meshStandardMaterial color="#3b82f6" />
        </mesh>
        <Hit size={[0.24, 0.3, 0.22]} position={[0, 0.1, 0]} />
      </Target>
      <Target ref={tool('primer')} target="primer">
        <Rod r={0.07} len={0.13} color="#e5e7eb" metal position={[0, 0.065, 0]} />
        <Rod r={0.072} len={0.05} color="#f8fafc" position={[0, 0.065, 0]} />
        <Hit size={[0.24, 0.3, 0.22]} position={[0, 0.1, 0]} />
      </Target>
      <Target ref={tool('stick')} target="stick">
        <Box size={[0.03, 0.34, 0.012]} color="#d6b48a" position={[0, 0.17, 0]} />
        <Hit size={[0.2, 0.38, 0.22]} position={[0, 0.17, 0]} />
      </Target>
      <Target ref={tool('brush')} target="brush">
        <Box size={[0.035, 0.17, 0.02]} color="#d6b48a" position={[0, 0.085, 0]} />
        <Box size={[0.09, 0.03, 0.026]} color={STEEL} metal position={[0, 0.18, 0]} />
        <Box size={[0.09, 0.08, 0.022]} color="#44403c" position={[0, 0.235, 0]} />
        <Hit size={[0.22, 0.34, 0.22]} position={[0, 0.15, 0]} />
      </Target>
      <Target ref={tool('roller')} target="roller">
        <Box size={[0.035, 0.15, 0.035]} color="#dc2626" position={[0, 0.075, 0]} />
        <Box size={[0.014, 0.12, 0.014]} color={STEEL} metal position={[0, 0.2, 0]} />
        <mesh ref={sleeve} castShadow position={[0, 0.27, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.045, 0.045, 0.26, 16]} />
          <meshStandardMaterial />
        </mesh>
        <Hit size={[0.3, 0.38, 0.22]} position={[0, 0.17, 0]} />
      </Target>

      <Target target="wait" position={[1.72, 2.2, 0.04]}>
        <Rod r={0.2} len={0.03} color={DARK} position={[0, 0, 0.015]} rotation={[Math.PI / 2, 0, 0]} />
        <Rod r={0.18} len={0.032} color="#fafaf9" position={[0, 0, 0.017]} rotation={[Math.PI / 2, 0, 0]} />
        <group ref={minute} position={[0, 0, 0.04]}>
          <Box size={[0.015, 0.15, 0.008]} color={DARK} position={[0, 0.07, 0]} />
        </group>
        <Box size={[0.02, 0.1, 0.008]} color={DARK} position={[0.035, 0.03, 0.04]} rotation={[0, 0, -0.9]} />
      </Target>

      {/* on the floor in front of the wall */}
      <Target still target="sheet">
        <mesh ref={sheet} receiveShadow>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#f5f5f4" />
        </mesh>
      </Target>
      <Target ref={can} target="can">
        <Rod r={0.11} len={0.26} color={STEEL} metal />
        <mesh ref={canTop} position={[0, 0.131, 0]}>
          <cylinderGeometry args={[0.1, 0.1, 0.004, 24]} />
          <meshStandardMaterial />
        </mesh>
      </Target>
      <mesh ref={pour} visible={false} position={[TRAY.x - 0.13, 0.27, TRAY.z]}>
        <cylinderGeometry args={[0.012, 0.012, 0.45, 8]} />
        <meshStandardMaterial color={COAT2} />
      </mesh>
      <Target target="tray" position={TRAY.toArray()}>
        <Box size={[0.42, 0.05, 0.5]} color="#44403c" />
        <mesh ref={trayPaint} visible={false} position={[0, 0.027, 0.06]}>
          <boxGeometry args={[0.36, 0.006, 0.34]} />
          <meshStandardMaterial color={COAT2} roughness={0.3} />
        </mesh>
        <Hit size={[0.5, 0.2, 0.56]} position={[0, 0.08, 0]} />
      </Target>
      <Target target="water" position={WATER.toArray()}>
        <mesh castShadow position={[0, 0.12, 0]}>
          <cylinderGeometry args={[0.15, 0.115, 0.24, 24, 1, true]} />
          <meshStandardMaterial color="#64748b" side={DoubleSide} />
        </mesh>
        <mesh ref={water} position={[0, 0.1, 0]}>
          <cylinderGeometry args={[0.135, 0.117, 0.18, 24]} />
          <meshStandardMaterial transparent opacity={0.85} />
        </mesh>
      </Target>

      {/* slips: streaks or tram lines, a lap mark, drips on the floor */}
      <group ref={stripes} visible={false} position={[(X0 + X1) / 2, 1.3, 0.03]}>
        {[-2, -1, 0, 1, 2].map((n) => (
          <mesh key={n} position={[n * 0.2, 0, 0]}>
            <planeGeometry args={[0.16, 1.1]} />
            <meshBasicMaterial color={n % 2 ? '#134e4a' : '#ccfbf1'} transparent opacity={0} />
          </mesh>
        ))}
      </group>
      <mesh ref={lap} visible={false} position={[(X0 + X1) / 2, 1.3, 0.03]}>
        <planeGeometry args={[1.8, 0.14]} />
        <meshBasicMaterial color="#0f766e" transparent opacity={0} />
      </mesh>
      <group ref={drips} visible={false} position={[(X0 + X1) / 2, 0, 0.3]}>
        {[-0.5, 0.1, 0.6].map((x) => (
          <mesh key={x} position={[x, 1.3, Math.abs(x) * 0.5]}>
            <sphereGeometry args={[0.04]} />
            <meshStandardMaterial color={COAT2} />
          </mesh>
        ))}
      </group>
    </Stage>
  )
}

export default function PaintWallScene(props: SceneProps) {
  return (
    <StageCanvas reduced={props.reduced} position={CAM} far={30}>
      <Scene {...props} />
    </StageCanvas>
  )
}
