import { useFrame } from '@react-three/fiber'
import { useRef, type ReactNode, type Ref } from 'react'
import { Color, MathUtils } from 'three'
import type { AmbientLight, Group, Mesh, MeshStandardMaterial, PointLight } from 'three'
import { LADDER_WOOD, LEAN, LadderSide, Man, RAIL_Z, onLadder, type Rig } from '@/scene/man'
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
  useEased,
  useSlip,
  v3,
  visit,
  type SceneProps,
} from '@/scene/stage'
import { bulbPose, slipEffect, type Pose } from './light-bulb-pose'

const { lerp, smoothstep } = MathUtils

// World: the landing hero's room. Metres, the stepladder opens at the origin, the man faces -z
// and the camera sees his right side. The far wall is x = WALL, the side wall z = 1.75.
// Fittings and bulbs are drawn about three times life size, as the hero's bulb is.
const CAM_ROOM = v3(5.0, 2.3, -2.9)
const LOOK_ROOM = v3(-0.3, 1.45, -0.15)
const CAM_WALL = v3(3.9, 2.1, -2.7)
const LOOK_WALL = v3(-0.8, 1.75, -0.35)
const WALL = -1.7
const FIXTURE = v3(0.21, 2.62, 0.05)
const LADDER_FOLDED = v3(1.05, 0, 1.25)
const ORIGIN = v3(0, 0, 0)
const SHELF_Y = 1.2
// where the three replacement bulbs stand on the shelf, along the wall
const SLOTS = [-0.62, -1.0, -1.38]
const LED_REST = v3(WALL + 0.12, SHELF_Y + 0.2, SLOTS[0])
const BIN = v3(WALL + 0.32, 0.2, -1.3)
// a bulb held just past the fingers, and one tucked in his belt, in the frame of his forearm and body
const IN_HAND = v3(0, -0.48, 0)
const IN_BELT = v3(-0.12, 0.84, -0.2)

const SECONDS: Partial<Record<keyof Pose, number>> = {
  hot: 2.4,
  ladderOpen: 1.9,
  oldOut: 4.6,
  newIn: 4.6,
  newPicked: 1.2,
  binned: 1.2,
  wallView: 1.3,
}

const OFF = new Color('#a8a29e')
const ON = new Color('#16a34a')

// A lamp with its screw cap up, the way it hangs in the fixture. `e14` is the small cap.
function Bulb({
  ref,
  glass,
  r = 0.09,
  e14,
}: {
  ref?: Ref<MeshStandardMaterial>
  glass: string
  r?: number
  e14?: boolean
}) {
  return (
    <>
      <mesh>
        <sphereGeometry args={[r]} />
        <meshStandardMaterial ref={ref} color={glass} emissive="#ffc46b" emissiveIntensity={0} />
      </mesh>
      <Rod r={e14 ? 0.02 : 0.035} len={0.07} color={STEEL} metal position={[0, r + 0.015, 0]} />
    </>
  )
}

// Something mounted on the far wall, built facing +z and turned to face the room.
function OnWall({ y, z, children }: { y: number; z: number; children: ReactNode }) {
  return (
    <group position={[WALL, y, z]} rotation={[0, Math.PI / 2, 0]}>
      {children}
    </group>
  )
}

const hand = v3(0, 0, 0)
const belt = v3(0, 0, 0)
const look = v3(0, 0, 0)

function Scene({ step, slip, mistakes, onAct, reduced }: SceneProps) {
  const rig = useRef({} as Rig)
  const ambient = useRef<AmbientLight>(null)
  const lamp = useRef<PointLight>(null)
  const rocker = useRef<Group>(null)
  const lever = useRef<Mesh>(null)
  const minute = useRef<Group>(null)
  const hour = useRef<Group>(null)
  const ladder = useRef<Group>(null)
  const front = useRef<Group>(null)
  const back = useRef<Group>(null)
  const top = useRef<Mesh>(null)
  const oldBulb = useRef<Group>(null)
  const oldGlass = useRef<MeshStandardMaterial>(null)
  const hotTag = useRef<Group>(null)
  const led = useRef<Group>(null)
  const ledGlass = useRef<MeshStandardMaterial>(null)
  const bigGlass = useRef<MeshStandardMaterial>(null)

  const eased = useEased(bulbPose, step, reduced, SECONDS)
  const fx = useSlip({ slip, mistakes, reduced }, slip ? slipEffect(step, slip) : '', 0.02)

  useFrame(({ camera }) => {
    const c = eased.current
    const f = fx.current
    const swell = Math.sin(Math.PI * f.k)
    const wobble = f.kind === 'wobble' ? swell : 0

    rocker.current!.rotation.x = lerp(-0.22, 0.22, smoothstep(c.switchOn, 0, 1))
    // MCB levers: up is ON, opposite of the rocker
    lever.current!.position.y = lerp(-0.035, 0.035, smoothstep(c.breakerOn, 0, 1))
    ;(lever.current!.material as MeshStandardMaterial).color.lerpColors(OFF, ON, c.breakerOn)
    // the wait: a few minutes go by on the clock while the bulb cools
    minute.current!.rotation.z = (c.hot - 1) * Math.PI * 4
    hour.current!.rotation.z = -0.9 + ((c.hot - 1) * Math.PI) / 3

    // The ladder is carried over from the wall, then its legs are spread and locked.
    const carried = smoothstep(c.ladderOpen, 0, 0.65)
    const spread = smoothstep(c.ladderOpen, 0.6, 1)
    ladder.current!.position.lerpVectors(LADDER_FOLDED, ORIGIN, carried)
    ladder.current!.position.y += Math.sin(carried * Math.PI) * 0.25
    ladder.current!.rotation.x = lerp(0.1, 0, carried)
    front.current!.position.z = lerp(0.2, RAIL_Z, spread)
    front.current!.rotation.x = -LEAN * spread
    back.current!.position.z = lerp(0.12, -0.24, spread)
    back.current!.rotation.x = LEAN * spread
    top.current!.visible = spread > 0.9

    // Each trip: climb, reach, half the turns, swap what is in the socket, and back down.
    const up = visit(c.oldOut, 0, 0.32, 0.68, 1) + visit(c.newIn, 0, 0.32, 0.68, 1)
    const reach = visit(c.oldOut, 0.32, 0.44, 0.56, 0.68) + visit(c.newIn, 0.32, 0.44, 0.56, 0.68)
    const turns =
      (smoothstep(c.oldOut, 0.44, 0.56) - smoothstep(c.newIn, 0.44, 0.56)) * Math.PI * 4
    const man = rig.current
    onLadder(man, up, Math.max(reach, wobble * 0.95), turns)
    // without the ladder he is on tiptoe, swaying
    man.root.position.y += wobble * 0.05
    man.root.rotation.z = Math.sin(f.t * 10) * 0.1 * wobble
    man.head.rotation.x = reach * 0.5 + c.lit * 0.25 + wobble * 0.45
    man.elbowR.localToWorld(hand.copy(IN_HAND))
    man.root.localToWorld(belt.copy(IN_BELT))

    // Old bulb: socket, his hand, his belt, the bin.
    const dropped = smoothstep(c.binned, 0, 1)
    const old = oldBulb.current!.position
    old.lerpVectors(FIXTURE, hand, smoothstep(c.oldOut, 0.47, 0.53))
    old.lerp(belt, smoothstep(c.oldOut, 0.74, 0.92))
    old.lerp(BIN, dropped)
    old.y += Math.sin(dropped * Math.PI) * 0.5
    oldBulb.current!.rotation.y = turns
    oldBulb.current!.visible = c.binned < 0.98
    const burn = f.kind === 'burn' ? swell : 0
    oldGlass.current!.emissive.set('#ff4d1f')
    oldGlass.current!.emissiveIntensity = c.hot * 1.4 + burn * 3
    hotTag.current!.visible = c.hot > 0.5
    hotTag.current!.scale.setScalar(1 + burn * 0.6)

    // New bulb: shelf, his hand, the socket.
    const picked = smoothstep(c.newPicked, 0, 1)
    const fresh = led.current!.position
    fresh.lerpVectors(LED_REST, hand, picked)
    fresh.y += Math.sin(picked * Math.PI) * 0.4
    fresh.lerp(FIXTURE, smoothstep(c.newIn, 0.47, 0.53))
    // it stands cap down on the shelf and goes in cap up
    led.current!.rotation.set(Math.PI * (1 - smoothstep(c.newPicked, 0, 0.6)), turns, 0)
    ledGlass.current!.emissiveIntensity = c.lit * 4
    lamp.current!.intensity = c.lit * 16
    // stands in for light bouncing off the walls
    ambient.current!.intensity = 1 + c.lit * 0.35

    bigGlass.current!.emissive.set('#ff3b00')
    bigGlass.current!.emissiveIntensity = f.kind === 'overheat' ? swell * 2.5 : 0

    const wall = smoothstep(c.wallView, 0, 1)
    camera.position.lerpVectors(CAM_ROOM, CAM_WALL, wall)
    camera.lookAt(look.lerpVectors(LOOK_ROOM, LOOK_WALL, wall))
  })

  const socketEmpty = step === 5 || step === 6

  return (
    <Stage value={onAct}>
      <ambientLight ref={ambient} intensity={1} />
      <directionalLight
        castShadow
        intensity={1.3}
        position={[4, 5, -3]}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-3}
        shadow-camera-right={3}
        shadow-camera-top={3.5}
        shadow-camera-bottom={-1}
        shadow-bias={-0.002}
      />
      <pointLight ref={lamp} color="#ffb86b" intensity={0} position={FIXTURE.toArray()} />

      {/* room corner: floor and the two walls facing the camera */}
      <Box size={[3.4, 0.1, 3.4]} color="#a8a29e" position={[0, -0.05, 0]} />
      <Box size={[0.1, 3.2, 3.4]} color="#fef3c7" position={[-1.75, 1.6, 0]} />
      <Box size={[3.4, 3.2, 0.1]} color="#fef3c7" position={[0, 1.6, 1.75]} />

      {/* joist, cord and lamp holder */}
      <Box
        size={[FIXTURE.x + 0.15 + 1.7, 0.1, 0.12]}
        color={LADDER_WOOD}
        position={[(FIXTURE.x + 0.15 - 1.7) / 2, 3.05, FIXTURE.z]}
      />
      <Rod r={0.008} len={0.26} color={DARK} position={[FIXTURE.x, 2.87, FIXTURE.z]} />
      <Target target={socketEmpty ? 'socket' : 'bulb'} position={FIXTURE.toArray()}>
        <Rod r={0.045} len={0.09} color={DARK} position={[0, 0.13, 0]} />
        <Hit size={[0.36, 0.42, 0.36]} position={[0, 0.02, 0]} />
      </Target>
      <group ref={hotTag} position={[FIXTURE.x, 2.36, FIXTURE.z]} rotation={[0, 2.1, 0]}>
        <Label text="HOT" h={0.13} color="#dc2626" />
      </group>

      <group ref={oldBulb}>
        <Bulb ref={oldGlass} glass="#a8a29e" />
      </group>

      <OnWall y={2.85} z={-0.45}>
        <Label text="E27 max 60W" h={0.1} />
      </OnWall>

      <OnWall y={1.3} z={0.1}>
        <Target target="switch">
          <Box size={[0.26, 0.26, 0.03]} color="#fafaf9" position={[0, 0, 0.015]} />
          {/* Singapore rockers: down is ON */}
          <group ref={rocker} position={[0, 0, 0.04]}>
            <Box size={[0.1, 0.15, 0.035]} color="#e7e5e4" />
          </group>
          <Hit size={[0.36, 0.36, 0.12]} />
        </Target>
      </OnWall>

      <OnWall y={2.05} z={0.02}>
        <Target target="breaker">
          <Box size={[0.52, 0.36, 0.1]} color="#d6d3d1" position={[0, 0, 0.05]} />
          {[-0.15, 0].map((x) => (
            <Box key={x} size={[0.08, 0.1, 0.05]} color="#16a34a" position={[x, 0.035, 0.12]} />
          ))}
          <mesh ref={lever} castShadow position={[0.15, 0.035, 0.12]}>
            <boxGeometry args={[0.08, 0.1, 0.05]} />
            <meshStandardMaterial />
          </mesh>
          <Label text="Lights" h={0.055} position={[0.15, -0.125, 0.102]} />
          <Label text="DB box" h={0.07} position={[0, 0.23, 0.01]} />
        </Target>
      </OnWall>

      <OnWall y={2.3} z={-1.0}>
        <Target target="wait">
          <Rod r={0.2} len={0.03} color={DARK} position={[0, 0, 0.015]} rotation={[Math.PI / 2, 0, 0]} />
          <Rod r={0.18} len={0.032} color="#fafaf9" position={[0, 0, 0.017]} rotation={[Math.PI / 2, 0, 0]} />
          <group ref={minute} position={[0, 0, 0.04]}>
            <Box size={[0.015, 0.15, 0.008]} color={DARK} position={[0, 0.07, 0]} />
          </group>
          <group ref={hour} position={[0, 0, 0.04]}>
            <Box size={[0.02, 0.1, 0.008]} color={DARK} position={[0, 0.045, 0]} />
          </group>
        </Target>
      </OnWall>

      {/* shelf of replacement bulbs, cap down */}
      <Box size={[0.26, 0.03, 1.15]} color={LADDER_WOOD} position={[WALL + 0.13, SHELF_Y, -1.0]} />
      <Target ref={led} target="new-led-e27">
        <Bulb ref={ledGlass} glass="#f8fafc" r={0.08} />
        <Rod r={0.06} len={0.05} color="#e2e8f0" position={[0, 0.06, 0]} />
        <Hit size={[0.3, 0.36, 0.3]} position={[0, 0.03, 0]} />
      </Target>
      <Target target="new-100w" position={[WALL + 0.12, SHELF_Y + 0.21, SLOTS[1]]} rotation={[Math.PI, 0, 0]}>
        <Bulb ref={bigGlass} glass="#fde68a" />
        <Hit size={[0.3, 0.36, 0.3]} position={[0, 0.03, 0]} />
      </Target>
      <Target target="new-e14" position={[WALL + 0.12, SHELF_Y + 0.17, SLOTS[2]]} rotation={[Math.PI, 0, 0]}>
        <Bulb glass="#f8fafc" r={0.055} e14 />
        <Hit size={[0.3, 0.36, 0.3]} position={[0, 0.03, 0]} />
      </Target>
      {['9W E27', '100W E27', '5W E14'].map((text, i) => (
        <group key={text} position={[WALL + 0.265, SHELF_Y - 0.08, SLOTS[i]]} rotation={[0, Math.PI / 2, 0]}>
          <Label text={text} h={0.075} />
        </group>
      ))}

      <Target target="bin" position={[BIN.x, 0, BIN.z]}>
        {[-0.17, 0.17].map((d) => (
          <Box key={d} size={[0.36, 0.42, 0.02]} color="#15803d" position={[0, 0.21, d]} />
        ))}
        {[-0.17, 0.17].map((d) => (
          <Box key={d} size={[0.02, 0.42, 0.36]} color="#15803d" position={[d, 0.21, 0]} />
        ))}
        <group position={[0.185, 0.24, 0]} rotation={[0, Math.PI / 2, 0]}>
          <Label text="E-waste" h={0.075} color="#fafaf9" />
        </group>
      </Target>

      <Target ref={ladder} target="ladder">
        <LadderSide ref={front} z={RAIL_Z} lean={-LEAN} rungs />
        <LadderSide ref={back} z={-0.24} lean={LEAN} rungs={false} />
        <mesh ref={top} castShadow position={[0, 1.66, 0.18]}>
          <boxGeometry args={[0.52, 0.04, 0.22]} />
          <meshStandardMaterial color={LADDER_WOOD} />
        </mesh>
      </Target>

      <Man rig={rig} />
      <Spark fx={fx} size={7} />
    </Stage>
  )
}

export default function LightBulbScene(props: SceneProps) {
  return (
    <StageCanvas reduced={props.reduced} position={CAM_ROOM} far={30}>
      <Scene {...props} />
    </StageCanvas>
  )
}
