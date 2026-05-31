'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ViewTransition } from 'react';
import type { Tour } from '@/types';

interface TourImage { id: number; url: string; altText?: string; sortOrder: number; }
type GalleryTour = Pick<Tour, 'name' | 'tourCode' | 'imageUrl'> & {
    images?: TourImage[];
};

interface TourGalleryProps {
    tour: GalleryTour;
    t: (key: string) => string;
    /** Tour ID — used for the shared element view transition name matching TourCard */
    tourId: string | number;
}

const FALLBACK_IMAGES = [
    'https://images.unsplash.com/photo-1723380775952-28ea1a7a330a?auto=format&fit=crop&q=80&w=1200',
];

function GalleryImage({
    src,
    alt,
    sizes,
    priority = false,
}: {
    src: string;
    alt: string;
    sizes: string;
    priority?: boolean;
}) {
    return (
        <Image
            src={src}
            alt={alt}
            fill
            sizes={sizes}
            priority={priority}
            className="object-cover transition-transform duration-700 group-hover:scale-105"
        />
    );
}

export default function TourGallery({ tour, t, tourId }: TourGalleryProps) {
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

    // Lấy ảnh thực tế từ database, không fix cứng thêm fallback nữa
    const dbImages: TourImage[] = tour?.images ?? [];
    let allImages: string[] = dbImages.map((img) => img.url);
    
    // Nếu hoàn toàn không có ảnh nào, mới dùng 1 ảnh fallback
    if (allImages.length === 0) {
        if (tour?.imageUrl) {
            allImages = [tour.imageUrl];
        } else {
            allImages = [FALLBACK_IMAGES[0]];
        }
    }

    const imgCount = allImages.length;

    const renderTourCode = () => (
        <div className="absolute top-4 left-4 z-10">
            <span className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-md text-[10px] font-bold tracking-widest uppercase shadow-sm text-on-surface">
                {t('tour_detail.tourCode')} {tour.tourCode?.substring(0, 12)}
            </span>
        </div>
    );

    const renderViewAllBtn = (isAbsolute = true) => (
        imgCount > 1 ? (
            <button
                onClick={(e) => { e.stopPropagation(); setLightboxIndex(0); }}
                className={`${isAbsolute ? 'absolute bottom-4 right-4' : 'mt-4 float-right'} bg-white/90 backdrop-blur-md px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg hover:bg-white transition-colors z-10 hidden md:flex`}
            >
                <span className="material-symbols-outlined text-sm">photo_library</span>
                {t('tour_detail.viewAllPhotos')}
            </button>
        ) : null
    );

    const renderGalleryGrid = () => {
        // Layout 1 Ảnh
        if (imgCount === 1) {
            return (
                <div className="w-full h-[300px] md:h-[480px] rounded-2xl overflow-hidden relative cursor-zoom-in group" onClick={() => setLightboxIndex(0)}>
                    {/* Shared element: name matches TourCard → smooth morph on navigation */}
                    <ViewTransition name={`tour-img-${tourId}`} share="morph">
                        <div className="absolute inset-0">
                            <GalleryImage src={allImages[0]} alt={tour.name} sizes="100vw" priority />
                        </div>
                    </ViewTransition>
                    {renderTourCode()}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                </div>
            );
        }

        // Layout 2 Ảnh (Chia đôi màn hình)
        if (imgCount === 2) {
            return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3 h-[300px] md:h-[480px] relative">
                    <div className="rounded-2xl overflow-hidden relative cursor-zoom-in group" onClick={() => setLightboxIndex(0)}>
                        <ViewTransition name={`tour-img-${tourId}`} share="morph">
                            <div className="absolute inset-0">
                                <GalleryImage src={allImages[0]} alt={tour.name} sizes="(min-width: 768px) 50vw, 100vw" priority />
                            </div>
                        </ViewTransition>
                        {renderTourCode()}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                    </div>
                    <div className="hidden md:block rounded-2xl overflow-hidden relative cursor-zoom-in group" onClick={() => setLightboxIndex(1)}>
                        <GalleryImage src={allImages[1]} alt={`${tour.name} 2`} sizes="50vw" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                        {renderViewAllBtn()}
                    </div>
                </div>
            );
        }

        // Layout 3 Ảnh (1 To bên trái, 2 Nhỏ bên phải xếp trên dưới)
        if (imgCount === 3) {
            return (
                <div className="grid grid-cols-1 md:grid-cols-3 md:grid-rows-2 gap-2 md:gap-3 h-[300px] md:h-[480px] relative">
                    <div className="md:col-span-2 md:row-span-2 rounded-2xl overflow-hidden relative cursor-zoom-in group" onClick={() => setLightboxIndex(0)}>
                        <ViewTransition name={`tour-img-${tourId}`} share="morph">
                            <div className="absolute inset-0">
                                <GalleryImage src={allImages[0]} alt={tour.name} sizes="(min-width: 768px) 67vw, 100vw" priority />
                            </div>
                        </ViewTransition>
                        {renderTourCode()}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                    </div>
                    <div className="hidden md:block rounded-2xl overflow-hidden relative cursor-zoom-in group" onClick={() => setLightboxIndex(1)}>
                        <GalleryImage src={allImages[1]} alt={`${tour.name} 2`} sizes="33vw" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                    </div>
                    <div className="hidden md:block rounded-2xl overflow-hidden relative cursor-zoom-in group" onClick={() => setLightboxIndex(2)}>
                        <GalleryImage src={allImages[2]} alt={`${tour.name} 3`} sizes="33vw" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                        {renderViewAllBtn()}
                    </div>
                </div>
            );
        }

        // Layout >= 4 Ảnh (Layout cũ: 1 To, 3 Nhỏ xếp quanh)
        const [main, ...rest] = allImages;
        const side = rest.slice(0, 3);
        return (
            <div className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-2 gap-2 md:gap-3 h-[300px] md:h-[480px] relative">
                {/* Ảnh chính — shared element target */}
                <div className="md:col-span-2 md:row-span-2 rounded-2xl overflow-hidden relative cursor-zoom-in group" onClick={() => setLightboxIndex(0)}>
                    <ViewTransition name={`tour-img-${tourId}`} share="morph">
                        <div className="absolute inset-0">
                            <GalleryImage src={main} alt={tour.name} sizes="(min-width: 768px) 50vw, 100vw" priority />
                        </div>
                    </ViewTransition>
                    {renderTourCode()}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                </div>

                {/* Ảnh phụ */}
                {side.map((url, i) => {
                    const isLast = i === side.length - 1 && allImages.length > 4;
                    const extraCount = allImages.length - 4;
                    return (
                        <div key={i} className={`hidden md:block rounded-2xl overflow-hidden relative cursor-zoom-in group ${i === 2 ? 'md:col-span-2' : ''}`} onClick={() => setLightboxIndex(i + 1)}>
                            <GalleryImage src={url} alt={`${tour.name} ${i + 2}`} sizes={i === 2 ? '50vw' : '25vw'} />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                            {isLast && (
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-2xl">
                                    <span className="text-white font-bold text-lg">+{extraCount} ảnh</span>
                                </div>
                            )}
                            {i === 2 && !isLast && renderViewAllBtn()}
                            {isLast && renderViewAllBtn()}
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <>
            <section className="mb-10">
                {renderGalleryGrid()}

                {/* Xem tất cả ảnh — mobile friendly */}
                {imgCount > 1 && (
                    <div className="mt-3 flex justify-end md:hidden">
                        <button
                            onClick={() => setLightboxIndex(0)}
                            className="flex items-center gap-1.5 text-xs font-semibold text-primary border border-primary/30 px-3 py-1.5 rounded-lg"
                        >
                            <span className="material-symbols-outlined text-[14px]">photo_library</span>
                            Xem tất cả {allImages.length} ảnh
                        </button>
                    </div>
                )}
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
                        <Image
                            src={allImages[lightboxIndex]}
                            alt={`${tour.name} - ảnh ${lightboxIndex + 1}`}
                            width={1200}
                            height={800}
                            sizes="100vw"
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
