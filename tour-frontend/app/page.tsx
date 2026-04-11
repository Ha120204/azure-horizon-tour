'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from './components/Header';
import Footer from './components/Footer';
import HeroSearch from './components/HeroSearch';

export default function HomePage() {
  const [tours, setTours] = useState([]);
  const router = useRouter();

  // Gọi API lấy danh sách Tour
  useEffect(() => {
    const fetchTours = async () => {
      try {
        const res = await fetch('http://localhost:3000/tour');
        const data = await res.json();
        setTours(data);
      } catch (error) {
        console.error('Lỗi lấy danh sách tour:', error);
      }
    };
    fetchTours();
  }, []);

  return (
    <div className="bg-background text-on-surface font-body antialiased min-h-screen flex flex-col">
      {/* Top Navigation Bar */}
      <Header />

      {/* Hero Section */}
      <header className="relative pt-32 pb-20 px-8">
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="inline-block px-4 py-1.5 rounded-full bg-secondary-fixed text-on-secondary-fixed text-[0.6875rem] font-label font-bold tracking-[0.05em] uppercase mb-6">Expertly Authored Journeys</span>
              <h1 className="text-7xl font-headline font-extrabold text-on-surface tracking-tight leading-[1.1] mb-8">
                Travel that <br /><span className="text-primary italic">transcends</span>.
              </h1>
              <p className="text-xl text-on-surface-variant leading-relaxed max-w-lg mb-12">
                Khám phá những điểm đến tuyệt vời nhất cùng Azure Horizon. Trải nghiệm dịch vụ đẳng cấp và những hành trình không thể nào quên.
              </p>
            </div>
            <div className="relative">
              <div className="aspect-[4/5] rounded-[2rem] overflow-hidden shadow-2xl">
                <img alt="Luxury Italian coast" className="w-full h-full object-cover" src="https://images.unsplash.com/photo-1673403731036-30ef7a4995f5?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8THV4dXJ5JTIwSXRhbGlhbiUyMGNvYXN0fGVufDB8fDB8fHww" />
              </div>
              <div className="absolute -bottom-6 -left-6 bg-surface-container-lowest p-6 rounded-xl ambient-shadow hidden md:block">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full editorial-gradient flex items-center justify-center text-white">
                    <span className="material-symbols-outlined">verified_user</span>
                  </div>
                  <div>
                    <p className="text-sm font-headline font-bold">Carbon Neutral</p>
                    <p className="text-xs text-on-surface-variant">Sustainable luxury travel</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Thanh Tìm Kiếm  */}
          <div className="mt-16 max-w-5xl mx-auto">
            <HeroSearch />
          </div>
        </div>
      </header>

      {/* Main Content: Featured Tours (API Động) */}
      <main className="py-24 px-8 bg-surface">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-end mb-16">
            <div>
              <h2 className="text-4xl font-headline font-bold text-on-surface mb-4">Featured Collections</h2>
              <p className="text-on-surface-variant max-w-md">Những trải nghiệm được tuyển chọn kỹ lưỡng, đại diện cho đỉnh cao của du lịch.</p>
            </div>
            <button className="group hidden md:flex items-center gap-2 text-primary font-headline font-semibold">
              Explore All Destinations
              <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
            </button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10">
            {tours.length > 0 ? tours.map((tour: any) => (
              <div key={tour.id} className="group flex flex-col bg-surface-container-lowest rounded-xl overflow-hidden hover:bg-white hover:ambient-shadow transition-all duration-300 cursor-pointer" onClick={() => router.push(`/tour/${tour.id}`)}>
                <div className="relative h-72 overflow-hidden">
                  <img
                    alt={tour.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    src={tour.imageUrl || "https://images.unsplash.com/photo-1506744038136-46273834b3fb"}
                  />
                  <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-4 py-1.5 rounded-full text-xs font-label font-bold text-primary shadow-sm">
                    {tour.duration} DAYS
                  </div>
                </div>
                <div className="p-8 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-headline font-bold text-on-surface line-clamp-1" title={tour.name}>{tour.name}</h3>
                    <div className="flex items-center gap-1 text-secondary">
                      <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                      <span className="text-xs font-bold">5.0</span>
                    </div>
                  </div>
                  <p className="text-on-surface-variant text-sm leading-relaxed mb-8 flex-1 line-clamp-2">
                    {tour.description}
                  </p>
                  <div className="flex items-center justify-between pt-6 border-t border-outline-variant/10">
                    <div>
                      <span className="text-[0.625rem] font-label font-bold text-outline uppercase block tracking-widest mb-1">Per Person</span>
                      <span className="text-2xl font-headline font-extrabold text-on-surface">
                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(tour.price)}
                      </span>
                    </div>
                    <button className="px-6 py-2.5 rounded-full bg-surface-container-high text-primary font-headline font-bold text-sm hover:bg-primary hover:text-white transition-colors">
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            )) : (
              <div className="col-span-full text-center py-10 text-on-surface-variant">
                Đang tải dữ liệu Tour...
              </div>
            )}
          </div>
        </div>
      </main>

      {/* BỔ SUNG 2: Khối Editorial Section (Our Philosophy) */}
      <section className="py-24 px-8 bg-surface-container-low">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-12 gap-16 items-center">
            <div className="lg:col-span-7">
              <div className="grid grid-cols-2 gap-6">
                <div className="rounded-2xl overflow-hidden aspect-[3/4] translate-y-12 shadow-lg">
                  <img alt="Swiss Alps Cabin" className="w-full h-full object-cover" src="https://images.unsplash.com/photo-1694980252071-5e1bd1f37448?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8U3dpc3MlMjBBbHBzJTIwQ2FiaW58ZW58MHx8MHx8fDA%3D" />
                </div>
                <div className="rounded-2xl overflow-hidden aspect-[3/4] shadow-lg">
                  <img alt="Bali Infinity Pool" className="w-full h-full object-cover" src="https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&q=80" />
                </div>
              </div>
            </div>
            <div className="lg:col-span-5">
              <span className="text-[0.6875rem] font-label font-bold text-primary uppercase tracking-widest mb-6 block">Our Philosophy</span>
              <h2 className="text-5xl font-headline font-extrabold text-on-surface mb-8 leading-tight">The Art of the Path.</h2>
              <p className="text-lg text-on-surface-variant leading-relaxed mb-8">
                Chúng tôi không chỉ đặt chuyến đi; chúng tôi kiến tạo trải nghiệm. Mỗi hành trình là một câu chuyện được dệt nên từ những bí mật địa phương, những kỳ quan kiến trúc và những khoảnh khắc tĩnh lặng định hình cả một đời kỷ niệm.
              </p>
              <ul className="space-y-6 mb-12">
                <li className="flex gap-4">
                  <span className="material-symbols-outlined text-tertiary">check_circle</span>
                  <div>
                    <span className="block font-headline font-bold text-on-surface">Curated Accommodations</span>
                    <p className="text-sm text-on-surface-variant">Stay in places that tell a story.</p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <span className="material-symbols-outlined text-tertiary">check_circle</span>
                  <div>
                    <span className="block font-headline font-bold text-on-surface">Local Concierge</span>
                    <p className="text-sm text-on-surface-variant">Access to the inaccessible.</p>
                  </div>
                </li>
              </ul>
              <button className="px-8 py-4 rounded-full border-2 border-primary text-primary font-headline font-bold hover:bg-primary hover:text-white transition-all">
                Discover Our Story
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}