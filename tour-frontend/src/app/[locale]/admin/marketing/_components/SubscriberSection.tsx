'use client';

import AdminPagination from '@/components/admin/AdminPagination';
import { LogSelect } from '../../logs/_components/LogSelect';
import { statusOptions } from '../_lib/config';
import { formatDate } from '../_lib/helpers';
import type { Meta, Subscriber, SubscriberStatus } from '../_lib/types';

interface SubscriberSectionProps {
  search: string;
  status: SubscriberStatus;
  filteredSummary: string;
  subscribers: Subscriber[];
  isLoading: boolean;
  loadingId: number | null;
  meta: Meta;
  page: number;
  limit: number;
  onSearchChange: (value: string) => void;
  onStatusChange: (status: SubscriberStatus) => void;
  onToggleActive: (subscriber: Subscriber) => void;
  onDelete: (subscriber: Subscriber) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (limit: number) => void;
}

export function SubscriberSection({
  search,
  status,
  filteredSummary,
  subscribers,
  isLoading,
  loadingId,
  meta,
  page,
  limit,
  onSearchChange,
  onStatusChange,
  onToggleActive,
  onDelete,
  onPageChange,
  onPageSizeChange,
}: SubscriberSectionProps) {
  return (
    <section className="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex flex-col lg:flex-row gap-3 lg:items-center">
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">search</span>
          <input
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Tìm email người đăng ký..."
            className="w-full h-12 rounded-xl bg-slate-50 border border-slate-200 pl-12 pr-4 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
          />
        </div>
        <LogSelect
          value={status}
          options={statusOptions}
          onChange={value => onStatusChange(value as SubscriberStatus)}
          ariaLabel="Lọc người đăng ký theo trạng thái"
          align="right"
          className="w-full lg:w-[190px]"
          triggerClassName="!min-h-12 !rounded-xl !border-slate-200 !bg-slate-50 !px-4 !font-semibold !text-slate-700 hover:!border-blue-200 hover:!bg-blue-50/60"
          menuClassName="w-full min-w-[220px]"
        />
        <div className="h-12 rounded-xl bg-slate-50 border border-slate-200 px-4 flex items-center text-sm font-semibold text-slate-500 whitespace-nowrap">
          {filteredSummary}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500">
              <th className="px-5 py-4 font-bold">Người đăng ký</th>
              <th className="px-5 py-4 font-bold">Trạng thái</th>
              <th className="px-5 py-4 font-bold">Nguồn</th>
              <th className="px-5 py-4 font-bold">Ngày đăng ký</th>
              <th className="px-5 py-4 font-bold text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading && Array.from({ length: 5 }).map((_, index) => (
              <tr key={index} className="animate-pulse">
                <td className="px-5 py-4"><div className="h-4 bg-slate-100 rounded w-56" /></td>
                <td className="px-5 py-4"><div className="h-7 bg-slate-100 rounded-full w-28" /></td>
                <td className="px-5 py-4"><div className="h-4 bg-slate-100 rounded w-32" /></td>
                <td className="px-5 py-4"><div className="h-4 bg-slate-100 rounded w-36" /></td>
                <td className="px-5 py-4"><div className="h-8 bg-slate-100 rounded ml-auto w-24" /></td>
              </tr>
            ))}
            {!isLoading && subscribers.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-20 text-center">
                  <span className="material-symbols-outlined text-5xl text-slate-300 mb-3">mark_email_unread</span>
                  <p className="font-bold text-slate-800">Chưa có người đăng ký phù hợp</p>
                  <p className="text-sm text-slate-500 mt-1">Thử bỏ bộ lọc hoặc kiểm tra lại từ khóa tìm kiếm.</p>
                </td>
              </tr>
            )}
            {!isLoading && subscribers.map(item => (
              <SubscriberRow
                key={item.id}
                subscriber={item}
                loadingId={loadingId}
                onToggleActive={onToggleActive}
                onDelete={onDelete}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div className="p-4 border-t border-slate-100">
        <AdminPagination
          currentPage={page}
          totalPages={meta.totalPages}
          totalItems={meta.total}
          pageSize={limit}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          itemLabel="người đăng ký"
        />
      </div>
    </section>
  );
}

interface SubscriberRowProps {
  subscriber: Subscriber;
  loadingId: number | null;
  onToggleActive: (subscriber: Subscriber) => void;
  onDelete: (subscriber: Subscriber) => void;
}

function SubscriberRow({
  subscriber,
  loadingId,
  onToggleActive,
  onDelete,
}: SubscriberRowProps) {
  return (
    <tr className="hover:bg-slate-50/70 transition-colors">
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${subscriber.isActive ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
            <span className="material-symbols-outlined text-[20px]">alternate_email</span>
          </div>
          <div>
            <p className="font-bold text-slate-900">{subscriber.email}</p>
            <p className="text-xs text-slate-400">ID #{subscriber.id}</p>
          </div>
        </div>
      </td>
      <td className="px-5 py-4">
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${subscriber.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${subscriber.isActive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
          {subscriber.isActive ? 'Đang nhận tin' : 'Đã tạm dừng'}
        </span>
      </td>
      <td className="px-5 py-4 text-slate-500">
        <span className="inline-flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px] text-slate-400">public</span>
          Trang web
        </span>
      </td>
      <td className="px-5 py-4 text-slate-600 tabular-nums">{formatDate(subscriber.createdAt)}</td>
      <td className="px-5 py-4">
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => onToggleActive(subscriber)}
            disabled={loadingId === subscriber.id}
            className="w-9 h-9 rounded-xl border border-slate-200 text-slate-500 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-colors disabled:opacity-60"
            title={subscriber.isActive ? 'Tạm dừng nhận tin' : 'Bật nhận tin'}
          >
            <span className="material-symbols-outlined text-[18px]">{subscriber.isActive ? 'notifications_off' : 'notifications_active'}</span>
          </button>
          <button
            onClick={() => onDelete(subscriber)}
            className="w-9 h-9 rounded-xl border border-slate-200 text-slate-500 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700 transition-colors"
            title="Xóa người đăng ký"
          >
            <span className="material-symbols-outlined text-[18px]">delete</span>
          </button>
        </div>
      </td>
    </tr>
  );
}
