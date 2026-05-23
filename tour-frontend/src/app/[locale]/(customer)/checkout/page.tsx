'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { fetchWithAuth } from '@/lib/fetchWithAuth';
import { useLocale } from '@/context/LocaleContext';
import ErrorToast from '@/components/checkout/ErrorToast';
import ContactInfoForm from '@/components/checkout/ContactInfoForm';
import PassengerSection from '@/components/checkout/PassengerSection';
import OrderSummary from '@/components/checkout/OrderSummary';
import { API_BASE_URL } from '@/lib/constants';
import ConfirmBookingModal from '@/components/checkout/ConfirmBookingModal';

type PassengerType = 'Adult (12+)' | 'Child (4-11)' | 'Infant (<4)';

interface Passenger {
    type: PassengerType;
    fullName: string;
    dob: string;
    gender: string;
    identityType: string;
    identityNo: string;
}

interface CheckoutPackage {
    id: number;
    name: string;
    price?: number | null;
}

interface CheckoutDeparture {
    id: number;
    price?: number | null;
    availableSeats?: number | null;
    category?: string | null;
    note?: string | null;
    flashSaleEndsAt?: string | null;
}

interface CheckoutTourData {
    id: number;
    name: string;
    imageUrl?: string | null;
    startDate: string;
    duration: string;
    price: number;
    availableSeats?: number | null;
    packages?: CheckoutPackage[];
    departures?: CheckoutDeparture[];
}

interface WalletVoucher {
    id: number | string;
    status?: string;
    voucher: {
        code: string;
        label?: string;
        discountType: string;
        discountValue: number;
        minOrderValue?: number;
        expiryDate?: string | null;
    };
}

const SALE_DEPARTURE_CATEGORIES = new Set(['FLASH_SALE', 'EARLY_BIRD', 'LAST_MINUTE']);

function isSaleDeparture(departure: CheckoutDeparture | null, regularPrice?: number | null) {
    if (!departure) return false;

    const departurePrice = Number(departure.price);
    const originalPrice = Number(regularPrice);
    if (
        Number.isFinite(departurePrice) &&
        Number.isFinite(originalPrice) &&
        originalPrice > 0 &&
        departurePrice < originalPrice
    ) {
        return true;
    }

    const category = departure.category?.trim();
    const legacyNote = departure.note?.trim();
    const hasSaleCategory =
        (category != null && SALE_DEPARTURE_CATEGORIES.has(category)) ||
        (!category && legacyNote != null && SALE_DEPARTURE_CATEGORIES.has(legacyNote));

    if (!hasSaleCategory) return false;

    if (departure.flashSaleEndsAt) {
        const endsAt = new Date(departure.flashSaleEndsAt);
        if (!Number.isNaN(endsAt.getTime()) && endsAt <= new Date()) return false;
    }

    return true;
}

function CheckoutContent() {
    const searchParams = useSearchParams();
    const { t, formatPrice, language } = useLocale();

    // 1. LẤY ID TOUR, PACKAGE VÀ DEPARTURE TỪ URL
    const tourIdStr = searchParams.get('tourId');
    const packageIdStr = searchParams.get('packageId');
    const departureIdStr = searchParams.get('departureId');

    // STATE LƯU THÔNG TIN TOUR TỪ DATABASE
    const [tourData, setTourData] = useState<CheckoutTourData | null>(null);
    const [selectedPackage, setSelectedPackage] = useState<CheckoutPackage | null>(null);
    const [selectedDeparture, setSelectedDeparture] = useState<CheckoutDeparture | null>(null);
    const [isLoadingTour, setIsLoadingTour] = useState(true);

    const [contactInfo, setContactInfo] = useState({ fullName: '', email: '', phone: '', identityType: 'CCCD', identityNo: '', dob: '', gender: '' });
    const [leadTraveler, setLeadTraveler] = useState({ fullName: '', dob: '', gender: '', identityType: 'CCCD', identityNo: '', notes: '' });

    const [tempFormData, setTempFormData] = useState({ fullName: '', dob: '', gender: '', identityType: 'CCCD', identityNo: '' });
    const [passengers, setPassengers] = useState<Passenger[]>([]);
    const [isBookForMyself, setIsBookForMyself] = useState(true);
    const [activeFormType, setActiveFormType] = useState<PassengerType | null>(null);
    const [isPaymentLoading, setIsPaymentLoading] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'PAYOS' | 'IN_STORE'>('PAYOS');

    // Toast Alert State
    const [errorMsg, setErrorMsg] = useState('');

    const showError = (msg: string) => {
        setErrorMsg(msg);
        setTimeout(() => setErrorMsg(''), 4000);
    };

    const handleOpenConfirmModal = () => {
        if (!contactInfo.fullName || !contactInfo.email || !contactInfo.phone || !contactInfo.identityNo) {
            showError(t('checkout.errors.fillContact'));
            return;
        }

        // Validate identity document format
        if (contactInfo.identityType === 'CCCD' && !/^\d{12}$/.test(contactInfo.identityNo)) {
            showError('Số CCCD không hợp lệ (phải đủ 12 chữ số).');
            return;
        }
        if (contactInfo.identityType === 'PASSPORT' && !/^[A-Za-z0-9]{6,15}$/.test(contactInfo.identityNo)) {
            showError('Số hộ chiếu không hợp lệ (6–15 ký tự, chỉ gồm chữ và số).');
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

        if (activeFormType) {
            showError('Vui lòng hoàn thành hoặc hủy bỏ biểu mẫu thông tin hành khách đang nhập dở.');
            return;
        }

        setIsConfirmModalOpen(true);
    };

    // Voucher State
    const [voucherCode, setVoucherCode] = useState('');
    const [appliedVoucher, setAppliedVoucher] = useState<{
        code: string; label: string; discountAmount: number; discountType: string; discountValue: number;
    } | null>(null);
    const [voucherError, setVoucherError] = useState('');
    const [isValidating, setIsValidating] = useState(false);
    const [myWalletVouchers, setMyWalletVouchers] = useState<WalletVoucher[]>([]);
    const [showWalletDropdown, setShowWalletDropdown] = useState(false);

    // Load from sessionStorage on mount (only once)
    useEffect(() => {
        // Validate tourId matches to avoid caching across different tours
        const savedTourId = sessionStorage.getItem('checkout_tourId');
        if (savedTourId && savedTourId !== tourIdStr) {
            sessionStorage.removeItem('checkout_contactInfo');
            sessionStorage.removeItem('checkout_leadTraveler');
            sessionStorage.removeItem('checkout_passengers');
            sessionStorage.removeItem('checkout_isBookForMyself');
            sessionStorage.removeItem('checkout_appliedVoucher');
            sessionStorage.removeItem('checkout_voucherCode');
        }
        if (tourIdStr) {
            sessionStorage.setItem('checkout_tourId', tourIdStr);
        }

        const savedContact = sessionStorage.getItem('checkout_contactInfo');
        if (savedContact) {
            try { setContactInfo(JSON.parse(savedContact)); } catch(e){}
        }

        const savedLead = sessionStorage.getItem('checkout_leadTraveler');
        if (savedLead) {
            try { setLeadTraveler(JSON.parse(savedLead)); } catch(e){}
        }

        const savedPassengers = sessionStorage.getItem('checkout_passengers');
        if (savedPassengers) {
            try { setPassengers(JSON.parse(savedPassengers)); } catch(e){}
        }

        const savedBookMyself = sessionStorage.getItem('checkout_isBookForMyself');
        if (savedBookMyself) {
            setIsBookForMyself(savedBookMyself === 'true');
        }

        const savedVoucher = sessionStorage.getItem('checkout_appliedVoucher');
        if (savedVoucher) {
            try { setAppliedVoucher(JSON.parse(savedVoucher)); } catch(e){}
        }
        
        const savedVoucherCode = sessionStorage.getItem('checkout_voucherCode');
        if (savedVoucherCode) setVoucherCode(savedVoucherCode);
    }, [tourIdStr]);

    // Save to sessionStorage when states change
    useEffect(() => {
        if (contactInfo.fullName || contactInfo.email || contactInfo.phone) {
            sessionStorage.setItem('checkout_contactInfo', JSON.stringify(contactInfo));
        }
    }, [contactInfo]);

    useEffect(() => {
        if (leadTraveler.fullName || leadTraveler.dob) {
            sessionStorage.setItem('checkout_leadTraveler', JSON.stringify(leadTraveler));
        }
    }, [leadTraveler]);

    useEffect(() => {
        if (passengers.length > 0) {
            sessionStorage.setItem('checkout_passengers', JSON.stringify(passengers));
        } else {
            sessionStorage.removeItem('checkout_passengers');
        }
    }, [passengers]);

    useEffect(() => {
        sessionStorage.setItem('checkout_isBookForMyself', isBookForMyself.toString());
    }, [isBookForMyself]);

    useEffect(() => {
        if (appliedVoucher) {
            sessionStorage.setItem('checkout_appliedVoucher', JSON.stringify(appliedVoucher));
        } else {
            sessionStorage.removeItem('checkout_appliedVoucher');
        }
    }, [appliedVoucher]);

    useEffect(() => {
        if (voucherCode) {
            sessionStorage.setItem('checkout_voucherCode', voucherCode);
        } else {
            sessionStorage.removeItem('checkout_voucherCode');
        }
    }, [voucherCode]);

    // 2. GỌI API LẤY DATA THẬT CỦA TOUR VÀ THÔNG TIN NGƯỜI DÙNG
    useEffect(() => {
        const fetchInitialData = async () => {
            if (tourIdStr) {
                try {
                    const resTour = await fetch(`${API_BASE_URL}/tour/${tourIdStr}?locale=${language}`);
                    if (resTour.ok) {
                        const payload = await resTour.json();
                        const tourInfo = payload.data || payload;
                        setTourData(tourInfo);
                        if (packageIdStr && tourInfo.packages) {
                            const pkg = tourInfo.packages.find((p: CheckoutPackage) => p.id.toString() === packageIdStr);
                            if (pkg) setSelectedPackage(pkg);
                        }
                        if (departureIdStr && tourInfo.departures) {
                            const dep = tourInfo.departures.find((d: CheckoutDeparture) => d.id.toString() === departureIdStr);
                            if (dep) setSelectedDeparture(dep);
                        }
                    }
                } catch (error) {
                    console.error("Lỗi tải thông tin tour:", error);
                }
            }
            setIsLoadingTour(false);

            const token = localStorage.getItem('accessToken');
            setIsLoggedIn(!!token);
            if (token) {
                try {
                    const resUser = await fetchWithAuth(`${API_BASE_URL}/auth/profile`);
                    if (resUser.ok) {
                        const payload = await resUser.json();
                        const uData = payload.data || payload;
                        
                        const savedContact = sessionStorage.getItem('checkout_contactInfo');
                        if (!savedContact) {
                            setContactInfo({ 
                                fullName: uData.fullName || '', 
                                email: uData.email || '', 
                                phone: uData.phone || '',
                                identityType: uData.identityType || 'CCCD',
                                identityNo: uData.identityNo || '',
                                dob: uData.dob || '',
                                gender: uData.gender || ''
                            });
                        }
                        
                        const savedLead = sessionStorage.getItem('checkout_leadTraveler');
                        if (!savedLead) {
                            setLeadTraveler(prev => ({ 
                                ...prev, 
                                fullName: uData.fullName || '',
                                dob: uData.dob || '',
                                gender: uData.gender || '',
                                identityType: uData.identityType || 'CCCD',
                                identityNo: uData.identityNo || '',
                            }));
                        }
                    } else {
                        setIsLoggedIn(false);
                        localStorage.removeItem('accessToken');
                        localStorage.removeItem('userName');
                        localStorage.removeItem('userAvatarUrl');
                        localStorage.removeItem('userAvatar');
                        window.dispatchEvent(new Event('auth-change'));
                    }
                } catch (error) {
                    console.error("Lỗi khi tải thông tin user:", error);
                    setIsLoggedIn(false);
                    localStorage.removeItem('accessToken');
                    localStorage.removeItem('userName');
                    localStorage.removeItem('userAvatarUrl');
                    localStorage.removeItem('userAvatar');
                    window.dispatchEvent(new Event('auth-change'));
                }
            }

            if (token) {
                try {
                    const resWallet = await fetchWithAuth(`${API_BASE_URL}/voucher/my-wallet`);
                    if (resWallet.ok) {
                        const payload = await resWallet.json();
                        const walletData = payload.data || payload;
                        setMyWalletVouchers(walletData.filter((uv: WalletVoucher) => uv.status === 'available') || []);
                    }
                } catch (e) { console.error('Lỗi tải ví voucher:', e); }
            }
        };
        fetchInitialData();
    }, [tourIdStr, packageIdStr, departureIdStr, language]);

    // 3. THIẾT LẬP BẢNG GIÁ ĐỘNG DỰA TRÊN GIÁ TOUR TRONG DATABASE
    const basePrice = (() => {
        const base = selectedDeparture?.price ?? tourData?.price ?? 0;
        const addon = selectedPackage?.price ?? 0;
        return base + addon;
    })();
    const PRICES = {
        'Adult (12+)': basePrice,
        'Child (4-11)': basePrice * 0.7,
        'Infant (<4)': basePrice * 0.1
    };
    const adultCount = 1 + passengers.filter(p => p.type === 'Adult (12+)').length;
    const childCount = passengers.filter(p => p.type === 'Child (4-11)').length;
    const infantCount = passengers.filter(p => p.type === 'Infant (<4)').length;

    const subtotal = (adultCount * PRICES['Adult (12+)']) +
        (childCount * PRICES['Child (4-11)']) +
        (infantCount * PRICES['Infant (<4)']);

    const discountAmount = appliedVoucher?.discountAmount || 0;
    const totalPrice = Math.max(0, subtotal - discountAmount);
    const isSelectedDepartureSale = isSaleDeparture(selectedDeparture, tourData?.price);
    const saleVoucherMessage = t('checkout.saleTourNoVoucher');

    useEffect(() => {
        if (!isSelectedDepartureSale) return;
        setAppliedVoucher(null);
        setVoucherCode('');
        setVoucherError('');
        setShowWalletDropdown(false);
    }, [isSelectedDepartureSale]);

    // Voucher validation
    const handleApplyVoucher = async (code?: string) => {
        const codeToUse = (code || voucherCode).trim().toUpperCase();
        if (!codeToUse) return;

        if (isSelectedDepartureSale) {
            setAppliedVoucher(null);
            setVoucherError(saleVoucherMessage);
            setShowWalletDropdown(false);
            return;
        }

        setIsValidating(true);
        setVoucherError('');
        setAppliedVoucher(null);   // reset khi apply lại
        setShowWalletDropdown(false);

        try {
            const res = await fetchWithAuth(`${API_BASE_URL}/voucher/validate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code: codeToUse,
                    totalPrice: subtotal,
                    tourId: tourData?.id ?? Number(tourIdStr),
                    departureId: selectedDeparture?.id ?? null,
                }),
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
                } else if (typeof msg === 'string' && msg.startsWith('SALE_TOUR_NO_VOUCHER')) {
                    msg = saleVoucherMessage;
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
                } else if (typeof msg === 'string' && msg.startsWith('SALE_TOUR_NO_VOUCHER')) {
                    msg = saleVoucherMessage;
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
                gender: contactInfo.gender,
                identityType: contactInfo.identityType,
                identityNo: contactInfo.identityNo,
            }));
        } else {
            setLeadTraveler(prev => ({ 
                ...prev, 
                fullName: '',
                dob: '',
                gender: '',
                identityType: 'CCCD',
                identityNo: '',
            }));
        }
    };

    const handleOpenForm = (type: PassengerType | null) => {
        setActiveFormType(type);
        const defaultIdType = type === 'Infant (<4)' ? 'BIRTH_CERT' : 'CCCD';
        setTempFormData({ fullName: '', dob: '', gender: '', identityType: defaultIdType, identityNo: '' });
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
        if (!contactInfo.fullName || !contactInfo.email || !contactInfo.phone || !contactInfo.identityNo) {
            showError(t('checkout.errors.fillContact'));
            return;
        }

        // Validate identity document format
        if (contactInfo.identityType === 'CCCD' && !/^\d{12}$/.test(contactInfo.identityNo)) {
            showError('Số CCCD không hợp lệ (phải đủ 12 chữ số).');
            return;
        }
        if (contactInfo.identityType === 'PASSPORT' && !/^[A-Za-z0-9]{6,15}$/.test(contactInfo.identityNo)) {
            showError('Số hộ chiếu không hợp lệ (6–15 ký tự, chỉ gồm chữ và số).');
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

        try {
            setIsPaymentLoading(true);

            const allPassengers = [
                { 
                    type: 'Adult (12+)', 
                    fullName: leadTraveler.fullName, 
                    dob: leadTraveler.dob, 
                    gender: leadTraveler.gender, 
                    identityType: leadTraveler.identityType,
                    identityNo: leadTraveler.identityNo,
                    notes: leadTraveler.notes 
                },
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
                paymentMethod: paymentMethod,
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

            if (response.ok) {
                // Clear sessionStorage checkout states
                sessionStorage.removeItem('checkout_contactInfo');
                sessionStorage.removeItem('checkout_leadTraveler');
                sessionStorage.removeItem('checkout_passengers');
                sessionStorage.removeItem('checkout_isBookForMyself');
                sessionStorage.removeItem('checkout_appliedVoucher');
                sessionStorage.removeItem('checkout_voucherCode');
                sessionStorage.removeItem('checkout_tourId');

                const bookingCode = data.booking?.bookingCode || data.bookingCode;
                window.location.href = `/${language}/payment?bookingCode=${bookingCode}`;
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
                        isLoggedIn={isLoggedIn}
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
                        maxPassengers={selectedDeparture?.availableSeats ?? tourData?.availableSeats ?? undefined}
                    />
                </div>

                <OrderSummary
                    tourData={tourData}
                    selectedPackage={selectedPackage}
                    adultCount={adultCount}
                    childCount={childCount}
                    infantCount={infantCount}
                    prices={PRICES}
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
                    isSaleDeparture={isSelectedDepartureSale}
                    saleVoucherMessage={saleVoucherMessage}
                    isPaymentLoading={isPaymentLoading}
                    onPayment={handleOpenConfirmModal}
                    t={t}
                    formatPrice={formatPrice}
                />
            </div>

            <ConfirmBookingModal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                onConfirm={() => {
                    setIsConfirmModalOpen(false);
                    handlePayment();
                }}
                contactInfo={contactInfo}
                leadTraveler={leadTraveler}
                passengers={passengers}
                t={t}
            />
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
