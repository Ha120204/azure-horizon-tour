"use client";

import { useState, useRef, useEffect } from "react";

export interface ComboboxOption {
  value: string;
  label: string;
  sublabel?: string;
  tag?: string;    // ISO-2 country code → rendered as flag emoji
  group?: string;
}

interface Props {
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

function toFlag(code: string): string {
  return [...code.toUpperCase()]
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join("");
}

export default function SearchableCombobox({ options, value, onChange, placeholder }: Props) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // keep input in sync when parent changes value externally
  useEffect(() => { setQuery(value); }, [value]);

  useEffect(() => {
    function onOutsideClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onOutsideClick);
    return () => document.removeEventListener("mousedown", onOutsideClick);
  }, []);

  const filtered = query.trim()
    ? options.filter((o) => {
        const q = query.toLowerCase();
        return (
          o.value.toLowerCase().includes(q) ||
          o.label.toLowerCase().includes(q) ||
          (o.sublabel?.toLowerCase().includes(q) ?? false)
        );
      })
    : options;

  // preserve group insertion order from the filtered list
  const grouped = filtered.reduce<{ group: string; items: ComboboxOption[] }[]>(
    (acc, o) => {
      const g = o.group ?? "";
      const existing = acc.find((x) => x.group === g);
      if (existing) existing.items.push(o);
      else acc.push({ group: g, items: [o] });
      return acc;
    },
    [],
  );

  return (
    <div ref={containerRef} className="relative">
      {/* Input */}
      <div className="relative">
        <input
          type="text"
          value={query}
          placeholder={placeholder}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}
          onChange={(e) => {
            setQuery(e.target.value);
            onChange(e.target.value);
            setOpen(true);
          }}
          className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2.5 pr-8 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setOpen((prev) => !prev)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60 hover:text-on-surface-variant transition-colors"
        >
          <span
            className={`material-symbols-outlined text-[18px] transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          >
            expand_more
          </span>
        </button>
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1.5 w-full max-h-60 overflow-y-auto rounded-2xl border border-outline-variant/20 bg-surface-container-lowest shadow-xl">
          {grouped.length === 0 ? (
            <p className="px-3 py-3 text-sm text-on-surface-variant/60 text-center italic">
              Không tìm thấy kết quả — nhập tự do để lưu
            </p>
          ) : (
            grouped.map(({ group, items }) => (
              <div key={group}>
                {group && (
                  <div className="sticky top-0 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/50 bg-surface-container border-b border-outline-variant/10">
                    {group}
                  </div>
                )}
                {items.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault(); // prevent input blur before click registers
                      onChange(opt.value);
                      setQuery(opt.value);
                      setOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 flex items-center justify-between gap-2 transition-colors text-sm ${
                      value === opt.value
                        ? "bg-primary/10 text-primary"
                        : "text-on-surface hover:bg-surface-container"
                    }`}
                  >
                    <span className="flex flex-col min-w-0">
                      <span className="font-medium leading-snug truncate">{opt.label}</span>
                      {opt.sublabel && (
                        <span className="text-[11px] text-on-surface-variant/70 truncate">
                          {opt.sublabel}
                        </span>
                      )}
                    </span>
                    {opt.tag && (
                      <span className="shrink-0 text-base leading-none" title={opt.tag}>
                        {toFlag(opt.tag)}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
