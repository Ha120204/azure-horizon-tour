import Image from 'next/image';

type Props = {
    bookingCode: string;
    tourCode?: string;
    tourName?: string;
    imageUrl?: string | null;
};

export function BookingHeroImage({ bookingCode, tourCode, tourName, imageUrl }: Props) {
    return (
        <div className="relative w-full h-64 md:h-80 lg:h-[400px] rounded-2xl overflow-hidden mb-8 md:mb-12 shadow-lg">
            <Image
                src={imageUrl || 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7'}
                alt={tourName || 'Tour image'}
                fill
                priority
                sizes="100vw"
                className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 w-full p-6 md:p-8 lg:p-10">
                <div className="flex flex-wrap items-center gap-3 mb-3 md:mb-4">
                    <span className="bg-white/20 backdrop-blur-md text-white border border-white/30 px-3 md:px-4 py-1.5 md:py-2 rounded-full text-[10px] md:text-xs font-bold tracking-widest uppercase shadow-sm">
                        VÉ: {bookingCode}
                    </span>
                    <span className="bg-black/30 backdrop-blur-md text-white border border-white/20 px-3 md:px-4 py-1.5 md:py-2 rounded-full text-[10px] md:text-xs font-bold tracking-widest uppercase shadow-sm">
                        TOUR: {tourCode}
                    </span>
                </div>
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-headline font-extrabold text-white tracking-tight drop-shadow-md">
                    {tourName}
                </h1>
            </div>
        </div>
    );
}
