import type { VoucherDetail } from './types';
import { formatCurrency } from './utils';

export default function VoucherHeroHeader({
  data,
  copied,
  heroGradient,
  status,
  discountDisplay,
  onClose,
  onCopy,
}: {
  data: VoucherDetail | null;
  copied: boolean;
  heroGradient: string;
  status: { label: string; gradient: string } | null;
  discountDisplay: string;
  onClose: () => void;
  onCopy: () => void;
}) {
  return (
    <div
      className="relative shrink-0 overflow-hidden"
      style={{ background: heroGradient, borderRadius: '24px 24px 0 0' }}
    >
      <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white opacity-10" aria-hidden="true" />
      <div className="absolute top-8 -right-4 w-24 h-24 rounded-full bg-white opacity-10" aria-hidden="true" />
      <div className="absolute -bottom-6 left-8 w-20 h-20 rounded-full bg-white opacity-10" aria-hidden="true" />

      <div className="relative z-[1] px-7 pt-6 pb-7">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl flex items-center justify-center bg-white/20">
              <span className="material-symbols-outlined text-white text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }} aria-hidden="true">local_activity</span>
            </div>
            <h2 id="vd-title" className="text-white/80 text-sm font-semibold tracking-wide">Chi Tiết Voucher</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Đóng"
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/15 transition-colors hover:bg-white/25 focus-visible:ring-2 focus-visible:ring-white/70 outline-none"
          >
            <span className="material-symbols-outlined text-white text-lg" aria-hidden="true">close</span>
          </button>
        </div>

        {data && (
          <div className="flex items-end justify-between gap-4">
            <div className="min-w-0">
              <button
                onClick={onCopy}
                aria-label={`Sao chép mã ${data.code}`}
                className="inline-flex items-center gap-2 mb-3 px-3.5 py-1.5 rounded-xl bg-white/15 backdrop-blur transition-colors hover:bg-white/25 focus-visible:ring-2 focus-visible:ring-white/70 outline-none"
              >
                <span className="font-mono font-bold text-white text-base tracking-widest">{data.code}</span>
                <span className="material-symbols-outlined text-white/70 text-sm" aria-hidden="true">
                  {copied ? 'check' : 'content_copy'}
                </span>
                {copied && <span className="text-white/80 text-xs">Đã sao chép!</span>}
              </button>

              <div className="flex items-baseline gap-2">
                <span className="text-white/60 text-base font-semibold">Giảm</span>
                <span className="text-white font-extrabold leading-none text-[2.6rem]">{discountDisplay}</span>
              </div>

              <p className="text-white/70 text-sm mt-1 truncate">
                {data.label}
                {data.minOrderValue > 0 && (
                  <span className="ml-1.5 text-white/50 text-xs">· Đơn từ {formatCurrency(data.minOrderValue)}</span>
                )}
              </p>
            </div>

            {status && (
              <div className="shrink-0 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 bg-white/15 text-white border border-white/25">
                <span className="w-1.5 h-1.5 rounded-full bg-white inline-block animate-pulse" aria-hidden="true" />
                {status.label}
              </div>
            )}
          </div>
        )}
      </div>

      {data?.description && (
        <div className="px-7 py-3 text-xs font-medium italic bg-black/20 text-white/75">
          &quot;{data.description}&quot;
        </div>
      )}
    </div>
  );
}
