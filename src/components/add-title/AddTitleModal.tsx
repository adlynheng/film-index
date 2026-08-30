"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CategoryPicker } from "@/components/add-title/CategoryPicker";
import { FranchisePicker } from "@/components/add-title/FranchisePicker";
import { FrameUploadField } from "@/components/add-title/FrameUploadField";
import { SearchResultsList } from "@/components/add-title/SearchResultsList";
import { TitleSearchField } from "@/components/add-title/TitleSearchField";
import { useTitleSearch } from "@/hooks/useTitleSearch";
import { saveFilm } from "@/actions/saveFilm";
import type { TmdbSearchResult } from "@/lib/tmdb/client";
import type { FilmCategory } from "@/lib/types";

interface AddTitleModalProps {
  onClose: () => void;
  existingFranchises: string[];
}

interface DraftFilm {
  title: string;
  year: number | null;
  director: string;
  categories: FilmCategory[];
  cast: TmdbSearchResult["cast"];
  franchiseName: string | null;
}

// Matches the design's emptyDraft, which starts on "Movies" rather than on no
// category at all — the same fallback saveFilmInput applies server-side.
const EMPTY_DRAFT: DraftFilm = {
  title: "",
  year: null,
  director: "",
  categories: ["Movies"],
  cast: [],
  franchiseName: null,
};

export function AddTitleModal({ onClose, existingFranchises }: AddTitleModalProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<DraftFilm>(EMPTY_DRAFT);
  const [isPicked, setIsPicked] = useState(false);
  const [frameImageFile, setFrameImageFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const { results, isSearching, hasSearched, error: searchError } = useTitleSearch(query);

  // aria-modal="true" promises the dialog can be dismissed; without this the
  // only way out for a keyboard user is to tab to Cancel.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const title = (draft.title || query).trim();
  const showNoMatch = !isPicked && !isSearching && hasSearched && !searchError && results.length === 0;

  function pickResult(result: TmdbSearchResult) {
    setDraft((current) => ({
      ...current,
      title: result.title,
      year: result.year,
      director: result.director,
      categories: result.categories,
      cast: result.cast,
    }));
    setQuery(result.title);
    setIsPicked(true);
  }

  function clearPick() {
    // The design's Clear is "start over", so it wipes the query too — the
    // franchise and the frame are the two things worth keeping across a
    // re-search, and only the franchise lives in the draft.
    setDraft({ ...EMPTY_DRAFT, franchiseName: draft.franchiseName });
    setQuery("");
    setIsPicked(false);
  }

  function toggleCategory(category: FilmCategory) {
    setDraft((current) => ({
      ...current,
      categories: current.categories.includes(category)
        ? current.categories.filter((selected) => selected !== category)
        : [...current.categories, category],
    }));
  }

  async function handleSave() {
    if (!title) return;

    setIsSaving(true);
    setSaveError(null);
    try {
      const frameImageBytes = frameImageFile ? await frameImageFile.arrayBuffer() : null;
      const { slug } = await saveFilm({
        title,
        year: draft.year,
        director: draft.director,
        categories: draft.categories,
        cast: draft.cast,
        franchiseName: draft.franchiseName,
        frameImageBytes,
      });
      onClose();
      router.push(`/films/${slug}`);
      router.refresh();
      // isSaving stays true: the modal unmounts on close, and leaving the
      // button in its "Adding…" state avoids a flash of "Add title" during
      // the navigation.
    } catch (error) {
      // In production Next replaces a Server Action's error message with an
      // opaque digest, so the specific text only appears in development —
      // hence the fallback rather than relying on the message being useful.
      setSaveError(error instanceof Error && error.message ? error.message : "Could not add this title.");
      setIsSaving(false);
    }
  }

  return (
    <>
      <div onClick={onClose} aria-hidden="true" className="fixed inset-0 z-[70] bg-backdrop" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Add to the index"
        className="fixed left-1/2 top-1/2 z-[80] max-h-[90vh] w-[min(max(50vw,480px),94vw)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto border border-border bg-paper px-[44px] pb-[34px] pt-[38px] shadow-[0_24px_60px_rgba(17,17,16,0.18)]"
      >
        <div className="text-[12px] uppercase tracking-[0.09em] text-muted">Add to the index</div>

        <div className="relative mt-[22px]">
          <TitleSearchField
            query={query}
            onQueryChange={(newQuery) => {
              setQuery(newQuery);
              setIsPicked(false);
            }}
            isSearching={isSearching}
          />
          {!isPicked ? <SearchResultsList results={results} onPick={pickResult} /> : null}
          {showNoMatch ? (
            <div className="mt-[12px] text-[13px] text-muted">
              No match — keep the typed title and fill the rest in yourself.
            </div>
          ) : null}
          {searchError ? <div className="mt-[12px] text-[13px] text-muted">{searchError}</div> : null}
        </div>

        {isPicked ? (
          <div className="mt-[18px] flex flex-wrap gap-x-[22px] gap-y-[8px] text-[13px] text-body">
            <span>{draft.year}</span>
            <span>{draft.director}</span>
            <button
              type="button"
              onClick={clearPick}
              className="cursor-pointer border-b border-borderStrong bg-transparent p-0 text-[13px] text-muted"
            >
              Clear
            </button>
          </div>
        ) : null}

        <div className="mt-[26px]">
          <div className="text-[12px] uppercase tracking-[0.09em] text-muted">Frame</div>
          <FrameUploadField onFileSelected={setFrameImageFile} />
        </div>

        <fieldset className="mt-[26px] border-none p-0">
          <legend className="text-[12px] uppercase tracking-[0.09em] text-muted">Categories</legend>
          <div className="mt-[12px]">
            <CategoryPicker selected={draft.categories} onToggle={toggleCategory} />
          </div>
        </fieldset>

        <div className="mt-[26px]">
          <div className="text-[12px] uppercase tracking-[0.09em] text-muted">
            Franchise <span className="normal-case tracking-normal">— optional</span>
          </div>
          <FranchisePicker
            value={draft.franchiseName}
            onChange={(franchiseName) => setDraft((current) => ({ ...current, franchiseName }))}
            existingFranchises={existingFranchises}
          />
        </div>

        {saveError ? (
          <div role="alert" className="mt-[22px] text-[13px] text-ink">
            {saveError}
          </div>
        ) : null}

        <div className="mt-[34px] flex items-center justify-end gap-[20px]">
          <button type="button" onClick={onClose} className="cursor-pointer bg-transparent p-0 text-[14px] text-muted">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !title}
            className="cursor-pointer rounded-full bg-ink px-[24px] py-[11px] text-[14px] text-paper disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? "Adding…" : "Add title"}
          </button>
        </div>
      </div>
    </>
  );
}
