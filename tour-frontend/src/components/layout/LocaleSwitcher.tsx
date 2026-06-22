'use client';

import Image from 'next/image';
import { useState } from 'react';
import { useLocale } from '@/context/LocaleContext';
import { changeLocale } from '@/lib/i18n/setLocaleCookie';

interface LocaleSwitcherProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function LocaleSwitcher({ isOpen, onClose }: LocaleSwitcherProps) {
    const { language, currency, setCurrency } = useLocale();

    // State tạm để người dùng chọn trước khi bấm Confirm
    const [tempLang, setTempLang] = useState(language);
    const [tempCur, setTempCur] = useState(currency);

    const optionButtonClass = (isActive: boolean) =>
        `group w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 text-left transition-[background-color,border-color,box-shadow,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white motion-reduce:transform-none motion-reduce:transition-none ${
            isActive
                ? 'border-primary bg-primary/5 shadow-[0_10px_24px_rgba(0,63,135,0.10)] hover:bg-primary/10 hover:shadow-[0_14px_32px_rgba(0,63,135,0.16)]'
                : 'border-slate-100 bg-white hover:border-primary/25 hover:bg-primary/[0.03] hover:shadow-[0_12px_28px_rgba(15,23,42,0.08)]'
        }`;
    const currencyGlyphClass = (isActive: boolean) =>
        `text-base font-black px-2 py-0.5 rounded-md transition-[background-color,color,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105 motion-reduce:transform-none ${
            isActive
                ? 'bg-primary/10 text-primary'
                : 'text-slate-700 bg-slate-100 group-hover:bg-primary/10 group-hover:text-primary'
        }`;
    const activeCheckClass =
        'w-5 h-5 rounded-full bg-primary flex items-center justify-center shadow-sm transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-110 motion-reduce:transform-none';

    // Chỉ đồng bộ state tạm khi modal VỪA MỞ (isOpen chuyển từ false → true)
    const handleClose = () => {
        setTempLang(language);
        setTempCur(currency);
        onClose();
    };

    const handleConfirm = () => {
        setCurrency(tempCur);
        onClose();
        changeLocale(tempLang);
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Overlay mờ nền */}
            <div
                className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[200] animate-fadeIn"
                onClick={handleClose}
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
                            onClick={handleClose}
                            aria-label="Close regional settings"
                            className="group flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-[background-color,color,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:bg-primary/10 hover:text-primary active:translate-y-0 active:scale-95 motion-reduce:transform-none motion-reduce:transition-none"
                        >
                            <span className="material-symbols-outlined text-xl transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:rotate-90 motion-reduce:transform-none">close</span>
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
                                    className={optionButtonClass(tempCur === 'VND')}
                                >
                                    <span className={currencyGlyphClass(tempCur === 'VND')}>₫</span>
                                    <div className="flex-1">
                                        <p className={`text-sm font-bold ${tempCur === 'VND' ? 'text-primary' : 'text-slate-800'}`}>VND</p>
                                        <p className="text-[11px] text-slate-500">Vietnam Dong</p>
                                    </div>
                                    {tempCur === 'VND' && (
                                        <div className={activeCheckClass}>
                                            <span className="material-symbols-outlined text-white text-xs">check</span>
                                        </div>
                                    )}
                                </button>

                                {/* USD */}
                                <button
                                    type="button"
                                    onClick={() => setTempCur('USD')}
                                    className={optionButtonClass(tempCur === 'USD')}
                                >
                                    <span className={currencyGlyphClass(tempCur === 'USD')}>$</span>
                                    <div className="flex-1">
                                        <p className={`text-sm font-bold ${tempCur === 'USD' ? 'text-primary' : 'text-slate-800'}`}>USD</p>
                                        <p className="text-[11px] text-slate-500">US Dollar</p>
                                    </div>
                                    {tempCur === 'USD' && (
                                        <div className={activeCheckClass}>
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
                                    className={optionButtonClass(tempLang === 'vi')}
                                >
                                    <Image
                                        src="https://flagcdn.com/w40/vn.png"
                                        alt="Cờ Việt Nam"
                                        width={28}
                                        height={21}
                                        className="h-5 w-7 rounded-[3px] border border-slate-200 object-cover shadow-sm transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105 motion-reduce:transform-none"
                                    />
                                    <div className="flex-1">
                                        <p className={`text-sm font-bold ${tempLang === 'vi' ? 'text-primary' : 'text-slate-800'}`}>Tiếng Việt</p>
                                        <p className="text-[11px] text-slate-500">Việt Nam</p>
                                    </div>
                                    {tempLang === 'vi' && (
                                        <div className={activeCheckClass}>
                                            <span className="material-symbols-outlined text-white text-xs">check</span>
                                        </div>
                                    )}
                                </button>

                                {/* English */}
                                <button
                                    type="button"
                                    onClick={() => setTempLang('en')}
                                    className={optionButtonClass(tempLang === 'en')}
                                >
                                    <span className="text-lg transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-110 motion-reduce:transform-none">🌐</span>
                                    <div className="flex-1">
                                        <p className={`text-sm font-bold ${tempLang === 'en' ? 'text-primary' : 'text-slate-800'}`}>English</p>
                                        <p className="text-[11px] text-slate-500">International</p>
                                    </div>
                                    {tempLang === 'en' && (
                                        <div className={activeCheckClass}>
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
                            className="inline-flex items-center justify-center px-8 py-2.5 bg-primary text-white font-headline font-bold text-sm rounded-xl shadow-md shadow-primary/20 transition-[background-color,box-shadow,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:bg-primary-container hover:shadow-xl hover:shadow-primary/25 active:translate-y-0 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 motion-reduce:transform-none motion-reduce:transition-none"
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
