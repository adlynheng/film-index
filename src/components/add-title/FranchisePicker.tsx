"use client";

import { useMemo, useState } from "react";

const NONE_LABEL = "None — standalone title";

interface FranchisePickerProps {
  value: string | null;
  onChange: (franchiseName: string | null) => void;
  existingFranchises: string[];
}

/**
 * A free-text field with a dropdown of franchises already in the index, per
 * the "Franchise — optional" block in My Film Index.dc.html. Typing a name
 * that does not exist yet is the intended way to start a new franchise:
 * `insertFilm` resolves the name to a row, creating it if needed, so nothing
 * here has to know whether the name is new.
 */
export function FranchisePicker({ value, onChange, existingFranchises }: FranchisePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const sortedFranchises = useMemo(
    () => [...existingFranchises].sort((a, b) => a.localeCompare(b)),
    [existingFranchises]
  );

  return (
    <>
      <div className="relative mt-[12px]">
        <div className="flex items-center gap-[10px] border border-borderStrong bg-field py-[11px] pl-[14px] pr-[12px]">
          <input
            value={value ?? ""}
            onChange={(event) => {
              const typed = event.target.value;
              onChange(typed.trim() ? typed : null);
            }}
            placeholder="None — or type a new franchise name"
            aria-label="Franchise"
            className="min-w-0 flex-1 border-none bg-transparent text-[15px] text-ink outline-none"
          />
          <button
            type="button"
            onClick={() => setIsOpen((current) => !current)}
            aria-expanded={isOpen}
            aria-label="Choose an existing franchise"
            title="Choose an existing franchise"
            // Tailwind v4's rotate-* sets the CSS `rotate` property rather than
            // `transform`, so the transition has to name `rotate` to animate.
            className={`flex h-[26px] w-[30px] cursor-pointer items-center justify-center border-l border-border bg-transparent text-[11px] text-mutedStrong transition-[rotate,color] duration-[140ms] hover:text-ink ${
              isOpen ? "rotate-180" : ""
            }`}
          >
            ▼
          </button>
        </div>

        {isOpen ? (
          <ul className="absolute left-0 right-0 top-full z-[6] max-h-[220px] overflow-y-auto border border-t-0 border-borderStrong bg-paper">
            {[null, ...sortedFranchises].map((option) => (
              <li key={option ?? "__none__"}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(option);
                    setIsOpen(false);
                  }}
                  className={`block w-full cursor-pointer border-b border-borderFaint px-[14px] py-[11px] text-left text-[14px] transition-colors duration-[140ms] hover:bg-tile ${
                    value === option ? "bg-tile" : "bg-transparent"
                  } ${option === null ? "text-muted" : "text-ink"}`}
                >
                  {option ?? NONE_LABEL}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className={`mt-[9px] text-[12.5px] ${value ? "text-ink" : "text-muted"}`}>{value ?? NONE_LABEL}</div>
    </>
  );
}
