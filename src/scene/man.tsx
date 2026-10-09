// The handyman and his stepladder, shared by the landing hero and the modules he appears in.
import type { ReactNode, Ref, RefObject } from 'react'
import type { Group, Mesh } from 'three'
import { armTo } from '@/landing/timeline'

export const RUNG_GAP = 0.3
// front rails lean back by this much; the man's feet follow it as he climbs
export const LEAN = 0.25
const CLIMB_HEIGHT = RUNG_GAP * 2
const REACH = 2.72
export const RAIL_Z = 0.6
export const SHOULDER_Y = 1.3
// the hands stop here, just short of the top of the rails
const RAIL_GRIP_MAX = 1.62

const OVERALLS = '#2563eb'
const SHIRT = '#f5f5f4'
const SKIN = '#e0ac69'
export const LADDER_WOOD = '#b45309'

// His joints. A limb hangs along -y and rotation.x swings it toward -z, the way he faces.
export type Rig = Record<
  'root' | 'head' | 'armL' | 'elbowL' | 'armR' | 'elbowR' | 'legL' | 'kneeL' | 'legR' | 'kneeR',
  Group
> & { handR: Mesh }

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

export function LadderSide({
  ref,
  z,
  lean,
  rungs,
}: {
  ref?: Ref<Group>
  z: number
  lean: number
  rungs: boolean
}) {
  return (
    <group ref={ref} position={[0, 0, z]} rotation={[lean, 0, 0]}>
      {[-0.22, 0.22].map((x) => (
        <mesh key={x} castShadow position={[x, 0.85, 0]}>
          <boxGeometry args={[0.04, 1.7, 0.06]} />
          <meshStandardMaterial color={LADDER_WOOD} />
        </mesh>
      ))}
      {rungs &&
        [1, 2, 3, 4, 5].map((n) => (
          <mesh key={n} castShadow position={[0, n * RUNG_GAP, 0]}>
            <boxGeometry args={[0.44, 0.03, 0.1]} />
            <meshStandardMaterial color={LADDER_WOOD} />
          </mesh>
        ))}
    </group>
  )
}

// `rig` is filled in as he mounts: make it with useRef({} as Rig).
export function Man({ rig }: { rig: RefObject<Rig> }) {
  const at =
    <K extends keyof Rig>(k: K) =>
    (o: Rig[K] | null) => {
      if (o) rig.current[k] = o
    }
  return (
    <group ref={at('root')}>
      <mesh castShadow position={[0, 1.03, 0]}>
        <capsuleGeometry args={[0.15, 0.3]} />
        <meshStandardMaterial color={OVERALLS} />
      </mesh>
      <mesh position={[0, 0.82, 0]}>
        <cylinderGeometry args={[0.16, 0.16, 0.06]} />
        <meshStandardMaterial color="#78350f" />
      </mesh>
      <group ref={at('head')} position={[0, 1.38, 0]}>
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

      <Limb
        ref={at('armL')}
        joint={at('elbowL')}
        position={[-0.21, SHOULDER_Y, 0]}
        len={0.3}
        r={0.05}
        color={SHIRT}
      >
        <mesh castShadow position={[0, -0.04, 0]}>
          <boxGeometry args={[0.08, 0.1, 0.08]} />
          <meshStandardMaterial color={SKIN} />
        </mesh>
      </Limb>
      <Limb
        ref={at('armR')}
        joint={at('elbowR')}
        position={[0.21, SHOULDER_Y, 0]}
        len={0.3}
        r={0.05}
        color={SHIRT}
      >
        {/* no castShadow: this hand works right under a lamp and would black out the room */}
        <mesh ref={at('handR')} position={[0, -0.04, 0]}>
          <boxGeometry args={[0.08, 0.1, 0.08]} />
          <meshStandardMaterial color={SKIN} />
        </mesh>
      </Limb>

      {(['L', 'R'] as const).map((side) => (
        <Limb
          key={side}
          ref={at(`leg${side}`)}
          joint={at(`knee${side}`)}
          position={[side === 'L' ? -0.09 : 0.09, 0.75, 0]}
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
  )
}

// Puts him on the stepladder at the origin: `climb` 0 is on the floor in front of it, 1 is
// two rungs up. `reach` raises his right arm to a ceiling lamp and `twist` turns that hand.
export function onLadder(rig: Rig, climb: number, reach: number, twist: number) {
  const hold = Math.min(1, climb * 5)
  const stride = Math.sin(climb * Math.PI * 2)
  const liftL = Math.max(0, stride)
  const liftR = Math.max(0, -stride)

  const manY = climb * CLIMB_HEIGHT
  const manZ = 0.85 - climb * (0.2 + CLIMB_HEIGHT * Math.tan(LEAN))
  const lean = -hold * 0.1
  rig.root.position.set(0, manY, manZ)
  rig.root.rotation.x = lean

  rig.legL.rotation.x = liftL
  rig.kneeL.rotation.x = -liftL * 1.4
  rig.legR.rotation.x = liftR
  rig.kneeR.rotation.x = -liftR * 1.4

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
  rig.armL.rotation.x = hold * shoulderL
  rig.elbowL.rotation.x = hold * bendL
  rig.armR.rotation.x = hold * shoulderR + (REACH - hold * shoulderR) * reach
  rig.elbowR.rotation.x = hold * bendR * (1 - reach)
  rig.handR.rotation.y = twist
}
