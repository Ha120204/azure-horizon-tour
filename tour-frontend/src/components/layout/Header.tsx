'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from '@/i18n/routing';
import Link from 'next/link';
import Image from 'next/image';
import { useLocale } from '@/context/LocaleContext';
import LocaleSwitcher from './LocaleSwitcher';
import { API_BASE_URL } from '@/lib/http/constants';
import { DEFAULT_PUBLIC_SETTINGS, fetchPublicSettings } from '@/lib/settings/publicSettings';
import { getDestinationDisplay } from '@/lib/tour/formatDestination';
import { clearClientUserStorage, fetchAuthProfile } from '@/lib/auth/authSession';
import { getDefaultAdminPathForRole, isAdminRole } from '@/lib/admin/adminAccess';
import { toastEmitter } from '@/lib/http/toastEmitter';

interface SearchResult {
    destinations: { id: number; name: string; type?: string; region?: string }[];
    tours: { id: number; name: string; price: number }[];
}

function AzureHorizonBrandIcon({ solid }: { solid: boolean }) {
    return (
        <span
            className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-[1rem] transition-all duration-300 ${
                solid
                    ? 'bg-[#12bff0] shadow-[0_10px_24px_rgba(18,191,240,0.24)]'
                    : 'bg-[#12bff0] shadow-[0_10px_28px_rgba(0,25,64,0.24)]'
            }`}
            aria-hidden="true"
        >
            <svg
                viewBox="0 0 24 24"
                className="relative h-6 w-6"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                <circle cx="12" cy="12" r="7.25" stroke="#FFFFFF" strokeWidth="2" />
                <path
                    d="M14.9 8.6L12.9 13L8.6 15L10.6 10.6L14.9 8.6Z"
                    fill="#FFFFFF"
                />
                <circle cx="12" cy="12" r="1.15" fill="#12BFF0" />
            </svg>
        </span>
    );
}

export default function Header() {
    const router = useRouter();
    const pathname = usePathname();
    const { t, language, currency, formatPrice } = useLocale();
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [userName, setUserName] = useState('');
    const [userEmail, setUserEmail] = useState('');
    const [userRole, setUserRole] = useState('');
    const [userAvatar, setUserAvatar] = useState('');
    const [isScrolled, setIsScrolled] = useState(false);
    const [publicSettings, setPublicSettings] = useState(DEFAULT_PUBLIC_SETTINGS);

    // Search States
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [searchResults, setSearchResults] = useState<SearchResult>({ destinations: [], tours: [] });

    // Locale Switcher State
    const [isLocaleOpen, setIsLocaleOpen] = useState(false);

    // Mobile hamburger menu (< lg)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const searchInputRef = useRef<HTMLInputElement>(null);
    const searchContainerRef = useRef<HTMLDivElement>(null);
    const searchRequestIdRef = useRef(0);

    // Scroll-aware header (transparent only on homepage)
    const isHomepage = pathname === '/';
    const isSolidHeader = isScrolled || !isHomepage;
    const canAccessAdmin = isAdminRole(userRole);
    const defaultAdminPath = canAccessAdmin ? getDefaultAdminPathForRole(userRole) : null;

    useEffect(() => {
        const onScroll = () => setIsScrolled(window.scrollY > 60);
        window.addEventListener('scroll', onScroll, { passive: true });
        // Reset scroll state when navigating to non-home page
        onScroll();
        return () => window.removeEventListener('scroll', onScroll);
    }, [pathname]);


    useEffect(() => {
        const controller = new AbortController();
        fetchPublicSettings(controller.signal)
            .then(setPublicSettings)
            .catch(error => {
                if (!(error instanceof DOMException && error.name === 'AbortError')) {
                    console.error('Error loading public settings:', error);
                }
            });

        return () => controller.abort();
    }, []);

    // Kiểm tra đăng nhập
    useEffect(() => {
        let isActive = true;

        const checkAuth = async () => {
            const profile = await fetchAuthProfile();
            if (!isActive) return;

            if (!profile) {
                setIsLoggedIn(false);
                setUserName('');
                setUserEmail('');
                setUserRole('');
                setUserAvatar('');
                return;
            }

            const fullName = profile.fullName || '';
            const email = profile.email || '';
            const role = profile.role || '';
            const avatarUrl = profile.avatarUrl || '';
            setIsLoggedIn(true);
            setUserName(fullName);
            setUserEmail(email);
            setUserRole(role);
            setUserAvatar(avatarUrl);
            localStorage.setItem('userName', fullName);
            if (email) localStorage.setItem('userEmail', email);
            else localStorage.removeItem('userEmail');
            if (role) localStorage.setItem('userRole', role);
            else localStorage.removeItem('userRole');
            if (avatarUrl) localStorage.setItem('userAvatarUrl', avatarUrl);
            else localStorage.removeItem('userAvatarUrl');
        };

        // Chạy lần đầu
        checkAuth();

        // Lắng nghe sự kiện để cập nhật không cần reload
        window.addEventListener('auth-change', checkAuth);

        // Clean up
        return () => {
            isActive = false;
            window.removeEventListener('auth-change', checkAuth);
        };
    }, []);

    // Focus input khi mở thanh search
    useEffect(() => {
        if (isSearchOpen && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [isSearchOpen]);

    // Xử lý click ra ngoài để đóng search/dropdown
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
                if (!searchQuery) setIsSearchOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [searchQuery]);

    // Debounce & Gọi API Tìm kiếm thực tế
    useEffect(() => {
        const controller = new AbortController();
        const requestId = ++searchRequestIdRef.current;
        const delayDebounceFn = setTimeout(async () => {
            if (searchQuery.trim().length >= 2) {
                setIsLoading(true);
                try {
                    const params = new URLSearchParams({
                        q: searchQuery,
                        locale: language,
                    });
                    const res = await fetch(`${API_BASE_URL}/search?${params.toString()}`, {
                        signal: controller.signal,
                    });
                    if (requestId === searchRequestIdRef.current) {
                        if (res.ok) {
                            const data = await res.json();
                            // Backend wraps all responses via TransformInterceptor:
                            // { statusCode, message, data: { destinations, tours }, timestamp }
                            const payload = data?.data ?? data;
                            setSearchResults({
                                destinations: Array.isArray(payload?.destinations) ? payload.destinations : [],
                                tours: Array.isArray(payload?.tours) ? payload.tours : [],
                            });
                            setIsDropdownOpen(true);
                        }
                        setIsLoading(false);
                    }
                } catch (error) {
                    if (error instanceof DOMException && error.name === 'AbortError') return;
                    console.error("Lỗi khi fetch dữ liệu search:", error);
                    if (requestId === searchRequestIdRef.current) setIsLoading(false);
                }
            } else {
                setSearchResults({ destinations: [], tours: [] });
                setIsDropdownOpen(false);
                setIsLoading(false);
            }
        }, 300);

        return () => {
            clearTimeout(delayDebounceFn);
            controller.abort();
        };
    }, [searchQuery, language]);

    // Đóng menu mobile khi đổi route (vd: nút back trình duyệt)
    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [pathname]);

    // Khi menu mobile mở: Esc để đóng, khóa cuộn nền, tự đóng nếu kéo rộng ≥ lg
    useEffect(() => {
        if (!isMobileMenuOpen) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsMobileMenuOpen(false);
        };
        const onResize = () => {
            if (window.innerWidth >= 1400) setIsMobileMenuOpen(false);
        };
        document.addEventListener('keydown', onKeyDown);
        window.addEventListener('resize', onResize);
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('resize', onResize);
            document.body.style.overflow = previousOverflow;
        };
    }, [isMobileMenuOpen]);

    const handleQuickSearch = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (searchQuery.trim()) {
            router.push(`/destinations?dest=${encodeURIComponent(searchQuery)}`);
            setIsSearchOpen(false);
            setIsDropdownOpen(false);
            setSearchQuery('');
        }
    };

    const handleLogout = async () => {
        try {
            // Gọi API để Backend xóa thẻ HttpOnly Cookie (refresh token)
            await fetch(`${API_BASE_URL}/auth/logout`, { 
                method: 'POST',
                credentials: 'include' 
            });
        } catch (err) {
            console.error("Lỗi khi đăng xuất:", err);
        }

        clearClientUserStorage();

        // Bắn event báo hiệu để Header cập nhật lại state lập tức
        window.dispatchEvent(new Event('auth-change'));
        toastEmitter.success(t('nav.logoutSuccessTitle'), t('profile.logoutSuccess'));

        // Chuyển về trang chủ
        router.push('/');
    };

    const handleResultClick = (path: string) => {
        setIsDropdownOpen(false);
        setIsSearchOpen(false);
        setSearchQuery('');
        router.push(path);
    };

    const brandSubtitle = language === 'vi' ? 'Nền tảng du lịch cao cấp' : 'Premium travel platform';

    // Label hiển thị trên nút Globe: "EN · $" hoặc "VI · ₫"
    const localeLabel = `${language.toUpperCase()} · ${currency === 'VND' ? '₫' : '$'}`;
    const navLinks = [
        { href: '/destinations', key: 'nav.destinations' },
        { href: '/promotions', key: 'nav.promotions' },
        { href: '/journal', key: 'nav.journal' },
        { href: '/about', key: 'nav.about' },
        { href: '/contact', key: 'nav.contact' },
    ];
    const translatedRole = userRole === 'SUPER_ADMIN' || userRole === 'ADMIN' || userRole === 'STAFF' || userRole === 'CUSTOMER'
        ? userRole
        : null;
    const roleLabel = translatedRole ? t(`nav.account.roles.${translatedRole}`) : userRole;
    const adminDescription = canAccessAdmin
        ? t(`nav.account.adminDescriptions.${userRole}`)
        : '';
    const rolePresentation = userRole === 'SUPER_ADMIN'
        ? {
            badgeIcon: 'shield_with_heart',
            badgeClass: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200/70',
            workspaceIcon: 'shield_with_heart',
            workspaceClass: 'bg-amber-50/80 hover:bg-amber-100/80 hover:shadow-amber-500/10',
            workspaceIconClass: 'bg-amber-600 text-white shadow-amber-600/20',
            workspaceTextClass: 'text-amber-800',
            workspaceArrowClass: 'text-amber-700',
        }
        : userRole === 'ADMIN'
            ? {
                badgeIcon: 'admin_panel_settings',
                badgeClass: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200/70',
                workspaceIcon: 'admin_panel_settings',
                workspaceClass: 'bg-violet-50/80 hover:bg-violet-100/80 hover:shadow-violet-500/10',
                workspaceIconClass: 'bg-violet-600 text-white shadow-violet-600/20',
                workspaceTextClass: 'text-violet-800',
                workspaceArrowClass: 'text-violet-700',
            }
            : userRole === 'STAFF'
                ? {
                    badgeIcon: 'support_agent',
                    badgeClass: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200/70',
                    workspaceIcon: 'support_agent',
                    workspaceClass: 'bg-sky-50/80 hover:bg-sky-100/80 hover:shadow-sky-500/10',
                    workspaceIconClass: 'bg-sky-600 text-white shadow-sky-600/20',
                    workspaceTextClass: 'text-sky-800',
                    workspaceArrowClass: 'text-sky-700',
                }
                : {
                    badgeIcon: 'person',
                    badgeClass: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200/70',
                    workspaceIcon: 'person',
                    workspaceClass: '',
                    workspaceIconClass: '',
                    workspaceTextClass: '',
                    workspaceArrowClass: '',
                };

    return (
        <>


            <nav className={`fixed top-0 w-full z-50 font-body transition-all duration-500 ${isSolidHeader ? 'bg-white/90 backdrop-blur-md shadow-sm border-b border-slate-200/15' : 'bg-transparent border-transparent shadow-none'}`}
                style={{ animation: 'headerSlideDown 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}>
                <div className="flex justify-between items-center px-6 md:px-12 py-4 max-w-screen-2xl mx-auto">

                    {/* 1. BRAND LOGO */}
                    <Link
                        href="/"
                        className="group flex min-w-0 items-center gap-3 transition-transform duration-300 hover:-translate-y-0.5"
                        aria-label={`${publicSettings.company_name} home`}
                    >
                        <AzureHorizonBrandIcon solid={isSolidHeader} />
                        <span className="flex min-w-0 flex-col leading-none">
                            <span
                                className={`font-headline text-[1.15rem] font-extrabold tracking-tight truncate transition-colors duration-300 md:text-[1.25rem] ${
                                    isSolidHeader ? 'text-slate-950' : 'text-white drop-shadow-md'
                                }`}
                            >
                                {publicSettings.company_name}
                            </span>
                            <span
                                className={`mt-1 hidden whitespace-nowrap text-[0.68rem] font-bold tracking-[0.14em] transition-colors duration-300 lg:block ${
                                    isSolidHeader ? 'text-slate-500' : 'text-white/80 drop-shadow-sm'
                                }`}
                            >
                                {brandSubtitle}
                            </span>
                        </span>
                    </Link>

                    {/* 2. MAIN NAVIGATION */}
                    <div className="hidden min-[1400px]:flex items-center gap-1.5 font-['Plus_Jakarta_Sans'] font-semibold tracking-tight" suppressHydrationWarning>
                        {navLinks.map(link => {
                            const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
                            const solidStateClass = isActive
                                ? 'bg-primary/10 text-primary shadow-sm shadow-primary/5'
                                : 'text-slate-600 hover:bg-surface-container-low hover:text-primary';
                            const transparentStateClass = isActive
                                ? 'bg-white/20 text-white shadow-sm shadow-black/10'
                                : 'text-white/80 hover:bg-white/15 hover:text-white';

                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    aria-current={isActive ? 'page' : undefined}
                                    className={`group inline-flex min-h-[42px] items-center rounded-full px-4 py-2 text-sm transition-[transform,background-color,color,box-shadow] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97] motion-reduce:transform-none motion-reduce:transition-none ${
                                        isSolidHeader ? solidStateClass : transparentStateClass
                                    }`}
                                >
                                    <span className="whitespace-nowrap">{t(link.key)}</span>
                                </Link>
                            );
                        })}
                    </div>

                    {/* 3. USER TOOLS */}
                    <div className="flex items-center gap-3">

                        {/* Search Component */}
                        <div className="relative flex items-center" ref={searchContainerRef}>
                            <form
                                onSubmit={handleQuickSearch}
                                className={`flex items-center rounded-full w-40 sm:w-48 lg:w-60 px-3 py-1.5 border transition-all duration-300 ${
                                    (isScrolled || !isHomepage)
                                        ? 'bg-slate-100/90 border-slate-200/10 text-slate-800 focus-within:bg-white focus-within:border-primary/20 focus-within:ring-2 focus-within:ring-primary/10'
                                        : 'bg-white/10 hover:bg-white/15 border-white/20 text-white focus-within:bg-white/20 focus-within:border-white/30'
                                }`}
                            >
                                <span className={`material-symbols-outlined text-[18px] shrink-0 mr-1.5 ${
                                    (isScrolled || !isHomepage) ? 'text-slate-400' : 'text-white/60'
                                }`}>
                                    search
                                </span>
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder={t('nav.search')}
                                    className={`w-full bg-transparent border-none p-0 text-xs sm:text-sm focus:ring-0 outline-none ${
                                        (isScrolled || !isHomepage)
                                            ? 'text-slate-800 placeholder:text-slate-400'
                                            : 'text-white placeholder:text-white/50'
                                    }`}
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSearchQuery('');
                                            setIsDropdownOpen(false);
                                        }}
                                        className="flex items-center justify-center p-0.5 rounded-full hover:bg-black/5 shrink-0"
                                    >
                                        <span className={`material-symbols-outlined text-[14px] ${
                                            (isScrolled || !isHomepage) ? 'text-slate-400' : 'text-white/60'
                                        }`}>
                                            close
                                        </span>
                                    </button>
                                )}
                            </form>

                            {/* Dropdown Live Search */}
                            {isDropdownOpen && searchQuery.length >= 2 && (
                                <div className="absolute top-full mt-3 right-0 w-[320px] bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-slate-100 overflow-hidden z-50 flex flex-col">

                                    {isLoading ? (
                                        <div className="p-6 flex justify-center items-center text-slate-400">
                                            <span className="material-symbols-outlined animate-spin text-2xl">progress_activity</span>
                                        </div>
                                    ) : (
                                        <>
                                            {/* Destinations */}
                                            {searchResults.destinations.length > 0 && (
                                                <div className="py-2">
                                                    <h3 className="px-4 py-2 text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest">{t('nav.destinations')}</h3>
                                                    {searchResults.destinations.map(dest => {
                                                        const display = getDestinationDisplay(dest, language);
                                                        return (
                                                            <div
                                                                key={`dest-${dest.id}`}
                                                                onClick={() => handleResultClick(`/destinations?dest=${encodeURIComponent(display.name)}`)}
                                                                className="px-4 py-2 hover:bg-slate-50 cursor-pointer flex items-center gap-3 transition-colors"
                                                            >
                                                                <span className="material-symbols-outlined text-slate-400 text-lg">location_on</span>
                                                                <div>
                                                                    <p className="text-sm font-semibold text-slate-800">{display.name}</p>
                                                                    {display.region && <p className="text-xs text-slate-500">{display.region}</p>}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {searchResults.destinations.length > 0 && searchResults.tours.length > 0 && (
                                                <div className="h-px bg-slate-100 mx-4"></div>
                                            )}

                                            {/* Tours */}
                                            {searchResults.tours.length > 0 && (
                                                <div className="py-2">
                                                    <h3 className="px-4 py-2 text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest">Tours</h3>
                                                    {searchResults.tours.map((tour, index) => {
                                                        return (
                                                            <div
                                                                key={`tour-${tour.id || index}`}
                                                                onClick={() => handleResultClick(`/tour/${tour.id}`)}
                                                                className="px-4 py-2 hover:bg-slate-50 cursor-pointer flex items-center gap-3 transition-colors"
                                                            >
                                                                <span className="material-symbols-outlined text-slate-400 text-lg">explore</span>
                                                                <div>
                                                                    <p className="text-sm font-semibold text-slate-800 truncate w-56">{tour.name}</p>
                                                                    <p className="text-xs font-medium text-blue-800 mt-0.5">{formatPrice(tour.price)}</p>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {/* Trống */}
                                            {searchResults.destinations.length === 0 && searchResults.tours.length === 0 && (
                                                <div className="p-6 text-center text-sm text-slate-500">
                                                    {t('nav.noResults')} &quot;{searchQuery}&quot;
                                                </div>
                                            )}

                                            {/* Footer See All */}
                                            <div className="bg-slate-50 p-3 text-center border-t border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleQuickSearch()}>
                                                <p className="text-xs font-semibold text-blue-800 flex items-center justify-center gap-1">
                                                    {t('nav.viewAllResults')}
                                                    <span className="material-symbols-outlined text-[1rem]">arrow_forward</span>
                                                </p>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* 🌐 Locale Switcher Button */}
                        <button
                            onClick={() => setIsLocaleOpen(true)}
                            className={`hidden min-[1400px]:flex items-center gap-1.5 transition-colors px-3 py-1.5 rounded-full border ${
                                (isScrolled || !isHomepage)
                                    ? 'text-slate-600 hover:text-blue-800 hover:bg-slate-50 border-transparent hover:border-slate-200'
                                    : 'text-white/90 hover:text-white border-white/20 hover:bg-white/10'
                            }`}
                        >
                            {language === 'vi' ? (
                                <Image
                                    src="https://flagcdn.com/w40/vn.png"
                                    alt="Cờ Việt Nam"
                                    width={24}
                                    height={18}
                                    className="h-4 w-6 rounded-[3px] border border-white/40 object-cover shadow-sm"
                                />
                            ) : (
                                <span className="material-symbols-outlined text-lg">language</span>
                            )}
                            <span className="text-xs font-bold tracking-wide">{localeLabel}</span>
                        </button>



                        {/* Auth Logic — desktop; phiên bản mobile nằm trong panel hamburger */}
                        <div className="hidden min-[1400px]:block">
                        {isLoggedIn ? (
                            <div className="flex items-center gap-2.5 relative group">
                                {/* Username — adapts to scrolled state */}
                                <span
                                    title={userEmail || userName}
                                    className={`text-sm font-semibold transition-colors duration-300 ${(isScrolled || !isHomepage) ? 'text-slate-700' : 'text-white drop-shadow-sm'}`}
                                >
                                    {userName}
                                </span>

                                {/* Avatar with ring animation on hover */}
                                <div className="w-9 h-9 rounded-full overflow-hidden border-2 cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg
                                    border-white/40 group-hover:border-white"
                                    style={{ boxShadow: (isScrolled || !isHomepage) ? undefined : '0 0 0 2px rgba(255,255,255,0.2)' }}
                                >
                                    {userAvatar ? (
                                        <Image className="h-full w-full object-cover" src={userAvatar} alt={userName} width={36} height={36} sizes="36px" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-primary text-white font-bold text-sm">
                                            {userName ? userName.charAt(0).toUpperCase() : '?'}
                                        </div>
                                    )}
                                </div>

                                {/* Dropdown — slide + fade entrance */}
                                <div className="absolute top-full right-0 z-30 w-72 pt-3 opacity-0 invisible transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:visible group-hover:opacity-100">
                                    <div className="translate-y-1 overflow-hidden rounded-2xl border border-slate-100/80 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.16)] transition-transform duration-200 group-hover:translate-y-0">
                                        <div className="flex items-center gap-3 px-4 py-4">
                                            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-sm font-extrabold text-white shadow-sm">
                                                {userAvatar ? (
                                                    <Image className="h-full w-full object-cover" src={userAvatar} alt={userName} width={44} height={44} sizes="44px" />
                                                ) : (
                                                    userName ? userName.charAt(0).toUpperCase() : '?'
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-extrabold text-slate-900">{userName}</p>
                                                <p className="mt-0.5 truncate text-xs text-slate-500">{userEmail || t('nav.memberLabel')}</p>
                                                {roleLabel && (
                                                    <span className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold ${rolePresentation.badgeClass}`}>
                                                        <span className="material-symbols-outlined text-[12px]">
                                                            {rolePresentation.badgeIcon}
                                                        </span>
                                                        {roleLabel}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="border-t border-slate-100 px-2 py-2">
                                            <p className="px-2 pb-1 pt-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">{t('nav.account.personalSection')}</p>
                                            <button
                                                type="button"
                                                onClick={() => router.push('/profile')}
                                                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-600 transition-[transform,background-color,color] duration-150 hover:translate-x-0.5 hover:bg-blue-50/70 hover:text-primary active:scale-[0.98] motion-reduce:transform-none motion-reduce:transition-none"
                                            >
                                                <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
                                                {t('nav.profile')}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => router.push('/my-bookings')}
                                                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-600 transition-[transform,background-color,color] duration-150 hover:translate-x-0.5 hover:bg-blue-50/70 hover:text-primary active:scale-[0.98] motion-reduce:transform-none motion-reduce:transition-none"
                                            >
                                                <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>luggage</span>
                                                {t('nav.myBookings')}
                                            </button>
                                        </div>

                                        {canAccessAdmin && defaultAdminPath && (
                                            <div className="border-t border-slate-100 px-2 py-2">
                                                <p className="px-2 pb-1 pt-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">{t('nav.account.adminSection')}</p>
                                                <button
                                                    type="button"
                                                    onClick={() => router.push(defaultAdminPath)}
                                                    className={`group/admin flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-[transform,background-color,box-shadow] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-[0.98] motion-reduce:transform-none motion-reduce:transition-none ${rolePresentation.workspaceClass}`}
                                                >
                                                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full shadow-sm ${rolePresentation.workspaceIconClass}`}>
                                                        <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>{rolePresentation.workspaceIcon}</span>
                                                    </span>
                                                    <span className="min-w-0 flex-1">
                                                        <span className={`block text-sm font-extrabold ${rolePresentation.workspaceTextClass}`}>{t('nav.account.adminTitle')}</span>
                                                        <span className="mt-0.5 block truncate text-[11px] font-medium text-slate-500">{adminDescription}</span>
                                                    </span>
                                                    <span className={`material-symbols-outlined text-[18px] transition-transform duration-200 group-hover/admin:translate-x-1 motion-reduce:transform-none ${rolePresentation.workspaceArrowClass}`}>arrow_forward</span>
                                                </button>
                                            </div>
                                        )}

                                        <div className="border-t border-slate-100 p-2">
                                            <button
                                                type="button"
                                                onClick={handleLogout}
                                                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-red-500 transition-[transform,background-color] duration-150 hover:translate-x-0.5 hover:bg-red-50 active:scale-[0.98] motion-reduce:transform-none motion-reduce:transition-none"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">logout</span>
                                                {t('nav.signOut')}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <Link
                                href="/login"
                                className={`px-6 py-2 rounded-full font-headline font-semibold text-sm active:scale-95 transition-all shadow-md ${
                                    (isScrolled || !isHomepage)
                                        ? 'bg-blue-800 text-white hover:opacity-90'
                                        : 'bg-white/15 text-white border border-white/30 hover:bg-white/25 backdrop-blur-sm'
                                }`}
                            >
                                {t('nav.signIn')}
                            </Link>
                        )}
                        </div>

                        {/* Hamburger — mobile/tablet (< lg) */}
                        <button
                            type="button"
                            onClick={() => setIsMobileMenuOpen((open) => !open)}
                            aria-expanded={isMobileMenuOpen}
                            aria-controls="mobile-menu-panel"
                            aria-label={isMobileMenuOpen ? t('nav.closeMenu') : t('nav.openMenu')}
                            className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors min-[1400px]:hidden ${
                                isSolidHeader
                                    ? 'text-slate-700 hover:bg-slate-100'
                                    : 'text-white hover:bg-white/15'
                            }`}
                        >
                            <span className="material-symbols-outlined text-2xl">
                                {isMobileMenuOpen ? 'close' : 'menu'}
                            </span>
                        </button>
                    </div>
                </div>

            </nav>

            {/* Backdrop — bấm ngoài để đóng drawer */}
            <div
                className={`min-[1400px]:hidden fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-[2px] transition-opacity duration-300 ${
                    isMobileMenuOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
                aria-hidden="true"
            />

            {/* Mobile drawer — trượt từ phải (< 1400px) */}
            <div
                id="mobile-menu-panel"
                role="dialog"
                aria-modal="true"
                className={`min-[1400px]:hidden fixed inset-y-0 right-0 z-[60] flex w-[86%] max-w-sm flex-col bg-white shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                    isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
                }`}
            >
                {/* Đầu drawer: thương hiệu + đóng */}
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                    <Link href="/" onClick={() => setIsMobileMenuOpen(false)} className="flex min-w-0 items-center gap-2.5">
                        <AzureHorizonBrandIcon solid={true} />
                        <span className="truncate font-headline text-lg font-extrabold tracking-tight text-slate-900">
                            {publicSettings.company_name}
                        </span>
                    </Link>
                    <button
                        type="button"
                        onClick={() => setIsMobileMenuOpen(false)}
                        aria-label={t('nav.closeMenu')}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Nội dung cuộn */}
                <div className="flex-1 overflow-y-auto px-4 py-4">
                    <div className="flex flex-col gap-1">
                        {navLinks.map((link) => {
                            const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    aria-current={isActive ? 'page' : undefined}
                                    className={`rounded-xl px-4 py-3 text-base font-semibold transition-colors ${
                                        isActive ? 'bg-primary/10 text-primary' : 'text-slate-700 hover:bg-slate-100'
                                    }`}
                                >
                                    {t(link.key)}
                                </Link>
                            );
                        })}
                    </div>

                    {isLoggedIn && (
                        <div className="mt-2 flex flex-col gap-1 border-t border-slate-100 pt-3">
                            <p className="px-4 pb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">{t('nav.account.personalSection')}</p>
                            <button
                                type="button"
                                onClick={() => { setIsMobileMenuOpen(false); router.push('/profile'); }}
                                className="flex items-center gap-3 rounded-xl px-4 py-3 text-left text-base font-semibold text-slate-700 transition-colors hover:bg-slate-100"
                            >
                                <span className="material-symbols-outlined text-[20px]">person</span>
                                {t('nav.profile')}
                            </button>
                            <button
                                type="button"
                                onClick={() => { setIsMobileMenuOpen(false); router.push('/my-bookings'); }}
                                className="flex items-center gap-3 rounded-xl px-4 py-3 text-left text-base font-semibold text-slate-700 transition-colors hover:bg-slate-100"
                            >
                                <span className="material-symbols-outlined text-[20px]">luggage</span>
                                {t('nav.myBookings')}
                            </button>
                            {canAccessAdmin && defaultAdminPath && (
                                <button
                                    type="button"
                                    onClick={() => { setIsMobileMenuOpen(false); router.push(defaultAdminPath); }}
                                    className="flex items-center gap-3 rounded-xl px-4 py-3 text-left text-base font-semibold text-slate-700 transition-colors hover:bg-slate-100"
                                >
                                    <span className="material-symbols-outlined text-[20px]">{rolePresentation.badgeIcon}</span>
                                    {t('nav.account.adminTitle')}
                                </button>
                            )}
                        </div>
                    )}

                    <div className="mt-2 border-t border-slate-100 pt-3">
                        <p className="px-4 pb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">{t('nav.settingsSection')}</p>
                        <button
                            type="button"
                            onClick={() => { setIsMobileMenuOpen(false); setIsLocaleOpen(true); }}
                            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-base font-semibold text-slate-700 transition-colors hover:bg-slate-100"
                        >
                            <span className="material-symbols-outlined text-[20px] text-slate-500">language</span>
                            {localeLabel}
                        </button>
                    </div>
                </div>

                {/* Footer drawer: tài khoản */}
                <div className="border-t border-slate-100 px-4 py-4">
                    {isLoggedIn ? (
                        <>
                            <div className="flex items-center gap-3 px-1">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-sm font-bold text-white">
                                    {userAvatar ? (
                                        <Image className="h-full w-full object-cover" src={userAvatar} alt={userName} width={44} height={44} sizes="44px" />
                                    ) : (
                                        userName ? userName.charAt(0).toUpperCase() : '?'
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-bold text-slate-900">{userName}</p>
                                    <p className="mt-0.5 truncate text-xs text-slate-500">{userEmail || t('nav.memberLabel')}</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => { setIsMobileMenuOpen(false); handleLogout(); }}
                                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-red-500 transition-colors hover:bg-red-50"
                            >
                                <span className="material-symbols-outlined text-[20px]">logout</span>
                                {t('nav.signOut')}
                            </button>
                        </>
                    ) : (
                        <Link
                            href="/login"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="block rounded-full bg-blue-800 px-6 py-3 text-center text-sm font-semibold text-white transition-opacity hover:opacity-90"
                        >
                            {t('nav.signIn')}
                        </Link>
                    )}
                </div>
            </div>

            {/* Locale Switcher Modal */}
            <LocaleSwitcher isOpen={isLocaleOpen} onClose={() => setIsLocaleOpen(false)} />

        </>
    );
}
