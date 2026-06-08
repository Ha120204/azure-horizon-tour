'use client';

import type { VoucherDetailDrawerProps } from './voucherDetail/types';
import { useVoucherDetail } from './voucherDetail/useVoucherDetail';
import VoucherHeroHeader from './voucherDetail/VoucherHeroHeader';
import VoucherUsageCard from './voucherDetail/VoucherUsageCard';
import VoucherToursCard from './voucherDetail/VoucherToursCard';
import VoucherBookingsCard from './voucherDetail/VoucherBookingsCard';
import VoucherMetaCards from './voucherDetail/VoucherMetaCards';
import VoucherUsersCard from './voucherDetail/VoucherUsersCard';

export default function VoucherDetailDrawer({ voucherId, onClose }: VoucherDetailDrawerProps) {
  const {
    data, isLoading, error, visible, copied,
    handleClose, fetchDetail, handleCopy,
    usedCount, maxUses, isUnlimited, usageRatio,
    savedCount, userVouchers, analytics,
    status, heroGradient, discountDisplay, progressColor,
  } = useVoucherDetail(voucherId, onClose);

  if (voucherId === null) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="vd-title">
      <div
        className={`absolute inset-0 transition-opacity duration-250 ${visible ? 'opacity-100' : 'opacity-0'}`}
        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
        onClick={handleClose}
      />

      <div
        className={`relative w-full max-w-[540px] flex flex-col overflow-hidden transition-[opacity,transform] duration-250 ${
          visible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'
        }`}
        style={{ maxHeight: '92vh', borderRadius: '24px', background: '#ffffff', boxShadow: '0 32px 80px rgba(0,0,0,0.28), 0 0 0 1px rgba(255,255,255,0.06)' }}
      >
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-3xl bg-white">
            <div className="flex flex-col items-center gap-3">
              <span className="material-symbols-outlined text-4xl animate-spin text-primary" aria-hidden="true">progress_activity</span>
              <p className="text-sm font-medium text-gray-500">Đang tải dữ liệu…</p>
            </div>
          </div>
        )}

        {error && !isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-3xl bg-white">
            <div className="flex flex-col items-center gap-3 px-8 text-center">
              <span className="material-symbols-outlined text-4xl text-red-500" aria-hidden="true">error</span>
              <p className="text-sm text-red-600 font-semibold">{error}</p>
              <button onClick={fetchDetail} className="text-sm font-semibold text-primary transition-colors hover:text-primary/80 focus-visible:ring-2 focus-visible:ring-primary/40 rounded outline-none">
                Thử lại
              </button>
            </div>
          </div>
        )}

        <VoucherHeroHeader
          data={data}
          copied={copied}
          heroGradient={heroGradient}
          status={status}
          discountDisplay={discountDisplay}
          onClose={handleClose}
          onCopy={handleCopy}
        />

        <div className="flex-1 overflow-y-auto bg-slate-50">
          <div className="p-5 space-y-4">
            {data && (
              <VoucherUsageCard
                usedCount={usedCount}
                maxUses={maxUses}
                isUnlimited={isUnlimited}
                usageRatio={usageRatio}
                savedCount={savedCount}
                progressColor={progressColor}
                analytics={analytics}
              />
            )}
            {data && analytics && <VoucherToursCard analytics={analytics} />}
            {data && analytics && <VoucherBookingsCard analytics={analytics} />}
            {data && <VoucherMetaCards data={data} />}
            {data && <VoucherUsersCard data={data} savedCount={savedCount} userVouchers={userVouchers} />}
          </div>
        </div>
      </div>
    </div>
  );
}
