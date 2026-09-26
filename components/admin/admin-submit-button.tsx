"use client";

import { useFormStatus } from "react-dom";

type AdminSubmitButtonProps = {
  idleLabel: string;
  pendingLabel: string;
  className?: string;
};

export function AdminSubmitButton({ idleLabel, pendingLabel, className = "button primary-button" }: AdminSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button className={className} type="submit" disabled={pending} aria-busy={pending}>
      {pending ? pendingLabel : idleLabel}
    </button>
  );
}
