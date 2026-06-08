"use client";

import { useState } from "react";

import DatePickerDropdown from "@/components/search/DatePickerDropdown";

interface FlightDateTimeFieldProps {
  value: string;
  minDate?: string;
  onChange: (value: string) => void;
}

function splitDateTime(value: string) {
  const [date = "", time = ""] = value.split("T");
  const [hour = "", minute = ""] = time.split(":");

  return { date, hour, minute };
}

function sanitizeTime(value: string, max: number) {
  const digits = value.replace(/\D/g, "").slice(0, 2);
  if (!digits) return "";
  return String(Math.min(Number(digits), max));
}

function normalizeTime(value: string, max: number) {
  const sanitized = sanitizeTime(value, max);
  return sanitized ? sanitized.padStart(2, "0") : "00";
}

export default function FlightDateTimeField({
  value,
  minDate,
  onChange,
}: FlightDateTimeFieldProps) {
  const current = splitDateTime(value);
  const [editingField, setEditingField] = useState<"hour" | "minute" | null>(
    null,
  );
  const [draft, setDraft] = useState("");
  const displayedHour = editingField === "hour" ? draft : current.hour;
  const displayedMinute = editingField === "minute" ? draft : current.minute;

  const commitTime = (nextHour: string, nextMinute: string) => {
    if (!current.date) return;

    onChange(
      `${current.date}T${normalizeTime(nextHour, 23)}:${normalizeTime(nextMinute, 59)}`,
    );
  };

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_116px] gap-2">
      <div className="min-w-0 space-y-1">
        <span className="block text-[9px] font-bold uppercase tracking-wider text-on-surface-variant/60">
          Ngày
        </span>
        <DatePickerDropdown
          value={current.date}
          minDate={minDate}
          onChange={(date) => {
            if (!date) {
              onChange("");
              return;
            }

            onChange(
              `${date}T${normalizeTime(current.hour, 23)}:${normalizeTime(current.minute, 59)}`,
            );
          }}
          language="vi"
          label="Ngày bay"
          placeholder="dd/mm/yyyy"
          variant="field"
          dropdownPlacement="top"
          triggerClassName="!h-10 !rounded-lg !px-2.5 !py-2"
          dropdownClassName="w-[310px] max-w-[calc(100vw-2rem)]"
        />
      </div>

      <div className="min-w-0 space-y-1">
        <div className="flex items-center justify-between gap-1">
          <span className="text-[9px] font-bold uppercase tracking-wider text-on-surface-variant/60">
            Thời gian
          </span>
          <span className="text-[8px] font-semibold uppercase text-on-surface-variant/40">
            24h
          </span>
        </div>
        <div
          className={`grid h-10 grid-cols-[1fr_auto_1fr] items-center rounded-lg border border-outline-variant/20 bg-surface-container-lowest px-1.5 transition focus-within:ring-2 focus-within:ring-primary ${
            current.date ? "" : "opacity-55"
          }`}
        >
          <input
            type="text"
            inputMode="numeric"
            maxLength={2}
            aria-label="Giờ"
            disabled={!current.date}
            value={displayedHour}
            onFocus={(event) => {
              setEditingField("hour");
              setDraft(current.hour);
              event.currentTarget.select();
            }}
            onChange={(event) => setDraft(sanitizeTime(event.target.value, 23))}
            onBlur={(event) => {
              const normalized = normalizeTime(event.target.value, 23);
              setEditingField(null);
              commitTime(normalized, current.minute);
            }}
            placeholder="HH"
            className="min-w-0 bg-transparent text-center text-sm font-extrabold tabular-nums text-on-surface outline-none placeholder:text-on-surface-variant/30 disabled:cursor-not-allowed"
          />
          <span className="px-0.5 text-sm font-extrabold text-on-surface-variant/30">
            :
          </span>
          <input
            type="text"
            inputMode="numeric"
            maxLength={2}
            aria-label="Phút"
            disabled={!current.date}
            value={displayedMinute}
            onFocus={(event) => {
              setEditingField("minute");
              setDraft(current.minute);
              event.currentTarget.select();
            }}
            onChange={(event) => setDraft(sanitizeTime(event.target.value, 59))}
            onBlur={(event) => {
              const normalized = normalizeTime(event.target.value, 59);
              setEditingField(null);
              commitTime(current.hour, normalized);
            }}
            placeholder="MM"
            className="min-w-0 bg-transparent text-center text-sm font-extrabold tabular-nums text-on-surface outline-none placeholder:text-on-surface-variant/30 disabled:cursor-not-allowed"
          />
        </div>
      </div>
    </div>
  );
}
