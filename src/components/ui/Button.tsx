import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "danger";
};

const VARIANT_CLASS = {
  primary: "bg-primary text-primary-foreground",
  danger: "border border-danger bg-transparent text-danger",
} as const;

export function Button({
  variant = "primary",
  className = "",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`rounded-[14px] px-5 py-3 text-center font-bold disabled:cursor-not-allowed disabled:opacity-50 max-[600px]:w-full ${VARIANT_CLASS[variant]} ${className}`}
      {...props}
    />
  );
}
