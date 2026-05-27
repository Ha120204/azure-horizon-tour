'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

export function Lightbox({ images, initial, onClose }: { images: string[]; initial: number; onClose: () => void }) {
    const [idx, setIdx] = useState(initial);
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowRight') setIdx((p) => (p + 1) % images.length);
            if (e.key === 'ArrowLeft') setIdx((p) => (p - 1 + images.length) % images.length);
        };
        window.addEventListener('keydown', handler);
        document.body.style.overflow = 'hidden';
        return () => { window.removeEventListener('keydown', handler); document.body.style.overflow = ''; };
    }, [onClose, images.length]);

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center" onClick={onClose}>
            <div className="absolute inset-0 bg-black/90 backdrop-blur-md" />
            <button onClick={onClose} className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors z-10">
                <span className="material-symbols-outlined">close</span>
            </button>
            {images.length > 1 && (
                <>
                    <button
                        onClick={(e) => { e.stopPropagation(); setIdx((p) => (p - 1 + images.length) % images.length); }}
                        className="absolute left-4 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors z-10"
                    >
                        <span className="material-symbols-outlined">chevron_left</span>
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); setIdx((p) => (p + 1) % images.length); }}
                        className="absolute right-4 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors z-10"
                    >
                        <span className="material-symbols-outlined">chevron_right</span>
                    </button>
                </>
            )}
            <div
                className="relative z-10 h-[85vh] w-[90vw] rounded-xl"
                onClick={(e) => e.stopPropagation()}
            >
                <Image
                    src={images[idx]}
                    alt={`Ảnh ${idx + 1}`}
                    fill
                    unoptimized
                    sizes="90vw"
                    className="object-contain drop-shadow-2xl"
                />
            </div>
            {images.length > 1 && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                    {images.map((_, i) => (
                        <button
                            key={i}
                            onClick={(e) => { e.stopPropagation(); setIdx(i); }}
                            className={`w-2 h-2 rounded-full transition-all ${i === idx ? 'bg-white w-5' : 'bg-white/40'}`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
