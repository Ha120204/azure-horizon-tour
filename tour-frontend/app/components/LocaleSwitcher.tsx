'use client';

import { useState, useEffect } from 'react';
import { useLocale } from '@/app/context/LocaleContext';
import { usePathname, useRouter } from '../../i18n/routing';
import { useSearchParams } from 'next/navigation';

interface LocaleSwitcherProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function LocaleSwitcher({ isOpen, onClose }: LocaleSwitcherProps) {
    const { language, currency, setCurrency } = useLocale();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // State tạm để người dùng chọn trước khi bấm Confirm
    const [tempLang, setTempLang] = useState(language);
    const [tempCur, setTempCur] = useState(currency);

    // Chỉ đồng bộ state tạm khi modal VỪA MỞ (isOpen chuyển từ false → true)
    useEffect(() => {
        if (isOpen) {
            setTempLang(language);
            setTempCur(currency);
        }
    }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleConfirm = () => {
        setCurrency(tempCur);
        onClose();
        
        // Điều hướng sang locale mới, GỮI NGUYÊN các query params (?tourId=...)
        const queryStr = searchParams.toString();
        const href = queryStr ? `${pathname}?${queryStr}` : pathname;
        
        router.replace(href as any, { locale: tempLang });
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Overlay mờ nền */}
            <div
                className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[200] animate-fadeIn"
                onClick={onClose}
            />

            {/* Modal chính */}
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[201] w-[95%] max-w-[560px] animate-modalSlideUp">
                <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100">

                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                                <span className="material-symbols-outlined text-primary text-lg">language</span>
                            </div>
                            <h2 className="font-headline text-lg font-bold tracking-tight text-slate-800">
                                {tempLang === 'vi' ? 'Cài đặt khu vực' : 'Regional Settings'}
                            </h2>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors"
                        >
                            <span className="material-symbols-outlined text-slate-500 text-xl">close</span>
                        </button>
                    </div>

                    {/* Body: 2 cột */}
                    <div className="grid grid-cols-2 divide-x divide-slate-100">
                        {/* Cột trái: Tiền tệ */}
                        <div className="p-6">
                            <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-4">
                                {tempLang === 'vi' ? 'Đơn vị tiền tệ' : 'Currency'}
                            </h3>
                            <div className="space-y-2">
                                {/* VND */}
                                <button
                                    type="button"
                                    onClick={() => setTempCur('VND')}
                                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 text-left transition-all duration-200 active:scale-[0.98]
                                        ${tempCur === 'VND'
                                            ? 'border-primary bg-primary/5'
                                            : 'border-slate-100 hover:border-slate-200 bg-white'
                                        }`}
                                >
                                    <span className="text-base font-black text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">₫</span>
                                    <div className="flex-1">
                                        <p className={`text-sm font-bold ${tempCur === 'VND' ? 'text-primary' : 'text-slate-800'}`}>VND</p>
                                        <p className="text-[11px] text-slate-500">Vietnam Dong</p>
                                    </div>
                                    {tempCur === 'VND' && (
                                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                            <span className="material-symbols-outlined text-white text-xs">check</span>
                                        </div>
                                    )}
                                </button>

                                {/* USD */}
                                <button
                                    type="button"
                                    onClick={() => setTempCur('USD')}
                                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 text-left transition-all duration-200 active:scale-[0.98]
                                        ${tempCur === 'USD'
                                            ? 'border-primary bg-primary/5'
                                            : 'border-slate-100 hover:border-slate-200 bg-white'
                                        }`}
                                >
                                    <span className="text-base font-black text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">$</span>
                                    <div className="flex-1">
                                        <p className={`text-sm font-bold ${tempCur === 'USD' ? 'text-primary' : 'text-slate-800'}`}>USD</p>
                                        <p className="text-[11px] text-slate-500">US Dollar</p>
                                    </div>
                                    {tempCur === 'USD' && (
                                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                            <span className="material-symbols-outlined text-white text-xs">check</span>
                                        </div>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Cột phải: Ngôn ngữ */}
                        <div className="p-6">
                            <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-4">
                                {tempLang === 'vi' ? 'Ngôn ngữ' : 'Language'}
                            </h3>
                            <div className="space-y-2">
                                {/* Tiếng Việt */}
                                <button
                                    type="button"
                                    onClick={() => setTempLang('vi')}
                                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 text-left transition-all duration-200 active:scale-[0.98]
                                        ${tempLang === 'vi'
                                            ? 'border-primary bg-primary/5'
                                            : 'border-slate-100 hover:border-slate-200 bg-white'
                                        }`}
                                >
                                    <span className="text-lg">🇻🇳</span>
                                    <div className="flex-1">
                                        <p className={`text-sm font-bold ${tempLang === 'vi' ? 'text-primary' : 'text-slate-800'}`}>Tiếng Việt</p>
                                        <p className="text-[11px] text-slate-500">Việt Nam</p>
                                    </div>
                                    {tempLang === 'vi' && (
                                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                            <span className="material-symbols-outlined text-white text-xs">check</span>
                                        </div>
                                    )}
                                </button>

                                {/* English */}
                                <button
                                    type="button"
                                    onClick={() => setTempLang('en')}
                                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 text-left transition-all duration-200 active:scale-[0.98]
                                        ${tempLang === 'en'
                                            ? 'border-primary bg-primary/5'
                                            : 'border-slate-100 hover:border-slate-200 bg-white'
                                        }`}
                                >
                                    <span className="text-lg">🌐</span>
                                    <div className="flex-1">
                                        <p className={`text-sm font-bold ${tempLang === 'en' ? 'text-primary' : 'text-slate-800'}`}>English</p>
                                        <p className="text-[11px] text-slate-500">International</p>
                                    </div>
                                    {tempLang === 'en' && (
                                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                            <span className="material-symbols-outlined text-white text-xs">check</span>
                                        </div>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Footer: Nút xác nhận */}
                    <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <p className="text-xs text-slate-500">
                            {tempLang === 'vi' ? 'Cài đặt sẽ được lưu lại' : 'Settings will be saved'}
                        </p>
                        <button
                            type="button"
                            onClick={handleConfirm}
                            className="px-8 py-2.5 bg-primary text-white font-headline font-bold text-sm rounded-xl hover:opacity-90 active:scale-95 transition-all shadow-md shadow-primary/20"
                        >
                            {tempLang === 'vi' ? 'Xác nhận' : 'Confirm'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Animations */}
            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes modalSlideUp { from { opacity: 0; transform: translate(-50%, -45%); } to { opacity: 1; transform: translate(-50%, -50%); } }
                .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
                .animate-modalSlideUp { animation: modalSlideUp 0.3s ease-out; }
            `}} />
        </>
    );
}
