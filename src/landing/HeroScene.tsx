import { Canvas, useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { Vector2, Vector3 } from 'three'
import type { AmbientLight, MeshStandardMaterial, PointLight } from 'three'
import { LADDER_WOOD as WOOD, LEAN, LadderSide, Man, RAIL_Z, onLadder, type Rig } from '@/scene/man'
import { LIT_AT, pose } from './timeline'

// The man faces -z and the camera looks at his right side.
const CAM = new Vector3(5.5, 2.4, -2.5)
const TARGET = new Vector3(0, 1.5, 0)
const BULB = [0.21, 2.62, 0.05] as const

function Scene({ animate, onLit }: { animate: boolean; onLit: (lit: boolean) => void }) {
  const rig = useRef({} as Rig)
  const light = useRef<PointLight>(null)
  const ambient = useRef<AmbientLight>(null)
  const bulb = useRef<MeshStandardMaterial>(null)
  const wasLit = useRef<boolean>(null)
  const drift = useRef(new Vector2())

  useFrame(({ clock, camera, pointer, size }) => {
    const p = pose(animate ? clock.elapsedTime : LIT_AT)
    onLadder(rig.current, p.climb, p.armReach, p.twist)
    rig.current.head.rotation.x = p.armReach * 0.5 + p.lit * 0.25

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
      <mesh receiveShadow position={[-0.05, -0.05, 0.05]}>
        <boxGeometry args={[3.5, 0.1, 3.5]} />
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

      <Man rig={rig} />
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
