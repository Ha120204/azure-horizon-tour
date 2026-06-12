'use client';

import { useEffect, useRef, useState } from 'react';
import { fetchWithAuth } from '@/lib/http/fetchWithAuth';
import { API_BASE_URL } from '@/lib/http/constants';
import { clearClientUserStorage } from '@/lib/auth/authSession';
import { isValidPassword } from '@/lib/auth/passwordPolicy';
import { buildLocalizedLoginPath } from '@/lib/auth/authRedirect';
import { useLocale } from '@/context/LocaleContext';
import type { SupportTicket } from '@/components/profile/SupportTicketList';
import type { UserVoucher } from '@/types';
import type { ProfileUser, RecentBooking } from '../_lib/types';

type ToastState = { msg: string; type: 'success' | 'error' } | null;

export function useProfile() {
    const { t, language } = useLocale();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [userData, setUserData] = useState<ProfileUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [profileLoadError, setProfileLoadError] = useState('');

    // Form thông tin cá nhân
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [dob, setDob] = useState('');
    const [gender, setGender] = useState('');
    const [identityType, setIdentityType] = useState('CCCD');
    const [identityNo, setIdentityNo] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');

    const [isAvatarUploading, setIsAvatarUploading] = useState(false);
    const [isUpdatingInfo, setIsUpdatingInfo] = useState(false);
    const [toast, setToast] = useState<ToastState>(null);

    // Snapshot giá trị gốc sau khi load — dùng để dirty-check trước khi submit
    const savedProfile = useRef({ name: '', phone: '', dob: '', gender: '', identityType: 'CCCD', identityNo: '' });

    const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([]);
    const [myVouchers, setMyVouchers] = useState<UserVoucher[]>([]);
    const [myTickets, setMyTickets] = useState<SupportTicket[]>([]);
    const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
    const [activeTab, setActiveTab] = useState<'bookings' | 'support'>('bookings');
    const [requestedSupportTicketId, setRequestedSupportTicketId] = useState<number | null>(null);

    // Đổi mật khẩu
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [isChangingPassword, setIsChangingPassword] = useState(false);

    const showToast = (msg: string, type: 'success' | 'error') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                setProfileLoadError('');
                const resProfile = await fetchWithAuth(`${API_BASE_URL}/auth/profile`);

                if (!resProfile.ok) {
                    setProfileLoadError(t('profile.loadError'));
                    return;
                }

                const payload = await resProfile.json();
                const data = payload.data !== undefined ? payload.data : payload;
                setUserData(data);
                const cleanPhone = (data.phone || '').replace(/\D/g, '');
                setName(data.fullName || '');
                setPhone(cleanPhone);
                setEmail(data.email || '');
                setDob(data.dob || '');
                setGender(data.gender || '');
                setIdentityType(data.identityType || 'CCCD');
                setIdentityNo(data.identityNo || '');
                setAvatarUrl(data.avatarUrl || '');
                savedProfile.current = {
                    name: data.fullName || '',
                    phone: cleanPhone,
                    dob: data.dob || '',
                    gender: data.gender || '',
                    identityType: data.identityType || 'CCCD',
                    identityNo: data.identityNo || '',
                };
                localStorage.setItem('userName', data.fullName || '');
                if (data.avatarUrl) localStorage.setItem('userAvatarUrl', data.avatarUrl);
                else localStorage.removeItem('userAvatarUrl');
                window.dispatchEvent(new Event('auth-change'));

                const loadOptionalJson = async (url: string) => {
                    const response = await fetchWithAuth(url);
                    return response.ok ? response.json() : null;
                };

                const [bookingsResult, vouchersResult, ticketsResult] = await Promise.allSettled([
                    loadOptionalJson(`${API_BASE_URL}/booking/history/my-bookings`),
                    loadOptionalJson(`${API_BASE_URL}/voucher/my-wallet`),
                    loadOptionalJson(`${API_BASE_URL}/support/customer/my-tickets`),
                ]);

                if (bookingsResult.status === 'fulfilled' && bookingsResult.value) {
                    const bookingResult = bookingsResult.value;
                    setRecentBookings(Array.isArray(bookingResult.data) ? bookingResult.data as RecentBooking[] : []);
                }

                if (vouchersResult.status === 'fulfilled' && vouchersResult.value) {
                    const voucherData = vouchersResult.value;
                    const arr = voucherData.data || voucherData || [];
                    setMyVouchers(Array.isArray(arr) ? arr as UserVoucher[] : []);
                }

                if (ticketsResult.status === 'fulfilled' && ticketsResult.value) {
                    const ticketData = ticketsResult.value;
                    const tickets = ticketData?.data ?? ticketData;
                    setMyTickets(Array.isArray(tickets) ? tickets : []);
                }

            } catch {
                setProfileLoadError(t('profile.loadError'));
                showToast(t('profile.loadError'), 'error');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [t]);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('tab') === 'support') {
            setActiveTab('support');
            const ticketId = Number(params.get('ticketId'));
            setRequestedSupportTicketId(Number.isFinite(ticketId) && ticketId > 0 ? ticketId : null);
        }
    }, []);

    useEffect(() => {
        if (!requestedSupportTicketId) return;
        const matchedTicket = myTickets.find(ticket => Number(ticket.id) === requestedSupportTicketId);
        if (matchedTicket) {
            setSelectedTicket(matchedTicket);
        }
    }, [myTickets, requestedSupportTicketId]);

    const handleUpdateInfo = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isUpdatingInfo) return;

        const s = savedProfile.current;
        const isDirty = name !== s.name || phone !== s.phone || dob !== s.dob
            || gender !== s.gender || identityType !== s.identityType || identityNo !== s.identityNo;
        if (!isDirty) {
            showToast(t('profile.noChanges'), 'error');
            return;
        }

        setIsUpdatingInfo(true);
        try {
            const payload = { fullName: name, phone, dob, gender, identityType, identityNo };

            const res = await fetchWithAuth(`${API_BASE_URL}/auth/profile`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const result = await res.json();

            if (res.ok) {
                // Đồng bộ tên mới lên localStorage → Header cập nhật ngay
                localStorage.setItem('userName', name);
                window.dispatchEvent(new Event('auth-change'));
                savedProfile.current = { name, phone, dob, gender, identityType, identityNo };
                showToast(t('profile.updateSuccess'), 'success');
            } else {
                const errorMsg = Array.isArray(result?.message)
                    ? result.message.join(', ')
                    : (result?.message || t('profile.updateFail'));
                showToast(errorMsg, 'error');
            }
        } catch {
            console.error('[Profile] Update failed');
            showToast(t('profile.serverError'), 'error');
        } finally {
            setIsUpdatingInfo(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmNewPassword) {
            showToast(t('profile.passwordMismatch'), 'error');
            return;
        }
        if (!isValidPassword(newPassword)) {
            showToast(t('profile.passwordPolicyError'), 'error');
            return;
        }
        setIsChangingPassword(true);
        try {
            const res = await fetchWithAuth(`${API_BASE_URL}/auth/change-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentPassword, newPassword }),
            });

            if (res.ok) {
                // Backend đã xoá cookie + tăng tokenVersion → session hiện tại bị thu hồi.
                // Đưa người dùng về trang đăng nhập để đăng nhập lại với mật khẩu mới.
                showToast(t('profile.passwordSuccess'), 'success');
                clearClientUserStorage();
                window.dispatchEvent(new Event('auth-change'));
                setCurrentPassword('');
                setNewPassword('');
                setConfirmNewPassword('');
                setTimeout(() => {
                    window.location.href = buildLocalizedLoginPath(language, `/${language}/profile`);
                }, 1500);
                return;
            }

            const result = await res.json();
            showToast(result.message || t('profile.passwordFail'), 'error');
        } catch {
            showToast(t('profile.serverError'), 'error');
        } finally {
            setIsChangingPassword(false);
        }
    };

    const handleAvatarClick = () => { fileInputRef.current?.click(); };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const previousAvatarUrl = avatarUrl;
        const previewUrl = URL.createObjectURL(file);
        setAvatarUrl(previewUrl);

        setIsAvatarUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetchWithAuth(`${API_BASE_URL}/auth/avatar`, {
                method: 'POST',
                body: formData,
            });

            const result = await res.json();

            if (res.ok && result.data?.avatarUrl) {
                const nextAvatarUrl = result.data.avatarUrl;
                setAvatarUrl(nextAvatarUrl);
                setUserData(prev => prev ? { ...prev, avatarUrl: nextAvatarUrl } : prev);
                localStorage.setItem('userAvatarUrl', nextAvatarUrl);
                localStorage.removeItem('userAvatar');
                window.dispatchEvent(new Event('auth-change'));
                showToast(t('profile.avatarSuccess'), 'success');
            } else {
                setAvatarUrl(previousAvatarUrl);
                showToast(result.message || t('profile.avatarFail'), 'error');
            }
        } catch {
            console.error('Avatar upload failed');
            setAvatarUrl(previousAvatarUrl);
            showToast(t('profile.serverError'), 'error');
        } finally {
            URL.revokeObjectURL(previewUrl);
            setIsAvatarUploading(false);
        }
    };

    const refreshAfterPasswordSet = async () => {
        const res = await fetchWithAuth(`${API_BASE_URL}/auth/profile`);
        if (res.ok) {
            const payload = await res.json();
            const data = payload.data !== undefined ? payload.data : payload;
            setUserData(data);
            showToast(t('profile.setPasswordSuccess'), 'success');
        }
    };

    const showPasswordSetError = (message: string) => {
        showToast(message, 'error');
    };

    const totalTrips = recentBookings.filter(b => b.status !== 'CANCELLED' && b.status !== 'CANCEL_REQUESTED').length;
    const confirmedTrips = recentBookings.filter(b => b.status === 'CONFIRMED' && b.paymentStatus === 'PAID').length;

    return {
        // status
        loading, userData, profileLoadError, toast,
        // form
        name, setName, phone, setPhone, email, dob, setDob, gender, setGender,
        identityType, setIdentityType, identityNo, setIdentityNo, avatarUrl,
        isAvatarUploading, isUpdatingInfo, fileInputRef,
        // derived
        totalTrips, confirmedTrips,
        // data
        recentBookings, myVouchers,
        myTickets, setMyTickets,
        selectedTicket, setSelectedTicket,
        activeTab, setActiveTab,
        // password
        currentPassword, setCurrentPassword,
        newPassword, setNewPassword,
        confirmNewPassword, setConfirmNewPassword,
        isChangingPassword,
        // handlers
        handleUpdateInfo, handleChangePassword, handleAvatarClick, handleFileChange,
        refreshAfterPasswordSet, showPasswordSetError,
    };
}
