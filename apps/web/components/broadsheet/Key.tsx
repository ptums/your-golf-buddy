"use client";

import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

type Variant = "default" | "on" | "ink" | "quiet";

const variantClass: Record<Variant, string> = {
  default: "",
  on: "bs-key-on",
  ink: "bs-key-ink",
  quiet: "bs-key-quiet",
};

const cx = (...parts: (string | false | undefined)[]) => parts.filter(Boolean).join(" ");

type CommonProps = {
  variant?: Variant;
  className?: string;
  children: ReactNode;
};

type ButtonProps = CommonProps &
  Omit<ComponentPropsWithoutRef<"button">, "className" | "children"> & {
    href?: undefined;
  };

type LinkProps = CommonProps &
  Omit<ComponentPropsWithoutRef<typeof Link>, "className" | "children" | "href"> & {
    href: string;
  };

/**
 * A "key" — the only control shape in Broadsheet. 1.5px ink border, 2px radius,
 * surface fill, serif at heading weight. `on` inverts to ink with the magenta
 * state bar; `ink` is a solid primary/destructive action; `quiet` is
 * transparent (used with a dashed border for "use as typed").
 */
export default function Key(props: ButtonProps | LinkProps) {
  const cls = cx("bs-key", variantClass[props.variant ?? "default"], props.className);

  if (props.href !== undefined) {
    const { variant, className, children, href, ...rest } = props;
    void variant;
    void className;
    return (
      <Link href={href} className={cls} {...rest}>
        {children}
      </Link>
    );
  }

  const { variant, className, children, ...rest } = props;
  void variant;
  void className;
  return (
    <button className={cls} {...rest}>
      {children}
    </button>
  );
}
