import * as React from "react";
import { cn } from "@/lib/utils";

const Avatar = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "relative flex h-9 w-9 shrink-0 overflow-hidden rounded-full bg-primary/10 ring-2 ring-primary/20 items-center justify-center text-sm font-semibold text-primary",
        className
      )}
      {...props}
    />
  )
);
Avatar.displayName = "Avatar";

const AvatarFallback = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex h-full w-full items-center justify-center rounded-full", className)}
      {...props}
    />
  )
);
AvatarFallback.displayName = "AvatarFallback";

export { Avatar, AvatarFallback };
