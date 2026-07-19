import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-8 w-full min-w-0 rounded-md border bg-transparent px-2.5 py-1 text-sm transition-colors outline-none selection:bg-primary/20 placeholder:text-muted-foreground",
        "focus-visible:border-ring",
        "aria-invalid:border-destructive",
        "file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:opacity-50 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Input }
