import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

export function Spot({ className, ...props }: ComponentProps<'button'>) {
  return (
    <button
      type="button"
      className={cn(
        'absolute flex cursor-pointer flex-col items-center rounded-md text-xs font-medium text-stone-700 outline-none hover:bg-black/5 focus-visible:ring-3 focus-visible:ring-sky-600',
        className,
      )}
      {...props}
    />
  )
}
