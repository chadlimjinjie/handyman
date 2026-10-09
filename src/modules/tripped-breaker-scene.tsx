import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { MathUtils } from 'three'
import type { AmbientLight, DirectionalLight, Group, Mesh, MeshStandardMaterial, PointLight } from 'three'
import {
  BODY,
  Box,
  DARK,
  Hit,
  Label,
  Rod,
  Rope,
  STEEL,
  Spark,
  Stage,
  StageCanvas,
  Target,
  WOOD,
  curve,
  lay,
  useEased,
  useSlip,
  v3,
  type SceneProps,
} from '@/scene/stage'
import { breakerPose, slipEffect, type Pose } from './tripped-breaker-pose'

const { lerp, smoothstep } = MathUtils

// World: metres, x right, y up, the kitchen wall is the plane z = 0 facing the camera. The
// distribution board is on it to the left of the worktop.
const CAM_BOARD = v3(-0.9, 1.5, 1.1)
const LOOK_BOARD = v3(-0.9, 1.5, 0)
const CAM_ROOM = v3(0.3, 1.6, 3.4)
const LOOK_ROOM = v3(0.3, 1.2, 0)
const BOARD = v3(-0.9, 1.5, 0)
const WORKTOP = 0.92
const LAMP = v3(0.5, 2.15, 0.7)

// the three circuits, as [target, label, pose key, x on the board]
const MCBS = [
  ['mcb-lights', 'Lights', 'lightsMcb', -0.02],
  ['mcb-rooms', 'Rooms', 'roomsMcb', 0.09],
  ['mcb-kitchen', 'Kitchen', 'kitchenMcb', 0.2],
] as const

const KETTLE = v3(0.3, WORKTOP, 0.3)
const COOKER = v3(0.95, WORKTOP, 0.3)
const SOCKET_Y = 1.25
const KETTLE_PLUG_IN = v3(KETTLE.x, SOCKET_Y, 0.04)
const KETTLE_PLUG_OUT = v3(KETTLE.x + 0.24, WORKTOP + 0.02, 0.22)
const COOKER_PLUG = v3(COOKER.x, SOCKET_Y, 0.04)

const SECONDS: Partial<Record<keyof Pose, number>> = {
  // long enough for the kitchen breaker to be seen going on before the RCCB drops
  rccbUp: 0.5,
  lightsMcb: 0.15,
  roomsMcb: 0.15,
  kitchenMcb: 0.15,
  kettleIn: 1.2,
  closeUp: 1.4,
}

// a breaker's switch snaps between down and up
const toggleY = (v: number) => lerp(-0.03, 0.03, smoothstep(v, 0.4, 0.6))
const glow = (o: Mesh | null) => o!.material as MeshStandardMaterial
const look = v3(0, 0, 0)
const plug = v3(0, 0, 0)

function Scene({ step, slip, mistakes, onAct, reduced }: SceneProps) {
  const ambient = useRef<AmbientLight>(null)
  const sun = useRef<DirectionalLight>(null)
  const lamp = useRef<Mesh>(null)
  const lampLight = useRef<PointLight>(null)
  const rccb = useRef<Mesh>(null)
  const toggles = useRef<Partial<Record<string, Mesh | null>>>({})
  const kettlePlug = useRef<Mesh>(null)
  const kettleCord = useRef<Group>(null)
  const cookerCord = useRef<Group>(null)
  const kettleLed = useRef<Mesh>(null)
  const cookerLed = useRef<Mesh>(null)

  const eased = useEased(breakerPose, step, reduced, SECONDS)
  const fx = useSlip({ slip, mistakes, reduced }, slip ? slipEffect(step, slip) : '', 0.004)

  useFrame(({ camera }) => {
    const c = eased.current
    const f = fx.current

    // A trip slip plays out on the board: pushed up it drops straight back, and one that was
    // holding is knocked down for a moment.
    let up = smoothstep(c.rccbUp, 0.4, 0.6)
    if (f.kind === 'trip' && f.k > 0) {
      up = c.rccbUp > 0.5 ? (f.t > 0.15 && f.t < 0.7 ? 0 : 1) : f.t < 0.25 ? 1 : 0
    }
    rccb.current!.position.y = lerp(-0.03, 0.03, up)
    for (const [target, , key] of MCBS) toggles.current[target]!.position.y = toggleY(c[key])

    // what has power: each circuit needs its own breaker and the RCCB
    const lights = up * c.lightsMcb
    const kitchen = up * c.kitchenMcb
    ambient.current!.intensity = lerp(0.45, 1.2, lights)
    sun.current!.intensity = lerp(0.5, 1.5, lights)
    glow(lamp.current).emissiveIntensity = lights * 1.5
    lampLight.current!.intensity = lights * 2
    glow(cookerLed.current).emissiveIntensity = kitchen * 3
    glow(kettleLed.current).emissiveIntensity = kitchen * c.kettleIn * 3

    // the kettle's plug comes out of the socket and is left on the worktop
    const out = smoothstep(1 - c.kettleIn, 0, 1)
    plug.lerpVectors(KETTLE_PLUG_IN, KETTLE_PLUG_OUT, out)
    plug.z += Math.sin(out * Math.PI) * 0.15
    kettlePlug.current!.position.copy(plug)
    curve.v0.set(KETTLE.x + 0.06, WORKTOP + 0.02, KETTLE.z - 0.06)
    curve.v2.copy(plug)
    curve.v1.set((curve.v0.x + plug.x) / 2 + 0.1, WORKTOP + 0.01, 0.12)
    lay(kettleCord.current!)
    curve.v0.set(COOKER.x + 0.08, WORKTOP + 0.03, COOKER.z - 0.08)
    curve.v2.copy(COOKER_PLUG)
    curve.v1.set(COOKER.x + 0.14, WORKTOP + 0.01, 0.12)
    lay(cookerCord.current!)

    const near = smoothstep(c.closeUp, 0, 1)
    camera.position.lerpVectors(CAM_ROOM, CAM_BOARD, near)
    camera.lookAt(look.lerpVectors(LOOK_ROOM, LOOK_BOARD, near))
  })

  return (
    <Stage value={onAct}>
      <ambientLight ref={ambient} intensity={0.45} />
      <directionalLight
        ref={sun}
        castShadow
        intensity={0.5}
        position={[-1.5, 3.5, 4]}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-2.5}
        shadow-camera-right={2.5}
        shadow-camera-top={2.5}
        shadow-camera-bottom={-1.5}
        shadow-bias={-0.002}
      />

      {/* kitchen floor and wall, and the ceiling lamp that shows whether the lights circuit is on */}
      <Box size={[5, 0.04, 4]} color="#a8a29e" position={[0, -0.02, 1.2]} />
      <Box size={[5, 3, 0.04]} color="#e7e5e4" position={[0, 1.5, -0.02]} />
      <Rod r={0.006} len={0.5} color={DARK} position={[LAMP.x, LAMP.y + 0.3, LAMP.z]} />
      <mesh ref={lamp} position={LAMP.toArray()}>
        <sphereGeometry args={[0.09]} />
        <meshStandardMaterial color="#d6d3d1" emissive="#fff3b0" emissiveIntensity={0} />
      </mesh>
      <pointLight ref={lampLight} color="#fff3b0" intensity={0} distance={6} position={LAMP.toArray()} />

      {/* the distribution board: RCCB with its test button on the left, then one MCB per circuit */}
      <group position={BOARD.toArray()}>
        <Box size={[0.56, 0.4, 0.06]} color={BODY} position={[0.01, 0, 0.03]} />
        <Target target="rccb" position={[-0.17, 0.02, 0.075]}>
          <Box size={[0.12, 0.2, 0.03]} color="#e7e5e4" />
          <Box ref={rccb} size={[0.06, 0.05, 0.04]} color="#2563eb" position={[0, -0.03, 0.02]} />
        </Target>
        <Target target="test" position={[-0.17, -0.055, 0.1]}>
          <Box size={[0.035, 0.025, 0.02]} color="#facc15" />
          <Hit size={[0.07, 0.045, 0.03]} />
        </Target>
        <Label text="RCCB" h={0.026} position={[-0.17, -0.125, 0.062]} />
        <Label text="TEST" h={0.014} position={[-0.17, -0.032, 0.092]} />
        {MCBS.map(([target, text, , x]) => (
          <group key={target}>
            {/* at the start the learner switches all three off as one move */}
            <Target target={step === 0 ? 'mcbs' : target} position={[x, 0.02, 0.075]}>
              <Box size={[0.08, 0.16, 0.03]} color="#e7e5e4" />
              <Box
                ref={(m) => {
                  toggles.current[target] = m
                }}
                size={[0.04, 0.05, 0.04]}
                color={DARK}
                position={[0, 0.03, 0.02]}
              />
            </Target>
            <Label text={text} h={0.022} position={[x, -0.125, 0.062]} />
          </group>
        ))}
        {/* a roll of tape on the ledge beside it: the wrong fix */}
        <Box size={[0.16, 0.012, 0.1]} color={WOOD} position={[0.42, -0.15, 0.05]} />
        <Target target="tape" position={[0.42, -0.1, 0.05]}>
          <mesh castShadow>
            <torusGeometry args={[0.03, 0.014, 10, 24]} />
            <meshStandardMaterial color="#fde68a" />
          </mesh>
          <Hit size={[0.12, 0.1, 0.08]} />
        </Target>
        <Label text="Tape" h={0.022} position={[0.42, -0.18, 0.062]} />
      </group>

      {/* worktop and the cupboard under it */}
      <Box size={[1.9, 0.88, 0.56]} color={WOOD} position={[0.6, 0.44, 0.3]} />
      <Box size={[1.9, 0.04, 0.62]} color="#57534e" position={[0.6, WORKTOP - 0.02, 0.31]} />
      {[KETTLE.x, COOKER.x].map((x) => (
        <Box key={x} size={[0.15, 0.15, 0.02]} color={BODY} position={[x, SOCKET_Y, 0.01]} />
      ))}

      {/* the kettle, standing in water that has got into its base */}
      <mesh position={[KETTLE.x + 0.03, WORKTOP + 0.002, KETTLE.z + 0.02]}>
        <cylinderGeometry args={[0.16, 0.16, 0.003, 32]} />
        <meshStandardMaterial color="#7dd3fc" transparent opacity={0.7} roughness={0.1} />
      </mesh>
      <Target target="kettle" position={KETTLE.toArray()}>
        <Rod r={0.08} len={0.02} color={DARK} position={[0, 0.01, 0]} />
        <Rod r={0.07} top={0.055} len={0.19} color={STEEL} metal position={[0, 0.115, 0]} />
        <Box size={[0.02, 0.13, 0.03]} color={DARK} position={[0.085, 0.12, 0]} />
        <mesh ref={kettleLed} position={[0, 0.012, 0.08]}>
          <sphereGeometry args={[0.008]} />
          <meshStandardMaterial color={DARK} emissive="#f97316" emissiveIntensity={0} />
        </mesh>
        <Hit size={[0.24, 0.26, 0.2]} position={[0, 0.11, 0]} />
      </Target>
      <Box ref={kettlePlug} size={[0.05, 0.05, 0.04]} color={BODY} />
      <Rope ref={kettleCord} n={10} r={0.007} colors={[DARK]} />

      <Target target="cooker" position={COOKER.toArray()}>
        <Rod r={0.11} len={0.15} color={BODY} position={[0, 0.075, 0]} />
        <Rod r={0.11} top={0.07} len={0.03} color="#d6d3d1" position={[0, 0.165, 0]} />
        <mesh ref={cookerLed} position={[0, 0.06, 0.11]}>
          <sphereGeometry args={[0.008]} />
          <meshStandardMaterial color={DARK} emissive="#f97316" emissiveIntensity={0} />
        </mesh>
        <Hit size={[0.26, 0.22, 0.24]} position={[0, 0.09, 0]} />
      </Target>
      <Box size={[0.05, 0.05, 0.04]} color={BODY} position={COOKER_PLUG.toArray()} />
      <Rope ref={cookerCord} n={10} r={0.007} colors={[DARK]} />

      <Spark fx={fx} size={2} />
    </Stage>
  )
}

export default function TrippedBreakerScene(props: SceneProps) {
  return (
    <StageCanvas reduced={props.reduced} position={CAM_BOARD}>
      <Scene {...props} />
    </StageCanvas>
  )
}
