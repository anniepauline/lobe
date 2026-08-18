import * as React from "react";

import { cn } from "#lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-lg border border-input bg-input/20 px-3 py-2 text-base transition-[color,background-color,border-color,box-shadow] outline-none placeholder:text-muted-foreground/70 hover:border-ring/60 focus-visible:border-ring focus-visible:bg-input/30 focus-visible:ring-[3px] focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive md:text-sm dark:aria-invalid:border-destructive/70",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
