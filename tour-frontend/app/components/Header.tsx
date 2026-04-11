'use client'; // Bắt buộc vì có dùng useState, useEffect, useRouter

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface SearchResult {
    destinations: { id: number; name: string; type?: string; region?: string }[];
    tours: { id: number; name: string; price: number }[];
}

export default function Header() {
    const router = useRouter();
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [userName, setUserName] = useState('');
    const [logoutMsg, setLogoutMsg] = useState('');

    // Search States
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [searchResults, setSearchResults] = useState<SearchResult>({ destinations: [], tours: [] });

    const searchInputRef = useRef<HTMLInputElement>(null);
    const searchContainerRef = useRef<HTMLDivElement>(null);

    // Kiểm tra đăng nhập
    useEffect(() => {
        const checkAuth = () => {
            const token = localStorage.getItem('accessToken');
            if (token) {
                setIsLoggedIn(true);
                setUserName(localStorage.getItem('userName') || '');
            } else {
                setIsLoggedIn(false);
                setUserName('');
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
                    // Nhớ đổi cổng 3000 thành cổng NestJS của bạn nếu khác
                    const res = await fetch(`http://localhost:3000/search?q=${encodeURIComponent(searchQuery)}`);
                    if (res.ok) {
                        const data = await res.json();
                        setSearchResults(data);
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
        }, 300); // Đợi 300ms sau khi ngừng gõ mới gọi API

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

    const handleLogout = () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('userName');

        // Bắn event báo hiệu để Header cập nhật lại state lặp tức
        window.dispatchEvent(new Event('auth-change'));

        // Chuyển về trang chủ (nếu đang ở trang khác)
        router.push('/');
    };

    const handleResultClick = (path: string) => {
        setIsDropdownOpen(false);
        setIsSearchOpen(false);
        setSearchQuery('');
        router.push(path);
    };
    return (
        <>
            {logoutMsg && (
                <div className="fixed top-24 right-8 z-[100] animate-bounce">
                    <div className="bg-white border-l-4 border-emerald-500 shadow-2xl rounded-xl px-6 py-4 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                            <span className="material-symbols-outlined text-2xl">check_circle</span>
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-slate-800 font-headline">Goodbye!</h4>
                            <p className="text-xs text-slate-500 mt-0.5">{logoutMsg}</p>
                        </div>
                    </div>
                </div>
            )}

            <nav className="fixed top-0 w-full z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md shadow-sm border-b border-slate-200/15 font-body transition-all">
                <div className="flex justify-between items-center px-6 md:px-12 py-4 max-w-screen-2xl mx-auto">

                    {/* 1. BRAND LOGO */}
                    <Link href="/" className="text-2xl font-bold tracking-tighter text-blue-900 font-headline uppercase">
                        Azure Horizon
                    </Link>

                    {/* 2. MAIN NAVIGATION */}
                    <div className="hidden md:flex items-center gap-8 font-['Plus_Jakarta_Sans'] font-semibold tracking-tight">
                        <Link href="/destinations" className="text-slate-600 hover:text-blue-800 transition-all duration-300 relative group py-2">
                            Destinations
                            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-800 transition-all duration-300 group-hover:w-full"></span>
                        </Link>
                        <Link href="/tailor-made" className="text-slate-600 hover:text-blue-800 transition-all duration-300 relative group py-2">
                            Tailor-made
                            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-800 transition-all duration-300 group-hover:w-full"></span>
                        </Link>
                        <Link href="/journal" className="text-slate-600 hover:text-blue-800 transition-all duration-300 relative group py-2">
                            Journal
                            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-800 transition-all duration-300 group-hover:w-full"></span>
                        </Link>
                        <Link href="/about" className="text-slate-600 hover:text-blue-800 transition-all duration-300 relative group py-2">
                            About
                            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-800 transition-all duration-300 group-hover:w-full"></span>
                        </Link>
                    </div>

                    {/* 3. USER TOOLS */}
                    <div className="flex items-center gap-5">

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
                                    placeholder="Tìm kiếm..."
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
                                className="text-slate-600 hover:text-blue-800 transition-colors flex items-center justify-center p-2 rounded-full"
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
                                                    <h3 className="px-4 py-2 text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest">Destinations</h3>
                                                    {searchResults.destinations.map(dest => (
                                                        <div
                                                            key={`dest-${dest.id}`}
                                                            onClick={() => handleResultClick(`/destinations/${dest.id}`)}
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
                                                            onClick={() => handleResultClick(`/tours/${tour.id}`)}
                                                            className="px-4 py-2 hover:bg-slate-50 cursor-pointer flex items-center gap-3 transition-colors"
                                                        >
                                                            <span className="material-symbols-outlined text-slate-400 text-lg">explore</span>
                                                            <div>
                                                                <p className="text-sm font-semibold text-slate-800 truncate w-56">{tour.name}</p>
                                                                <p className="text-xs font-medium text-blue-800 mt-0.5">{tour.price.toLocaleString()}đ</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Trống */}
                                            {searchResults.destinations.length === 0 && searchResults.tours.length === 0 && (
                                                <div className="p-6 text-center text-sm text-slate-500">
                                                    No results found for "{searchQuery}"
                                                </div>
                                            )}

                                            {/* Footer See All */}
                                            <div className="bg-slate-50 p-3 text-center border-t border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleQuickSearch()}>
                                                <p className="text-xs font-semibold text-blue-800 flex items-center justify-center gap-1">
                                                    View all results
                                                    <span className="material-symbols-outlined text-[1rem]">arrow_forward</span>
                                                </p>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="h-6 w-px bg-slate-200/80 mx-1 hidden md:block"></div>

                        {/* Auth Logic */}
                        {isLoggedIn ? (
                            <div className="flex items-center gap-3 relative group">
                                <span className="text-sm font-semibold text-slate-700">{userName}</span>
                                <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden border border-slate-200 cursor-pointer hover:shadow-md transition-all">
                                    <img className="w-full h-full object-cover" src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100" alt="Avatar" />
                                </div>

                                {/* Dropdown Menu */}
                                <div className="absolute top-12 right-0 w-48 bg-white rounded-xl shadow-lg border border-slate-100 p-2 opacity-0 group-hover:opacity-100 transition-all invisible group-hover:visible z-20">
                                    <button onClick={() => router.push('/profile')} className="w-full text-left block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 font-medium rounded-lg">Profile</button>
                                    <button onClick={() => router.push('/my-bookings')} className="w-full text-left block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 font-medium rounded-lg">My Bookings</button>
                                    <div className="h-px bg-slate-100 my-1 w-full"></div>
                                    <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50 rounded-lg">Sign Out</button>
                                </div>
                            </div>
                        ) : (
                            <Link
                                href="/login"
                                className="px-6 py-2 rounded-full bg-blue-800 text-white font-headline font-semibold text-sm active:scale-95 transition-transform shadow-md hover:opacity-90"
                            >
                                Sign In
                            </Link>
                        )}
                    </div>
                </div>
            </nav>
        </>
    );
}