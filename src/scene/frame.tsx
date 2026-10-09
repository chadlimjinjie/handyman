import { Component, Suspense, createContext, use, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// The closed caption drawn over the scene: what the narrator is saying.
export const Subtitle = createContext('')

// Without WebGL, or if the 3D chunk fails to load, the buttons below still work the module.
class Optional extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

// A module's 3D scene, with the same moves as buttons for keyboards, screen readers and
// small screens. `actions` is [target, label] pairs.
export function SceneFrame({
  className,
  caption,
  actions,
  onAct,
  children,
}: {
  className: string
  caption?: ReactNode
  actions: string[][]
  onAct: (target: string) => void
  children: ReactNode
}) {
  const subtitle = use(Subtitle)
  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <div
          aria-hidden="true"
          className={cn('aspect-[4/3] w-full overflow-hidden rounded-xl border', className)}
        >
          <Optional>
            <Suspense fallback={null}>{children}</Suspense>
          </Optional>
        </div>
        {/* ponytail: covers the bottom of the scene, clicks pass through. Move it under the canvas if it hides too much. */}
        {subtitle && (
          <p
            role="status"
            className="pointer-events-none absolute inset-x-2 bottom-2 rounded-lg bg-black/75 px-3 py-2 text-center text-sm text-white"
          >
            {subtitle}
          </p>
        )}
      </div>
      {caption}
      <ul className="flex flex-wrap gap-2">
        {actions.map(([target, label]) => (
          <li key={target}>
            <Button variant="outline" size="sm" onClick={() => onAct(target)}>
              {label}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  )
}
