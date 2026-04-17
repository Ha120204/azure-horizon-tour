'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';
import { fetchWithAuth } from '@/app/utils/fetchWithAuth';
import { useLocale } from '@/app/context/LocaleContext';

type PassengerType = 'Adult (12+)' | 'Child (4-11)' | 'Infant (<4)';

interface Passenger {
    type: PassengerType;
    fullName: string;
    dob: string;
    gender: string;
}

const ACCOMMODATION_TIERS = {
    'luxury_villa': { name: 'Luxury Villa', price: 0 },
    'boutique_hotel': { name: 'Boutique Hotel', price: 0 },
    'ocean_suite': { name: 'Ocean Suite', price: 0 },
};

function CheckoutContent() {
    const searchParams = useSearchParams();
    const { t, formatPrice } = useLocale();

    // 1. LẤY ID TOUR TỪ URL
    const tourIdStr = searchParams.get('tourId');
    const tierId = searchParams.get('tier') || 'luxury_villa';

    const currentTier =
        ACCOMMODATION_TIERS[tierId as keyof typeof ACCOMMODATION_TIERS] ||
        Object.values(ACCOMMODATION_TIERS).find(t => t.name === tierId) ||
        ACCOMMODATION_TIERS['luxury_villa'];

    // STATE LƯU THÔNG TIN TOUR TỪ DATABASE
    const [tourData, setTourData] = useState<any>(null);
    const [isLoadingTour, setIsLoadingTour] = useState(true);

    const [contactInfo, setContactInfo] = useState({ fullName: '', email: '', phone: '', dob: '', gender: '' });
    const [leadTraveler, setLeadTraveler] = useState({ fullName: '', dob: '', gender: '', notes: '' });

    const [passengers, setPassengers] = useState<Passenger[]>([]);
    const [isBookForMyself, setIsBookForMyself] = useState(true);
    const [activeFormType, setActiveFormType] = useState<PassengerType | null>(null);
    const [tempFormData, setTempFormData] = useState({ fullName: '', dob: '', gender: '' });
    const [isPaymentLoading, setIsPaymentLoading] = useState(false);

    // Toast Alert State
    const [errorMsg, setErrorMsg] = useState('');

    const showError = (msg: string) => {
        setErrorMsg(msg);
        setTimeout(() => setErrorMsg(''), 4000);
    };

    // Voucher State
    const [voucherCode, setVoucherCode] = useState('');
    const [appliedVoucher, setAppliedVoucher] = useState<{
        code: string; label: string; discountAmount: number; discountType: string; discountValue: number;
    } | null>(null);
    const [voucherError, setVoucherError] = useState('');
    const [isValidating, setIsValidating] = useState(false);
    const [myWalletVouchers, setMyWalletVouchers] = useState<any[]>([]);
    const [showWalletDropdown, setShowWalletDropdown] = useState(false);

    // 2. GỌI API LẤY DATA THẬT CỦA TOUR VÀ THÔNG TIN NGƯỜI DÙNG
    useEffect(() => {
        const fetchInitialData = async () => {
            if (tourIdStr) {
                try {
                    const resTour = await fetch(`http://localhost:3000/tour/${tourIdStr}`);
                    if (resTour.ok) {
                        const tData = await resTour.json();
                        setTourData(tData);
                    }
                } catch (error) {
                    console.error("Lỗi tải thông tin tour:", error);
                }
            }
            setIsLoadingTour(false);

            const token = localStorage.getItem('accessToken');
            if (token) {
                try {
                    const resUser = await fetchWithAuth('http://localhost:3000/auth/profile');
                    if (resUser.ok) {
                        const uData = await resUser.json();
                        setContactInfo({ 
                            fullName: uData.fullName || '', 
                            email: uData.email || '', 
                            phone: uData.phone || '',
                            dob: uData.dob || '',
                            gender: uData.gender || ''
                        });
                        setLeadTraveler(prev => ({ 
                            ...prev, 
                            fullName: uData.fullName || '',
                            dob: uData.dob || '',
                            gender: uData.gender || ''
                        }));
                    }
                } catch (error) {
                    console.error("Lỗi khi tải thông tin user:", error);
                }
            }

            // Fetch user's voucher wallet
            if (token) {
                try {
                    const resWallet = await fetchWithAuth('http://localhost:3000/voucher/my-wallet');
                    if (resWallet.ok) {
                        const walletData = await resWallet.json();
                        setMyWalletVouchers(walletData.filter((uv: any) => uv.status === 'available') || []);
                    }
                } catch (e) { console.error('Lỗi tải ví voucher:', e); }
            }
        };
        fetchInitialData();
    }, [tourIdStr]);

    // 3. THIẾT LẬP BẢNG GIÁ ĐỘNG DỰA TRÊN GIÁ TOUR TRONG DATABASE
    const basePrice = tourData?.price || 0;
    const PRICES = {
        'Adult (12+)': basePrice,
        'Child (4-11)': basePrice * 0.7,
        'Infant (<4)': basePrice * 0.1
    };
    const TAXES = 0;

    const adultCount = 1 + passengers.filter(p => p.type === 'Adult (12+)').length;
    const childCount = passengers.filter(p => p.type === 'Child (4-11)').length;
    const infantCount = passengers.filter(p => p.type === 'Infant (<4)').length;

    const subtotal = (adultCount * PRICES['Adult (12+)']) +
        (childCount * PRICES['Child (4-11)']) +
        (infantCount * PRICES['Infant (<4)']) + TAXES;

    const discountAmount = appliedVoucher?.discountAmount || 0;
    const totalPrice = Math.max(0, subtotal - discountAmount);

    // Voucher validation
    const handleApplyVoucher = async (code?: string) => {
        const codeToUse = code || voucherCode.trim();
        if (!codeToUse) return;

        setIsValidating(true);
        setVoucherError('');
        setShowWalletDropdown(false);

        try {
            const res = await fetchWithAuth('http://localhost:3000/voucher/validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: codeToUse, totalPrice: subtotal }),
            });

            const data = await res.json();

            if (res.ok && data.valid) {
                setAppliedVoucher({
                    code: data.code,
                    label: data.label,
                    discountAmount: data.discountAmount,
                    discountType: data.discountType,
                    discountValue: data.discountValue,
                });
                setVoucherCode(data.code);
                setVoucherError('');
            } else {
                let errorMsg = data.message || t('checkout.invalidVoucher');
                if (typeof errorMsg === 'string' && errorMsg.startsWith('MIN_ORDER:')) {
                    const minVal = Number(errorMsg.split(':')[1]);
                    errorMsg = t('checkout.minOrder', { amount: formatPrice(minVal) });
                }
                setVoucherError(errorMsg);
                setAppliedVoucher(null);
            }
        } catch {
            setVoucherError(t('checkout.serverError'));
        } finally {
            setIsValidating(false);
        }
    };

    const handleRemoveVoucher = () => {
        setAppliedVoucher(null);
        setVoucherCode('');
        setVoucherError('');
    };


    const handleToggleBookForMyself = (checked: boolean) => {
        setIsBookForMyself(checked);
        if (checked) {
            setLeadTraveler(prev => ({ 
                ...prev, 
                fullName: contactInfo.fullName,
                dob: contactInfo.dob,
                gender: contactInfo.gender
            }));
        } else {
            setLeadTraveler(prev => ({ 
                ...prev, 
                fullName: '',
                dob: '',
                gender: ''
            }));
        }
    };

    const handleOpenForm = (type: PassengerType | null) => {
        setActiveFormType(type);
        setTempFormData({ fullName: '', dob: '', gender: '' });
    };

    const handleSavePassenger = () => {
        if (!tempFormData.fullName || !tempFormData.dob || !tempFormData.gender) {
            showError(t('checkout.errors.fillAll'));
            return;
        }
        if (activeFormType) {
            setPassengers([...passengers, { type: activeFormType, ...tempFormData }]);
            setActiveFormType(null);
        }
    };

    const handleRemovePassenger = (indexToRemove: number) => {
        setPassengers(passengers.filter((_, index) => index !== indexToRemove));
    };

    const handlePayment = async () => {
        if (!contactInfo.fullName || !contactInfo.email || !contactInfo.phone) {
            showError(t('checkout.errors.fillContact'));
            return;
        }

        if (!contactInfo.email.includes('@')) {
            showError(t('checkout.errors.invalidEmail'));
            return;
        }

        if (!leadTraveler.fullName || !leadTraveler.dob || !leadTraveler.gender) {
            showError(t('checkout.errors.leadData'));
            return;
        }

        if (!tourData) {
            showError(t('checkout.errors.invalidOrder'));
            return;
        }

        const token = localStorage.getItem('accessToken');
        if (!token) {
            showError(t('checkout.errors.loginRequired'));
            setTimeout(() => { window.location.href = "/login"; }, 1500);
            return;
        }

        try {
            setIsPaymentLoading(true);

            const allPassengers = [
                { type: 'Adult (12+)', fullName: leadTraveler.fullName, dob: leadTraveler.dob, gender: leadTraveler.gender, notes: leadTraveler.notes },
                ...passengers
            ];

            const totalPeople = adultCount + childCount + infantCount;

            const bookingPayload = {
                tourId: Number(tourIdStr) || tourData.id,
                tier: tierId,
                contactInfo: contactInfo,
                passengers: allPassengers,
                totalAmount: totalPrice,
                numberOfPeople: totalPeople,
                voucherCode: appliedVoucher?.code || undefined,
            };

            const response = await fetchWithAuth('http://localhost:3000/booking', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(bookingPayload)
            });

            const data = await response.json();

            if (response.ok && data.paymentUrl) {
                window.location.href = data.paymentUrl;
            } else {
                showError(t('checkout.errors.paymentInit') + ": " + (data.message || t('checkout.errors.tryAgain')));
                setIsPaymentLoading(false);
            }

        } catch (error) {
            console.error("Lỗi gọi API:", error);
            showError(t('checkout.errors.serverFail'));
            setIsPaymentLoading(false);
        }
    };

    if (isLoadingTour) {
        return <div className="min-h-[60vh] flex items-center justify-center font-bold text-primary">{t('checkout.loadingData')}</div>;
    }

    if (!tourData) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
                <span className="material-symbols-outlined text-6xl text-error mb-4">error</span>
                <h2 className="text-2xl font-bold mb-2">{t('checkout.notFound')}</h2>
                <p className="text-outline mb-6">{t('checkout.goBackDesc')}</p>
                <button onClick={() => window.location.href = '/destinations'} className="bg-primary text-white px-8 py-3 rounded-full font-bold">{t('checkout.exploreTours')}</button>
            </div>
        );
    }

    return (
        <main className="pt-28 pb-20 px-4 md:px-8 max-w-screen-2xl mx-auto flex-grow w-full">

            {/* Custom Error Toast */}
            {errorMsg && (
                <div className="fixed top-28 right-8 z-[100] animate-modalSlideUp">
                    <div className="bg-white border-l-4 border-error shadow-2xl rounded-xl px-6 py-4 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-error/10 flex items-center justify-center text-error border-2 border-error/20">
                            <span className="material-symbols-outlined text-2xl">priority_high</span>
                        </div>
                        <div className="max-w-xs">
                            <h4 className="text-sm font-bold text-slate-800 font-headline uppercase tracking-wide">{t('checkout.infoError')}</h4>
                            <p className="text-[13px] text-slate-500 mt-1 leading-snug">{errorMsg}</p>
                        </div>
                        <button onClick={() => setErrorMsg('')} className="ml-2 text-slate-400 hover:bg-slate-100 p-2 rounded-full transition-colors w-9 h-9 flex items-center justify-center">
                            <span className="material-symbols-outlined text-sm font-bold">close</span>
                        </button>
                    </div>
                </div>
            )}

            <div className="mb-8 md:mb-12 flex items-center justify-start gap-4 md:gap-12">
                <div className="flex items-center gap-2 md:gap-3">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full primary-gradient flex items-center justify-center text-white font-bold text-sm md:text-base shadow-md">1</div>
                    <span className="font-headline font-bold text-primary tracking-tight text-sm md:text-base">{t('checkout.step1')}</span>
                </div>
                <div className="h-px w-8 md:w-16 bg-outline-variant/30 hidden sm:block"></div>
                <div className="flex items-center gap-2 md:gap-3 opacity-50">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant font-bold text-sm md:text-base">2</div>
                    <span className="font-headline font-medium text-on-surface-variant tracking-tight text-sm md:text-base hidden sm:block">{t('checkout.step2')}</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
                <div className="lg:col-span-8 space-y-8 md:space-y-10">

                    {/* 1. Contact Information Card */}
                    <section className="bg-white rounded-xl p-6 md:p-8 ambient-shadow ghost-border">
                        <div className="flex items-center gap-4 mb-6 md:mb-8">
                            <span className="material-symbols-outlined text-primary text-3xl">contact_mail</span>
                            <h2 className="font-headline text-xl md:text-2xl font-bold tracking-tight">{t('checkout.contactInfoTitle')}</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                            <div className="md:col-span-2">
                                <label className="block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant mb-2">{t('checkout.fullName')} <span className="text-error">*</span></label>
                                <input
                                    className="w-full bg-surface-container-low border-none rounded-lg p-3 md:p-4 focus:ring-1 focus:ring-primary outline-none"
                                    type="text"
                                    placeholder={t('checkout.enterFullName')}
                                    value={contactInfo.fullName}
                                    onChange={(e) => {
                                        const newVal = e.target.value;
                                        setContactInfo({ ...contactInfo, fullName: newVal });
                                        if (isBookForMyself) {
                                            setLeadTraveler(prev => ({ ...prev, fullName: newVal }));
                                        }
                                    }}
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant mb-2">{t('checkout.email')} <span className="text-error">*</span></label>
                                <input
                                    className="w-full bg-surface-container-low border-none rounded-lg p-3 md:p-4 focus:ring-1 focus:ring-primary outline-none text-slate-500"
                                    type="email"
                                    placeholder={t('checkout.enterEmail')}
                                    value={contactInfo.email}
                                    readOnly
                                    title="Login email cannot be changed"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant mb-2">{t('checkout.phone')} <span className="text-error">*</span></label>
                                <input
                                    className="w-full bg-surface-container-low border-none rounded-lg p-3 md:p-4 focus:ring-1 focus:ring-primary outline-none"
                                    type="tel"
                                    placeholder={t('checkout.enterPhone')}
                                    value={contactInfo.phone}
                                    onChange={(e) => setContactInfo({ ...contactInfo, phone: e.target.value })}
                                />
                            </div>
                        </div>
                    </section>

                    <label className="flex items-center justify-between bg-primary/5 rounded-xl p-4 md:p-5 border border-primary/20 cursor-pointer shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>
                        <div className="flex items-center gap-4 pl-2 md:pl-4">
                            <div className="relative flex items-center justify-center">
                                <input
                                    type="checkbox"
                                    checked={isBookForMyself}
                                    onChange={(e) => handleToggleBookForMyself(e.target.checked)}
                                    className="w-6 h-6 appearance-none border-2 border-primary/50 rounded-md flex-shrink-0 checked:bg-primary checked:border-primary transition-colors cursor-pointer group-hover:border-primary outline-none"
                                />
                                <span className={`material-symbols-outlined text-white text-[18px] font-bold absolute pointer-events-none transition-opacity ${isBookForMyself ? 'opacity-100' : 'opacity-0'}`}>check</span>
                            </div>
                            <div>
                                <span className="text-[15px] md:text-base font-bold text-primary block">{t('checkout.bookForMyself')}</span>
                            </div>
                        </div>
                        <span className="material-symbols-outlined text-primary/30 group-hover:text-primary/70 transition-colors hidden sm:block text-3xl">post_add</span>
                    </label>

                    {/* 2. Passenger Information Card */}
                    <section className="bg-white rounded-xl p-6 md:p-8 ambient-shadow ghost-border">
                        <div className="flex items-center gap-4 mb-6 md:mb-8">
                            <span className="material-symbols-outlined text-primary text-3xl">group</span>
                            <h2 className="font-headline text-xl md:text-2xl font-bold tracking-tight">{t('checkout.passengerInfoTitle')}</h2>
                        </div>

                        <div className="space-y-8">
                            <div className="bg-surface-container-low/50 p-5 md:p-6 rounded-xl border border-outline-variant/20">
                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-2">
                                    <h3 className="font-headline font-semibold text-base md:text-lg text-primary">{t('checkout.leadTraveler')}</h3>
                                    <span className="bg-tertiary-container text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest w-max shadow-sm">{t('checkout.required')}</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                                    <div className="md:col-span-2">
                                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant mb-2">{t('checkout.fullName')} <span className="text-error">*</span></label>
                                        <input
                                            className="w-full bg-white border border-outline-variant/20 rounded-lg p-3 md:p-4 focus:ring-1 focus:ring-primary outline-none shadow-sm"
                                            type="text"
                                            placeholder={t('checkout.enterFullName')}
                                            value={leadTraveler.fullName}
                                            onChange={(e) => setLeadTraveler({ ...leadTraveler, fullName: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant mb-2">{t('checkout.dob')} <span className="text-error">*</span></label>
                                        <input
                                            className="w-full bg-white border border-outline-variant/20 rounded-lg p-3 md:p-4 focus:ring-1 focus:ring-primary outline-none shadow-sm"
                                            type="date"
                                            value={leadTraveler.dob}
                                            onChange={(e) => setLeadTraveler({ ...leadTraveler, dob: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant mb-2">{t('checkout.gender')} <span className="text-error">*</span></label>
                                        <select
                                            className="w-full bg-white border border-outline-variant/20 rounded-lg p-3 md:p-4 focus:ring-1 focus:ring-primary outline-none shadow-sm appearance-none"
                                            value={leadTraveler.gender}
                                            onChange={(e) => setLeadTraveler({ ...leadTraveler, gender: e.target.value })}
                                        >
                                            <option value="">{t('checkout.selectGender')}</option>
                                            <option value="Male">{t('checkout.male')}</option>
                                            <option value="Female">{t('checkout.female')}</option>
                                            <option value="Other">{t('checkout.other')}</option>
                                        </select>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant mb-2">{t('checkout.specialReq')}</label>
                                        <textarea
                                            className="w-full bg-white border border-outline-variant/20 rounded-lg p-3 md:p-4 focus:ring-1 focus:ring-primary outline-none shadow-sm resize-none"
                                            placeholder={t('checkout.specialReqPlaceholder')}
                                            rows={2}
                                            value={leadTraveler.notes}
                                            onChange={(e) => setLeadTraveler({ ...leadTraveler, notes: e.target.value })}
                                        ></textarea>
                                    </div>
                                </div>
                            </div>

                            {passengers.length > 0 && (
                                <div className="space-y-3">
                                    <h4 className="font-bold text-sm text-on-surface-variant">{t('checkout.addedPassengers')}</h4>
                                    {passengers.map((p, idx) => (
                                        <div key={idx} className="flex justify-between items-center bg-white border border-primary/20 p-4 rounded-xl shadow-sm">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                                    <span className="material-symbols-outlined text-xl">{p.type.includes('Child') ? 'child_care' : p.type.includes('Infant') ? 'baby_changing_station' : 'person'}</span>
                                                </div>
                                                <div>
                                                    <p className="font-bold text-on-surface">{p.fullName}</p>
                                                    <p className="text-xs text-outline font-medium">{t(p.type === 'Adult (12+)' ? 'checkout.adult' : p.type === 'Child (4-11)' ? 'checkout.child' : 'checkout.infant')} • {p.dob || t('checkout.dobNotEntered')}</p>
                                                </div>
                                            </div>
                                            <button onClick={() => handleRemovePassenger(idx)} className="text-error hover:bg-error/10 p-2 rounded-lg transition-colors">
                                                <span className="material-symbols-outlined">delete</span>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="space-y-4 pt-4 border-t border-outline-variant/20">
                                <h3 className="font-headline font-bold text-lg">{t('checkout.addPassenger')}</h3>
                                <div className="grid grid-cols-3 gap-2 md:gap-4">
                                    {(['Adult (12+)', 'Child (4-11)', 'Infant (<4)'] as PassengerType[]).map((type) => {
                                        const isActive = activeFormType === type;
                                        const icon = type.includes('Child') ? 'child_care' : type.includes('Infant') ? 'baby_changing_station' : 'person';

                                        const translatedType = type === 'Adult (12+)' ? t('checkout.adult') : type === 'Child (4-11)' ? t('checkout.child') : t('checkout.infant');

                                        return (
                                            <button
                                                key={type}
                                                onClick={() => handleOpenForm(isActive ? null : type)}
                                                className={`relative flex flex-col items-center justify-center gap-2 p-3 md:p-4 rounded-xl border-2 transition-all ${isActive ? 'border-primary bg-primary/5 shadow-sm' : 'border-outline-variant/30 hover:border-primary/50 bg-white'}`}
                                            >
                                                {isActive && (
                                                    <div className="absolute -top-2 -right-2 bg-primary text-white w-5 h-5 rounded-full flex items-center justify-center shadow-md">
                                                        <span className="material-symbols-outlined text-[12px] font-bold">check</span>
                                                    </div>
                                                )}
                                                <span className={`material-symbols-outlined ${isActive ? 'text-primary' : 'text-on-surface-variant'}`}>{icon}</span>
                                                <span className={`text-[10px] md:text-xs font-bold uppercase tracking-tight ${isActive ? 'text-primary' : 'text-on-surface-variant'}`}>{translatedType}</span>
                                            </button>
                                        );
                                    })}
                                </div>

                                {activeFormType && (
                                    <div className="relative bg-primary/5 rounded-2xl p-5 md:p-8 border border-primary/20 animate-fade-in mt-4">
                                        <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-surface border-t border-l border-primary/20 rotate-45" style={{ backgroundColor: '#f6f8fb' }}></div>
                                        <div className="flex justify-between items-center mb-6">
                                            <h4 className="font-headline font-bold text-lg text-primary">{t('checkout.enterInfoFor')} {activeFormType === 'Adult (12+)' ? t('checkout.adult') : activeFormType === 'Child (4-11)' ? t('checkout.child') : t('checkout.infant')}</h4>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                                            <div className="md:col-span-2">
                                                <label className="block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant mb-2">{t('checkout.fullName')} <span className="text-error">*</span></label>
                                                <input
                                                    className="w-full bg-white border border-outline-variant/20 rounded-lg p-3 md:p-4 focus:ring-1 focus:ring-primary outline-none shadow-sm"
                                                    placeholder={t('checkout.enterFullName')}
                                                    type="text"
                                                    value={tempFormData.fullName}
                                                    onChange={(e) => setTempFormData({ ...tempFormData, fullName: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant mb-2">{t('checkout.dob')} <span className="text-error">*</span></label>
                                                <input
                                                    className="w-full bg-white border border-outline-variant/20 rounded-lg p-3 md:p-4 focus:ring-1 focus:ring-primary outline-none shadow-sm"
                                                    type="date"
                                                    value={tempFormData.dob}
                                                    onChange={(e) => setTempFormData({ ...tempFormData, dob: e.target.value })}
                                                />
                                                <p className="mt-2 text-[11px] text-primary/70 font-medium italic">
                                                    {activeFormType === 'Child (4-11)' ? t('checkout.age4to11') : activeFormType === 'Infant (<4)' ? t('checkout.under4') : t('checkout.over12')}
                                                </p>
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant mb-2">{t('checkout.gender')} <span className="text-error">*</span></label>
                                                <select
                                                    className="w-full bg-white border border-outline-variant/20 rounded-lg p-3 md:p-4 focus:ring-1 focus:ring-primary outline-none shadow-sm appearance-none"
                                                    value={tempFormData.gender}
                                                    onChange={(e) => setTempFormData({ ...tempFormData, gender: e.target.value })}
                                                >
                                                    <option value="">{t('checkout.selectGender')}</option>
                                                    <option value="Male">{t('checkout.male')}</option>
                                                    <option value="Female">{t('checkout.female')}</option>
                                                    <option value="Other">{t('checkout.other')}</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="mt-8 flex justify-end gap-3">
                                            <button onClick={() => setActiveFormType(null)} className="px-6 py-3 rounded-full font-bold text-sm text-outline hover:text-on-surface transition-colors">{t('checkout.cancel')}</button>
                                            <button onClick={handleSavePassenger} className="bg-primary text-white px-8 py-3 rounded-full font-bold text-sm hover:opacity-90 transition-all shadow-md shadow-primary/20 active:scale-95">{t('checkout.savePassenger')}</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>
                </div>

                {/* RIGHT COLUMN: STICKY ORDER SUMMARY */}
                <div className="lg:col-span-4 sticky top-28">
                    <div className="bg-white rounded-2xl ambient-shadow border border-outline-variant/20 overflow-hidden flex flex-col">
                        <div className="bg-surface-container-low p-6 border-b border-outline-variant/20">
                            <h2 className="font-headline text-lg font-bold text-on-surface flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">receipt_long</span>
                                {t('checkout.orderSummary')}
                            </h2>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="flex gap-4 items-start">
                                <img alt={tourData.name} className="w-20 h-20 md:w-24 md:h-24 object-cover rounded-xl shrink-0 shadow-sm" src={tourData.imageUrl || "https://images.unsplash.com/photo-1499681404123-6c7102ce0033?auto=format&fit=crop&q=80&w=400"} />
                                <div>
                                    <h3 className="font-headline font-bold text-base leading-tight mb-2 text-on-surface line-clamp-2">{tourData.name}</h3>
                                    <div className="flex items-center gap-1.5 text-on-surface-variant text-xs font-medium mt-2">
                                        <span className="material-symbols-outlined text-[14px]">calendar_month</span>
                                        <span>{t('checkout.departure')}: {new Date(tourData.startDate).toLocaleDateString('vi-VN')}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-on-surface-variant text-xs font-medium mt-1">
                                        <span className="material-symbols-outlined text-[14px]">schedule</span>
                                        <span>{tourData.duration}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-amber-50 border border-amber-100/50 rounded-xl p-3.5 flex items-start gap-3">
                                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                                    <span className="material-symbols-outlined text-amber-700 text-sm">hotel_class</span>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest mb-0.5">{t('checkout.selectedTier')}</p>
                                    <p className="font-semibold text-amber-900 text-sm">{currentTier.name}</p>
                                </div>
                            </div>

                            <div className="space-y-3 pt-4 border-t border-dashed border-outline-variant/40 text-sm">
                                {adultCount > 0 && (
                                    <div className="flex justify-between items-center">
                                        <span className="text-on-surface-variant font-medium">{t('checkout.adultX')} x {adultCount}</span>
                                        <span className="font-semibold text-on-surface">{formatPrice(adultCount * PRICES['Adult (12+)'])}</span>
                                    </div>
                                )}
                                {childCount > 0 && (
                                    <div className="flex justify-between items-center">
                                        <span className="text-on-surface-variant font-medium">{t('checkout.childX')} x {childCount}</span>
                                        <span className="font-semibold text-on-surface">{formatPrice(childCount * PRICES['Child (4-11)'])}</span>
                                    </div>
                                )}
                                {infantCount > 0 && (
                                    <div className="flex justify-between items-center">
                                        <span className="text-on-surface-variant font-medium">{t('checkout.infantX')} x {infantCount}</span>
                                        <span className="font-semibold text-on-surface">{formatPrice(infantCount * PRICES['Infant (<4)'])}</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center pt-2">
                                    <span className="text-outline font-medium">{t('checkout.taxFee')}</span>
                                    <span className="font-semibold text-outline">{formatPrice(TAXES)}</span>
                                </div>
                            </div>

                            {/* ═══ Voucher Section ═══ */}
                            <div className="pt-4 border-t border-dashed border-outline-variant/40">
                                <p className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant mb-3 flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-sm text-primary">confirmation_number</span>
                                    {t('checkout.voucherTitle')}
                                </p>

                                {appliedVoucher ? (
                                    <div className="bg-tertiary/5 border border-tertiary/20 rounded-xl p-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-bold text-tertiary">{appliedVoucher.label}</p>
                                                <p className="font-mono text-xs text-on-surface-variant mt-0.5">{appliedVoucher.code}</p>
                                            </div>
                                            <button onClick={handleRemoveVoucher} className="text-outline hover:text-error transition-colors p-1">
                                                <span className="material-symbols-outlined text-sm">close</span>
                                            </button>
                                        </div>
                                        <div className="flex justify-between items-center mt-3 pt-3 border-t border-tertiary/10">
                                            <span className="text-xs text-on-surface-variant">{t('checkout.discount')}</span>
                                            <span className="font-bold text-tertiary text-sm">-{formatPrice(appliedVoucher.discountAmount)}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <div className="flex gap-2">
                                            <div className="relative flex-grow">
                                                <input
                                                    type="text"
                                                    value={voucherCode}
                                                    onChange={(e) => {
                                                        setVoucherCode(e.target.value.toUpperCase());
                                                        if (voucherError) setVoucherError('');
                                                    }}
                                                    placeholder={t('checkout.enterVoucher')}
                                                    className="w-full bg-surface-container-low border border-outline-variant/20 rounded-lg pl-4 pr-10 py-3 text-sm font-mono focus:ring-1 focus:ring-primary outline-none uppercase"
                                                    onKeyDown={(e) => e.key === 'Enter' && handleApplyVoucher()}
                                                />
                                                {voucherCode && (
                                                    <button
                                                        onClick={() => {
                                                            setVoucherCode('');
                                                            setVoucherError('');
                                                        }}
                                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-outline hover:text-error transition-colors flex items-center justify-center p-1 rounded-full"
                                                    >
                                                        <span className="material-symbols-outlined text-base">close</span>
                                                    </button>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => handleApplyVoucher()}
                                                disabled={isValidating || !voucherCode.trim()}
                                                className="px-5 py-3 bg-primary text-white rounded-lg font-bold text-sm hover:opacity-90 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                                            >
                                                {isValidating ? '...' : t('checkout.apply')}
                                            </button>
                                        </div>
                                        {voucherError && (
                                            <p className="text-error text-xs mt-2 flex items-center gap-1">
                                                <span className="material-symbols-outlined text-sm">error</span>
                                                {voucherError}
                                            </p>
                                        )}

                                        {/* Wallet quick-pick */}
                                        {myWalletVouchers.length > 0 && (
                                            <div className="mt-3">
                                                <button
                                                    onClick={() => setShowWalletDropdown(!showWalletDropdown)}
                                                    className="text-xs text-primary font-bold flex items-center gap-1 hover:underline underline-offset-4"
                                                >
                                                    <span className="material-symbols-outlined text-sm">wallet</span>
                                                    {t('checkout.chooseFromWallet')} ({myWalletVouchers.length})
                                                    <span className={`material-symbols-outlined text-sm transition-transform ${showWalletDropdown ? 'rotate-180' : ''}`}>expand_more</span>
                                                </button>
                                                {showWalletDropdown && (
                                                    <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                                                        {myWalletVouchers.map((uv: any) => (
                                                            <button
                                                                key={uv.id}
                                                                onClick={() => {
                                                                    setVoucherCode(uv.voucher.code);
                                                                    handleApplyVoucher(uv.voucher.code);
                                                                }}
                                                                className="w-full text-left p-3 bg-surface-container-low rounded-lg border border-outline-variant/10 hover:border-primary/30 hover:bg-primary/5 transition-all"
                                                            >
                                                                <div className="flex justify-between items-center">
                                                                    <span className="font-mono font-bold text-xs text-primary">{uv.voucher.code}</span>
                                                                    <span className="text-[10px] font-bold text-tertiary">
                                                                        {uv.voucher.discountType === 'PERCENTAGE' ? `-${uv.voucher.discountValue}%` : `-${formatPrice(uv.voucher.discountValue)}`}
                                                                    </span>
                                                                </div>
                                                                <p className="text-[10px] text-outline mt-1">{uv.voucher.label}</p>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="pt-4 mt-2 border-t-2 border-primary/10">
                                {appliedVoucher && (
                                    <div className="flex justify-between items-center mb-2 text-sm">
                                        <span className="text-on-surface-variant">{t('checkout.subtotal')}</span>
                                        <span className="text-on-surface-variant">{formatPrice(subtotal)}</span>
                                    </div>
                                )}
                                {appliedVoucher && (
                                    <div className="flex justify-between items-center mb-3 text-sm">
                                        <span className="text-tertiary font-medium">{t('checkout.voucherDiscount')}</span>
                                        <span className="text-tertiary font-bold">-{formatPrice(discountAmount)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-end bg-surface-container-low p-4 rounded-xl border border-outline-variant/20">
                                    <span className="font-headline font-bold text-on-surface-variant uppercase tracking-wider text-xs">{t('checkout.totalPayment')}</span>
                                    <span className="font-headline font-black text-3xl text-primary">{formatPrice(totalPrice)}</span>
                                </div>
                            </div>

                            <button
                                onClick={handlePayment}
                                disabled={isPaymentLoading}
                                className={`w-full bg-primary text-white py-4 rounded-xl font-bold flex items-center justify-center gap-3 hover:opacity-90 transition-all shadow-lg shadow-primary/20 active:scale-95 text-base ${isPaymentLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
                            >
                                <span>{isPaymentLoading ? t('checkout.redirecting') : t('checkout.secureCheckout')}</span>
                                <span className="material-symbols-outlined text-xl">{isPaymentLoading ? 'hourglass_empty' : 'lock'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}

export default function CheckoutPage() {
    return (
        <div className="bg-surface font-body text-on-surface min-h-screen flex flex-col">
            <style dangerouslySetInnerHTML={{
                __html: `
                .ambient-shadow { box-shadow: 0 8px 32px rgba(25, 28, 33, 0.04); }
                .primary-gradient { background: linear-gradient(135deg, #003f87 0%, #0056b3 100%); }
                .ghost-border { border: 1px solid rgba(194, 198, 212, 0.15); }
            `}} />
            <Header />
            <Suspense fallback={<div className="min-h-screen flex items-center justify-center font-bold text-primary">Loading cart...</div>}>
                <CheckoutContent />
            </Suspense>
            <Footer />
        </div>
    );
}