'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
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
import { buildLocalizedLoginPath } from '@/lib/authRedirect';
import { clearClientUserStorage, fetchAuthProfile } from '@/lib/authSession';
import type { PassengerType } from '@/lib/passengerDetails';
import { PASSENGER_MULTIPLIERS } from '@/lib/passengerPricing';

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
    departureDate?: string | null;  // dùng để tính tuổi chính xác tại thời điểm khởi hành
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
    const router = useRouter();
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
    const [editingPassengerIndex, setEditingPassengerIndex] = useState<number | null>(null);
    const [isPaymentLoading, setIsPaymentLoading] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [paymentMethod] = useState<'PAYOS' | 'IN_STORE'>('PAYOS');

    // Toast Alert State
    const [errorMsg, setErrorMsg] = useState('');

    // Cuộn lên đầu trang khi component mount (kể cả khi bấm back/forward)
    useEffect(() => {
        if (typeof window !== 'undefined') {
            if ('scrollRestoration' in window.history) {
                window.history.scrollRestoration = 'manual';
            }
            window.scrollTo(0, 0);
        }
    }, []);

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
            try { setContactInfo(JSON.parse(savedContact)); } catch {}
        }

        const savedLead = sessionStorage.getItem('checkout_leadTraveler');
        if (savedLead) {
            try { setLeadTraveler(JSON.parse(savedLead)); } catch {}
        }

        const savedPassengers = sessionStorage.getItem('checkout_passengers');
        if (savedPassengers) {
            try { setPassengers(JSON.parse(savedPassengers)); } catch {}
        }

        const savedBookMyself = sessionStorage.getItem('checkout_isBookForMyself');
        if (savedBookMyself) {
            setIsBookForMyself(savedBookMyself === 'true');
        }

        const savedVoucher = sessionStorage.getItem('checkout_appliedVoucher');
        if (savedVoucher) {
            try { setAppliedVoucher(JSON.parse(savedVoucher)); } catch {}
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

    // 2. GỌI API LẤY DATA THẬT CỦA TOUR VÀ THÔNG TIN NGƯỜI DÙNG
    useEffect(() => {
        const fetchInitialData = async () => {
            let isRedirectingToLogin = false;
            try {
                const profile = await fetchAuthProfile();
                setIsLoggedIn(!!profile);

                if (!profile) {
                    const redirectPath = `${window.location.pathname}${window.location.search}`;
                    isRedirectingToLogin = true;
                    router.replace(buildLocalizedLoginPath(language, redirectPath));
                    return;
                }

                if (tourIdStr) {
                    try {
                        const resTour = await fetch(`${API_BASE_URL}/tour/${tourIdStr}?locale=${language}`);
                        if (resTour.ok) {
                            const payload = await resTour.json();
                            const tourInfo = payload.data || payload;
                            setTourData(tourInfo);
                            if (packageIdStr && tourInfo.packages) {
                                const pkg = tourInfo.packages.find((p: CheckoutPackage) => p.id.toString() === packageIdStr);
                                // Nếu có packageId trong URL thì dùng, không thì tự động chọn gói đầu tiên
                                if (pkg) {
                                    setSelectedPackage(pkg);
                                } else if (tourInfo.packages.length > 0) {
                                    setSelectedPackage(tourInfo.packages[0]);
                                }
                            } else if (tourInfo.packages?.length > 0) {
                                // Không có packageId trong URL — auto-select gói đầu tiên (Hướng A)
                                setSelectedPackage(tourInfo.packages[0]);
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

                if (profile) {
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
                            clearClientUserStorage();
                            window.dispatchEvent(new Event('auth-change'));
                            const redirectPath = `${window.location.pathname}${window.location.search}`;
                            isRedirectingToLogin = true;
                            router.replace(buildLocalizedLoginPath(language, redirectPath));
                            return;
                        }
                    } catch (error) {
                        console.error("Lỗi khi tải thông tin user:", error);
                        setIsLoggedIn(false);
                        clearClientUserStorage();
                        window.dispatchEvent(new Event('auth-change'));
                        const redirectPath = `${window.location.pathname}${window.location.search}`;
                        isRedirectingToLogin = true;
                        router.replace(buildLocalizedLoginPath(language, redirectPath));
                        return;
                    }
                    
                    try {
                        const resWallet = await fetchWithAuth(`${API_BASE_URL}/voucher/my-wallet`);
                        if (resWallet.ok) {
                            const payload = await resWallet.json();
                            const walletData = payload.data || payload;
                            setMyWalletVouchers(walletData.filter((uv: WalletVoucher) => uv.status === 'available') || []);
                        }
                    } catch (e) { console.error('Lỗi tải ví voucher:', e); }
                }
            } catch (error) {
                console.error("Lỗi tải dữ liệu ban đầu:", error);
            } finally {
                if (!isRedirectingToLogin) {
                    setIsLoadingTour(false);
                }
            }
        };
        fetchInitialData();
    }, [tourIdStr, packageIdStr, departureIdStr, language, router]);

    // 3. THIẾT LẬP BẢNG GIÁ ĐỘNG DỰA TRÊN GIÁ PACKAGE (mô hình Hướng A)
    // Package.price là giá toàn phần, không cộng departure.price nữa.
    const basePrice = selectedPackage?.price ?? tourData?.price ?? 0;

    const PRICES = {
        'Adult (12+)': basePrice * PASSENGER_MULTIPLIERS['Adult (12+)'],
        'Child (4-11)': basePrice * PASSENGER_MULTIPLIERS['Child (4-11)'],
        'Infant (<4)': basePrice * PASSENGER_MULTIPLIERS['Infant (<4)']
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
        setEditingPassengerIndex(null);
        setActiveFormType(type);
        const defaultIdType = type === 'Infant (<4)' ? 'BIRTH_CERT' : 'CCCD';
        setTempFormData({ fullName: '', dob: '', gender: '', identityType: defaultIdType, identityNo: '' });
    };

    const handleEditPassenger = (index: number) => {
        const passenger = passengers[index];
        if (!passenger) return;

        setEditingPassengerIndex(index);
        setActiveFormType(passenger.type);
        setTempFormData({
            fullName: passenger.fullName,
            dob: passenger.dob,
            gender: passenger.gender,
            identityType: passenger.identityType || (passenger.type === 'Infant (<4)' ? 'BIRTH_CERT' : 'CCCD'),
            identityNo: passenger.identityNo || '',
        });
    };

    const handleSavePassenger = () => {
        if (!tempFormData.fullName || !tempFormData.dob || !tempFormData.gender) {
            showError(t('checkout.errors.fillAll'));
            return;
        }
        if (activeFormType) {
            const passengerPayload = { type: activeFormType, ...tempFormData };
            setPassengers(prev => (
                editingPassengerIndex !== null && prev[editingPassengerIndex]
                    ? prev.map((passenger, index) => index === editingPassengerIndex ? passengerPayload : passenger)
                    : [...prev, passengerPayload]
            ));
            setEditingPassengerIndex(null);
            setActiveFormType(null);
        }
    };

    const handleRemovePassenger = (indexToRemove: number) => {
        setPassengers(prev => prev.filter((_, index) => index !== indexToRemove));
        if (editingPassengerIndex === indexToRemove) {
            setEditingPassengerIndex(null);
            setActiveFormType(null);
            return;
        }
        setEditingPassengerIndex(prev => {
            if (prev === null) return null;
            return indexToRemove < prev ? prev - 1 : prev;
        });
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
            // Infant không chiếm ghế (ngồi lòng người lớn) — chỉ adult + child mới cần ghế thực
            const seatCount = adultCount + childCount;

            const bookingPayload = {
                tourId: Number(tourIdStr) || tourData.id,
                packageId: selectedPackage?.id, // [PHASE 2] Gửi packageId thay vì tier
                departureId: selectedDeparture?.id, // Gửi departureId nếu có
                contactInfo: contactInfo,
                passengers: allPassengers,
                totalAmount: totalPrice,
                numberOfPeople: totalPeople,   // tổng người (adult + child + infant) để lưu lịch sử
                seatCount: seatCount,          // số ghế thực cần giữ (không tính infant)
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
                router.push(`/${language}/payment?bookingCode=${bookingCode}`);
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
                <button onClick={() => router.push('/destinations')} className="bg-primary text-white px-8 py-3 rounded-full font-bold">{t('checkout.exploreTours')}</button>
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
                        onEditPassenger={handleEditPassenger}
                        onRemovePassenger={handleRemovePassenger}
                        editingPassengerIndex={editingPassengerIndex}
                        t={t}
                        maxPassengers={selectedDeparture?.availableSeats ?? tourData?.availableSeats ?? undefined}
                        departureDate={selectedDeparture?.departureDate ?? tourData?.startDate ?? null}
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
