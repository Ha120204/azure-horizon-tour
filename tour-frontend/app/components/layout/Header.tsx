'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from '@/i18n/routing';
import Link from 'next/link';
import { useLocale } from '@/app/context/LocaleContext';
import LocaleSwitcher from './LocaleSwitcher';
import { API_BASE_URL } from '@/app/lib/constants';
import { DEFAULT_PUBLIC_SETTINGS, fetchPublicSettings } from '@/app/lib/publicSettings';

interface SearchResult {
    destinations: { id: number; name: string; type?: string; region?: string }[];
    tours: { id: number; name: string; price: number }[];
}

export default function Header() {
    const router = useRouter();
    const pathname = usePathname();
    const { t, language, currency, formatPrice } = useLocale();
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [userName, setUserName] = useState('');
    const [userAvatar, setUserAvatar] = useState('');
    const [logoutMsg, setLogoutMsg] = useState('');
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

    const searchInputRef = useRef<HTMLInputElement>(null);
    const searchContainerRef = useRef<HTMLDivElement>(null);

    // Scroll-aware header (transparent only on homepage)
    const isHomepage = pathname === '/';

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
        const checkAuth = () => {
            const token = localStorage.getItem('accessToken');
            if (token) {
                setIsLoggedIn(true);
                setUserName(localStorage.getItem('userName') || '');
                setUserAvatar(localStorage.getItem('userAvatar') || '');
            } else {
                setIsLoggedIn(false);
                setUserName('');
                setUserAvatar('');
            }
            
            // Clean up old insecure refreshToken if it still exists from previous version
            if (localStorage.getItem('refreshToken')) {
                localStorage.removeItem('refreshToken');
            }
        };

        // Chạy lần đầu
        checkAuth();

        // Lắng nghe sự kiện để cập nhật không cần reload
        window.addEventListener('auth-change', checkAuth);

        // Clean up
        return () => window.removeEventListener('auth-change', checkAuth);
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
        const delayDebounceFn = setTimeout(async () => {
            if (searchQuery.trim().length >= 2) {
                setIsLoading(true);
                try {
                    const res = await fetch(`${API_BASE_URL}/search?q=${encodeURIComponent(searchQuery)}`);
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
                } catch (error) {
                    console.error("Lỗi khi fetch dữ liệu search:", error);
                } finally {
                    setIsLoading(false);
                }
            } else {
                setSearchResults({ destinations: [], tours: [] });
                setIsDropdownOpen(false);
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery]);

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

        localStorage.removeItem('accessToken');
        localStorage.removeItem('userName');
        localStorage.removeItem('userAvatar');

        // Bắn event báo hiệu để Header cập nhật lại state lặp tức
        window.dispatchEvent(new Event('auth-change'));

        // Chuyển về trang chủ
        router.push('/');
    };

    const handleResultClick = (path: string) => {
        setIsDropdownOpen(false);
        setIsSearchOpen(false);
        setSearchQuery('');
        router.push(path);
    };

    // Label hiển thị trên nút Globe: "EN · $" hoặc "VI · ₫"
    const localeLabel = `${language.toUpperCase()} · ${currency === 'VND' ? '₫' : '$'}`;

    return (
        <>
            {logoutMsg && (
                <div className="fixed top-24 right-8 z-[100] animate-bounce">
                    <div className="bg-white border-l-4 border-emerald-500 shadow-2xl rounded-xl px-6 py-4 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                            <span className="material-symbols-outlined text-2xl">check_circle</span>
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-slate-800 font-headline">{t('nav.goodbye')}</h4>
                            <p className="text-xs text-slate-500 mt-0.5">{logoutMsg}</p>
                        </div>
                    </div>
                </div>
            )}

            <nav className={`fixed top-0 w-full z-50 font-body transition-all duration-500 ${(isScrolled || !isHomepage) ? 'bg-white/90 backdrop-blur-md shadow-sm border-b border-slate-200/15' : 'bg-transparent border-transparent shadow-none'}`}
                style={{ animation: 'headerSlideDown 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}>
                <div className="flex justify-between items-center px-6 md:px-12 py-4 max-w-screen-2xl mx-auto">

                    {/* 1. BRAND LOGO */}
                    <Link href="/" className={`text-2xl font-bold tracking-tighter font-headline uppercase transition-colors duration-300 ${(isScrolled || !isHomepage) ? 'text-blue-900' : 'text-white drop-shadow-md'}`}>
                        {publicSettings.company_name}
                    </Link>

                    {/* 2. MAIN NAVIGATION */}
                    <div className="hidden md:flex items-center gap-7 font-['Plus_Jakarta_Sans'] font-semibold tracking-tight" suppressHydrationWarning>
                        {[{ href: '/destinations', key: 'nav.destinations' }, { href: '/promotions', key: 'nav.promotions' }, { href: '/journal', key: 'nav.journal' }, { href: '/about', key: 'nav.about' }, { href: '/contact', key: 'nav.contact' }].map(link => (
                            <Link key={link.href} href={link.href} className={`transition-all duration-300 relative group py-2 ${
                                pathname.includes(link.href)
                                    ? ((isScrolled || !isHomepage) ? 'text-blue-800' : 'text-white')
                                    : ((isScrolled || !isHomepage) ? 'text-slate-600 hover:text-blue-800' : 'text-white/80 hover:text-white')
                            }`}>
                                {t(link.key)}
                                <span className={`absolute bottom-0 left-0 h-0.5 transition-all duration-300 ${(isScrolled || !isHomepage) ? 'bg-blue-800' : 'bg-white'} ${pathname.includes(link.href) ? 'w-full' : 'w-0 group-hover:w-full'}`}></span>
                            </Link>
                        ))}
                    </div>

                    {/* 3. USER TOOLS */}
                    <div className="flex items-center gap-3">

                        {/* Search Component */}
                        <div className="relative flex items-center" ref={searchContainerRef}>
                            <form
                                onSubmit={handleQuickSearch}
                                className={`transition-all duration-300 ease-in-out overflow-hidden flex items-center bg-slate-100 rounded-full ${isSearchOpen ? 'w-48 md:w-64 px-4 opacity-100 mr-2' : 'w-0 opacity-0'}`}
                            >
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder={t('nav.search')}
                                    className="w-full bg-transparent border-none text-sm text-slate-700 focus:ring-0 outline-none py-2 placeholder:text-slate-400"
                                />
                            </form>

                            <button
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => {
                                    if (isSearchOpen) {
                                        setSearchQuery('');
                                        setIsSearchOpen(false);
                                        setIsDropdownOpen(false);
                                    } else {
                                        setIsSearchOpen(true);
                                    }
                                }}
                                className={`transition-colors flex items-center justify-center p-2 rounded-full ${(isScrolled || !isHomepage) ? 'text-slate-600 hover:text-blue-800' : 'text-white/90 hover:text-white'}`}
                            >
                                <span className="material-symbols-outlined text-xl">
                                    {isSearchOpen ? 'close' : 'search'}
                                </span>
                            </button>

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
                                                    {searchResults.destinations.map(dest => (
                                                        <div
                                                            key={`dest-${dest.id}`}
                                                            onClick={() => handleResultClick(`/destinations?dest=${encodeURIComponent(dest.name)}`)}
                                                            className="px-4 py-2 hover:bg-slate-50 cursor-pointer flex items-center gap-3 transition-colors"
                                                        >
                                                            <span className="material-symbols-outlined text-slate-400 text-lg">location_on</span>
                                                            <div>
                                                                <p className="text-sm font-semibold text-slate-800">{dest.name}</p>
                                                                {dest.region && <p className="text-xs text-slate-500">{dest.region}</p>}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {searchResults.destinations.length > 0 && searchResults.tours.length > 0 && (
                                                <div className="h-px bg-slate-100 mx-4"></div>
                                            )}

                                            {/* Tours */}
                                            {searchResults.tours.length > 0 && (
                                                <div className="py-2">
                                                    <h3 className="px-4 py-2 text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest">Tours</h3>
                                                    {searchResults.tours.map((tour, index) => (
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
                                                    ))}
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
                            className={`hidden md:flex items-center gap-1.5 transition-colors px-3 py-1.5 rounded-full border ${
                                (isScrolled || !isHomepage)
                                    ? 'text-slate-600 hover:text-blue-800 hover:bg-slate-50 border-transparent hover:border-slate-200'
                                    : 'text-white/90 hover:text-white border-white/20 hover:bg-white/10'
                            }`}
                        >
                            <span className="material-symbols-outlined text-lg">language</span>
                            <span className="text-xs font-bold tracking-wide">{localeLabel}</span>
                        </button>

                        <div className={`h-6 w-px mx-1 hidden md:block transition-colors duration-300 ${(isScrolled || !isHomepage) ? 'bg-slate-200/80' : 'bg-white/25'}`}></div>

                        {/* Auth Logic */}
                        {isLoggedIn ? (
                            <div className="flex items-center gap-2.5 relative group">
                                {/* Username — adapts to scrolled state */}
                                <span className={`text-sm font-semibold transition-colors duration-300 ${(isScrolled || !isHomepage) ? 'text-slate-700' : 'text-white drop-shadow-sm'}`}>
                                    {userName}
                                </span>

                                {/* Avatar with ring animation on hover */}
                                <div className="w-9 h-9 rounded-full overflow-hidden border-2 cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg
                                    border-white/40 group-hover:border-white"
                                    style={{ boxShadow: (isScrolled || !isHomepage) ? undefined : '0 0 0 2px rgba(255,255,255,0.2)' }}
                                >
                                    {userAvatar ? (
                                        <img className="w-full h-full object-cover" src={userAvatar} alt={userName} />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-primary text-white font-bold text-sm">
                                            {userName ? userName.charAt(0).toUpperCase() : '?'}
                                        </div>
                                    )}
                                </div>

                                {/* Dropdown — slide + fade entrance */}
                                <div className="absolute top-full right-0 w-52 pt-3 z-30
                                    opacity-0 group-hover:opacity-100 invisible group-hover:visible
                                    transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]">
                                    <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-slate-100/80 p-1.5 translate-y-1 group-hover:translate-y-0 transition-transform duration-200">
                                    {/* User info header */}
                                    <div className="px-3 py-2.5 mb-1">
                                        <p className="text-xs font-bold text-slate-800 truncate">{userName}</p>
                                        <p className="text-[10px] text-slate-400 mt-0.5">{t('nav.memberLabel')}</p>
                                    </div>
                                    <div className="h-px bg-slate-100 mx-1 mb-1"></div>
                                    <button onClick={() => router.push('/profile')}
                                        className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-sm text-slate-600 hover:text-blue-800 hover:bg-blue-50/60 font-medium rounded-xl transition-colors duration-150">
                                        <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
                                        {t('nav.profile')}
                                    </button>
                                    <button onClick={() => router.push('/my-bookings')}
                                        className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-sm text-slate-600 hover:text-blue-800 hover:bg-blue-50/60 font-medium rounded-xl transition-colors duration-150">
                                        <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>luggage</span>
                                        {t('nav.myBookings')}
                                    </button>
                                    <div className="h-px bg-slate-100 mx-1 my-1"></div>
                                    <button onClick={handleLogout}
                                        className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-sm font-bold text-red-500 hover:bg-red-50 rounded-xl transition-colors duration-150">
                                        <span className="material-symbols-outlined text-[16px]">logout</span>
                                        {t('nav.signOut')}
                                    </button>
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
                </div>
            </nav>

            {/* Locale Switcher Modal */}
            <LocaleSwitcher isOpen={isLocaleOpen} onClose={() => setIsLocaleOpen(false)} />
        </>
    );
}
