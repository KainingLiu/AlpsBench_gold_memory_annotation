"use client";

import * as React from "react";
import { GripVerticalIcon } from "lucide-react";
import { Group, Panel, Separator } from "react-resizable-panels";

import { cn } from "./utils";

function ResizablePanelGroup({
  className,
  ...props
}: React.ComponentProps<typeof Group>) {
  return (
    <Group
      className={cn("flex h-full w-full", className)}
      {...props}
    />
  );
}

function ResizablePanel({
  className,
  ...props
}: React.ComponentProps<typeof Panel>) {
  return <Panel className={cn("h-full overflow-hidden", className)} {...props} />;
}

function ResizableHandle({
  withHandle,
  className,
  ...props
}: Omit<React.ComponentProps<typeof Separator>, 'role' | 'tabIndex'> & {
  withHandle?: boolean;
}) {
  return (
    <Separator
      className={cn(
        "bg-border relative flex w-1.5 items-center justify-center shrink-0",
        "hover:bg-blue-200 active:bg-blue-300 transition-colors cursor-col-resize",
        className,
      )}
      {...props as any}
    >
      {withHandle && (
        <div className="bg-border z-10 flex h-8 w-3 items-center justify-center rounded-sm border shadow-sm">
          <GripVerticalIcon className="size-3 text-muted-foreground" />
        </div>
      )}
    </Separator>
  );
}

export { ResizablePanelGroup, ResizablePanel, ResizableHandle };
