import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { MathUtils } from 'three'
import type { Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D, Vector3 } from 'three'
import {
  BODY,
  BRASS,
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
import { plugPose, slipEffect, type Pose } from './power-plug-pose'

const { lerp, smoothstep } = MathUtils

// World: metres, x right, y up, z toward the camera. Bench top is y = 0, the wall is at z = -0.2.
// The plug and socket are drawn about twice life size so the terminals can be seen and clicked.
const CAM_WALL = v3(0.13, 0.6, 1.04)
const LOOK_WALL = v3(0.13, 0.13, 0)
const CAM_BENCH = v3(0, 0.34, 0.27)
const LOOK_BENCH = v3(0, 0.02, 0.05)

const SOCKET_PLATE = [-0.16, 0.115, -0.2] as const
// A plug's origin is the middle of its back face. Pins point along -z, the flex leaves along -y.
// On the bench it lies face up (rotation.x = -90 degrees), earth away from the camera.
const IN_SOCKET = v3(-0.14, 0.115, -0.188)
const NEW_REST = v3(0, 0.024, 0.03)
const OLD_REST = v3(0.22, 0.024, 0.02)
const FUSE_REST = v3(-0.15, 0.006, 0.06)
const STRIPPER_REST = v3(-0.05, 0.008, 0.145)
const FLEX_FROM = v3(0.38, 0.008, 0)

// plug-local points
const ENTRY = v3(0, -0.055, 0.012)
const SHEATH_END = v3(0, -0.024, 0.014)
const FUSE_SEAT = v3(0.035, 0, 0.02)
const STUB_Y = -0.0395

const WIRES = [
  {
    key: 'wireE',
    target: 'term-e',
    letter: 'E',
    colors: ['#16a34a', '#facc15'],
    at: [0, 0.03],
    label: [-0.018, 0.036],
    free: v3(0, -0.002, 0.05),
  },
  {
    key: 'wireN',
    target: 'term-n',
    letter: 'N',
    colors: ['#2563eb'],
    at: [-0.03, 0],
    label: [-0.03, 0.025],
    free: v3(-0.016, -0.008, 0.045),
  },
  {
    key: 'wireL',
    target: 'term-l',
    letter: 'L',
    colors: ['#78350f'],
    at: [0.012, 0],
    label: [0.019, 0.026],
    free: v3(0.016, -0.008, 0.045),
  },
] as const

// seconds for a part to travel between its two states; the rest take 0.9
const SECONDS: Partial<Record<keyof Pose, number>> = {
  stripped: 2.2,
  oldIn: 1.2,
  newIn: 1.4,
  closeUp: 1.2,
}
// Carries a plug between the bench and the socket, pins going in square at the end.
function carry(plug: Group, rest: Vector3, inSocket: number) {
  const p = smoothstep(inSocket, 0, 1)
  const arc = Math.sin(p * Math.PI)
  plug.position.lerpVectors(rest, IN_SOCKET, p)
  plug.position.y += arc * 0.05
  plug.position.z += arc * 0.1
  plug.rotation.x = ((p - 1) * Math.PI) / 2
}

function Pins() {
  return (
    <>
      <Box size={[0.01, 0.02, 0.024]} color={BRASS} metal position={[0, 0.028, -0.012]} />
      <Box size={[0.016, 0.008, 0.022]} color={BRASS} metal position={[-0.024, -0.014, -0.011]} />
      <Box size={[0.016, 0.008, 0.022]} color={BRASS} metal position={[0.024, -0.014, -0.011]} />
    </>
  )
}

function Fuse({ band }: { band: string }) {
  return (
    <>
      <Rod r={0.006} len={0.04} color={BODY} />
      <Rod r={0.0062} len={0.012} color={band} />
      <Rod r={0.0066} len={0.008} color={STEEL} metal position={[0, 0.016, 0]} />
      <Rod r={0.0066} len={0.008} color={STEEL} metal position={[0, -0.016, 0]} />
      <Hit size={[0.03, 0.055, 0.03]} />
    </>
  )
}

const flexEnd = v3(0, 0, 0)
const newEntry = v3(0, 0, 0)
const point = v3(0, 0, 0)
const tip = v3(0, 0, 0)
const bend = v3(0, 0, 0)
const sheathEnd = v3(0, 0, 0)
const look = v3(0, 0, 0)
const material = (o: Object3D) => (o as Mesh).material as MeshStandardMaterial | MeshBasicMaterial

function Scene({ step, slip, mistakes, onAct, reduced }: SceneProps) {
  const rocker = useRef<Group>(null)
  const redMark = useRef<Mesh>(null)
  const oldPlug = useRef<Group>(null)
  const plug = useRef<Group>(null)
  const cover = useRef<Group>(null)
  const grip = useRef<Group>(null)
  const stub = useRef<Mesh>(null)
  const cores = useRef<(Group | null)[]>([])
  const screws = useRef<(Group | null)[]>([])
  const flex = useRef<Group>(null)
  const stripper = useRef<Group>(null)
  const fuse = useRef<Group>(null)
  const blades = useRef<Group>(null)
  const smoke = useRef<Group>(null)

  const eased = useEased(plugPose, step, reduced, SECONDS)
  const fx = useSlip({ slip, mistakes, reduced }, slip ? slipEffect(step, slip) : '')
  const camera = useThree((s) => s.camera)

  useEffect(() => {
    // the spark jumps where the live copper is, which is not always the thing clicked
    const live = slip === 'strip' ? oldPlug.current : slip === 'plug' ? plug.current : null
    live?.getWorldPosition(fx.current.at).lerp(camera.position, 0.12)
  }, [mistakes, slip, camera, fx])

  useFrame(({ camera }, delta) => {
    const c = eased.current
    const f = fx.current
    const k = f.k
    const swell = Math.sin(Math.PI * k)
    const tug = f.kind === 'tug' ? swell : 0

    rocker.current!.rotation.x = lerp(-0.22, 0.22, smoothstep(c.socketOn, 0, 1))
    redMark.current!.visible = c.socketOn > 0.5

    carry(oldPlug.current!, OLD_REST, c.oldIn)
    // cut off with the damaged end of the flex
    oldPlug.current!.scale.setScalar(1 - smoothstep(c.stripped, 0, 0.25))
    carry(plug.current!, NEW_REST, c.newIn)

    const off = smoothstep(c.coverOff, 0, 1)
    cover.current!.position.set(0.115 * off, 0, -0.029 * off + Math.sin(off * Math.PI) * 0.07)

    const gripped = smoothstep(c.gripped, 0, 1)
    grip.current!.position.z = lerp(0.028, 0.021, gripped)
    grip.current!.position.y = lerp(-0.042, -0.034, gripped)
    grip.current!.rotation.z = lerp(0.25, 0, gripped)

    // The flex leaves the old plug for the new one, the stripper visits it, then the cores appear.
    plug.current!.localToWorld(newEntry.copy(ENTRY))
    oldPlug.current!.localToWorld(flexEnd.copy(ENTRY))
    flexEnd.lerp(newEntry, smoothstep(c.stripped, 0.05, 0.45))
    curve.v0.copy(FLEX_FROM)
    curve.v2.copy(flexEnd)
    curve.v1.addVectors(FLEX_FROM, flexEnd).multiplyScalar(0.5)
    curve.v1.y = 0.008
    curve.v1.z += 0.12
    lay(flex.current!)
    curve.getPoint(0.5, point)

    const heat = f.kind === 'heat' ? swell : 0
    for (const seg of flex.current!.children) {
      ;(material(seg) as MeshStandardMaterial).emissiveIntensity = heat * 1.5
    }
    smoke.current!.visible = heat > 0
    smoke.current!.position.copy(point).setY(point.y + 0.02 + (1 - k) * 0.12)
    smoke.current!.scale.setScalar(1 + (1 - k) * 2)
    for (const puff of smoke.current!.children) material(puff).opacity = heat * 0.5

    const visit = smoothstep(c.stripped, 0.25, 0.5) - smoothstep(c.stripped, 0.7, 0.95)
    stripper.current!.position.lerpVectors(STRIPPER_REST, newEntry, visit)
    stripper.current!.position.y += Math.sin(visit * Math.PI) * 0.05 + visit * 0.012
    stripper.current!.rotation.y = lerp(0.3, Math.PI / 2, visit)

    const bared = smoothstep(c.stripped, 0.6, 1)
    stub.current!.visible = c.stripped > 0.45
    stub.current!.position.y = STUB_Y - tug * 0.014
    sheathEnd.copy(SHEATH_END).setY(SHEATH_END.y - tug * 0.014)
    WIRES.forEach((w, i) => {
      // the core swings over and into its terminal, then the screw goes down on it
      const home = smoothstep(c[w.key], 0, 0.7) * (1 - tug)
      tip.set(w.at[0], w.at[1] - 0.007, 0.018)
      tip.lerpVectors(w.free, tip, home)
      tip.z += Math.sin(home * Math.PI) * 0.012
      bend.set(w.at[0], SHEATH_END.y + 0.004, 0.016)
      point.set(w.free.x * 0.5, SHEATH_END.y + 0.01, 0.035)
      bend.lerpVectors(point, bend, home)
      curve.v0.copy(sheathEnd)
      curve.v1.lerpVectors(sheathEnd, bend, bared)
      curve.v2.lerpVectors(sheathEnd, tip, bared)
      const core = cores.current[i]!
      core.visible = bared > 0.01
      lay(core)
      screws.current[i]!.rotation.z = smoothstep(c[w.key], 0.6, 1) * Math.PI * 4
    })

    const seated = smoothstep(c.fuseIn, 0, 1)
    plug.current!.localToWorld(point.copy(FUSE_SEAT))
    fuse.current!.position.lerpVectors(FUSE_REST, point, seated)
    fuse.current!.position.y += Math.sin(seated * Math.PI) * 0.06
    fuse.current!.rotation.x = Math.PI / 2
    // it rides inside the closed plug from here on
    fuse.current!.visible = c.newIn === 0

    blades.current!.rotation.z -= delta * 22 * smoothstep(c.fanOn, 0, 1)

    const closeUp = smoothstep(c.closeUp, 0, 1)
    camera.position.lerpVectors(CAM_WALL, CAM_BENCH, closeUp)
    camera.lookAt(look.lerpVectors(LOOK_WALL, LOOK_BENCH, closeUp))
  })

  return (
    <Stage value={onAct}>
      <ambientLight intensity={1.1} />
      <directionalLight
        castShadow
        intensity={1.8}
        position={[-0.5, 1.2, 0.8]}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-0.8}
        shadow-camera-right={0.8}
        shadow-camera-top={0.8}
        shadow-camera-bottom={-0.8}
        shadow-camera-near={0.1}
        shadow-camera-far={4}
        shadow-bias={-0.0005}
      />

      {/* floor, wall, bench */}
      <Box size={[6, 0.02, 6]} color="#a8a29e" position={[0, -0.8, 0]} />
      <Box size={[3, 2.4, 0.02]} color="#fef3c7" position={[0.1, 0.3, -0.21]} />
      <Box size={[1, 0.04, 0.5]} color={WOOD} position={[-0.1, -0.02, 0.05]} />

      <group position={SOCKET_PLATE}>
        {/* a plug in the socket has no handler of its own, so a click on it lands here too */}
        <Target target="plug">
          <Box size={[0.18, 0.16, 0.012]} color="#fafaf9" position={[0, 0, 0.006]} />
          <Box size={[0.01, 0.02, 0.002]} color={DARK} position={[0.02, 0.028, 0.0125]} />
          <Box size={[0.016, 0.008, 0.002]} color={DARK} position={[-0.004, -0.014, 0.0125]} />
          <Box size={[0.016, 0.008, 0.002]} color={DARK} position={[0.044, -0.014, 0.0125]} />
        </Target>
        <Target target="socket-switch" position={[-0.062, 0.03, 0.014]}>
          {/* Singapore rockers: down is ON, and the top then sticks out showing red */}
          <group ref={rocker}>
            <Box size={[0.024, 0.04, 0.012]} color="#e7e5e4" />
            <mesh ref={redMark} position={[0, 0.013, 0.0005]}>
              <boxGeometry args={[0.02, 0.01, 0.0125]} />
              <meshStandardMaterial color="#dc2626" emissive="#dc2626" emissiveIntensity={0.6} />
            </mesh>
          </group>
          <Hit size={[0.045, 0.07, 0.03]} />
        </Target>
      </group>

      {/* the cracked plug the fan arrived with */}
      <group ref={oldPlug}>
        <Box size={[0.1, 0.1, 0.035]} color="#e7e2d6" position={[0, 0, 0.0175]} />
        <Box size={[0.075, 0.004, 0.002]} color="#7f1d1d" position={[0.004, 0.012, 0.0355]} rotation={[0, 0, 0.6]} />
        <Box size={[0.04, 0.004, 0.002]} color="#7f1d1d" position={[0.02, -0.014, 0.0355]} rotation={[0, 0, -0.5]} />
        <Pins />
      </group>

      <group ref={plug}>
        <Box size={[0.1, 0.1, 0.01]} color={BODY} position={[0, 0, 0.005]} />
        <Box size={[0.005, 0.1, 0.018]} color={BODY} position={[-0.0475, 0, 0.019]} />
        <Box size={[0.005, 0.1, 0.018]} color={BODY} position={[0.0475, 0, 0.019]} />
        <Box size={[0.09, 0.005, 0.018]} color={BODY} position={[0, 0.0475, 0.019]} />
        <Box size={[0.036, 0.005, 0.018]} color={BODY} position={[-0.027, -0.0475, 0.019]} />
        <Box size={[0.036, 0.005, 0.018]} color={BODY} position={[0.027, -0.0475, 0.019]} />
        <Pins />

        {WIRES.map((w, i) => (
          <group key={w.target}>
            <Target target={w.target} position={[w.at[0], w.at[1], 0.017]}>
              <Box size={[0.016, 0.014, 0.014]} color={BRASS} metal />
              <group
                ref={(g) => {
                  screws.current[i] = g
                }}
                position={[0, 0, 0.009]}
              >
                <Rod r={0.005} len={0.004} color={STEEL} metal rotation={[Math.PI / 2, 0, 0]} />
                <Box size={[0.008, 0.0015, 0.001]} color={DARK} position={[0, 0, 0.002]} />
              </group>
              <Hit size={[0.026, 0.024, 0.03]} />
            </Target>
            <Label text={w.letter} h={0.012} position={[w.label[0], w.label[1], 0.0103]} />
            <Rope
              ref={(g) => {
                cores.current[i] = g
              }}
              n={8}
              r={0.0028}
              colors={w.colors}
              bareTip
            />
          </group>
        ))}

        {/* fuse clips, on the live side */}
        <Box size={[0.012, 0.006, 0.012]} color={BRASS} metal position={[0.035, 0.019, 0.016]} />
        <Box size={[0.012, 0.006, 0.012]} color={BRASS} metal position={[0.035, -0.019, 0.016]} />

        {/* outer sheath, from the flex entry to where the cores split */}
        <mesh ref={stub} position={[0, STUB_Y, 0.012]}>
          <cylinderGeometry args={[0.006, 0.006, 0.031, 12]} />
          <meshStandardMaterial color={DARK} />
        </mesh>

        <Target ref={grip} target="grip" position={[0, -0.042, 0.028]}>
          <Box size={[0.036, 0.008, 0.006]} color="#57534e" />
          <Rod r={0.003} len={0.003} color={STEEL} metal position={[-0.013, 0, 0.004]} rotation={[Math.PI / 2, 0, 0]} />
          <Rod r={0.003} len={0.003} color={STEEL} metal position={[0.013, 0, 0.004]} rotation={[Math.PI / 2, 0, 0]} />
          <Hit size={[0.044, 0.018, 0.02]} />
        </Target>

        {/* Closed and finished, the natural click is "plug this in". */}
        <Target ref={cover} target={step >= 10 ? 'plug' : 'cover'}>
          <Box size={[0.104, 0.104, 0.032]} color={BODY} position={[0, 0, 0.021]} />
          <Rod r={0.006} len={0.002} color={STEEL} metal position={[0, 0, 0.0375]} rotation={[Math.PI / 2, 0, 0]} />
        </Target>
      </group>

      <Rope ref={flex} n={16} r={0.006} colors={[DARK]} />

      <Target ref={stripper} target="strip">
        <Box size={[0.075, 0.01, 0.012]} color="#dc2626" position={[-0.03, 0, 0.011]} rotation={[0, 0.16, 0]} />
        <Box size={[0.075, 0.01, 0.012]} color="#dc2626" position={[-0.03, 0, -0.011]} rotation={[0, -0.16, 0]} />
        <Box size={[0.04, 0.008, 0.007]} color={STEEL} metal position={[0.027, 0, 0.004]} />
        <Box size={[0.04, 0.008, 0.007]} color={STEEL} metal position={[0.027, 0, -0.004]} />
        <Rod r={0.006} len={0.012} color={DARK} position={[0.008, 0, 0]} />
        <Hit size={[0.13, 0.03, 0.06]} />
      </Target>

      {/* the choice of fuses, laid out on the bench */}
      <Target ref={fuse} target="fuse-3a">
        <Fuse band="#dc2626" />
      </Target>
      <Target target="fuse-13a" position={[-0.115, 0.006, 0.06]} rotation={[Math.PI / 2, 0, 0]}>
        <Fuse band="#92400e" />
      </Target>
      <Target target="fuse-foil" position={[-0.08, 0.007, 0.06]} rotation={[0, Math.PI / 2, 0]}>
        <mesh castShadow scale={[1.7, 0.55, 0.8]}>
          <icosahedronGeometry args={[0.012, 0]} />
          <meshStandardMaterial color="#e5e7eb" metalness={0.5} roughness={0.3} flatShading />
        </mesh>
        <Hit size={[0.05, 0.03, 0.03]} />
      </Target>
      {['3A', '13A', 'Foil'].map((text, i) => (
        <Label
          key={text}
          text={text}
          h={0.013}
          color="#fffbeb"
          position={[-0.15 + i * 0.035, 0.001, 0.094]}
          rotation={[-Math.PI / 2, 0, 0]}
        />
      ))}

      {/* standing fan on the floor beside the bench: only its head clears the bench top */}
      <group position={[0.4, 0.25, -0.06]}>
        <Rod r={0.012} len={0.9} color={STEEL} metal position={[0, -0.5, -0.03]} />
        <Rod r={0.05} len={0.08} color={STEEL} metal position={[0, 0, -0.04]} rotation={[Math.PI / 2, 0, 0]} />
        {[0, 0.035].map((z) => (
          <mesh key={z} position={[0, 0, z]}>
            <torusGeometry args={[0.14, 0.004, 8, 48]} />
            <meshStandardMaterial color={STEEL} metalness={0.35} roughness={0.4} />
          </mesh>
        ))}
        {[0, 1, 2, 3].map((n) => (
          <Box
            key={n}
            size={[0.28, 0.003, 0.003]}
            color={STEEL}
            metal
            position={[0, 0, 0.036]}
            rotation={[0, 0, (n * Math.PI) / 4]}
          />
        ))}
        <group ref={blades} position={[0, 0, 0.016]}>
          <Rod r={0.022} len={0.03} color={DARK} rotation={[Math.PI / 2, 0, 0]} />
          {[0, 1, 2].map((n) => (
            <group key={n} rotation={[0, 0, (n * Math.PI * 2) / 3]}>
              <Box size={[0.1, 0.05, 0.004]} color="#cbd5e1" position={[0.07, 0, 0]} rotation={[0.35, 0, 0]} />
            </group>
          ))}
        </group>
        {/* rating plate */}
        <Box size={[0.1, 0.04, 0.003]} color="#fafaf9" position={[0, -0.2, -0.016]} />
        <Label text="55W" h={0.032} position={[0, -0.2, -0.014]} />
      </group>

      <Spark fx={fx} />

      <group ref={smoke} visible={false}>
        {[-0.014, 0.004, 0.016].map((x, i) => (
          <mesh key={x} position={[x, i * 0.012, 0]}>
            <sphereGeometry args={[0.012 + i * 0.003]} />
            <meshBasicMaterial color="#57534e" transparent opacity={0} depthWrite={false} />
          </mesh>
        ))}
      </group>
    </Stage>
  )
}

export default function PowerPlugScene(props: SceneProps) {
  return (
    <StageCanvas reduced={props.reduced} position={CAM_WALL}>
      <Scene {...props} />
    </StageCanvas>
  )
}
