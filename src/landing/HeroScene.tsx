import { Canvas, useFrame } from '@react-three/fiber'
import { useRef, type ReactNode, type Ref } from 'react'
import { Vector2, Vector3 } from 'three'
import type { AmbientLight, Group, Mesh, MeshStandardMaterial, PointLight } from 'three'
import { LIT_AT, armTo, pose } from './timeline'

// The man faces -z and the camera looks at his right side.
const CAM = new Vector3(5.5, 2.4, -2.5)
const TARGET = new Vector3(0, 1.5, 0)
const BULB = [0.21, 2.62, 0.05] as const
const RUNG_GAP = 0.3
// front rails lean back by this much; the man's feet follow it as he climbs
const LEAN = 0.25
const CLIMB_HEIGHT = RUNG_GAP * 2
const REACH = 2.72
const RAIL_Z = 0.6
const SHOULDER_Y = 1.3
// the hands stop here, just short of the top of the rails
const RAIL_GRIP_MAX = 1.62

const OVERALLS = '#2563eb'
const SHIRT = '#f5f5f4'
const SKIN = '#e0ac69'
const WOOD = '#b45309'

function Limb({
  ref,
  joint,
  position,
  len,
  r,
  color,
  children,
}: {
  ref: Ref<Group>
  joint: Ref<Group>
  position: [number, number, number]
  len: number
  r: number
  color: string
  children: ReactNode
}) {
  return (
    <group ref={ref} position={position}>
      <mesh castShadow position={[0, -len / 2, 0]}>
        <capsuleGeometry args={[r, len - r * 2]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <group ref={joint} position={[0, -len, 0]}>
        <mesh castShadow position={[0, -len / 2, 0]}>
          <capsuleGeometry args={[r * 0.9, len - r * 2]} />
          <meshStandardMaterial color={color} />
        </mesh>
        <group position={[0, -len, 0]}>{children}</group>
      </group>
    </group>
  )
}

function LadderSide({ z, lean, rungs }: { z: number; lean: number; rungs: boolean }) {
  return (
    <group position={[0, 0, z]} rotation={[lean, 0, 0]}>
      {[-0.22, 0.22].map((x) => (
        <mesh key={x} castShadow position={[x, 0.85, 0]}>
          <boxGeometry args={[0.04, 1.7, 0.06]} />
          <meshStandardMaterial color={WOOD} />
        </mesh>
      ))}
      {rungs &&
        [1, 2, 3, 4, 5].map((n) => (
          <mesh key={n} castShadow position={[0, n * RUNG_GAP, 0]}>
            <boxGeometry args={[0.44, 0.03, 0.1]} />
            <meshStandardMaterial color={WOOD} />
          </mesh>
        ))}
    </group>
  )
}

function Scene({ animate, onLit }: { animate: boolean; onLit: (lit: boolean) => void }) {
  const man = useRef<Group>(null)
  const head = useRef<Group>(null)
  const armL = useRef<Group>(null)
  const elbowL = useRef<Group>(null)
  const armR = useRef<Group>(null)
  const elbowR = useRef<Group>(null)
  const handR = useRef<Mesh>(null)
  const legL = useRef<Group>(null)
  const kneeL = useRef<Group>(null)
  const legR = useRef<Group>(null)
  const kneeR = useRef<Group>(null)
  const light = useRef<PointLight>(null)
  const ambient = useRef<AmbientLight>(null)
  const bulb = useRef<MeshStandardMaterial>(null)
  const wasLit = useRef<boolean>(null)
  const drift = useRef(new Vector2())

  useFrame(({ clock, camera, pointer, size }) => {
    const p = pose(animate ? clock.elapsedTime : LIT_AT)
    const hold = Math.min(1, p.climb * 5)
    const stride = Math.sin(p.climb * Math.PI * 2)
    const liftL = Math.max(0, stride)
    const liftR = Math.max(0, -stride)

    const manY = p.climb * CLIMB_HEIGHT
    const manZ = 0.85 - p.climb * (0.2 + CLIMB_HEIGHT * Math.tan(LEAN))
    const lean = -hold * 0.1
    man.current!.position.set(0, manY, manZ)
    man.current!.rotation.x = lean
    head.current!.rotation.x = p.armReach * 0.5 + p.lit * 0.25

    legL.current!.rotation.x = liftL
    kneeL.current!.rotation.x = -liftL * 1.4
    legR.current!.rotation.x = liftR
    kneeR.current!.rotation.x = -liftR * 1.4

    // Each hand grips the front rail a little below shoulder height, alternating with the legs.
    // The grip point is taken into the man's own leaning frame, relative to his shoulder.
    const grip = (offset: number) => {
      const along = Math.min(RAIL_GRIP_MAX, (manY + SHOULDER_Y - 0.15 + offset) / Math.cos(LEAN))
      const y = along * Math.cos(LEAN) - manY
      const z = RAIL_Z - along * Math.sin(LEAN) - manZ
      return armTo(
        y * Math.cos(lean) + z * Math.sin(lean) - SHOULDER_Y,
        z * Math.cos(lean) - y * Math.sin(lean),
      )
    }
    const [shoulderL, bendL] = grip(stride * 0.1)
    const [shoulderR, bendR] = grip(-stride * 0.1)
    armL.current!.rotation.x = hold * shoulderL
    elbowL.current!.rotation.x = hold * bendL
    armR.current!.rotation.x = hold * shoulderR + (REACH - hold * shoulderR) * p.armReach
    elbowR.current!.rotation.x = hold * bendR * (1 - p.armReach)
    handR.current!.rotation.y = p.twist

    light.current!.intensity = p.lit * 30
    // stands in for light bouncing off the walls, so the lit room has no black undersides
    ambient.current!.intensity = 0.35 + p.lit * 0.6
    bulb.current!.emissiveIntensity = p.lit * 4

    const lit = p.lit > 0.5
    if (lit !== wasLit.current) {
      wasLit.current = lit
      onLit(lit)
    }

    if (animate) drift.current.lerp(pointer, 0.05)
    // back off on narrow canvases so the room still fits
    const fit = Math.max(1, 1.25 / (size.width / size.height))
    camera.position
      .set(CAM.x, CAM.y + drift.current.y * 0.4, CAM.z + drift.current.x * 0.8)
      .sub(TARGET)
      .multiplyScalar(fit)
      .add(TARGET)
    camera.lookAt(TARGET)
  })

  return (
    <>
      <ambientLight ref={ambient} color="#9db4ff" intensity={0.35} />
      <directionalLight color="#9db4ff" intensity={0.6} position={[4, 3, -3]} />
      <pointLight
        ref={light}
        castShadow
        color="#ffb86b"
        intensity={0}
        position={BULB}
        shadow-mapSize={[512, 512]}
        shadow-bias={-0.003}
      />

      {/* room corner: floor and the two walls facing the camera */}
      <mesh receiveShadow position={[0, -0.05, 0]}>
        <boxGeometry args={[3.4, 0.1, 3.4]} />
        <meshStandardMaterial color="#a8a29e" />
      </mesh>
      <mesh receiveShadow position={[-1.75, 1.6, 0]}>
        <boxGeometry args={[0.1, 3.2, 3.4]} />
        <meshStandardMaterial color="#fef3c7" />
      </mesh>
      <mesh receiveShadow position={[0, 1.6, 1.75]}>
        <boxGeometry args={[3.4, 3.2, 0.1]} />
        <meshStandardMaterial color="#fef3c7" />
      </mesh>

      {/* joist, cord, socket, bulb */}
      <mesh position={[(BULB[0] + 0.15 - 1.7) / 2, 3.05, BULB[2]]}>
        <boxGeometry args={[BULB[0] + 0.15 + 1.7, 0.1, 0.12]} />
        <meshStandardMaterial color={WOOD} />
      </mesh>
      <mesh position={[BULB[0], 2.87, BULB[2]]}>
        <cylinderGeometry args={[0.008, 0.008, 0.26]} />
        <meshStandardMaterial color="#292524" />
      </mesh>
      <mesh position={[BULB[0], 2.71, BULB[2]]}>
        <cylinderGeometry args={[0.035, 0.035, 0.07]} />
        <meshStandardMaterial color="#292524" />
      </mesh>
      <mesh position={BULB}>
        <sphereGeometry args={[0.09]} />
        <meshStandardMaterial ref={bulb} color="#e7e5e4" emissive="#ffc46b" emissiveIntensity={0} />
      </mesh>

      {/* stepladder */}
      <LadderSide z={RAIL_Z} lean={-LEAN} rungs />
      <LadderSide z={-0.24} lean={LEAN} rungs={false} />
      <mesh castShadow position={[0, 1.66, 0.18]}>
        <boxGeometry args={[0.52, 0.04, 0.22]} />
        <meshStandardMaterial color={WOOD} />
      </mesh>

      <group ref={man}>
        <mesh castShadow position={[0, 1.03, 0]}>
          <capsuleGeometry args={[0.15, 0.3]} />
          <meshStandardMaterial color={OVERALLS} />
        </mesh>
        <mesh position={[0, 0.82, 0]}>
          <cylinderGeometry args={[0.16, 0.16, 0.06]} />
          <meshStandardMaterial color="#78350f" />
        </mesh>
        <group ref={head} position={[0, 1.38, 0]}>
          <mesh castShadow position={[0, 0.12, 0]}>
            <sphereGeometry args={[0.13]} />
            <meshStandardMaterial color={SKIN} />
          </mesh>
          <mesh position={[0, 0.22, 0]}>
            <cylinderGeometry args={[0.12, 0.135, 0.07]} />
            <meshStandardMaterial color="#f59e0b" />
          </mesh>
          <mesh position={[0, 0.195, -0.17]}>
            <boxGeometry args={[0.18, 0.02, 0.14]} />
            <meshStandardMaterial color="#f59e0b" />
          </mesh>
        </group>

        <Limb ref={armL} joint={elbowL} position={[-0.21, SHOULDER_Y, 0]} len={0.3} r={0.05} color={SHIRT}>
          <mesh castShadow position={[0, -0.04, 0]}>
            <boxGeometry args={[0.08, 0.1, 0.08]} />
            <meshStandardMaterial color={SKIN} />
          </mesh>
        </Limb>
        <Limb ref={armR} joint={elbowR} position={[0.21, SHOULDER_Y, 0]} len={0.3} r={0.05} color={SHIRT}>
          {/* no castShadow: this hand sits right under the bulb and would black out the room */}
          <mesh ref={handR} position={[0, -0.04, 0]}>
            <boxGeometry args={[0.08, 0.1, 0.08]} />
            <meshStandardMaterial color={SKIN} />
          </mesh>
        </Limb>

        {[
          { x: -0.09, ref: legL, joint: kneeL },
          { x: 0.09, ref: legR, joint: kneeR },
        ].map((leg) => (
          <Limb
            key={leg.x}
            ref={leg.ref}
            joint={leg.joint}
            position={[leg.x, 0.75, 0]}
            len={0.375}
            r={0.065}
            color={OVERALLS}
          >
            <mesh castShadow position={[0, 0.035, -0.04]}>
              <boxGeometry args={[0.11, 0.07, 0.22]} />
              <meshStandardMaterial color="#292524" />
            </mesh>
          </Limb>
        ))}
      </group>
    </>
  )
}

export default function HeroScene(props: { animate: boolean; onLit: (lit: boolean) => void }) {
  return (
    <Canvas
      shadows="percentage"
      dpr={[1, 2]}
      frameloop={props.animate ? 'always' : 'demand'}
      camera={{ position: CAM.toArray(), fov: 38 }}
    >
      <Scene {...props} />
    </Canvas>
  )
}
