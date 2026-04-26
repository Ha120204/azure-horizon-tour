'use client';

type PassengerType = 'Adult (12+)' | 'Child (4-11)' | 'Infant (<4)';

interface Passenger {
    type: PassengerType;
    fullName: string;
    dob: string;
    gender: string;
}

interface LeadTraveler {
    fullName: string;
    dob: string;
    gender: string;
    notes: string;
}

interface PassengerSectionProps {
    leadTraveler: LeadTraveler;
    setLeadTraveler: React.Dispatch<React.SetStateAction<LeadTraveler>>;
    passengers: Passenger[];
    activeFormType: PassengerType | null;
    tempFormData: { fullName: string; dob: string; gender: string };
    setTempFormData: React.Dispatch<React.SetStateAction<{ fullName: string; dob: string; gender: string }>>;
    onOpenForm: (type: PassengerType | null) => void;
    onSavePassenger: () => void;
    onRemovePassenger: (index: number) => void;
    t: (key: string) => string;
}

export default function PassengerSection({
    leadTraveler,
    setLeadTraveler,
    passengers,
    activeFormType,
    tempFormData,
    setTempFormData,
    onOpenForm,
    onSavePassenger,
    onRemovePassenger,
    t,
}: PassengerSectionProps) {
    return (
        <section className="bg-white rounded-xl p-6 md:p-8 ambient-shadow ghost-border">
            <div className="flex items-center gap-4 mb-6 md:mb-8">
                <span className="material-symbols-outlined text-primary text-3xl">group</span>
                <h2 className="font-headline text-xl md:text-2xl font-bold tracking-tight">{t('checkout.passengerInfoTitle')}</h2>
            </div>

            <div className="space-y-8">
                {/* Lead Traveler */}
                <div className="bg-surface-container-low/50 p-5 md:p-6 rounded-xl border border-outline-variant/20">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-2">
                        <h3 className="font-headline font-semibold text-base md:text-lg text-primary">{t('checkout.leadTraveler')}</h3>
                        <span className="bg-tertiary-container text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest w-max shadow-sm">{t('checkout.required')}</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant mb-2">{t('checkout.fullName')} <span className="text-error">*</span></label>
                            <input
                                className="w-full bg-white border border-outline-variant/20 rounded-lg p-3 md:p-4 focus:ring-1 focus:ring-primary outline-none shadow-sm"
                                type="text"
                                placeholder={t('checkout.enterFullName')}
                                value={leadTraveler.fullName}
                                onChange={(e) => setLeadTraveler({ ...leadTraveler, fullName: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant mb-2">{t('checkout.dob')} <span className="text-error">*</span></label>
                            <input
                                className="w-full bg-white border border-outline-variant/20 rounded-lg p-3 md:p-4 focus:ring-1 focus:ring-primary outline-none shadow-sm"
                                type="date"
                                value={leadTraveler.dob}
                                onChange={(e) => setLeadTraveler({ ...leadTraveler, dob: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant mb-2">{t('checkout.gender')} <span className="text-error">*</span></label>
                            <select
                                className="w-full bg-white border border-outline-variant/20 rounded-lg p-3 md:p-4 focus:ring-1 focus:ring-primary outline-none shadow-sm appearance-none"
                                value={leadTraveler.gender}
                                onChange={(e) => setLeadTraveler({ ...leadTraveler, gender: e.target.value })}
                            >
                                <option value="">{t('checkout.selectGender')}</option>
                                <option value="Male">{t('checkout.male')}</option>
                                <option value="Female">{t('checkout.female')}</option>
                                <option value="Other">{t('checkout.other')}</option>
                            </select>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant mb-2">{t('checkout.specialReq')}</label>
                            <textarea
                                className="w-full bg-white border border-outline-variant/20 rounded-lg p-3 md:p-4 focus:ring-1 focus:ring-primary outline-none shadow-sm resize-none"
                                placeholder={t('checkout.specialReqPlaceholder')}
                                rows={2}
                                value={leadTraveler.notes}
                                onChange={(e) => setLeadTraveler({ ...leadTraveler, notes: e.target.value })}
                            ></textarea>
                        </div>
                    </div>
                </div>

                {/* Added Passengers List */}
                {passengers.length > 0 && (
                    <div className="space-y-3">
                        <h4 className="font-bold text-sm text-on-surface-variant">{t('checkout.addedPassengers')}</h4>
                        {passengers.map((p, idx) => (
                            <div key={idx} className="flex justify-between items-center bg-white border border-primary/20 p-4 rounded-xl shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                        <span className="material-symbols-outlined text-xl">{p.type.includes('Child') ? 'child_care' : p.type.includes('Infant') ? 'baby_changing_station' : 'person'}</span>
                                    </div>
                                    <div>
                                        <p className="font-bold text-on-surface">{p.fullName}</p>
                                        <p className="text-xs text-outline font-medium">{t(p.type === 'Adult (12+)' ? 'checkout.adult' : p.type === 'Child (4-11)' ? 'checkout.child' : 'checkout.infant')} • {p.dob || t('checkout.dobNotEntered')}</p>
                                    </div>
                                </div>
                                <button onClick={() => onRemovePassenger(idx)} className="text-error hover:bg-error/10 p-2 rounded-lg transition-colors">
                                    <span className="material-symbols-outlined">delete</span>
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Add Passenger Buttons + Form */}
                <div className="space-y-4 pt-4 border-t border-outline-variant/20">
                    <h3 className="font-headline font-bold text-lg">{t('checkout.addPassenger')}</h3>
                    <div className="grid grid-cols-3 gap-2 md:gap-4">
                        {(['Adult (12+)', 'Child (4-11)', 'Infant (<4)'] as PassengerType[]).map((type) => {
                            const isActive = activeFormType === type;
                            const icon = type.includes('Child') ? 'child_care' : type.includes('Infant') ? 'baby_changing_station' : 'person';
                            const translatedType = type === 'Adult (12+)' ? t('checkout.adult') : type === 'Child (4-11)' ? t('checkout.child') : t('checkout.infant');

                            return (
                                <button
                                    key={type}
                                    onClick={() => onOpenForm(isActive ? null : type)}
                                    className={`relative flex flex-col items-center justify-center gap-2 p-3 md:p-4 rounded-xl border-2 transition-all ${isActive ? 'border-primary bg-primary/5 shadow-sm' : 'border-outline-variant/30 hover:border-primary/50 bg-white'}`}
                                >
                                    {isActive && (
                                        <div className="absolute -top-2 -right-2 bg-primary text-white w-5 h-5 rounded-full flex items-center justify-center shadow-md">
                                            <span className="material-symbols-outlined text-[12px] font-bold">check</span>
                                        </div>
                                    )}
                                    <span className={`material-symbols-outlined ${isActive ? 'text-primary' : 'text-on-surface-variant'}`}>{icon}</span>
                                    <span className={`text-[10px] md:text-xs font-bold uppercase tracking-tight ${isActive ? 'text-primary' : 'text-on-surface-variant'}`}>{translatedType}</span>
                                </button>
                            );
                        })}
                    </div>

                    {activeFormType && (
                        <div className="relative bg-primary/5 rounded-2xl p-5 md:p-8 border border-primary/20 animate-fade-in mt-4">
                            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-surface border-t border-l border-primary/20 rotate-45" style={{ backgroundColor: '#f6f8fb' }}></div>
                            <div className="flex justify-between items-center mb-6">
                                <h4 className="font-headline font-bold text-lg text-primary">{t('checkout.enterInfoFor')} {activeFormType === 'Adult (12+)' ? t('checkout.adult') : activeFormType === 'Child (4-11)' ? t('checkout.child') : t('checkout.infant')}</h4>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                                <div className="md:col-span-2">
                                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant mb-2">{t('checkout.fullName')} <span className="text-error">*</span></label>
                                    <input
                                        className="w-full bg-white border border-outline-variant/20 rounded-lg p-3 md:p-4 focus:ring-1 focus:ring-primary outline-none shadow-sm"
                                        placeholder={t('checkout.enterFullName')}
                                        type="text"
                                        value={tempFormData.fullName}
                                        onChange={(e) => setTempFormData({ ...tempFormData, fullName: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant mb-2">{t('checkout.dob')} <span className="text-error">*</span></label>
                                    <input
                                        className="w-full bg-white border border-outline-variant/20 rounded-lg p-3 md:p-4 focus:ring-1 focus:ring-primary outline-none shadow-sm"
                                        type="date"
                                        value={tempFormData.dob}
                                        onChange={(e) => setTempFormData({ ...tempFormData, dob: e.target.value })}
                                    />
                                    <p className="mt-2 text-[11px] text-primary/70 font-medium italic">
                                        {activeFormType === 'Child (4-11)' ? t('checkout.age4to11') : activeFormType === 'Infant (<4)' ? t('checkout.under4') : t('checkout.over12')}
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant mb-2">{t('checkout.gender')} <span className="text-error">*</span></label>
                                    <select
                                        className="w-full bg-white border border-outline-variant/20 rounded-lg p-3 md:p-4 focus:ring-1 focus:ring-primary outline-none shadow-sm appearance-none"
                                        value={tempFormData.gender}
                                        onChange={(e) => setTempFormData({ ...tempFormData, gender: e.target.value })}
                                    >
                                        <option value="">{t('checkout.selectGender')}</option>
                                        <option value="Male">{t('checkout.male')}</option>
                                        <option value="Female">{t('checkout.female')}</option>
                                        <option value="Other">{t('checkout.other')}</option>
                                    </select>
                                </div>
                            </div>
                            <div className="mt-8 flex justify-end gap-3">
                                <button onClick={() => onOpenForm(null)} className="px-6 py-3 rounded-full font-bold text-sm text-outline hover:text-on-surface transition-colors">{t('checkout.cancel')}</button>
                                <button onClick={onSavePassenger} className="bg-primary text-white px-8 py-3 rounded-full font-bold text-sm hover:opacity-90 transition-all shadow-md shadow-primary/20 active:scale-95">{t('checkout.savePassenger')}</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}
