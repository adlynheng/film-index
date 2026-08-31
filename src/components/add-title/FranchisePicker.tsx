"use client";

import { useId, useMemo, useState } from "react";
import { useListboxNavigation } from "@/hooks/useListboxNavigation";
import { ChevronDown } from "lucide-react";

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
  const listboxId = useId();
  const [isOpen, setIsOpen] = useState(false);

  const sortedFranchises = useMemo(
    () => [...existingFranchises].sort((a, b) => a.localeCompare(b)),
    [existingFranchises]
  );

  // "None" leads the list, so an option's index is one ahead of its franchise.
  const options = useMemo<(string | null)[]>(() => [null, ...sortedFranchises], [sortedFranchises]);

  function choose(option: string | null) {
    onChange(option);
    setIsOpen(false);
    setActiveIndex(-1);
  }

  const { activeIndex, setActiveIndex, onKeyDown, listRef } = useListboxNavigation({
    itemCount: options.length,
    isOpen,
    onSelect: (index) => choose(options[index]),
    onDismiss: () => setIsOpen(false),
    // Arrow keys are the only way into this list from the keyboard: unlike the
    // other two it does not open itself as you type.
    onOpen: () => setIsOpen(true),
  });

  return (
    <>
      <div className="relative mt-[12px]">
        <div className="flex items-center gap-[10px] border border-borderStrong bg-field py-[11px] pl-[14px] pr-[12px]">
          <input
            value={value ?? ""}
            onChange={(event) => {
              const typed = event.target.value;
              onChange(typed.trim() ? typed : null);
              setActiveIndex(-1);
            }}
            onKeyDown={onKeyDown}
            placeholder="None — or type a new franchise name"
            aria-label="Franchise"
            role="combobox"
            aria-expanded={isOpen}
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined}
            className="min-w-0 flex-1 border-none bg-transparent text-[15px] text-ink outline-none"
          />
          <button
            type="button"
            onClick={() => {
              setIsOpen((current) => !current);
              setActiveIndex(-1);
            }}
            aria-expanded={isOpen}
            aria-label="Choose an existing franchise"
            title="Choose an existing franchise"
            // Tailwind v4's rotate-* sets the CSS `rotate` property rather than
            // `transform`, so the transition has to name `rotate` to animate.
            className={`flex h-[26px] w-[30px] cursor-pointer items-center justify-center bg-transparent text-[11px] text-mutedStrong transition-[rotate,color] duration-[140ms] hover:text-ink ${
              isOpen ? "rotate-180" : ""
            }`}
          >
            <ChevronDown size={32} strokeWidth={1.6} aria-hidden="true" />
          </button>
        </div>

        {isOpen ? (
          <ul
            ref={listRef}
            id={listboxId}
            role="listbox"
            aria-label="Franchises in the index"
            className="absolute left-0 right-0 top-full z-[6] max-h-[220px] overflow-y-auto border border-t-0 border-borderStrong bg-paper"
          >
            {options.map((option, index) => (
              <li
                key={option ?? "__none__"}
                id={`${listboxId}-${index}`}
                role="option"
                aria-selected={index === activeIndex}
              >
                <button
                  type="button"
                  onClick={() => choose(option)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={`block w-full cursor-pointer border-b border-borderFaint px-[14px] py-[11px] text-left text-[14px] transition-colors duration-[140ms] hover:bg-tile ${
                    value === option || index === activeIndex ? "bg-tile" : "bg-transparent"
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
