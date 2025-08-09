"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils"

type RootProps = React.ComponentProps<typeof ProgressPrimitive.Root>

interface ThemedProgressProps extends RootProps {
  indicatorClassName?: string
  trackClassName?: string
}

function Progress({
  className,
  value,
  indicatorClassName,
  trackClassName,
  ...props
}: ThemedProgressProps) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full",
        trackClassName || "bg-primary/20",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className={cn("h-full w-full flex-1 transition-all bg-primary", indicatorClassName)}
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  )
}

export { Progress }
