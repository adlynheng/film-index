"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";

interface ListboxNavigationOptions {
  /** How many options the list is currently showing. */
  itemCount: number;
  isOpen: boolean;
  onSelect: (index: number) => void;
  /** Escape, and any key that should give the list up. */
  onDismiss?: () => void;
  /** Arrow keys on a closed list open it, where the consumer has a closed state to open. */
  onOpen?: () => void;
}

/**
 * Arrow-key navigation for the dialog's three lookup lists — the title search,
 * the cast comboboxes and the franchise picker — so all three answer to the
 * keyboard the same way.
 *
 * `listRef` goes on the element whose children are the options: the highlighted
 * one is scrolled back into view, which each of these lists needs because they
 * all cap their height and scroll.
 */
export function useListboxNavigation<ListElement extends HTMLElement = HTMLUListElement>({
  itemCount,
  isOpen,
  onSelect,
  onDismiss,
  onOpen,
}: ListboxNavigationOptions) {
  const [highlighted, setActiveIndex] = useState(-1);
  const listRef = useRef<ListElement>(null);

  // Clamped on read rather than reset in an effect: a list that shrinks under
  // the highlight (new results landing) must not leave it pointing past the
  // end. Consumers drop the highlight on the events that reorder a list —
  // typing, and opening or closing it.
  const activeIndex = isOpen && highlighted < itemCount ? highlighted : -1;

  useEffect(() => {
    if (activeIndex < 0) return;
    const option = listRef.current?.children[activeIndex];
    option?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      if (event.key === "Escape") {
        if (!isOpen) return;
        // The dialog closes on Escape too, and giving up the list has to win
        // while it is open — otherwise dismissing a dropdown throws away the
        // whole draft.
        event.stopPropagation();
        setActiveIndex(-1);
        onDismiss?.();
        return;
      }

      const isArrow = event.key === "ArrowDown" || event.key === "ArrowUp";
      if (isArrow && !isOpen) {
        // Opening on an arrow key is the standard way into a collapsed
        // listbox, and the only keyboard route into the franchise list. It
        // lands on the first (or last) option rather than opening empty, so
        // one keypress is enough to start choosing.
        if (onOpen) {
          event.preventDefault();
          onOpen();
          setActiveIndex(event.key === "ArrowDown" ? 0 : Math.max(0, itemCount - 1));
        }
        return;
      }

      if (!isOpen || itemCount === 0) return;

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((current) => (current + 1) % itemCount);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((current) => (current <= 0 ? itemCount - 1 : current - 1));
      } else if (event.key === "Enter" && activeIndex >= 0) {
        // Only with something highlighted: otherwise Enter still belongs to
        // the dialog rather than to the list.
        event.preventDefault();
        onSelect(activeIndex);
        setActiveIndex(-1);
      }
    },
    [activeIndex, isOpen, itemCount, onDismiss, onOpen, onSelect]
  );

  return { activeIndex, setActiveIndex, onKeyDown, listRef };
}
