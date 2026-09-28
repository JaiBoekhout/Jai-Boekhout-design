"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

interface HeaderIconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
}

// Shared "ghost" chrome for the header's icon-button trio — see .header-icon-btn in
// globals.css for the actual visual states (transparent by default, navy circle + white icon on
// hover/focus-visible/aria-expanded="true"). This component only owns layout (a centred icon in
// a fixed 40x40 circle); every behavioural attribute (aria-label, aria-haspopup, aria-expanded,
// onClick) is passed straight through by each caller, since what a button does and whether it has
// a panel varies per instance — forwardRef so a caller that manages its own focus (e.g. returning
// focus to the trigger when its popup closes) can still reach the underlying <button>.
export const HeaderIconButton = forwardRef<HTMLButtonElement, HeaderIconButtonProps>(function HeaderIconButton(
  { icon, className, type = "button", ...rest },
  ref
) {
  return (
    <button ref={ref} type={type} className={`header-icon-btn${className ? ` ${className}` : ""}`} {...rest}>
      {icon}
    </button>
  );
});
