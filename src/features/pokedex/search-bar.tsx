"use client";

import { Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { messages } from "@/config/messages";
import { useUrlFilters } from "./use-url-filters";

const DEBOUNCE_MS = 300;

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

export function SearchBar() {
  const { filters, update } = useUrlFilters();
  const urlQuery = filters.q;
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(urlQuery);
  const [seenUrlQuery, setSeenUrlQuery] = useState(urlQuery);
  const [lastPushed, setLastPushed] = useState(urlQuery);

  // Follow external URL changes (e.g. "clear filters"), but not the echo of our own typing.
  if (urlQuery !== seenUrlQuery) {
    setSeenUrlQuery(urlQuery);
    if (urlQuery !== lastPushed) setValue(urlQuery);
  }

  useEffect(() => {
    const next = value.trim();
    if (next === urlQuery.trim()) return;
    const timer = setTimeout(() => {
      setLastPushed(next);
      update({ q: next }, "replace");
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [value, urlQuery, update]);

  // "/" focuses the search field, like many sites do.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "/" || event.ctrlKey || event.metaKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;
      event.preventDefault();
      inputRef.current?.focus();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const next = value.trim();
    setLastPushed(next);
    update({ q: next }, "replace");
  }

  return (
    <form role="search" onSubmit={submit} className="relative">
      <label htmlFor="busca" className="sr-only">
        {messages.search.label}
      </label>
      <Search
        aria-hidden
        className="text-muted pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2"
      />
      <input
        ref={inputRef}
        id="busca"
        type="search"
        name="q"
        autoComplete="off"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={messages.search.placeholder}
        className="border-border bg-surface placeholder:text-muted min-h-11 w-full rounded-xl border pr-11 pl-10 text-sm [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          aria-label={messages.search.clear}
          onClick={() => {
            setValue("");
            inputRef.current?.focus();
          }}
          className="text-muted hover:text-foreground absolute top-0 right-0 inline-flex size-11 items-center justify-center"
        >
          <X aria-hidden className="size-5" />
        </button>
      )}
    </form>
  );
}
