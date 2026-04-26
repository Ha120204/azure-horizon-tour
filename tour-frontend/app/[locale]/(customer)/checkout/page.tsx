'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Header from '@/app/components/layout/Header';
import Footer from '@/app/components/layout/Footer';
import { fetchWithAuth } from '@/app/lib/fetchWithAuth';
import { useLocale } from '@/app/context/LocaleContext';
import ErrorToast from '@/app/components/checkout/ErrorToast';
import ContactInfoForm from '@/app/components/checkout/ContactInfoForm';
import PassengerSection from '@/app/components/checkout/PassengerSection';
import OrderSummary from '@/app/components/checkout/OrderSummary';
import { API_BASE_URL } from '@/app/lib/constants';

type PassengerType = 'Adult (12+)' | 'Child (4-11)' | 'Infant (<4)';

interface Passenger {
    type: PassengerType;
    fullName: string;
    dob: string;
    gender: string;
}

function CheckoutContent() {
    const searchParams = useSearchParams();
    const { t, formatPrice } = useLocale();

    // 1. LẤY ID TOUR, PACKAGE VÀ DEPARTURE TỪ URL
    const tourIdStr = searchParams.get('tourId');
    const packageIdStr = searchParams.get('packageId');
    const departureIdStr = searchParams.get('departureId');

    // STATE LƯU THÔNG TIN TOUR TỪ DATABASE
    const [tourData, setTourData] = useState<any>(null);
    const [selectedPackage, setSelectedPackage] = useState<any>(null);
    const [selectedDeparture, setSelectedDeparture] = useState<any>(null);
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
                    const resTour = await fetch(`${API_BASE_URL}/tour/${tourIdStr}`);
                    if (resTour.ok) {
                        const payload = await resTour.json();
                        const tourInfo = payload.data || payload;
                        setTourData(tourInfo);
                        if (packageIdStr && tourInfo.packages) {
                            const pkg = tourInfo.packages.find((p: any) => p.id.toString() === packageIdStr);
                            if (pkg) setSelectedPackage(pkg);
                        }
                        if (departureIdStr && tourInfo.departures) {
                            const dep = tourInfo.departures.find((d: any) => d.id.toString() === departureIdStr);
                            if (dep) setSelectedDeparture(dep);
                        }
                    }
                } catch (error) {
                    console.error("Lỗi tải thông tin tour:", error);
                }
            }
            setIsLoadingTour(false);

            const token = localStorage.getItem('accessToken');
            if (token) {
                try {
                    const resUser = await fetchWithAuth(`${API_BASE_URL}/auth/profile`);
                    if (resUser.ok) {
                        const payload = await resUser.json();
                        const uData = payload.data || payload;
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

            if (token) {
                try {
                    const resWallet = await fetchWithAuth(`${API_BASE_URL}/voucher/my-wallet`);
                    if (resWallet.ok) {
                        const payload = await resWallet.json();
                        const walletData = payload.data || payload;
                        setMyWalletVouchers(walletData.filter((uv: any) => uv.status === 'available') || []);
                    }
                } catch (e) { console.error('Lỗi tải ví voucher:', e); }
            }
        };
        fetchInitialData();
    }, [tourIdStr]);

    // 3. THIẾT LẬP BẢNG GIÁ ĐỘNG DỰA TRÊN GIÁ TOUR TRONG DATABASE
    const basePrice = (() => {
        let base = selectedDeparture?.price ?? tourData?.price ?? 0;
        let addon = selectedPackage?.price ?? 0;
        return base + addon;
    })();
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
        const codeToUse = (code || voucherCode).trim().toUpperCase();
        if (!codeToUse) return;

        setIsValidating(true);
        setVoucherError('');
        setAppliedVoucher(null);   // reset khi apply lại
        setShowWalletDropdown(false);

        try {
            const res = await fetchWithAuth(`${API_BASE_URL}/voucher/validate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: codeToUse, totalPrice: subtotal }),
            });

            // Unwrap nested wrapper nếu có: { data: {...} } hoặc trực tiếp
            const raw = await res.json();
            const data = raw?.data ?? raw;

            if (!res.ok) {
                // NestJS BadRequestException → { statusCode, message }
                let msg = data?.message ?? t('checkout.invalidVoucher');
                // Có thể là mảng (class-validator)
                if (Array.isArray(msg)) msg = msg[0];
                if (typeof msg === 'string' && msg.startsWith('MIN_ORDER:')) {
                    const minVal = Number(msg.split(':')[1]);
                    msg = t('checkout.minOrder', { amount: formatPrice(minVal) });
                }
                setVoucherError(msg);
                return;
            }

            // Thành công: phải có valid = true và discountAmount hợp lệ
            if (data?.valid === true) {
                const discountAmount = Number(data.discountAmount) || 0;
                setAppliedVoucher({
                    code: data.code ?? codeToUse,
                    label: data.label ?? '',
                    discountAmount,
                    discountType: data.discountType ?? '',
                    discountValue: Number(data.discountValue) || 0,
                });
                setVoucherCode(data.code ?? codeToUse);
                setVoucherError('');
            } else {
                // Trường hợp backend trả 200 nhưng valid = false
                let msg = data?.message ?? t('checkout.invalidVoucher');
                if (typeof msg === 'string' && msg.startsWith('MIN_ORDER:')) {
                    const minVal = Number(msg.split(':')[1]);
                    msg = t('checkout.minOrder', { amount: formatPrice(minVal) });
                }
                setVoucherError(msg);
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
                packageId: selectedPackage?.id, // [PHASE 2] Gửi packageId thay vì tier
                departureId: selectedDeparture?.id, // Gửi departureId nếu có
                contactInfo: contactInfo,
                passengers: allPassengers,
                totalAmount: totalPrice,
                numberOfPeople: totalPeople,
                voucherCode: appliedVoucher?.code || undefined,
            };

            const response = await fetchWithAuth(`${API_BASE_URL}/booking`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(bookingPayload)
            });

            const payload = await response.json();
            const data = payload.data || payload;

            if (response.ok && data.paymentUrl) {
                window.location.href = data.paymentUrl;
            } else {
                showError(t('checkout.errors.paymentInit') + ": " + (payload.message || data.message || t('checkout.errors.tryAgain')));
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

            <ErrorToast message={errorMsg} onClose={() => setErrorMsg('')} t={t} />

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
                    <ContactInfoForm
                        contactInfo={contactInfo}
                        setContactInfo={setContactInfo}
                        isBookForMyself={isBookForMyself}
                        setIsBookForMyself={setIsBookForMyself}
                        onToggleBookForMyself={handleToggleBookForMyself}
                        setLeadTraveler={setLeadTraveler}
                        t={t}
                    />

                    <PassengerSection
                        leadTraveler={leadTraveler}
                        setLeadTraveler={setLeadTraveler}
                        passengers={passengers}
                        activeFormType={activeFormType}
                        tempFormData={tempFormData}
                        setTempFormData={setTempFormData}
                        onOpenForm={handleOpenForm}
                        onSavePassenger={handleSavePassenger}
                        onRemovePassenger={handleRemovePassenger}
                        t={t}
                    />
                </div>

                <OrderSummary
                    tourData={tourData}
                    selectedPackage={selectedPackage}
                    adultCount={adultCount}
                    childCount={childCount}
                    infantCount={infantCount}
                    prices={PRICES}
                    taxes={TAXES}
                    subtotal={subtotal}
                    totalPrice={totalPrice}
                    discountAmount={discountAmount}
                    appliedVoucher={appliedVoucher}
                    voucherCode={voucherCode}
                    setVoucherCode={setVoucherCode}
                    voucherError={voucherError}
                    setVoucherError={setVoucherError}
                    isValidating={isValidating}
                    onApplyVoucher={handleApplyVoucher}
                    onRemoveVoucher={handleRemoveVoucher}
                    myWalletVouchers={myWalletVouchers}
                    showWalletDropdown={showWalletDropdown}
                    setShowWalletDropdown={setShowWalletDropdown}
                    isPaymentLoading={isPaymentLoading}
                    onPayment={handlePayment}
                    t={t}
                    formatPrice={formatPrice}
                />
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
            <Suspense fallback={<div className="min-h-screen flex items-center justify-center font-bold text-primary">{`Loading...`}</div>}>
                <CheckoutContent />
            </Suspense>
            <Footer />
        </div>
    );
}