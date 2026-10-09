import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef, type ReactNode } from 'react'
import { MathUtils } from 'three'
import type { Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D, PointLight, Vector3 } from 'three'
import { Man, type Rig } from '@/scene/man'
import {
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
import { firePose, slipEffect, type Pose } from './fire-extinguisher-pose'

const { smoothstep } = MathUtils

// World: metres, x right, y up, z toward the camera. A workshop: the only door is in the left
// wall, the back wall is at z = -2, the burning power strip is under the bench on the right.
const CAM_ROOM = v3(-0.1, 2.6, 5.6)
const LOOK_ROOM = v3(-0.15, 0.95, -1)
const CAM_NEAR = v3(-0.75, 1.75, 2.7)
const LOOK_NEAR = v3(-0.5, 0.8, -1.2)

const START = v3(0, 0, 1.6)
// door at his back, a couple of metres from the fire
const DOOR_SPOT = v3(-1.55, 0, -1)
const BY_DOOR = v3(-2.2, 0, -1)
const CORNER_SPOT = v3(2.35, 0, -1.2)
const FIRE = v3(1.1, 0.06, -1.5)
// rotation.y that turns him from facing the back wall to facing the fire
const FACE_FIRE = -1.39
const RACK = [-1.5, -0.95, -0.4]
const RACK_Z = -1.78
const ON_RACK = v3(RACK[0], 0.29, RACK_Z)

// in the extinguisher's own frame: where the hose leaves the valve, and where the nozzle clips on
const HOSE_FROM = v3(0, 0.3, -0.06)
const NOZZLE_CLIP = v3(0.13, 0, -0.04)
// in the frame of his forearm: the middle of the hand, and what hangs from it
const IN_HAND = v3(0, -0.36, 0)
const CARRIED = v3(0, -0.72, 0)

const SECONDS: Partial<Record<keyof Pose, number>> = {
  holding: 1.3,
  atDoor: 2.2,
  squeezing: 2.4,
  burning: 3,
  backedOut: 1.8,
  closeUp: 1.4,
}

// An extinguisher, origin at the middle of its cylinder. `children` is its valve gear.
function Extinguisher({ band, children }: { band: string; children?: ReactNode }) {
  return (
    <>
      <Rod r={0.1} len={0.46} color="#dc2626" />
      <mesh position={[0, 0.23, 0]} scale={[1, 0.5, 1]}>
        <sphereGeometry args={[0.1]} />
        <meshStandardMaterial color="#dc2626" />
      </mesh>
      <Rod r={0.102} len={0.12} color={band} position={[0, 0.03, 0]} />
      <Box size={[0.07, 0.08, 0.07]} color={DARK} position={[0, 0.31, 0]} />
      <Box size={[0.2, 0.02, 0.04]} color={DARK} position={[0.07, 0.34, 0]} />
      {children}
    </>
  )
}

const UP = v3(0, 1, 0)
const dir = v3(0, 0, 0)
// Stretches a mesh that is 1 long in y from `a` to `b`.
function span(mesh: Object3D, a: Vector3, b: Vector3) {
  const len = dir.subVectors(b, a).length()
  mesh.position.addVectors(a, b).multiplyScalar(0.5)
  mesh.scale.y = len
  mesh.quaternion.setFromUnitVectors(UP, dir.divideScalar(len))
}

const spot = v3(0, 0, 0)
const held = v3(0, 0, 0)
const nozzle = v3(0, 0, 0)
const valve = v3(0, 0, 0)
const aim = v3(0, 0, 0)
const chest = v3(0, 0, 0)
const look = v3(0, 0, 0)

function Scene({ step, slip, mistakes, onAct, reduced }: SceneProps) {
  const rig = useRef({} as Rig)
  const button = useRef<Mesh>(null)
  const beacon = useRef<MeshStandardMaterial>(null)
  const unit = useRef<Group>(null)
  const pin = useRef<Group>(null)
  const lever = useRef<Group>(null)
  const hose = useRef<Group>(null)
  const powder = useRef<Mesh>(null)
  const jet = useRef<Mesh>(null)
  const flames = useRef<Group>(null)
  const glow = useRef<PointLight>(null)

  const eased = useEased(firePose, step, reduced, SECONDS)
  const fx = useSlip({ slip, mistakes, reduced }, slip ? slipEffect(step, slip) : '', 0.03)
  const camera = useThree((s) => s.camera)

  useEffect(() => {
    // the current comes back to him, not to the extinguisher that was clicked
    if (slip !== 'water' && slip !== 'foam') return
    rig.current.head.getWorldPosition(fx.current.at).lerp(camera.position, 0.1)
  }, [mistakes, slip, camera, fx])

  useFrame(({ camera, clock }) => {
    const c = eased.current
    const f = fx.current
    const t = clock.elapsedTime
    const swell = Math.sin(Math.PI * f.k)
    const flare = f.kind === 'flare' ? swell : 0
    const shock = f.kind === 'shock' ? f.k : 0

    button.current!.position.z = 0.05 - c.alarmOn * 0.02
    beacon.current!.emissiveIntensity = c.alarmOn * (1 + Math.sin(t * 11))

    // He walks to the spot by the door, turning to face the fire, and at the end backs out.
    const man = rig.current
    const toDoor = smoothstep(c.atDoor, 0, 1)
    const out = smoothstep(c.backedOut, 0, 1)
    man.root.position.lerpVectors(START, DOOR_SPOT, toDoor).lerp(BY_DOOR, out)
    const moving = Math.min(1, 6 * (c.atDoor * (1 - c.atDoor) + c.backedOut * (1 - c.backedOut)))
    const stride = Math.sin((c.atDoor + c.backedOut) * Math.PI * 7) * 0.55 * moving
    man.legL.rotation.x = stride
    man.legR.rotation.x = -stride
    man.kneeL.rotation.x = -Math.max(0, stride)
    man.kneeR.rotation.x = -Math.max(0, -stride)
    // the sweep: side to side across the base while the fire dies
    const sway = Math.sin(t * 5) * Math.min(1, 5 * c.burning * (1 - c.burning))
    man.root.rotation.y = FACE_FIRE * smoothstep(c.atDoor, 0.1, 0.8) + sway * 0.2
    man.root.position.x += Math.sin(t * 60) * 0.02 * shock
    // right hand carries it by the handle, left hand points the hose
    const aiming = smoothstep(c.aimed, 0, 1)
    man.armL.rotation.x = aiming * 1.2
    man.elbowL.rotation.x = aiming * 0.25
    man.head.rotation.x = aiming * 0.15
    man.root.updateWorldMatrix(true, true)

    const carried = smoothstep(c.holding, 0, 1)
    man.elbowR.localToWorld(held.copy(CARRIED))
    unit.current!.position.lerpVectors(ON_RACK, held, carried)
    unit.current!.position.y += Math.sin(carried * Math.PI) * 0.5
    unit.current!.rotation.y = man.root.rotation.y * carried
    lever.current!.rotation.z = -0.3 * smoothstep(c.squeezing, 0, 0.3)
    const pulled = smoothstep(c.pinOut, 0, 1)
    pin.current!.position.set(0.02, 0.34 - pulled * pulled * 0.6, 0.06 + pulled * 0.3)
    pin.current!.visible = c.pinOut < 0.98
    unit.current!.updateWorldMatrix(true, false)

    // hose: from the valve to the nozzle, which is clipped to the cylinder until he takes it
    unit.current!.localToWorld(valve.copy(HOSE_FROM))
    unit.current!.localToWorld(nozzle.copy(NOZZLE_CLIP))
    man.elbowL.localToWorld(spot.copy(IN_HAND))
    nozzle.lerp(spot, smoothstep(c.holding, 0.6, 1))
    curve.v0.copy(valve)
    curve.v2.copy(nozzle)
    curve.v1.addVectors(valve, nozzle).multiplyScalar(0.5)
    curve.v1.y -= 0.12 * carried
    lay(hose.current!)

    aim.copy(FIRE)
    aim.z += sway * 0.45
    powder.current!.visible = c.squeezing > 0.02
    span(powder.current!, aim, nozzle)
    ;(powder.current!.material as MeshBasicMaterial).opacity = Math.min(1, c.squeezing * 3) * 0.5

    man.root.localToWorld(chest.set(0, 1.1, -0.2))
    jet.current!.visible = shock > 0
    span(jet.current!, FIRE, chest)

    // flames die back under the powder, and surge when a slip gives them the upper hand
    flames.current!.scale.setScalar(Math.max(0.001, c.burning * (1 + flare * 0.7)))
    flames.current!.children.forEach((flame, i) => {
      flame.scale.y = 1 + 0.25 * Math.sin(t * (9 + i * 3) + i)
    })
    glow.current!.intensity = c.burning * (7 + 2 * Math.sin(t * 13)) * (1 + flare)

    const near = smoothstep(c.closeUp, 0, 1)
    camera.position.lerpVectors(CAM_ROOM, CAM_NEAR, near)
    camera.lookAt(look.lerpVectors(LOOK_ROOM, LOOK_NEAR, near))
  })

  const holding = step >= 2
  const gear = (
    <>
      <Target target={holding ? 'lever' : 'powder'} position={[0.07, 0.37, 0]}>
        <group ref={lever} position={[-0.07, 0, 0]}>
          <Box size={[0.22, 0.02, 0.04]} color={STEEL} metal position={[0.1, 0.012, 0]} />
        </group>
        <Hit size={[0.3, 0.14, 0.2]} position={[0.04, 0.03, 0]} />
      </Target>
      <Target ref={pin} target={holding ? 'pin' : 'powder'}>
        <mesh rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[0.045, 0.01, 8, 20]} />
          <meshStandardMaterial color="#facc15" />
        </mesh>
        <Hit size={[0.16, 0.16, 0.16]} />
      </Target>
    </>
  )

  return (
    <Stage value={onAct}>
      <ambientLight intensity={1.1} />
      <directionalLight
        castShadow
        intensity={1.5}
        position={[2, 5, 4]}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-4}
        shadow-camera-right={4}
        shadow-camera-top={4}
        shadow-camera-bottom={-3}
        shadow-bias={-0.002}
      />

      {/* floor, back wall, left wall */}
      <Box size={[6, 0.1, 5]} color="#a8a29e" position={[0.15, -0.05, 0.4]} />
      <Box size={[6, 3.2, 0.1]} color="#fef3c7" position={[0.15, 1.6, -2.1]} />
      <Box size={[0.1, 3.2, 5]} color="#fef3c7" position={[-2.85, 1.6, 0.4]} />

      {/* the only exit */}
      <Target target="back-away" position={[-2.78, 0, -1]}>
        <Box size={[0.06, 2.05, 0.95]} color={WOOD} position={[0, 1.025, 0]} />
        <Rod r={0.03} len={0.1} color={STEEL} metal position={[0.06, 1, 0.35]} rotation={[0, 0, Math.PI / 2]} />
        <Box size={[0.04, 0.2, 0.55]} color="#16a34a" position={[0, 2.25, 0]} />
        <group position={[0.022, 2.25, 0]} rotation={[0, Math.PI / 2, 0]}>
          <Label text="EXIT" h={0.16} color="#fafaf9" />
        </group>
      </Target>

      <Target target="alarm" position={[-2.15, 1.4, -2.05]}>
        <Box size={[0.26, 0.26, 0.08]} color="#dc2626" position={[0, 0, 0.04]} />
        <mesh ref={button} position={[0, 0, 0.05]}>
          <boxGeometry args={[0.13, 0.13, 0.06]} />
          <meshStandardMaterial color="#fafaf9" />
        </mesh>
        <mesh position={[0, 0.3, 0.08]}>
          <sphereGeometry args={[0.08]} />
          <meshStandardMaterial ref={beacon} color="#b91c1c" emissive="#ff2a2a" emissiveIntensity={0} />
        </mesh>
        <Hit size={[0.4, 0.75, 0.2]} position={[0, 0.12, 0.08]} />
      </Target>

      {/* the three extinguishers; the dry powder one is the one he takes */}
      <group ref={unit}>
        {holding ? (
          <Extinguisher band="#2563eb">{gear}</Extinguisher>
        ) : (
          <Target target="powder">
            <Extinguisher band="#2563eb">{gear}</Extinguisher>
          </Target>
        )}
      </group>
      <Rope ref={hose} n={10} r={0.018} colors={[DARK]} />
      <Target target="water" position={[RACK[1], 0.29, RACK_Z]}>
        <Extinguisher band="#fafaf9" />
      </Target>
      <Target target="foam" position={[RACK[2], 0.29, RACK_Z]}>
        <Extinguisher band="#fde68a" />
      </Target>
      {['Powder', 'Water', 'Foam'].map((text, i) => (
        <Label key={text} text={text} h={0.1} position={[RACK[i], 0.86, -2.04]} />
      ))}

      {/* workbench, with the overloaded power strip under it */}
      <Box size={[1.4, 0.06, 0.7]} color={WOOD} position={[1.1, 0.85, -1.65]} />
      {[0.46, 1.74].map((x) => (
        <Box key={x} size={[0.07, 0.82, 0.62]} color={WOOD} position={[x, 0.41, -1.65]} />
      ))}
      <Target target="base" position={FIRE.toArray()}>
        <Box size={[0.55, 0.06, 0.14]} color="#1c1917" />
        <Hit size={[0.9, 0.2, 0.5]} position={[0, 0.04, 0]} />
      </Target>
      <pointLight ref={glow} color="#ff7a1a" intensity={0} position={[FIRE.x, 0.4, FIRE.z + 0.2]} />
      <Target target="flames" position={[FIRE.x, 0.1, FIRE.z]}>
        <group ref={flames}>
          {[-0.2, -0.08, 0.04, 0.16, 0.25].map((x, i) => (
            <mesh key={x} position={[x, 0.16 + (i % 2) * 0.07, (i % 3) * 0.03]}>
              <coneGeometry args={[0.07 + (i % 2) * 0.02, 0.36 + (i % 2) * 0.16, 8]} />
              <meshBasicMaterial color={i % 2 ? '#fbbf24' : '#f97316'} />
            </mesh>
          ))}
          <Hit size={[0.75, 0.5, 0.35]} position={[0, 0.34, 0]} />
        </group>
      </Target>

      {/* places to stand, and the sweep in front of the fire */}
      {[
        { target: 'stand-door', at: DOOR_SPOT, text: 'Door side' },
        { target: 'stand-corner', at: CORNER_SPOT, text: 'Far corner' },
      ].map(({ target, at, text }) => (
        <Target key={target} target={target} position={[at.x, 0.006, at.z]}>
          <Rod r={0.34} len={0.01} color="#0369a1" />
          <Rod r={0.29} len={0.012} color="#e0f2fe" />
          <Label text={text} h={0.11} position={[0, 0.012, 0.5]} rotation={[-Math.PI / 2, 0, 0]} />
        </Target>
      ))}
      {holding && (
        <Target target="sweep" position={[FIRE.x - 0.1, 0.006, FIRE.z + 1.05]}>
          <Box size={[1.1, 0.012, 0.28]} color="#fde68a" />
          <Label text="< Sweep >" h={0.17} position={[0, 0.014, 0]} rotation={[-Math.PI / 2, 0, 0]} />
        </Target>
      )}

      <Man rig={rig} />

      <mesh ref={powder} visible={false}>
        <coneGeometry args={[0.38, 1, 16, 1, true]} />
        <meshBasicMaterial color="#fafaf9" transparent opacity={0} depthWrite={false} />
      </mesh>
      <mesh ref={jet} visible={false}>
        <cylinderGeometry args={[0.02, 0.02, 1, 8]} />
        <meshBasicMaterial color="#7dd3fc" />
      </mesh>
      <Spark fx={fx} kind="shock" size={9} />
    </Stage>
  )
}

export default function FireExtinguisherScene(props: SceneProps) {
  return (
    <StageCanvas reduced={props.reduced} position={CAM_ROOM} far={30}>
      <Scene {...props} />
    </StageCanvas>
  )
}
