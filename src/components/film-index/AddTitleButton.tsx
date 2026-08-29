interface AddTitleButtonProps {
  onClick: () => void;
}

// One of the constraints' named exceptions to the flexbox-default rule: a
// floating action button is inherently viewport-fixed. Ported from the "+"
// button in My Film Index.dc.html — the second, inset shadow is the top
// highlight that sells the glass, so it is not decoration to drop.
export function AddTitleButton({ onClick }: AddTitleButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Add a title"
      aria-label="Add a title"
      className="fixed bottom-[34px] right-[34px] z-40 flex h-[60px] w-[60px] cursor-pointer items-center justify-center rounded-full border border-glassBorder bg-glass text-[30px] font-light leading-none text-ink shadow-[0_8px_30px_rgba(17,17,16,0.16),inset_0_1px_0_rgba(255,255,255,0.7)] backdrop-blur-[16px] backdrop-saturate-[1.7] transition-[background-color,translate] duration-[160ms] hover:-translate-y-[2px] hover:bg-glassHover"
    >
      +
    </button>
  );
}
