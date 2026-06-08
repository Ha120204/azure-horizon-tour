import Image from 'next/image';
import type { VoucherDetail, UserVoucherEntry } from './types';
import { formatDateTime, getInitials } from './utils';

export default function VoucherUsersCard({
  data,
  savedCount,
  userVouchers,
}: {
  data: VoucherDetail;
  savedCount: number;
  userVouchers: UserVoucherEntry[];
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px] text-primary" aria-hidden="true">group</span>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Người Dùng Gần Đây</p>
        </div>
        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-primary">
          {savedCount} người đã lưu
        </span>
      </div>

      {userVouchers.length === 0 ? (
        <div className="text-center py-10 px-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 bg-slate-100">
            <span className="material-symbols-outlined text-3xl text-gray-300" aria-hidden="true">group_off</span>
          </div>
          <p className="text-sm font-semibold text-gray-500">Chưa có ai lưu voucher này</p>
          <p className="text-xs text-gray-400 mt-1">Voucher sẽ xuất hiện ở đây khi có người sử dụng</p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-50">
          {userVouchers.map((userVoucher) => (
            <li key={userVoucher.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50/70 transition-colors">
              {userVoucher.user?.avatarUrl ? (
                <Image
                  src={userVoucher.user.avatarUrl}
                  alt={userVoucher.user.fullName}
                  width={36}
                  height={36}
                  sizes="36px"
                  className="h-9 w-9 rounded-full object-cover shrink-0 ring-2 ring-white shadow-sm"
                />
              ) : (
                <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 ring-2 ring-white shadow-sm bg-blue-100">
                  <span className="text-blue-700 text-xs font-bold">{getInitials(userVoucher.user?.fullName)}</span>
                </div>
              )}

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{userVoucher.user?.fullName ?? '—'}</p>
                <p className="text-xs text-gray-400 truncate">{userVoucher.user?.email ?? '—'}</p>
              </div>

              <div className="flex flex-col items-end gap-1 shrink-0">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    userVoucher.isUsed
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                      : 'bg-slate-100 text-slate-500 border-transparent'
                  }`}
                >
                  {userVoucher.isUsed && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" aria-hidden="true" />}
                  {userVoucher.isUsed ? 'Đã dùng' : 'Đã lưu'}
                </span>
                <span className="text-[10px] text-gray-400">{formatDateTime(userVoucher.savedAt)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {savedCount > 20 && (
        <div className="px-4 py-3 border-t border-gray-50 text-center">
          <p className="text-xs text-gray-400">Hiển thị 20/{savedCount} người gần nhất</p>
        </div>
      )}
    </div>
  );
}
