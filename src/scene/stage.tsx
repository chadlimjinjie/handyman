// The parts every 3D module scene is built from.
import { Canvas, useFrame, useThree, type ThreeElements } from '@react-three/fiber'
import { createContext, use, useEffect, useMemo, useRef, type ReactNode, type Ref } from 'react'
import { CanvasTexture, MathUtils, QuadraticBezierCurve3, SRGBColorSpace, Vector3 } from 'three'
import type { Group, Object3D, PointLight } from 'three'

export const v3 = (x: number, y: number, z: number) => new Vector3(x, y, z)

export const BODY = '#f5f5f4'
export const BRASS = '#d4a017'
export const COPPER = '#c2703d'
export const STEEL = '#a8a29e'
export const DARK = '#292524'
export const WOOD = '#c8956c'

export type SceneProps = {
  step: number
  slip: string | null
  mistakes: number
  onAct: (target: string) => void
  reduced: boolean
}

export const Stage = createContext<(target: string) => void>(() => {})

export function StageCanvas({
  reduced,
  position,
  far = 12,
  children,
}: {
  reduced: boolean
  position: Vector3
  far?: number
  children: ReactNode
}) {
  return (
    <Canvas
      shadows="percentage"
      dpr={[1, 2]}
      frameloop={reduced ? 'demand' : 'always'}
      camera={{ position: position.toArray(), fov: 38, near: 0.05, far }}
    >
      {children}
    </Canvas>
  )
}

type MeshProps = Omit<ThreeElements['mesh'], 'args'>
type Look = { color: string; metal?: boolean }

const Skin = ({ color, metal }: Look) => (
  <meshStandardMaterial color={color} metalness={metal ? 0.35 : 0} roughness={metal ? 0.4 : 0.8} />
)

export function Box({ size, color, metal, ...props }: MeshProps & Look & { size: [number, number, number] }) {
  return (
    <mesh castShadow receiveShadow {...props}>
      <boxGeometry args={size} />
      <Skin color={color} metal={metal} />
    </mesh>
  )
}

// a cylinder along y; `top` narrows or widens the upper end
export function Rod({
  r,
  len,
  top = r,
  color,
  metal,
  ...props
}: MeshProps & Look & { r: number; len: number; top?: number }) {
  return (
    <mesh castShadow {...props}>
      <cylinderGeometry args={[top, r, len, 16]} />
      <Skin color={color} metal={metal} />
    </mesh>
  )
}

// An unseen box that makes a small part easier to click.
export function Hit({ size, ...props }: MeshProps & { size: [number, number, number] }) {
  return (
    <mesh {...props}>
      <boxGeometry args={size} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  )
}

export function Label({
  text,
  h,
  color = DARK,
  ...props
}: MeshProps & { text: string; h: number; color?: string }) {
  const [map, aspect] = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 32 + text.length * 56
    canvas.height = 96
    const ctx = canvas.getContext('2d')!
    ctx.font = 'bold 80px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = color
    ctx.fillText(text, canvas.width / 2, 52)
    const texture = new CanvasTexture(canvas)
    texture.colorSpace = SRGBColorSpace
    return [texture, canvas.width / canvas.height]
  }, [text, color])
  return (
    <mesh {...props}>
      <planeGeometry args={[h * aspect, h]} />
      <meshBasicMaterial map={map} transparent />
    </mesh>
  )
}

// Something the learner can click. The inner group is the one that swells on hover and
// shakes on a wrong move, so the caller's position and ref stay on the outer one.
// `still` is for things too big to swell, like a wall.
export function Target({
  target,
  still,
  children,
  ...props
}: ThreeElements['group'] & { target: string; still?: boolean }) {
  const onAct = use(Stage)
  const invalidate = useThree((s) => s.invalidate)
  const inner = useRef<Group>(null)
  const hover = (on: boolean) => {
    if (!still) inner.current!.scale.setScalar(on ? 1.06 : 1)
    document.body.style.cursor = on ? 'pointer' : ''
    invalidate()
  }
  return (
    <group {...props}>
      <group
        ref={inner}
        userData={{ target }}
        onClick={(e) => {
          e.stopPropagation()
          onAct(target)
        }}
        onPointerOver={(e) => {
          e.stopPropagation()
          hover(true)
        }}
        onPointerOut={() => hover(false)}
      >
        {children}
      </group>
    </group>
  )
}

// A bendy line of short cylinders, laid along `curve` each frame by `lay`.
export function Rope({
  ref,
  n,
  r,
  colors,
  bareTip,
}: {
  ref: Ref<Group>
  n: number
  r: number
  colors: readonly string[]
  bareTip?: boolean
}) {
  return (
    <group ref={ref}>
      {Array.from({ length: n }, (_, i) => {
        const bare = bareTip && i === n - 1
        return (
          <mesh key={i} castShadow>
            <cylinderGeometry args={[bare ? r * 0.55 : r, bare ? r * 0.55 : r, 1, 8]} />
            <meshStandardMaterial
              color={bare ? COPPER : colors[i % colors.length]}
              emissive="#ff3b00"
              emissiveIntensity={0}
            />
          </mesh>
        )
      })}
    </group>
  )
}

// Set its v0, v1 and v2, then `lay` a rope along it.
export const curve = new QuadraticBezierCurve3()
const UP = v3(0, 1, 0)
const from = v3(0, 0, 0)
const to = v3(0, 0, 0)
const dir = v3(0, 0, 0)

export function lay(rope: Group) {
  const n = rope.children.length
  curve.getPoint(0, from)
  for (let i = 0; i < n; i++) {
    const seg = rope.children[i]
    curve.getPoint((i + 1) / n, to)
    const len = dir.subVectors(to, from).length()
    seg.position.addVectors(from, to).multiplyScalar(0.5)
    // a little overlap hides the gaps on the outside of a bend
    seg.scale.set(1, len * 1.15 + 1e-6, 1)
    if (len > 1e-6) seg.quaternion.setFromUnitVectors(UP, dir.divideScalar(len))
    from.copy(to)
  }
}

// Rises over a..b and falls back over c..d: a tool leaving its place to do a job and returning.
export const visit = (v: number, a: number, b: number, c: number, d: number) =>
  MathUtils.smoothstep(v, a, b) - MathUtils.smoothstep(v, c, d)

// Walks every value of `pose(step)` toward its goal, each taking `seconds[key]` (0.9 by default)
// to cross from 0 to 1. Read the live values off `.current` in a useFrame declared after this.
export function useEased<P extends Record<string, number>>(
  pose: (step: number) => P,
  step: number,
  reduced: boolean,
  seconds: Partial<Record<keyof P, number>> = {},
) {
  const cur = useRef(pose(step))
  const invalidate = useThree((s) => s.invalidate)
  // only matters with frameloop="demand": draw the new state
  useEffect(() => invalidate(), [step, invalidate])
  useFrame((_, delta) => {
    const goal = pose(step)
    const c = cur.current as Record<string, number>
    for (const k in goal) {
      const max = reduced ? 1 : delta / (seconds[k] ?? 0.9)
      c[k] += MathUtils.clamp(goal[k] - c[k], -max, max)
    }
  })
  return cur
}

const FX_SECONDS = 1.1

// A wrong move: shakes the thing that was clicked, and reports what the scene should draw.
// `kind` names the consequence, `k` fades from 1 at the click to 0, `t` counts seconds since,
// `at` is where the clicked thing is, nudged toward the camera.
export function useSlip(
  { slip, mistakes, reduced }: Pick<SceneProps, 'slip' | 'mistakes' | 'reduced'>,
  kind: string,
  shake = 0.004,
) {
  const ref = useRef({
    kind: '',
    t: FX_SECONDS,
    k: 0,
    at: v3(0, 0, 0),
    part: undefined as Object3D | undefined,
  })
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)

  useEffect(() => {
    // motion-reduced learners get the explanation as text only
    if (!slip || reduced) return
    const fx = ref.current
    const parts: Object3D[] = []
    scene.traverse((o) => {
      if (o.userData.target === slip) parts.push(o)
    })
    if (fx.part) fx.part.position.x = 0
    fx.kind = kind
    fx.t = 0
    fx.part = parts[0]
    parts[0]?.getWorldPosition(fx.at).lerp(camera.position, 0.12)
  }, [mistakes, slip, kind, reduced, scene, camera])

  useFrame((_, delta) => {
    const fx = ref.current
    fx.t += delta
    fx.k = Math.max(0, 1 - fx.t / FX_SECONDS)
    if (fx.part) fx.part.position.x = Math.sin(fx.t * 45) * shake * fx.k
  })
  return ref
}

export type Slip = ReturnType<typeof useSlip>

// The flash of a short circuit, for a slip of the given kind. `size` 1 suits a bench top.
export function Spark({ fx, size = 1, kind = 'spark' }: { fx: Slip; size?: number; kind?: string }) {
  const group = useRef<Group>(null)
  const light = useRef<PointLight>(null)
  useFrame(() => {
    const { k, t, at } = fx.current
    const sparking = fx.current.kind === kind ? k * k : 0
    group.current!.visible = sparking > 0
    group.current!.position.copy(at)
    group.current!.scale.setScalar((0.4 + sparking) * size)
    group.current!.rotation.z = t * 9
    light.current!.intensity = sparking * 0.5 * size * size
  })
  return (
    <group ref={group} visible={false}>
      <mesh>
        <sphereGeometry args={[0.012]} />
        <meshBasicMaterial color="#fffbe0" />
      </mesh>
      {[0, 1, 2, 3].map((n) => (
        <mesh key={n} rotation={[0, 0, (n * Math.PI) / 4]}>
          <boxGeometry args={[0.09, 0.004, 0.004]} />
          <meshBasicMaterial color="#fde047" />
        </mesh>
      ))}
      <pointLight ref={light} color="#fff3b0" intensity={0} distance={0.8 * size} />
    </group>
  )
}
