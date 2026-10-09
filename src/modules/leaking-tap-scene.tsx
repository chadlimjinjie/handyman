import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { MathUtils } from 'three'
import type { Group, Mesh } from 'three'
import {
  BRASS,
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
import { slipEffect, tapPose, type Pose } from './leaking-tap-pose'

const { lerp, smoothstep } = MathUtils

// World: metres, x right, y up, z toward the camera. The cabinet under the counter is drawn
// with its doors and the front of the basin taken away. The drain is at x = DRAIN.
const CAM = v3(0.1, 1.12, 1.8)
const LOOK = v3(0.06, 0.72, 0)
const DRAIN = -0.1
const BASIN_FLOOR = 0.725
const CABINET_FLOOR = 0.12
const TAP = v3(DRAIN, 0.92, -0.26)
// where the spout lets go of the water
const MOUTH = v3(DRAIN, TAP.y + 0.1, TAP.z + 0.2)
// the headgear screwed into the top of the tap body, and held up in front once it is out
const HEAD_ON = v3(TAP.x, TAP.y + 0.16, TAP.z)
const HEAD_HELD = v3(0.12, 1.16, 0.2)
const HANDLE_ON = v3(TAP.x, TAP.y + 0.235, TAP.z)
const HANDLE_REST = v3(-0.48, 0.935, 0.1)
const IN_DRAIN = v3(DRAIN, BASIN_FLOOR + 0.008, 0)
const VALVE = v3(DRAIN - 0.12, 0.42, -0.26)

// tools along the worktop, right of the basin
const SLOTS = [0.2, 0.34, 0.47, 0.57, 0.68]
const NAMES = ['Stopper', 'Spanner', 'Washer', 'Big', 'PTFE']
const rest = (slot: number) => v3(SLOTS[slot], 0.92, 0.1)
const STOPPER_REST = rest(0)
const SPANNER_REST = rest(1).setY(0.926)
const WASHER_REST = rest(2).setY(0.928)

const SECONDS: Partial<Record<keyof Pose, number>> = {
  dripping: 0.3,
  tapOpen: 1.6,
  stopperIn: 1.2,
  handleOff: 1.6,
  headOut: 2.6,
  washerNew: 2,
}

const WATER = '#7dd3fc'
const at = v3(0, 0, 0)

function Scene({ step, slip, mistakes, onAct, reduced }: SceneProps) {
  const lever = useRef<Mesh>(null)
  const handle = useRef<Group>(null)
  const head = useRef<Group>(null)
  const oldWasher = useRef<Mesh>(null)
  const washer = useRef<Group>(null)
  const spanner = useRef<Group>(null)
  const stopper = useRef<Group>(null)
  const drip = useRef<Mesh>(null)
  const stream = useRef<Mesh>(null)
  const jet = useRef<Mesh>(null)
  const screw = useRef<Mesh>(null)

  const eased = useEased(tapPose, step, reduced, SECONDS)
  const fx = useSlip({ slip, mistakes, reduced }, slip ? slipEffect(step, slip) : '', 0.012)

  useFrame(({ camera, clock }) => {
    const c = eased.current
    const f = fx.current
    const t = clock.elapsedTime
    const swell = Math.sin(Math.PI * f.k)

    // lever in line with the pipe is open, across it is closed
    lever.current!.rotation.z = smoothstep(c.valveShut, 0, 1) * (Math.PI / 2)

    stopper.current!.position.lerpVectors(STOPPER_REST, IN_DRAIN, smoothstep(c.stopperIn, 0, 1))
    stopper.current!.position.y += Math.sin(c.stopperIn * Math.PI) * 0.2

    const off = smoothstep(c.handleOff, 0, 1)
    handle.current!.position.lerpVectors(HANDLE_ON, HANDLE_REST, off)
    handle.current!.position.y += Math.sin(off * Math.PI) * 0.1
    handle.current!.rotation.y = c.tapOpen * (1 - off) * -0.9

    // The spanner turns the nut, then the headgear is lifted out; refitting is the same in reverse.
    const away = smoothstep(c.headOut, 0.5, 1)
    head.current!.position.lerpVectors(HEAD_ON, HEAD_HELD, away)
    head.current!.position.y += Math.sin(away * Math.PI) * 0.05
    head.current!.rotation.y = smoothstep(c.headOut, 0.1, 0.5) * Math.PI * 4
    const grip = visit(c.headOut, 0, 0.15, 0.4, 0.5)
    at.set(HEAD_ON.x, HEAD_ON.y + 0.0125, HEAD_ON.z + 0.13)
    spanner.current!.position.lerpVectors(SPANNER_REST, at, grip)
    spanner.current!.position.y += Math.sin(grip * Math.PI) * 0.08
    spanner.current!.rotation.y = lerp(0.25, Math.sin(t * 8) * 0.15, grip)

    // the old washer comes off the end of the headgear and the new one goes on in its place
    oldWasher.current!.scale.setScalar(Math.max(0.001, 1 - smoothstep(c.washerNew, 0, 0.3)))
    const fitted = smoothstep(c.washerNew, 0.3, 1)
    at.copy(head.current!.position).setY(head.current!.position.y - 0.034)
    washer.current!.position.lerpVectors(WASHER_REST, at, fitted)
    washer.current!.position.y += Math.sin(fitted * Math.PI) * 0.08
    // drawn double size on the worktop so it can be seen and clicked
    washer.current!.scale.setScalar(lerp(2, 1, fitted))

    drip.current!.visible = c.dripping > 0.5
    const fall = (t * 0.9) % 1
    drip.current!.position.y = lerp(MOUTH.y, BASIN_FLOOR, fall * fall)

    // a dribble as the closed-off pipe empties, then the full flow once the valve is open again
    const dribble = c.valveShut > 0.5 ? visit(c.tapOpen, 0, 0.2, 0.5, 0.8) * 0.5 : 0
    const flow = Math.max(c.flowing, dribble)
    stream.current!.visible = flow > 0.01
    stream.current!.scale.set(flow, MOUTH.y - BASIN_FLOOR, flow)

    // slips: mains water out of the top of the tap body, a screw lost down the drain
    const spray = f.kind === 'jet' ? swell : 0
    jet.current!.visible = spray > 0
    jet.current!.scale.y = Math.max(0.001, spray * 0.4)
    jet.current!.position.y = HEAD_ON.y + spray * 0.2
    const lost = 1 - f.k
    screw.current!.visible = f.kind === 'drop' && f.k > 0
    screw.current!.position.lerpVectors(HANDLE_ON, IN_DRAIN, smoothstep(lost, 0, 0.6))
    screw.current!.position.y += Math.sin(smoothstep(lost, 0, 0.6) * Math.PI) * 0.06
    screw.current!.scale.setScalar(Math.max(0.001, 1 - smoothstep(lost, 0.6, 0.8)))

    camera.position.copy(CAM)
    camera.lookAt(LOOK)
  })

  return (
    <Stage value={onAct}>
      <ambientLight intensity={1.2} />
      <directionalLight
        castShadow
        intensity={1.7}
        position={[-1, 2.2, 2.6]}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-1.4}
        shadow-camera-right={1.4}
        shadow-camera-top={1.6}
        shadow-camera-bottom={-0.4}
        shadow-bias={-0.001}
      />

      {/* kitchen floor and wall */}
      <Box size={[5, 0.04, 4]} color="#a8a29e" position={[0, -0.02, 0.8]} />
      <Box size={[5, 3, 0.04]} color="#e0f2fe" position={[0, 1.2, -0.36]} />

      {/* cabinet carcass, front open */}
      <Box size={[1.36, 0.1, 0.56]} color={DARK} position={[0.05, 0.05, -0.04]} />
      <Box size={[1.36, 0.02, 0.66]} color={WOOD} position={[0.05, CABINET_FLOOR - 0.01, 0]} />
      <Box size={[1.36, 0.78, 0.02]} color="#e7d3bd" position={[0.05, 0.5, -0.32]} />
      {[-0.63, 0.73].map((x) => (
        <Box key={x} size={[0.03, 0.78, 0.66]} color={WOOD} position={[x, 0.5, 0]} />
      ))}

      {/* worktop, in four pieces around the basin */}
      <Box size={[0.36, 0.04, 0.7]} color="#57534e" position={[-0.48, 0.9, 0]} />
      <Box size={[0.66, 0.04, 0.7]} color="#57534e" position={[0.43, 0.9, 0]} />
      <Box size={[0.4, 0.04, 0.15]} color="#57534e" position={[DRAIN, 0.9, -0.275]} />
      <Box size={[0.4, 0.04, 0.15]} color="#57534e" position={[DRAIN, 0.9, 0.275]} />

      {/* basin: the front is glass here so the drain shows */}
      <Box size={[0.4, 0.01, 0.4]} color={STEEL} metal position={[DRAIN, 0.72, 0]} />
      <Box size={[0.4, 0.18, 0.01]} color={STEEL} metal position={[DRAIN, 0.81, -0.2]} />
      {[-0.2, 0.2].map((x) => (
        <Box key={x} size={[0.01, 0.18, 0.4]} color={STEEL} metal position={[DRAIN + x, 0.81, 0]} />
      ))}
      <mesh position={[DRAIN, 0.81, 0.2]}>
        <boxGeometry args={[0.4, 0.18, 0.006]} />
        <meshStandardMaterial color="#e0f2fe" transparent opacity={0.22} depthWrite={false} />
      </mesh>
      <Rod r={0.03} len={0.004} color={DARK} position={[DRAIN, BASIN_FLOOR + 0.002, 0]} />

      {/* waste: tailpiece, bottle trap and the arm off to the side */}
      <Rod r={0.022} len={0.14} color="#f5f5f4" position={[DRAIN, 0.65, 0]} />
      <Rod r={0.04} len={0.1} color="#f5f5f4" position={[DRAIN, 0.54, 0]} />
      <Rod r={0.022} len={0.66} color="#f5f5f4" position={[DRAIN + 0.36, 0.54, 0]} rotation={[0, 0, Math.PI / 2]} />

      {/* supply: up from the floor through the valve, across to the tap */}
      <Rod r={0.01} len={0.74} color={STEEL} metal position={[VALVE.x, 0.5, VALVE.z]} />
      <Rod r={0.01} len={0.12} color={STEEL} metal position={[DRAIN - 0.06, 0.87, VALVE.z]} rotation={[0, 0, Math.PI / 2]} />
      <Target target="valve" position={VALVE.toArray()}>
        <Box size={[0.05, 0.06, 0.05]} color={BRASS} metal />
        <Box ref={lever} size={[0.022, 0.11, 0.016]} color="#2563eb" position={[0, 0, 0.034]} />
        <Hit size={[0.18, 0.18, 0.14]} position={[0, 0, 0.03]} />
      </Target>

      <Target target="tap" position={TAP.toArray()}>
        <Rod r={0.02} len={0.16} color={STEEL} metal position={[0, 0.08, 0]} />
        <Rod r={0.014} len={0.2} color={STEEL} metal position={[0, 0.125, 0.1]} rotation={[Math.PI / 2, 0, 0]} />
        <Rod r={0.014} len={0.04} color={STEEL} metal position={[0, 0.115, 0.2]} />
        <Hit size={[0.1, 0.16, 0.3]} position={[0, 0.08, 0.1]} />
      </Target>
      <group ref={head}>
        <mesh castShadow position={[0, 0.0125, 0]}>
          <cylinderGeometry args={[0.026, 0.026, 0.025, 6]} />
          <meshStandardMaterial color={BRASS} metalness={0.35} roughness={0.4} />
        </mesh>
        <Rod r={0.008} len={0.06} color={BRASS} metal position={[0, 0.05, 0]} />
        <Rod r={0.012} len={0.03} color={BRASS} metal position={[0, -0.015, 0]} />
        <Rod ref={oldWasher} r={0.015} len={0.008} color="#57534e" position={[0, -0.034, 0]} />
      </group>
      <Target ref={handle} target="handle">
        <Rod r={0.014} len={0.03} color={STEEL} metal />
        <Box size={[0.11, 0.018, 0.025]} color={STEEL} metal position={[0, 0.012, 0]} />
        <Hit size={[0.16, 0.08, 0.1]} />
      </Target>

      {/* on the worktop */}
      <Target ref={stopper} target="stopper">
        <Rod r={0.04} len={0.012} color={DARK} position={[0, 0.006, 0]} />
        <Rod r={0.01} len={0.02} color={STEEL} metal position={[0, 0.022, 0]} />
        <Hit size={[0.11, 0.08, 0.12]} position={[0, 0.02, 0]} />
      </Target>
      <Target ref={spanner} target="spanner">
        <Box size={[0.028, 0.012, 0.2]} color={STEEL} metal />
        <Box size={[0.06, 0.012, 0.035]} color={STEEL} metal position={[0, 0, -0.11]} />
        <Hit size={[0.1, 0.06, 0.3]} />
      </Target>
      <Target ref={washer} target="washer">
        <Rod r={0.015} len={0.008} color="#dc2626" />
        <Hit size={[0.045, 0.04, 0.06]} />
      </Target>
      <Target target="washer-big" position={rest(3).toArray()}>
        <Rod r={0.042} len={0.016} color="#dc2626" position={[0, 0.008, 0]} />
        <Hit size={[0.1, 0.07, 0.12]} position={[0, 0.02, 0]} />
      </Target>
      <Target target="tape" position={rest(4).toArray()}>
        <mesh castShadow position={[0, 0.012, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.03, 0.012, 10, 24]} />
          <meshStandardMaterial color="#fafaf9" />
        </mesh>
        <Hit size={[0.1, 0.07, 0.12]} position={[0, 0.02, 0]} />
      </Target>
      {NAMES.map((text, i) => (
        <Label key={text} text={text} h={0.03} color="#fafaf9" position={[SLOTS[i], 0.9, 0.352]} />
      ))}

      {/* water: the drip, the stream from the spout, and where a slip sends it */}
      <mesh ref={drip} visible={false} position={[MOUTH.x, MOUTH.y, MOUTH.z]}>
        <sphereGeometry args={[0.009]} />
        <meshStandardMaterial color={WATER} />
      </mesh>
      <mesh ref={stream} visible={false} position={[MOUTH.x, (MOUTH.y + BASIN_FLOOR) / 2, MOUTH.z]}>
        <cylinderGeometry args={[0.008, 0.008, 1, 8]} />
        <meshStandardMaterial color={WATER} transparent opacity={0.8} />
      </mesh>
      <mesh ref={jet} visible={false} position={[HEAD_ON.x, HEAD_ON.y, HEAD_ON.z]}>
        <cylinderGeometry args={[0.05, 0.012, 1, 12]} />
        <meshStandardMaterial color={WATER} transparent opacity={0.75} />
      </mesh>
      <mesh ref={screw} visible={false}>
        <cylinderGeometry args={[0.006, 0.006, 0.02, 8]} />
        <meshStandardMaterial color={BRASS} />
      </mesh>
    </Stage>
  )
}

export default function LeakingTapScene(props: SceneProps) {
  return (
    <StageCanvas reduced={props.reduced} position={CAM}>
      <Scene {...props} />
    </StageCanvas>
  )
}
