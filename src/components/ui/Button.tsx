import type { ButtonHTMLAttributes, ReactElement } from "react";

type ButtonVariant = "primary" | "secondary" | "danger";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  isBlock?: boolean;
};

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-primary text-primary-foreground",
  secondary: "border-[1.5px] border-line bg-transparent text-foreground",
  // Focus Give up uses the mockup danger button. Auth screens use primary and secondary.
  danger: "border-[1.5px] border-danger bg-transparent text-danger",
};

// Mockup .btn: rounded, bold; full width on phones (AGENTS.md §7).
export function Button({
  variant = "primary",
  isBlock = false,
  className = "",
  type = "button",
  ...props
}: ButtonProps): ReactElement {
  const width = isBlock
    ? "block w-full"
    : "block w-full sm:inline-block sm:w-auto";
  return (
    <button
      type={type}
      className={`${width} cursor-pointer rounded-[14px] px-[22px] py-[13px] text-center font-bold disabled:cursor-not-allowed disabled:opacity-70 ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    />
  );
}
