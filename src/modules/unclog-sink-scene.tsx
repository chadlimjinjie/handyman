import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef, type Ref } from 'react'
import { Color, DoubleSide, MathUtils } from 'three'
import type { Group, Mesh, MeshStandardMaterial } from 'three'
import {
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
import { sinkPose, slipEffect, type Pose } from './unclog-sink-pose'

const { lerp, smoothstep } = MathUtils

// World: metres, x right, y up, z toward the camera. The cabinet under the counter is drawn
// with its doors and the front of the basin taken away. The drain is at x = DRAIN.
const CAM = v3(0.1, 1.02, 1.8)
const LOOK = v3(0.06, 0.6, 0)
const DRAIN = -0.1
const BASIN_FLOOR = 0.725
// top of the trap, where its nut meets the tailpiece
const TRAP_ON = v3(DRAIN, 0.58, 0)
// held out in front of the cabinet once it is off
const TRAP_HELD = v3(0.2, 0.52, 0.34)
const CABINET_FLOOR = 0.12
const BUCKET_REST = 0.47
const BUCKET_UNDER = -0.04
const BRUSH_REST = v3(0.28, 0.935, 0.06)
const TAP_MOUTH = 1.09

const SECONDS: Partial<Record<keyof Pose, number>> = {
  trapOff: 2.4,
  trapClean: 2.2,
  sinkFull: 2.8,
  bucketFull: 2.8,
  bucketUnder: 1.1,
}

const PLASTIC = '#f5f5f4'
const DIRTY = new Color('#5c4a2e')
const CLEAN = new Color('#7dd3fc')

// a length of see-through waste pipe along y
function Pipe({ len, ...props }: { len: number; position: [number, number, number] }) {
  return (
    <mesh {...props}>
      <cylinderGeometry args={[0.022, 0.022, len, 16]} />
      <meshStandardMaterial color={PLASTIC} transparent opacity={0.55} />
    </mesh>
  )
}

// hand-tight plastic slip nut: six sides, so its turning shows
function Nut({ ref, ...props }: { ref: Ref<Mesh>; position: [number, number, number] }) {
  return (
    <mesh ref={ref} castShadow {...props}>
      <cylinderGeometry args={[0.032, 0.032, 0.028, 6]} />
      <meshStandardMaterial color="#e7e5e4" />
    </mesh>
  )
}

const at = v3(0, 0, 0)

function Scene({ step, slip, mistakes, onAct, reduced }: SceneProps) {
  const water = useRef<Mesh>(null)
  const handle = useRef<Group>(null)
  const tapStream = useRef<Mesh>(null)
  const trap = useRef<Group>(null)
  const nuts = useRef<(Mesh | null)[]>([])
  const clog = useRef<Mesh>(null)
  const bucket = useRef<Group>(null)
  const bucketWater = useRef<Mesh>(null)
  const brush = useRef<Group>(null)
  const stream = useRef<Mesh>(null)
  const puddle = useRef<Mesh>(null)
  const fizz = useRef<Group>(null)

  const eased = useEased(sinkPose, step, reduced, SECONDS)
  const fx = useSlip({ slip, mistakes, reduced }, slip ? slipEffect(step, slip) : '', 0.012)
  const camera = useThree((s) => s.camera)

  useEffect(() => {
    // the wrench is what was clicked, but it is the nut that cracks
    if (slip === 'wrench') trap.current?.getWorldPosition(fx.current.at).lerp(camera.position, 0.1)
  }, [mistakes, slip, camera, fx])

  useFrame(({ camera, clock }) => {
    const c = eased.current
    const f = fx.current
    const swell = Math.sin(Math.PI * f.k)
    const splash = f.kind === 'splash' ? swell : 0

    bucket.current!.position.x = lerp(BUCKET_REST, BUCKET_UNDER, smoothstep(c.bucketUnder, 0, 1))
    bucketWater.current!.scale.y = Math.max(0.001, c.bucketFull)
    bucketWater.current!.position.y = 0.01 + c.bucketFull * 0.085
    bucketWater.current!.visible = c.bucketFull > 0.01

    // The nuts spin off, the trap drops clear, then it is lifted out to the front.
    const nutTurn = smoothstep(c.trapOff, 0, 0.3) * Math.PI * 4
    for (const nut of nuts.current) nut!.rotation.y = nutTurn
    const away = smoothstep(c.trapOff, 0.5, 1)
    trap.current!.position.lerpVectors(TRAP_ON, TRAP_HELD, away)
    trap.current!.position.y -= smoothstep(c.trapOff, 0.3, 0.5) * 0.08 * (1 - away)

    // The brush leaves the counter, scrubs out the bend and goes back.
    const scrub = visit(c.trapClean, 0.1, 0.3, 0.8, 1)
    at.copy(trap.current!.position)
    at.x += 0.06
    at.y -= 0.02 + Math.sin(clock.elapsedTime * 22) * 0.03 * scrub
    at.z += 0.01
    brush.current!.position.lerpVectors(BRUSH_REST, at, scrub)
    brush.current!.position.y += Math.sin(scrub * Math.PI) * 0.15
    brush.current!.rotation.x = scrub * -1.45
    clog.current!.scale.setScalar(Math.max(0.001, 1 - smoothstep(c.trapClean, 0.3, 0.8)))

    const running = smoothstep(c.tapOn, 0, 1)
    const level = Math.max(c.sinkFull * 0.85, running * 0.1)
    water.current!.scale.y = Math.max(0.001, level * 0.17)
    water.current!.position.y = BASIN_FLOOR + level * 0.085
    ;(water.current!.material as MeshStandardMaterial).color.lerpColors(DIRTY, CLEAN, running)
    handle.current!.rotation.y = running * -0.9

    // on a slip, the tap is opened for a moment to show where the water ends up
    const flow = Math.max(running, f.part?.userData.target === 'tap' ? splash : 0)
    tapStream.current!.visible = flow > 0.01
    tapStream.current!.scale.y = Math.max(0.001, flow * (TAP_MOUTH - BASIN_FLOOR))
    tapStream.current!.position.y = TAP_MOUTH - (flow * (TAP_MOUTH - BASIN_FLOOR)) / 2

    // Water out of the open pipe: into the bucket while the sink drains, or onto the cabinet
    // floor when a slip sends it there.
    const draining = c.trapOff > 0.3 && c.sinkFull > 0.02 && c.sinkFull < 0.9
    const top = c.trapOff > 0.3 ? TRAP_ON.y : TRAP_ON.y - 0.2
    const bottom = splash > 0 && c.bucketUnder < 0.5 ? CABINET_FLOOR : CABINET_FLOOR + 0.12
    stream.current!.visible = draining || splash > 0
    stream.current!.scale.y = top - bottom
    stream.current!.position.y = (top + bottom) / 2
    puddle.current!.visible = splash > 0
    puddle.current!.scale.setScalar(0.2 + (1 - f.k))
    ;(puddle.current!.material as MeshStandardMaterial).opacity = splash * 0.75

    fizz.current!.visible = f.kind === 'caustic' && f.k > 0
    fizz.current!.children.forEach((bubble, i) => {
      const rise = (f.t * 0.9 + i * 0.23) % 1
      bubble.position.y = rise * 0.28
      bubble.scale.setScalar(swell * (1.3 - rise))
    })

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

      {/* basin: the front is glass here so the water level shows */}
      <Box size={[0.4, 0.01, 0.4]} color={STEEL} metal position={[DRAIN, 0.72, 0]} />
      <Box size={[0.4, 0.18, 0.01]} color={STEEL} metal position={[DRAIN, 0.81, -0.2]} />
      {[-0.2, 0.2].map((x) => (
        <Box key={x} size={[0.01, 0.18, 0.4]} color={STEEL} metal position={[DRAIN + x, 0.81, 0]} />
      ))}
      <mesh position={[DRAIN, 0.81, 0.2]}>
        <boxGeometry args={[0.4, 0.18, 0.006]} />
        <meshStandardMaterial color="#e0f2fe" transparent opacity={0.22} depthWrite={false} />
      </mesh>
      <mesh ref={water} position={[DRAIN, BASIN_FLOOR, 0]}>
        <boxGeometry args={[0.38, 1, 0.38]} />
        <meshStandardMaterial transparent opacity={0.8} />
      </mesh>

      <Target target="tap" position={[DRAIN, 0.92, -0.26]}>
        <Rod r={0.02} len={0.22} color={STEEL} metal position={[0, 0.11, 0]} />
        <Rod r={0.014} len={0.24} color={STEEL} metal position={[0, 0.2, 0.11]} rotation={[Math.PI / 2, 0, 0]} />
        <Rod r={0.014} len={0.04} color={STEEL} metal position={[0, 0.185, 0.22]} />
        <group ref={handle} position={[0, 0.23, 0]}>
          <Box size={[0.1, 0.015, 0.025]} color={STEEL} metal position={[0.04, 0, 0]} />
        </group>
        <Hit size={[0.16, 0.3, 0.34]} position={[0, 0.13, 0.1]} />
      </Target>
      <mesh ref={tapStream} visible={false} position={[DRAIN, TAP_MOUTH, -0.04]}>
        <cylinderGeometry args={[0.008, 0.008, 1, 8]} />
        <meshStandardMaterial color={CLEAN} transparent opacity={0.8} />
      </mesh>

      {/* the fixed pipework: tailpiece down from the drain, waste arm off to the side */}
      <Target target="trap">
        <Pipe len={0.14} position={[DRAIN, 0.65, 0]} />
        <mesh position={[0.4, 0.52, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.022, 0.022, 0.66, 16]} />
          <meshStandardMaterial color={PLASTIC} />
        </mesh>
      </Target>

      {/* the trap itself: down, round the U, up to the waste arm */}
      <group ref={trap}>
        <Target target="trap">
          <Pipe len={0.14} position={[0, -0.07, 0]} />
          <mesh position={[0.06, -0.14, 0]} rotation={[0, 0, Math.PI]}>
            <torusGeometry args={[0.06, 0.022, 12, 24, Math.PI]} />
            <meshStandardMaterial color={PLASTIC} transparent opacity={0.55} />
          </mesh>
          <Pipe len={0.08} position={[0.12, -0.1, 0]} />
          <Nut
            ref={(m) => {
              nuts.current[0] = m
            }}
            position={[0, 0, 0]}
          />
          <Nut
            ref={(m) => {
              nuts.current[1] = m
            }}
            position={[0.12, -0.06, 0]}
          />
          {/* hair and grease, lodged in the bend */}
          <mesh ref={clog} position={[0.06, -0.185, 0]} scale={[1, 1, 1]}>
            <icosahedronGeometry args={[0.019, 1]} />
            <meshStandardMaterial color="#3f2d1d" flatShading />
          </mesh>
          <Hit size={[0.22, 0.26, 0.1]} position={[0.06, -0.1, 0]} />
        </Target>
      </group>

      <Target ref={bucket} target="bucket" position={[BUCKET_REST, CABINET_FLOOR, 0.04]}>
        <mesh castShadow position={[0, 0.12, 0]}>
          <cylinderGeometry args={[0.15, 0.115, 0.24, 24, 1, true]} />
          <meshStandardMaterial color="#3b82f6" side={DoubleSide} />
        </mesh>
        <Rod r={0.115} len={0.01} color="#3b82f6" position={[0, 0.005, 0]} />
        <mesh ref={bucketWater} visible={false}>
          <cylinderGeometry args={[0.13, 0.117, 0.17, 24]} />
          <meshStandardMaterial color={DIRTY} transparent opacity={0.85} />
        </mesh>
      </Target>

      {/* tools on the worktop */}
      <Target ref={brush} target="brush">
        <Box size={[0.025, 0.02, 0.17]} color="#16a34a" position={[0, 0, 0.03]} />
        <Box size={[0.04, 0.035, 0.06]} color="#fafaf9" position={[0, 0.005, -0.08]} />
        <Hit size={[0.09, 0.07, 0.3]} />
      </Target>
      <Target target="wrench" position={[0.44, 0.93, 0.06]} rotation={[0, 0.25, 0]}>
        <Box size={[0.028, 0.012, 0.2]} color={STEEL} metal />
        <Box size={[0.06, 0.012, 0.035]} color={STEEL} metal position={[0, 0, -0.11]} />
        <Hit size={[0.1, 0.06, 0.3]} />
      </Target>
      <Target target="cleaner" position={[0.61, 0.92, 0.02]}>
        <Rod r={0.04} len={0.17} color="#84cc16" position={[0, 0.085, 0]} />
        <Rod r={0.016} len={0.035} color="#dc2626" position={[0, 0.187, 0]} />
        <Box size={[0.06, 0.07, 0.002]} color="#fef08a" position={[0, 0.09, 0.04]} />
        <Label text="!" h={0.06} position={[0, 0.09, 0.042]} />
        <Hit size={[0.12, 0.24, 0.12]} position={[0, 0.1, 0]} />
      </Target>
      {['Brush', 'Wrench', 'Cleaner'].map((text, i) => (
        <Label key={text} text={text} h={0.032} color="#fafaf9" position={[0.28 + i * 0.165, 0.9, 0.352]} />
      ))}

      {/* water from the open pipe, and where it lands on a slip */}
      <mesh ref={stream} visible={false} position={[DRAIN, 0.4, 0]}>
        <cylinderGeometry args={[0.014, 0.014, 1, 8]} />
        <meshStandardMaterial color={DIRTY} transparent opacity={0.85} />
      </mesh>
      <mesh ref={puddle} visible={false} position={[DRAIN + 0.03, CABINET_FLOOR + 0.003, 0.06]}>
        <cylinderGeometry args={[0.26, 0.26, 0.004, 32]} />
        <meshStandardMaterial color={DIRTY} transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* caustic cleaner boiling back up out of the drain */}
      <group ref={fizz} visible={false} position={[DRAIN, 0.88, 0.02]}>
        {[-0.06, 0.03, -0.01, 0.07, -0.04].map((x, i) => (
          <mesh key={x} position={[x, 0, (i % 2) * 0.05]}>
            <sphereGeometry args={[0.022]} />
            <meshBasicMaterial color="#a3e635" transparent opacity={0.85} />
          </mesh>
        ))}
      </group>
      <Spark fx={fx} kind="crack" size={3} />
    </Stage>
  )
}

export default function UnclogSinkScene(props: SceneProps) {
  return (
    <StageCanvas reduced={props.reduced} position={CAM}>
      <Scene {...props} />
    </StageCanvas>
  )
}
