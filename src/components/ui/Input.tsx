import type { InputHTMLAttributes } from "react";

export function Input({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`rounded-xl border border-line bg-surface px-3 py-[11px] text-base ${className}`}
      {...props}
    />
  );
}
