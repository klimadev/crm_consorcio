"use client";

import * as React from "react";
import { Drawer as DrawerPrimitive } from "vaul";
import { cn } from "@/lib/utils";

const Sheet = DrawerPrimitive.Root;
const SheetTrigger = DrawerPrimitive.Trigger;
const SheetPortal = DrawerPrimitive.Portal;
const SheetClose = DrawerPrimitive.Close;

function SheetContent({
  side = "right",
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Content> & {
  side?: "left" | "right";
}) {
  const isRight = side === "right";
  return (
    <SheetPortal>
      <DrawerPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50" />
      <DrawerPrimitive.Content
        className={cn(
          "fixed top-0 bottom-0 z-50 flex flex-col border bg-white shadow-xl transition-transform duration-300",
          isRight ? "right-0 w-full max-w-md rounded-l-2xl" : "left-0 w-full max-w-md rounded-r-2xl",
          className,
        )}
        style={{
          transform: undefined,
        }}
        {...props}
      />
    </SheetPortal>
  );
}

function SheetHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col space-y-2 p-4", className)} {...props} />;
}

function SheetTitle({ className, ...props }: React.ComponentProps<typeof DrawerPrimitive.Title>) {
  return <DrawerPrimitive.Title className={cn("text-lg font-semibold text-slate-900", className)} {...props} />;
}

function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Description>) {
  return <DrawerPrimitive.Description className={cn("text-sm text-slate-500", className)} {...props} />;
}

function SheetFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mt-auto flex flex-col-reverse gap-2 p-4", className)} {...props} />;
}

export {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetClose,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};
