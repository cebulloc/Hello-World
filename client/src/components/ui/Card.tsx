import clsx from "clsx";
import type { HTMLAttributes, ReactNode } from "react";

interface Props extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padding?: "sm" | "md" | "lg";
}

const padded = {
  sm: "p-3",
  md: "p-5",
  lg: "p-7",
};

export function Card({
  children,
  className,
  padding = "md",
  ...rest
}: Props) {
  return (
    <div className={clsx("card", padded[padding], className)} {...rest}>
      {children}
    </div>
  );
}
