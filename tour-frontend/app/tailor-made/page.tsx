'use client';

import { useState } from 'react';
import Link from 'next/link';
import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';

export default function TailorMadePage() {
    // State để quản lý các nút chọn Phong cách du lịch (Travel Style)
    const [selectedStyles, setSelectedStyles] = useState<string[]>(['Culinary']);

    const toggleStyle = (style: string) => {
        if (selectedStyles.includes(style)) {
            setSelectedStyles(selectedStyles.filter(s => s !== style));
        } else {
            setSelectedStyles([...selectedStyles, style]);
        }
    };

    const travelStyles = ['Culinary', 'Wellness', 'Adventure', 'Cultural Immersion', 'Pure Relaxation'];

    return (
        <div className="bg-surface font-body text-on-surface selection:bg-primary-fixed selection:text-on-primary-fixed min-h-screen flex flex-col">
            <style dangerouslySetInnerHTML={{
                __html: `
                .editorial-shadow { box-shadow: 0 8px 32px rgba(25, 28, 33, 0.04); }
                .gradient-text { background: linear-gradient(135deg, #003f87 0%, #0056b3 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
            `}} />

            <Header />

            <main className="flex-grow pt-20">
                {/* 1. Hero Section */}
                <section className="min-h-[80vh] flex flex-col md:flex-row items-stretch overflow-hidden">
                    <div className="w-full md:w-1/2 flex items-center px-8 md:px-20 py-20 bg-surface">
                        <div className="max-w-xl">
                            <span className="text-sm text-primary font-semibold tracking-[0.2em] uppercase mb-6 block">
                                The Private Collection
                            </span>
                            <h1 className="text-5xl md:text-7xl font-headline font-bold text-on-surface tracking-tight leading-[1.1] mb-8">
                                Craft Your <br /><span className="gradient-text">Masterpiece</span>
                            </h1>
                            <p className="text-xl md:text-2xl text-on-surface-variant font-light leading-relaxed mb-12">
                                Share your vision with our expert travel designers. We will curate a bespoke itinerary that transcends your expectations.
                            </p>
                            <div className="flex items-center space-x-4">
                                <div className="w-12 h-px bg-primary"></div>
                                <span className="text-sm font-medium italic text-on-surface-variant">Your journey, redefined.</span>
                            </div>
                        </div>
                    </div>

                    <div className="w-full md:w-1/2 relative min-h-[400px]">
                        <img
                            className="absolute inset-0 w-full h-full object-cover"
                            alt="Luxury yacht sailing through turquoise Mediterranean waters"
                            src="https://images.unsplash.com/photo-1678791565568-1daab315c63c?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTh8fE1lZGl0ZXJyYW5lYW4lMjB3YXRlcnN8ZW58MHx8MHx8fDA%3D"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-surface via-surface/40 to-transparent"></div>
                    </div>
                </section>

                {/* 2. Concierge Request Form */}
                <section className="max-w-5xl mx-auto px-6 md:px-8 py-24 md:py-32">
                    <div className="text-center mb-16 md:mb-24">
                        <h2 className="text-3xl md:text-4xl font-headline font-semibold text-on-surface mb-4">Request Your Itinerary</h2>
                        <p className="text-on-surface-variant max-w-lg mx-auto text-lg">
                            Please complete the details below. A dedicated concierge will contact you within 24 hours.
                        </p>
                    </div>

                    <form className="space-y-20 md:space-y-24" onSubmit={(e) => e.preventDefault()}>

                        {/* Section A: The Journey */}
                        <div className="space-y-8 md:space-y-10">
                            <div className="flex items-baseline space-x-4 mb-8">
                                <span className="text-4xl font-headline font-bold text-surface-container-highest">01</span>
                                <h3 className="text-2xl font-headline font-bold text-on-surface uppercase tracking-wider">The Journey</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                                <div className="space-y-3">
                                    <label className="text-xs text-on-surface-variant font-bold tracking-widest block">WHERE DO YOU WANT TO GO?</label>
                                    <input
                                        className="w-full bg-surface-container-low border-none rounded-xl p-5 text-base md:text-lg focus:ring-1 focus:ring-primary focus:bg-white transition-all placeholder:text-outline-variant outline-none shadow-sm"
                                        placeholder="e.g. Amalfi Coast, Kyoto, Serengeti..."
                                        type="text"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-xs text-on-surface-variant font-bold tracking-widest block">WHEN ARE YOU PLANNING TO TRAVEL?</label>
                                    <input
                                        className="w-full bg-surface-container-low border-none rounded-xl p-5 text-base md:text-lg focus:ring-1 focus:ring-primary focus:bg-white transition-all outline-none shadow-sm"
                                        type="date"
                                    />
                                </div>
                                <div className="space-y-3 md:col-span-2">
                                    <label className="text-xs text-on-surface-variant font-bold tracking-widest block">EXPECTED DURATION</label>
                                    <select
                                        defaultValue=""
                                        className="w-full bg-surface-container-low border-none rounded-xl p-5 text-base md:text-lg focus:ring-1 focus:ring-primary focus:bg-white transition-all outline-none appearance-none shadow-sm"
                                    >
                                        <option value="" disabled>Select duration</option>
                                        <option value="1 week">1 week</option>
                                        <option value="2 weeks">2 weeks</option>
                                        <option value="3 weeks">3 weeks</option>
                                        <option value="1 month +">1 month +</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Section B: The Experience */}
                        <div className="space-y-8 md:space-y-10">
                            <div className="flex items-baseline space-x-4 mb-8">
                                <span className="text-4xl font-headline font-bold text-surface-container-highest">02</span>
                                <h3 className="text-2xl font-headline font-bold text-on-surface uppercase tracking-wider">The Experience</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                                <div className="space-y-3">
                                    <label className="text-xs text-on-surface-variant font-bold tracking-widest block">NUMBER OF TRAVELERS</label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-outline uppercase tracking-wider">Adults</span>
                                            <input className="w-full bg-surface-container-low border-none rounded-xl p-5 pl-20 text-base md:text-lg focus:ring-1 focus:ring-primary focus:bg-white transition-all outline-none shadow-sm" type="number" defaultValue="2" min="1" />
                                        </div>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-outline uppercase tracking-wider">Children</span>
                                            <input className="w-full bg-surface-container-low border-none rounded-xl p-5 pl-24 text-base md:text-lg focus:ring-1 focus:ring-primary focus:bg-white transition-all outline-none shadow-sm" type="number" defaultValue="0" min="0" />
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-xs text-on-surface-variant font-bold tracking-widest block">ESTIMATED BUDGET PER PERSON</label>
                                    <select
                                        defaultValue=""
                                        className="w-full bg-surface-container-low border-none rounded-xl p-5 text-base md:text-lg focus:ring-1 focus:ring-primary focus:bg-white transition-all outline-none appearance-none shadow-sm"
                                    >
                                        <option value="" disabled>Select budget</option>
                                        <option value="5000">$5,000+</option>
                                        <option value="10000">$10,000+</option>
                                        <option value="25000">$25,000+</option>
                                        <option value="unlimited">Unlimited</option>
                                    </select>
                                </div>
                                <div className="md:col-span-2 space-y-4">
                                    <label className="text-xs text-on-surface-variant font-bold tracking-widest block">TRAVEL STYLE</label>
                                    <div className="flex flex-wrap gap-3">
                                        {travelStyles.map(style => (
                                            <button
                                                key={style}
                                                type="button"
                                                onClick={() => toggleStyle(style)}
                                                className={`px-6 py-3 rounded-full text-sm font-medium transition-all duration-300 editorial-shadow border ${selectedStyles.includes(style)
                                                    ? 'bg-primary text-white border-primary shadow-md'
                                                    : 'bg-white text-on-surface-variant border-outline-variant/30 hover:border-primary/50'
                                                    }`}
                                            >
                                                {style}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Section C: Personal Details */}
                        <div className="space-y-8 md:space-y-10">
                            <div className="flex items-baseline space-x-4 mb-8">
                                <span className="text-4xl font-headline font-bold text-surface-container-highest">03</span>
                                <h3 className="text-2xl font-headline font-bold text-on-surface uppercase tracking-wider">Personal Details</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                                <div className="space-y-3">
                                    <label className="text-xs text-on-surface-variant font-bold tracking-widest block">FULL NAME</label>
                                    <input className="w-full bg-surface-container-low border-none rounded-xl p-5 text-base md:text-lg focus:ring-1 focus:ring-primary focus:bg-white transition-all outline-none shadow-sm" placeholder="Your name" type="text" required />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-xs text-on-surface-variant font-bold tracking-widest block">EMAIL ADDRESS</label>
                                    <input className="w-full bg-surface-container-low border-none rounded-xl p-5 text-base md:text-lg focus:ring-1 focus:ring-primary focus:bg-white transition-all outline-none shadow-sm" placeholder="email@address.com" type="email" required />
                                </div>
                                <div className="space-y-3 md:col-span-2">
                                    <label className="text-xs text-on-surface-variant font-bold tracking-widest block">TELL US MORE ABOUT YOUR DREAM TRIP</label>
                                    <textarea className="w-full bg-surface-container-low border-none rounded-xl p-5 text-base md:text-lg focus:ring-1 focus:ring-primary focus:bg-white transition-all outline-none resize-none shadow-sm" placeholder="Share your passions, interests, and any specific requirements..." rows={5}></textarea>
                                </div>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <div className="pt-12 text-center">
                            <button
                                type="submit"
                                onClick={() => alert("Form submitted successfully! Our Concierge will contact you soon.")}
                                className="group relative inline-flex items-center justify-center px-12 md:px-16 py-6 md:py-8 font-headline font-bold text-lg md:text-xl text-white bg-primary rounded-full overflow-hidden transition-all hover:scale-[1.02] active:scale-95 editorial-shadow"
                            >
                                <span className="relative z-10">Request Custom Itinerary</span>
                                <div className="absolute inset-0 bg-gradient-to-r from-primary to-primary-container opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            </button>
                            <p className="mt-6 text-[11px] md:text-sm text-on-surface-variant font-medium">By submitting, you agree to our concierge privacy terms.</p>
                        </div>
                    </form>
                </section>

                {/* 3. Signature Experience Preview */}
                <section className="bg-white py-24 md:py-32 px-6 md:px-8 overflow-hidden border-t border-outline-variant/10">
                    <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16 lg:gap-20">

                        <div className="w-full lg:w-1/2 relative">
                            <div className="aspect-[4/5] rounded-2xl overflow-hidden editorial-shadow">
                                <img
                                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-1000"
                                    alt="Luxury private jet cabin interior"
                                    src="https://images.unsplash.com/photo-1540962351504-03099e0a754b?auto=format&fit=crop&q=80&w=800"
                                />
                            </div>
                            {/* Floating Stats Card */}
                            <div className="absolute -bottom-8 -right-4 md:-bottom-10 md:-right-10 w-56 md:w-64 bg-white rounded-2xl p-6 md:p-8 editorial-shadow border border-outline-variant/10 hidden sm:block">
                                <span className="text-primary font-black font-headline text-4xl md:text-5xl block mb-2">98%</span>
                                <p className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-on-surface-variant leading-relaxed">
                                    Member Satisfaction for Tailor-made Journeys in 2025
                                </p>
                            </div>
                        </div>

                        <div className="w-full lg:w-1/2 space-y-8">
                            <h2 className="text-3xl md:text-5xl font-headline font-bold text-on-surface leading-tight tracking-tight">
                                The Azure Signature Service
                            </h2>
                            <p className="text-base md:text-lg text-on-surface-variant leading-relaxed font-light">
                                Each tailor-made journey is assigned a personal specialist who handles every logistical detail, from private aviation and villa procurement to exclusive access to world-renowned museums and culinary legends.
                            </p>
                            <ul className="space-y-6 pt-4">
                                <li className="flex items-center space-x-4 bg-surface-container-low p-4 rounded-xl">
                                    <span className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                        <span className="material-symbols-outlined text-base">public</span>
                                    </span>
                                    <span className="text-on-surface font-semibold">Global Network of Local Experts</span>
                                </li>
                                <li className="flex items-center space-x-4 bg-surface-container-low p-4 rounded-xl">
                                    <span className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                        <span className="material-symbols-outlined text-base">support_agent</span>
                                    </span>
                                    <span className="text-on-surface font-semibold">24/7 In-Country Travel Support</span>
                                </li>
                                <li className="flex items-center space-x-4 bg-surface-container-low p-4 rounded-xl">
                                    <span className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                        <span className="material-symbols-outlined text-base">tune</span>
                                    </span>
                                    <span className="text-on-surface font-semibold">Bespoke Guest Preferences Profile</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}