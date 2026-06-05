import type { TourFormData } from "./types";
import { formatCurrencyInput, stripCurrencyInput } from "./constants";

const labelWithBadgeClass =
  "mb-2 flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-wider text-on-surface-variant";
const helperTextClass =
  "mt-1.5 text-[11px] leading-relaxed text-on-surface-variant/65";

interface TourPricingSectionProps {
  form: Pick<TourFormData, "price" | "availableSeats">;
  errors: Partial<Record<"price" | "availableSeats", string>>;
  requiredBadge: React.ReactNode;
  handleChange: (field: keyof TourFormData, value: string) => void;
}

export function TourPricingSection({
  form,
  errors,
  requiredBadge,
  handleChange,
}: TourPricingSectionProps) {
  return (
    <div id="tour-section-pricing" className="scroll-mt-6">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="w-6 h-6 rounded-md bg-amber-500/10 flex items-center justify-center">
          <span className="material-symbols-outlined text-amber-600 text-[14px]">
            payments
          </span>
        </div>
        <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
          Giá & Số lượng
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-surface-container-low/40 rounded-2xl p-4 sm:p-5 border border-outline-variant/10">
        {/* Price */}
        <div>
          <label htmlFor="field-price" className={labelWithBadgeClass}>
            <span>Giá niêm yết</span>
            {requiredBadge}
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-600 font-bold text-sm pointer-events-none">
              ₫
            </span>
            <input
              id="field-price"
              name="price"
              type="text"
              aria-invalid={Boolean(errors.price)}
              aria-describedby={errors.price ? "field-price-error" : undefined}
              inputMode="numeric"
              autoComplete="off"
              placeholder="Ví dụ: 2.500.000"
              value={formatCurrencyInput(form.price)}
              onChange={(e) =>
                handleChange("price", stripCurrencyInput(e.target.value))
              }
              className={`w-full bg-surface-container-lowest border rounded-xl pl-9 pr-16 py-3 text-sm focus-visible:ring-2 focus-visible:ring-primary outline-none transition-colors ${errors.price ? "border-error" : "border-outline-variant/20"}`}
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded-md pointer-events-none tracking-wide">
              VNĐ
            </span>
          </div>
          <p className={helperTextClass}>
            Giá cơ bản mỗi khách. Ngày khởi hành hoặc gói tour có thể có giá
            riêng.
          </p>
          {errors.price && (
            <p className="text-error text-xs mt-1 flex items-center gap-1">
              <span className="material-symbols-outlined text-[12px]">
                error
              </span>
              <span id="field-price-error">{errors.price}</span>
            </p>
          )}
        </div>

        {/* Available Seats */}
        <div>
          <label htmlFor="field-availableSeats" className={labelWithBadgeClass}>
            <span>Số ghế mặc định</span>
            {requiredBadge}
          </label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60 text-base pointer-events-none">
              airline_seat_recline_normal
            </span>
            <input
              id="field-availableSeats"
              name="availableSeats"
              type="number"
              aria-invalid={Boolean(errors.availableSeats)}
              aria-describedby={
                errors.availableSeats
                  ? "field-availableSeats-error"
                  : undefined
              }
              inputMode="numeric"
              autoComplete="off"
              placeholder="20"
              min="1"
              value={form.availableSeats}
              onChange={(e) => handleChange("availableSeats", e.target.value)}
              className={`w-full bg-surface-container-lowest border rounded-xl pl-11 pr-4 py-3 text-sm focus-visible:ring-2 focus-visible:ring-primary outline-none transition-colors ${errors.availableSeats ? "border-error" : "border-outline-variant/20"}`}
            />
          </div>
          <p className={helperTextClass}>
            Dùng làm sức chứa mặc định nếu ngày khởi hành chưa đặt số ghế
            riêng.
          </p>
          {errors.availableSeats && (
            <p className="text-error text-xs mt-1 flex items-center gap-1">
              <span className="material-symbols-outlined text-[12px]">
                error
              </span>
              <span id="field-availableSeats-error">
                {errors.availableSeats}
              </span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
