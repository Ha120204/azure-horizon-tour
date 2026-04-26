'use client';

import { useState } from 'react';

interface TourImage { id: number; url: string; altText?: string; sortOrder: number; }

interface TourGalleryProps {
    tour: any;
    t: (key: string) => string;
}

// Fallback images khi tour chưa có ảnh gallery
const FALLBACK_IMAGES = [
    'https://images.unsplash.com/photo-1723380775952-28ea1a7a330a?auto=format&fit=crop&q=80&w=1200',
    'https://images.unsplash.com/photo-1688707084161-a2d4a7313f37?auto=format&fit=crop&q=80&w=800',
    'https://plus.unsplash.com/premium_photo-1673139081468-d6c013defbc2?auto=format&fit=crop&q=80&w=800',
    'https://plus.unsplash.com/premium_photo-1680831748191-d726a2f7b201?auto=format&fit=crop&q=80&w=800',
];

export default function TourGallery({ tour, t }: TourGalleryProps) {
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

    // Ảnh từ DB (gallery), nếu không có thì dùng imageUrl chính, fallback cuối cùng
    const dbImages: TourImage[] = tour?.images ?? [];
    const allImages: string[] = dbImages.length > 0
        ? dbImages.map((img) => img.url)
        : [tour?.imageUrl || FALLBACK_IMAGES[0], ...FALLBACK_IMAGES.slice(1)];

    const [main, ...rest] = allImages;
    // Hiển thị tối đa 3 ảnh phụ trong grid
    const side = rest.slice(0, 3);

    return (
        <>
            <section className="mb-10">
                <div className="grid grid-cols-1 md:grid-cols-4 grid-rows-2 gap-2 md:gap-3 h-[300px] md:h-[480px]">
                    {/* Ảnh chính — chiếm 2 cột, 2 hàng */}
                    <div
                        className="md:col-span-2 md:row-span-2 rounded-2xl overflow-hidden relative cursor-zoom-in group"
                        onClick={() => setLightboxIndex(0)}
                    >
                        <img
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                            alt={tour.name}
                            src={main}
                        />
                        <div className="absolute top-4 left-4">
                            <span className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-md text-[10px] font-bold tracking-widest uppercase shadow-sm text-on-surface">
                                {t('tour_detail.tourCode')} {tour.tourCode?.substring(0, 12)}
                            </span>
                        </div>
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 rounded-2xl" />
                    </div>

                    {/* Ảnh phụ */}
                    {side.map((url, i) => {
                        const isLast = i === side.length - 1 && allImages.length > 4;
                        const extraCount = allImages.length - 4;
                        return (
                            <div
                                key={i}
                                className={`hidden md:block rounded-2xl overflow-hidden relative cursor-zoom-in group ${i === 2 ? 'md:col-span-2' : ''}`}
                                onClick={() => setLightboxIndex(i + 1)}
                            >
                                <img
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                    alt={`${tour.name} ${i + 2}`}
                                    src={url}
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 rounded-2xl" />
                                {/* Nút "Xem tất cả" ở ảnh cuối nếu còn ảnh */}
                                {isLast && (
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-2xl">
                                        <span className="text-white font-bold text-lg">+{extraCount} ảnh</span>
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {/* Nút Xem tất cả ảnh (nếu không có ảnh thừa thì vẫn hiển thị) */}
                    {side.length === 0 && (
                        <div className="hidden md:block md:col-span-2 rounded-2xl overflow-hidden relative cursor-zoom-in group" onClick={() => setLightboxIndex(1)}>
                            <img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt={tour.name} src={FALLBACK_IMAGES[3]} />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 rounded-2xl" />
                            <button
                                onClick={(e) => { e.stopPropagation(); setLightboxIndex(0); }}
                                className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-md px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg hover:bg-white transition-colors"
                            >
                                <span className="material-symbols-outlined text-sm">photo_library</span>
                                {t('tour_detail.viewAllPhotos')}
                            </button>
                        </div>
                    )}
                </div>

                {/* Xem tất cả ảnh — mobile friendly */}
                <div className="mt-3 flex justify-end md:hidden">
                    <button
                        onClick={() => setLightboxIndex(0)}
                        className="flex items-center gap-1.5 text-xs font-semibold text-primary border border-primary/30 px-3 py-1.5 rounded-lg"
                    >
                        <span className="material-symbols-outlined text-[14px]">photo_library</span>
                        Xem tất cả {allImages.length} ảnh
                    </button>
                </div>
            </section>

            {/* ── Lightbox ── */}
            {lightboxIndex !== null && (
                <div
                    className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
                    onClick={() => setLightboxIndex(null)}
                >
                    <button
                        className="absolute top-4 right-4 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-colors"
                        onClick={() => setLightboxIndex(null)}
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>

                    {/* Prev / Next */}
                    {lightboxIndex > 0 && (
                        <button
                            className="absolute left-4 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-colors"
                            onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex - 1); }}
                        >
                            <span className="material-symbols-outlined">chevron_left</span>
                        </button>
                    )}
                    {lightboxIndex < allImages.length - 1 && (
                        <button
                            className="absolute right-4 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-colors"
                            onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex + 1); }}
                        >
                            <span className="material-symbols-outlined">chevron_right</span>
                        </button>
                    )}

                    <div onClick={(e) => e.stopPropagation()} className="max-w-5xl w-full">
                        <img
                            src={allImages[lightboxIndex]}
                            alt={`${tour.name} - ảnh ${lightboxIndex + 1}`}
                            className="w-full max-h-[80vh] object-contain rounded-xl"
                        />
                        <p className="text-center text-white/60 text-xs mt-3">
                            {lightboxIndex + 1} / {allImages.length}
                        </p>
                    </div>
                </div>
            )}
        </>
    );
}
