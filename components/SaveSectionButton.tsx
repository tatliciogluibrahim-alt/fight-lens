"use client";

interface SaveSectionButtonProps {
  elementId: string;
  filename: string;
}

export function SaveSectionButton({ elementId, filename }: SaveSectionButtonProps) {
  async function handleClick() {
    const { exportSectionAsPNG } = await import("@/lib/exportSection");
    await exportSectionAsPNG(elementId, filename);
  }

  return (
    <button
      type="button"
      onClick={() => {
        void handleClick();
      }}
      className="tap-target inline-flex items-center justify-center rounded-full border border-line bg-transparent px-3 font-mono text-[10px] uppercase tracking-[0.14em] text-subtle transition hover:bg-surface-2 hover:text-foreground"
    >
      SAVE AS IMAGE
    </button>
  );
}
