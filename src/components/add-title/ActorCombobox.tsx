"use client";

import { useId, useState } from "react";
import { usePeopleSearch } from "@/hooks/usePeopleSearch";
import type { PersonSuggestion } from "@/lib/db/people";

interface ActorComboboxProps {
  value: string;
  // Typing a name by hand: the row keeps whatever was typed and gives up any
  // identity it was carrying.
  onNameChange: (name: string) => void;
  // Choosing a suggestion: the row adopts that person, which is what keeps a
  // hand-entered credit from creating a second row beside them.
  onPick: (person: PersonSuggestion) => void;
  label: string;
  placeholder: string;
  className: string;
}

/**
 * A free-text cast field with a dropdown of people already in the index,
 * built like the franchise picker but fed from the database as you type.
 *
 * Picking rather than typing is the point. Identity for a credit is its
 * `tmdb_person_id` where there is one and its exact name otherwise, so a
 * hand-typed "Cillian Murphy" does not match the TMDB-sourced Cillian Murphy
 * already in `people` — it inserts a second row, splitting his filmography
 * across two nodes of the actor network. Adopting a suggestion carries the id
 * (or the exact name, for people who have none) and resolves to the one row.
 */
export function ActorCombobox({ value, onNameChange, onPick, label, placeholder, className }: ActorComboboxProps) {
  const listboxId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const { suggestions } = usePeopleSearch(value);

  const isListVisible = isOpen && suggestions.length > 0;

  function choose(person: PersonSuggestion) {
    onPick(person);
    setIsOpen(false);
    setActiveIndex(-1);
  }

  return (
    <div className="relative min-w-0">
      <input
        value={value}
        onChange={(event) => {
          onNameChange(event.target.value);
          setIsOpen(true);
          setActiveIndex(-1);
        }}
        onFocus={() => setIsOpen(true)}
        // Blur closes the list, so an option has to claim the click before the
        // input loses focus — see onMouseDown below.
        onBlur={() => setIsOpen(false)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setIsOpen(false);
            setActiveIndex(-1);
            return;
          }
          if (!isListVisible) return;
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActiveIndex((current) => (current + 1) % suggestions.length);
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActiveIndex((current) => (current <= 0 ? suggestions.length - 1 : current - 1));
          } else if (event.key === "Enter" && activeIndex >= 0) {
            // Only when an option is highlighted: otherwise Enter belongs to
            // the dialog, not to the list.
            event.preventDefault();
            choose(suggestions[activeIndex]);
          }
        }}
        placeholder={placeholder}
        aria-label={label}
        role="combobox"
        aria-expanded={isListVisible}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={isListVisible && activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined}
        className={className}
      />

      {isListVisible ? (
        <ul
          id={listboxId}
          role="listbox"
          aria-label="People already in the index"
          className="absolute left-0 right-0 top-full z-[6] max-h-[220px] overflow-y-auto border border-t-0 border-borderStrong bg-paper"
        >
          {suggestions.map((person, index) => (
            <li key={person.id} id={`${listboxId}-${index}`} role="option" aria-selected={index === activeIndex}>
              <button
                type="button"
                // Keeps the input focused long enough for the click to land.
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(person)}
                onMouseEnter={() => setActiveIndex(index)}
                className={`flex w-full cursor-pointer items-baseline justify-between gap-[12px] border-b border-borderFaint px-[11px] py-[9px] text-left text-[14px] ${
                  index === activeIndex ? "bg-tile" : "bg-transparent"
                }`}
              >
                <span className="min-w-0 truncate text-ink">{person.name}</span>
                <span className="whitespace-nowrap text-[12px] text-muted">
                  {person.filmCount} {person.filmCount === 1 ? "film" : "films"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
