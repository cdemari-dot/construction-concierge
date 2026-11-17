"use client";

export function PrintButton({ label = "Print" }: { label?: string }) {
  return (
    <button type="button" className="cc-btn lime sm" onClick={() => window.print()}>
      {label}
    </button>
  );
}
