export function StarRating({ rating, size = 16 }: { rating: number; size?: number }) {
    return (
        <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((i) => (
                <span
                    key={i}
                    className={`material-symbols-outlined ${i <= rating ? 'text-amber-400' : 'text-outline-variant/40'}`}
                    style={{ fontSize: size, fontVariationSettings: "'FILL' 1" }}
                >
                    star
                </span>
            ))}
        </div>
    );
}
