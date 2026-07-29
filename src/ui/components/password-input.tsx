"use client";

import * as React from "react";
import { Input } from "@/components/input";
import { cn } from "@/lib/utils";

type PasswordInputProps = React.InputHTMLAttributes<HTMLInputElement>;

/**
 * A masked secret input. There is deliberately no show/hide reveal: stored secrets
 * (host + credential passwords, key passphrases, sudo password) are write-only — the
 * server never returns them, and the UI never reveals what is typed. To change a secret,
 * type a new value; leave the field blank to keep the stored one.
 */
export const PasswordInput = React.forwardRef<
  HTMLInputElement,
  PasswordInputProps
>(({ className, ...props }, ref) => {
  return (
    <Input
      ref={ref}
      type="password"
      className={cn("h-11 text-base", className)}
      {...props}
    />
  );
});

PasswordInput.displayName = "PasswordInput";
