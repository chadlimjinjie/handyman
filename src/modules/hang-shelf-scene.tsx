import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { MathUtils } from 'three'
import type { Group, Mesh, MeshBasicMaterial, Object3D, Vector3 } from 'three'
import {
  BRASS,
  Box,
  DARK,
  Hit,
  Label,
  Rod,
  STEEL,
  Spark,
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
import { shelfPose, slipEffect, type Pose } from './hang-shelf-pose'

const { clamp, lerp, smoothstep } = MathUtils

// World: metres, x right, y up, the wall is the plane z = 0 facing the camera. It runs X0..X1
// and Y0..Y1; the tools are on two shelves to the right of it.
const CAM = v3(0.05, 1.62, 5.1)
const LOOK = v3(0.05, 1.02, 0)
const X0 = -2.2
const X1 = 1
const Y0 = 0.12
const Y1 = 2.4
const WIDE = X1 - X0
const TALL = Y1 - Y0
const SOCKET = [0.55, 0.35] as const
const SWITCH = [-1.7, 1.2] as const
// buried cables as [x, from y]: each runs straight up to the ceiling from its fitting
const CABLES = [SWITCH, SOCKET]

// Where the shelf could go: the two screw holes of each candidate.
const SPOTS = {
  'spot-switch': [v3(-1.7, 1.9, 0), v3(-1.2, 1.9, 0)],
  'spot-clear': [v3(-0.75, 1.5, 0), v3(-0.25, 1.5, 0)],
  'spot-socket': [v3(0.05, 1.1, 0), v3(0.55, 1.1, 0)],
}
const HOLES = SPOTS['spot-clear']
const MID = v3(0, 0, 0).addVectors(HOLES[0], HOLES[1]).multiplyScalar(0.5)

const SLOTS = [1.25, 1.55, 1.85, 2.15]
const SHELVES = [1.45, 0.85]
const home = (shelf: number, slot: number) => v3(SLOTS[slot], SHELVES[shelf], 0.14)
const HOME = {
  detector: home(0, 0),
  goggles: home(0, 1),
  drill: home(0, 2),
  plugs: home(0, 3),
  'bit-masonry': home(1, 0),
  'bit-wood': home(1, 1),
  'bit-10mm': home(1, 2),
  brackets: home(1, 3),
}
const NAMES = ['Detector', 'Goggles', 'Drill', 'Plugs', 'Masonry 6', 'Wood 6', 'Masonry 10', 'Brackets']

// the goggles leave the shelf for the learner's face, just under the camera
const WORN = v3(0.05, 1.5, 4.5)
// the drill's grip hangs this far below its chuck, and its bit ends this far in front of it
const GRIP = 0.17
const TIP = 0.29
// a bracket's arm is this far above its screw hole
const ARM = 0.044
const BRACKET_REST = [-0.05, 0.05].map((x) => v3(HOME.brackets.x + x, HOME.brackets.y + 0.16, 0.14))
const BOARD_REST = v3(-0.5, 0.0125, 1)
const BOARD_ON = v3(MID.x, MID.y + ARM + 0.0125, 0.11)

const SECONDS: Partial<Record<keyof Pose, number>> = {
  scanned: 3,
  marked: 1.2,
  gogglesOn: 1.2,
  bitIn: 0.8,
  drilled: 4,
  plugged: 1.6,
  bracketsOn: 2.6,
  shelfOn: 1.6,
}

const progress = (v: number, a: number, b: number) => clamp((v - a) / (b - a), 0, 1)

// A tool leaves its place for `to` and comes back as `w` goes 0, 1, 0, swinging out from the wall.
function send(tool: Object3D, from: Vector3, to: Vector3, w: number) {
  tool.position.lerpVectors(from, to, w)
  tool.position.z += Math.sin(w * Math.PI) * 0.3
}

const skin = (o: Object3D) => (o as Mesh).material as MeshBasicMaterial
const to = v3(0, 0, 0)

// a drill bit standing on its shank
function Bit({ r, color, tip }: { r: number; color: string; tip: number }) {
  return (
    <>
      <Rod r={r} len={0.2} color={color} metal position={[0, 0.1, 0]} />
      <Rod r={r * tip} top={0.002} len={0.03} color={color} metal position={[0, 0.215, 0]} />
      <Hit size={[0.22, 0.3, 0.22]} position={[0, 0.1, 0]} />
    </>
  )
}

function Scene({ step, slip, mistakes, onAct, reduced }: SceneProps) {
  const cables = useRef<Group>(null)
  const decoys = useRef<(Group | null)[]>([])
  const line = useRef<Mesh>(null)
  const chuckBit = useRef<Mesh>(null)
  const holes = useRef<Group>(null)
  const plugs = useRef<Group>(null)
  const brackets = useRef<(Group | null)[]>([])
  const board = useRef<Group>(null)
  const cloud = useRef<Group>(null)
  const scratch = useRef<Mesh>(null)
  const ghost = useRef<Mesh>(null)
  const tools = useRef<Partial<Record<keyof typeof HOME, Group | null>>>({})
  const tool = (name: keyof typeof HOME) => (g: Group | null) => {
    tools.current[name] = g
  }

  const eased = useEased(shelfPose, step, reduced, SECONDS)
  const fx = useSlip({ slip, mistakes, reduced }, slip ? slipEffect(step, slip) : '', 0.02)

  useFrame(({ camera }) => {
    const c = eased.current
    const f = fx.current
    const it = tools.current as Record<keyof typeof HOME, Group>

    // The detector snakes across the wall; each cable shows up as it passes over.
    const sweep = progress(c.scanned, 0.2, 0.8)
    to.set(lerp(X0 + 0.2, X1 - 0.2, sweep), 1.3 + Math.sin(sweep * Math.PI * 2) * 0.5, 0.05)
    send(it.detector, HOME.detector, to, visit(c.scanned, 0, 0.2, 0.8, 1))
    for (const cable of cables.current!.children) {
      skin(cable).opacity = smoothstep(to.x, cable.position.x - 0.1, cable.position.x + 0.1) * 0.4
    }

    // marking rubs out the other candidates and rules a level line between the two crosses
    const marked = smoothstep(c.marked, 0, 1)
    for (const decoy of decoys.current) decoy?.scale.setScalar(Math.max(0.001, 1 - marked))
    line.current!.scale.x = Math.max(0.001, marked)

    it.goggles.position.lerpVectors(HOME.goggles, WORN, smoothstep(c.gogglesOn, 0, 1))
    it.goggles.scale.setScalar(Math.max(0.001, 1 - smoothstep(c.gogglesOn, 0.8, 1)))

    it['bit-masonry'].scale.setScalar(Math.max(0.001, 1 - c.bitIn))
    chuckBit.current!.scale.setScalar(Math.max(0.001, c.bitIn))

    // The drill turns to face the wall, sinks the bit into one mark, then the other.
    const u = progress(c.drilled, 0.15, 0.85)
    const out = visit(c.drilled, 0, 0.15, 0.85, 1)
    const bite = Math.sin(clamp(u < 0.5 ? u / 0.4 : (u - 0.6) / 0.4, 0, 1) * Math.PI)
    to.lerpVectors(HOLES[0], HOLES[1], smoothstep(u, 0.4, 0.6))
    to.set(to.x, to.y - GRIP, TIP - bite * 0.05)
    it.drill.position.lerpVectors(HOME.drill, to, out)
    it.drill.rotation.y = (1 - out) * (Math.PI / 2)
    holes.current!.children.forEach((hole, j) => {
      hole.visible = u > (j ? 0.8 : 0.2)
    })

    plugs.current!.children.forEach((plug, j) => {
      plug.scale.setScalar(Math.max(0.001, smoothstep(c.plugged, j * 0.4, 0.6 + j * 0.4)))
    })
    brackets.current.forEach((bracket, j) => {
      const w = smoothstep(c.bracketsOn, j * 0.4, 0.6 + j * 0.4)
      bracket!.position.lerpVectors(BRACKET_REST[j], HOLES[j], w)
      bracket!.position.z += 0.004 + Math.sin(w * Math.PI) * 0.3
    })
    const up = smoothstep(c.shelfOn, 0, 1)
    board.current!.position.lerpVectors(BOARD_REST, BOARD_ON, up)
    board.current!.position.z += Math.sin(up * Math.PI) * 0.3

    // what a slip does: grit in the face, a scratch across the wall, a shelf that will not stay
    const k = f.k
    const fade = Math.sin(Math.PI * k)
    cloud.current!.visible = f.kind === 'dust' && k > 0
    cloud.current!.position.z = lerp(0.1, 2.5, 1 - k)
    cloud.current!.scale.setScalar(0.5 + (1 - k) * 3)
    for (const puff of cloud.current!.children) skin(puff).opacity = fade * 0.6
    scratch.current!.visible = f.kind === 'skate' && k > 0
    skin(scratch.current!).opacity = fade
    const sag = f.kind === 'sag' ? 1 - k : 0
    ghost.current!.visible = (f.kind === 'tilt' || f.kind === 'sag') && k > 0
    ghost.current!.rotation.set(sag * 1.2, 0, f.kind === 'tilt' ? 0.2 : 0)
    ghost.current!.position.y = BOARD_ON.y - sag * sag * 0.6
    skin(ghost.current!).opacity = fade * 0.8

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

      {/* floor, the wall with its skirting, and the panel the tool shelves are on */}
      <Box size={[5.6, 0.04, 3.4]} color="#a8a29e" position={[0, -0.02, 1.5]} />
      <Box size={[WIDE, TALL, 0.04]} color="#e7e5e4" position={[(X0 + X1) / 2, (Y0 + Y1) / 2, -0.02]} />
      <Box size={[WIDE, 0.5, 0.04]} color="#fafaf9" position={[(X0 + X1) / 2, Y1 + 0.25, -0.02]} />
      <Box size={[WIDE, Y0, 0.06]} color="#fafaf9" position={[(X0 + X1) / 2, Y0 / 2, -0.01]} />
      <Box size={[0.36, 2.9, 0.04]} color="#d6d3d1" position={[X0 - 0.18, 1.45, -0.02]} />
      <Box size={[1.6, 2.9, 0.08]} color="#d6d3d1" position={[X1 + 0.8, 1.45, 0]} />

      {/* light switch and socket: the only clues to what is buried */}
      <Box size={[0.17, 0.17, 0.02]} color="#fafaf9" position={[SWITCH[0], SWITCH[1], 0.01]} />
      <Box size={[0.05, 0.08, 0.02]} color="#d6d3d1" position={[SWITCH[0], SWITCH[1], 0.022]} />
      <Box size={[0.2, 0.2, 0.02]} color="#fafaf9" position={[SOCKET[0], SOCKET[1], 0.01]} />
      {[
        [0, 0.045],
        [-0.04, -0.03],
        [0.04, -0.03],
      ].map(([x, y]) => (
        <Box key={x} size={[0.02, 0.04, 0.004]} color={DARK} position={[SOCKET[0] + x, SOCKET[1] + y, 0.021]} />
      ))}
      <group ref={cables}>
        {CABLES.map(([x, y]) => (
          <mesh key={x} position={[x, (y + Y1) / 2, 0.004]}>
            <planeGeometry args={[0.16, Y1 - y]} />
            <meshBasicMaterial color="#dc2626" transparent opacity={0} depthWrite={false} />
          </mesh>
        ))}
      </group>

      {/* candidate spots: two pencil crosses each */}
      {Object.entries(SPOTS).map(([name, pair], i) => (
        <Target
          key={name}
          target={name}
          ref={(g: Group | null) => {
            decoys.current[i] = pair === HOLES ? null : g
          }}
          position={[(pair[0].x + pair[1].x) / 2, pair[0].y, 0.006]}
        >
          {[-0.25, 0.25].map((x) => (
            <group key={x} position={[x, 0, 0]}>
              {[-1, 1].map((s) => (
                <Box key={s} size={[0.1, 0.014, 0.002]} color={DARK} rotation={[0, 0, (s * Math.PI) / 4]} />
              ))}
            </group>
          ))}
          <Hit size={[0.75, 0.3, 0.06]} />
        </Target>
      ))}
      <mesh ref={line} position={[MID.x, MID.y, 0.005]} scale={[0.001, 1, 1]}>
        <boxGeometry args={[0.5, 0.008, 0.002]} />
        <meshBasicMaterial color="#78716c" />
      </mesh>

      {/* the holes and the plugs that go in them */}
      <group ref={holes}>
        {HOLES.map((h) => (
          <Rod key={h.x} visible={false} r={0.016} len={0.004} color={DARK} position={[h.x, h.y, 0.008]} rotation={[Math.PI / 2, 0, 0]} />
        ))}
      </group>
      <group ref={plugs}>
        {HOLES.map((h) => (
          <Rod key={h.x} r={0.022} len={0.006} color="#dc2626" position={[h.x, h.y, 0.01]} rotation={[Math.PI / 2, 0, 0]} scale={0.001} />
        ))}
      </group>

      {/* shelves of tools */}
      {SHELVES.map((y) => (
        <Box key={y} size={[1.24, 0.03, 0.3]} color={WOOD} position={[1.7, y - 0.015, 0.19]} />
      ))}
      {NAMES.map((text, i) => (
        <Label key={text} text={text} h={0.045} position={[SLOTS[i % 4], SHELVES[i >> 2] - 0.07, 0.342]} />
      ))}
      <Target ref={tool('detector')} target="detector">
        <Box size={[0.1, 0.18, 0.03]} color="#facc15" position={[0, 0.09, 0]} />
        <Box size={[0.06, 0.04, 0.004]} color={DARK} position={[0, 0.13, 0.016]} />
        <Hit size={[0.24, 0.3, 0.22]} position={[0, 0.1, 0]} />
      </Target>
      <Target ref={tool('goggles')} target="goggles">
        <Box size={[0.2, 0.012, 0.1]} color={DARK} position={[0, 0.04, -0.05]} />
        <mesh position={[0, 0.04, 0]}>
          <boxGeometry args={[0.2, 0.07, 0.02]} />
          <meshStandardMaterial color="#7dd3fc" transparent opacity={0.6} />
        </mesh>
        <Hit size={[0.26, 0.3, 0.22]} position={[0, 0.1, 0]} />
      </Target>
      <Target ref={tool('drill')} target="drill">
        {/* drawn pointing at the wall; it lies side-on while it is on the shelf */}
        <group position={[0, GRIP, 0]}>
          <Box size={[0.07, 0.08, 0.2]} color="#f59e0b" />
          <Box size={[0.05, 0.14, 0.05]} color={DARK} position={[0, -0.1, 0.06]} />
          <Rod r={0.022} len={0.05} color={DARK} position={[0, 0, -0.125]} rotation={[Math.PI / 2, 0, 0]} />
          <Rod ref={chuckBit} r={0.008} len={0.14} color={STEEL} metal position={[0, 0, -0.22]} rotation={[Math.PI / 2, 0, 0]} scale={0.001} />
          <Hit size={[0.3, 0.3, 0.3]} position={[0, -0.05, 0]} />
        </group>
      </Target>
      <Target target="plugs" position={HOME.plugs.toArray()}>
        <Box size={[0.16, 0.11, 0.05]} color="#fafaf9" position={[0, 0.055, 0]} />
        {[-0.045, 0, 0.045].map((x) => (
          <Rod key={x} r={0.012} len={0.08} color="#dc2626" position={[x, 0.055, 0.03]} />
        ))}
        <Hit size={[0.24, 0.3, 0.22]} position={[0, 0.1, 0]} />
      </Target>
      <Target ref={tool('bit-masonry')} target="bit-masonry" position={HOME['bit-masonry'].toArray()}>
        <Bit r={0.012} color={STEEL} tip={1.5} />
      </Target>
      <Target target="bit-wood" position={HOME['bit-wood'].toArray()}>
        <Bit r={0.012} color={BRASS} tip={0.5} />
      </Target>
      <Target target="bit-10mm" position={HOME['bit-10mm'].toArray()}>
        <Bit r={0.02} color={STEEL} tip={1.5} />
      </Target>
      {HOLES.map((h, j) => (
        <Target
          key={h.x}
          target="brackets"
          ref={(g: Group | null) => {
            brackets.current[j] = g
          }}
        >
          <Box size={[0.035, 0.2, 0.008]} color={DARK} metal position={[0, -0.06, 0]} />
          <Box size={[0.035, 0.008, 0.2]} color={DARK} metal position={[0, ARM - 0.004, 0.096]} />
          <Hit size={[0.12, 0.26, 0.22]} position={[0, -0.04, 0.09]} />
        </Target>
      ))}

      <Target ref={board} target="shelf">
        <Box size={[0.8, 0.025, 0.22]} color={WOOD} />
      </Target>

      {/* slips: grit off the bit, a wood bit's skid mark, a shelf put up wrong */}
      <group ref={cloud} visible={false} position={[MID.x, MID.y, 0.1]}>
        {[-0.07, 0.02, 0.09].map((x) => (
          <mesh key={x} position={[x, Math.abs(x) - 0.04, 0]}>
            <sphereGeometry args={[0.07]} />
            <meshBasicMaterial color="#a8a29e" transparent opacity={0} depthWrite={false} />
          </mesh>
        ))}
      </group>
      <mesh ref={scratch} visible={false} position={[HOLES[0].x + 0.2, HOLES[0].y - 0.1, 0.02]} rotation={[0, 0, 0.5]}>
        <planeGeometry args={[0.55, 0.025]} />
        <meshBasicMaterial color="#44403c" transparent opacity={0} />
      </mesh>
      <mesh ref={ghost} visible={false} position={[BOARD_ON.x, BOARD_ON.y, BOARD_ON.z]}>
        <boxGeometry args={[0.8, 0.025, 0.22]} />
        <meshBasicMaterial color={WOOD} transparent opacity={0} />
      </mesh>
      <Spark fx={fx} size={6} />
    </Stage>
  )
}

export default function HangShelfScene(props: SceneProps) {
  return (
    <StageCanvas reduced={props.reduced} position={CAM} far={30}>
      <Scene {...props} />
    </StageCanvas>
  )
}
