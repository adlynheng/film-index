"use client";

import { ActorCombobox } from "@/components/add-title/ActorCombobox";
import type { DraftCastMember } from "@/components/add-title/draftFilm";

interface ManualDetailsFieldsProps {
  title: string;
  year: number | null;
  director: string;
  cast: DraftCastMember[];
  onTitleChange: (title: string) => void;
  onYearChange: (year: number | null) => void;
  onDirectorChange: (director: string) => void;
  onCastChange: (cast: DraftCastMember[]) => void;
}

const TEXT_FIELD =
  "w-full min-w-0 border border-borderStrong bg-field px-[12px] py-[10px] font-sans text-[15px] outline-none focus:border-ink";
const CAST_FIELD =
  "w-full min-w-0 border border-borderStrong bg-field px-[11px] py-[9px] font-sans text-[14px] outline-none focus:border-ink";
const FIELD_LABEL = "mb-[6px] text-[12px] text-muted";

// The design seeds three blank rows when the section is first opened, so the
// shape of the cast list is visible before anything is typed.
export const BLANK_CAST_ROWS: DraftCastMember[] = [
  { name: "", role: "", tmdbPersonId: null },
  { name: "", role: "", tmdbPersonId: null },
  { name: "", role: "", tmdbPersonId: null },
];

export function ManualDetailsFields({
  title,
  year,
  director,
  cast,
  onTitleChange,
  onYearChange,
  onDirectorChange,
  onCastChange,
}: ManualDetailsFieldsProps) {
  function updateRow(index: number, patch: Partial<DraftCastMember>) {
    onCastChange(cast.map((member, position) => (position === index ? { ...member, ...patch } : member)));
  }

  return (
    <div className="mt-[20px] border-t border-border pt-[22px]">
      <div className="text-[12px] uppercase tracking-[0.09em] text-muted">Details</div>

      <div className="mt-[14px] grid grid-cols-1 gap-x-[18px] gap-y-[16px] sm:grid-cols-2">
        <label className="col-span-full block">
          <span className={`block ${FIELD_LABEL}`}>Title</span>
          <input
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            placeholder="Film or series title"
            className={TEXT_FIELD}
          />
        </label>
        <label className="block">
          <span className={`block ${FIELD_LABEL}`}>Year</span>
          <input
            value={year ?? ""}
            onChange={(event) => {
              // Digits only, four of them: the column is an integer, and the
              // action rejects anything outside 1888..now+5 rather than
              // coercing it, so a stray character would fail the save.
              const digits = event.target.value.replace(/[^0-9]/g, "").slice(0, 4);
              onYearChange(digits === "" ? null : Number(digits));
            }}
            inputMode="numeric"
            placeholder="e.g. 2019"
            className={TEXT_FIELD}
          />
        </label>
        <label className="block">
          <span className={`block ${FIELD_LABEL}`}>Director</span>
          <input
            value={director}
            onChange={(event) => onDirectorChange(event.target.value)}
            // Comma-separated, which is how the column stores more than one.
            placeholder="Name, or names separated by commas"
            className={TEXT_FIELD}
          />
        </label>
      </div>

      <div className="mt-[26px] flex flex-wrap items-baseline justify-between gap-[8px]">
        <div className="text-[12px] uppercase tracking-[0.09em] text-muted">Cast</div>
        <span className="text-[12.5px] text-muted">Actor, then the character they play</span>
      </div>

      <div className="mt-[12px] flex flex-col gap-[8px]">
        {cast.map((member, index) => (
          // Index keys: rows carry no id of their own, and every input here is
          // controlled, so a removal re-renders the remaining rows from state
          // rather than leaving a stale value behind.
          <div key={index} className="grid grid-cols-[1fr_1fr_30px] items-center gap-[8px]">
            <ActorCombobox
              value={member.name}
              // A TMDB credit is identified by its person id, not its name.
              // Typing over one means it is no longer that person, so the id
              // is dropped and the row falls back to name identity —
              // otherwise the credit would attach to the wrong actor in the
              // network graph.
              onNameChange={(name) => updateRow(index, { name, tmdbPersonId: null })}
              // Picking an existing person adopts their identity: the TMDB id
              // where they have one, and otherwise their exact name, which is
              // what the name-only rows de-duplicate on.
              onPick={(person) => updateRow(index, { name: person.name, tmdbPersonId: person.tmdbPersonId })}
              label={`Cast member ${index + 1} name`}
              placeholder="Actor"
              className={CAST_FIELD}
            />
            <input
              value={member.role}
              onChange={(event) => updateRow(index, { role: event.target.value })}
              placeholder="Character"
              aria-label={`Cast member ${index + 1} character`}
              className={CAST_FIELD}
            />
            <button
              type="button"
              onClick={() => onCastChange(cast.filter((_, position) => position !== index))}
              title="Remove this cast member"
              aria-label={`Remove cast member ${index + 1}`}
              className="h-[30px] w-[30px] cursor-pointer border border-border bg-transparent text-[15px] leading-none text-muted hover:border-borderStrong hover:text-ink"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => onCastChange([...cast, { name: "", role: "", tmdbPersonId: null }])}
        className="mt-[12px] cursor-pointer border border-dashed border-borderDashed bg-transparent px-[15px] py-[9px] font-sans text-[13px] text-body hover:border-ink hover:text-ink"
      >
        + Add cast member
      </button>
    </div>
  );
}
