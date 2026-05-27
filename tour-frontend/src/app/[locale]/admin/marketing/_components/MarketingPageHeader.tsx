'use client';

interface MarketingPageHeaderProps {
  onExportCsv: () => void;
  onCreateCampaign: () => void;
}

export function MarketingPageHeader({
  onExportCsv,
  onCreateCampaign,
}: MarketingPageHeaderProps) {
  return (
    <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between mb-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600 mb-2">Tiếp thị qua email</p>
        <h1 className="font-headline text-3xl font-extrabold text-slate-950 tracking-tight">Quản lý tiếp thị</h1>
        <p className="text-sm text-slate-500 mt-2 max-w-2xl">
          Quản lý danh sách người đăng ký nhận ưu đãi, bản nháp chiến dịch và lịch gửi email. Dữ liệu nhận tin được tách khỏi ticket hỗ trợ để vận hành rõ ràng hơn.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={onExportCsv}
          className="h-11 px-5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-bold hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 transition-colors flex items-center gap-2 shadow-sm"
        >
          <span className="material-symbols-outlined text-[18px]">download</span>
          Xuất CSV
        </button>
        <button
          onClick={onCreateCampaign}
          className="h-11 px-5 rounded-xl bg-blue-700 text-white text-sm font-bold hover:bg-blue-800 transition-colors flex items-center gap-2 shadow-lg shadow-blue-700/20"
        >
          <span className="material-symbols-outlined text-[18px]">add_circle</span>
          Tạo chiến dịch
        </button>
      </div>
    </div>
  );
}
