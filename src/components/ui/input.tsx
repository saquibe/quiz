import * as React from "react";
import { cn } from "@/lib/utils";
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(({ className, type, ...props }, ref) => <input type={type} className={cn("flex h-12 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-ink outline-none placeholder:text-slate-400 focus:border-teal focus:ring-2 focus:ring-teal/15 disabled:cursor-not-allowed disabled:opacity-50", className)} ref={ref} {...props} />);
Input.displayName = "Input";
export { Input };
