export default function Footer() {
    return (
        <footer className="bg-slate-900 text-slate-100 pt-20 pb-12 px-8 mt-auto">
            <div className="max-w-7xl mx-auto">
                <div className="grid md:grid-cols-4 gap-12 mb-20">
                    <div className="col-span-1 md:col-span-1">
                        <span className="text-2xl font-headline font-black tracking-tight mb-8 block">Azure Horizon</span>
                        <p className="text-slate-400 text-sm leading-relaxed">
                            Tái định nghĩa kiến trúc của du lịch hiện đại. Trải nghiệm toàn cầu, tâm hồn bản địa.
                        </p>
                    </div>
                    <div>
                        <h4 className="font-headline font-bold mb-6">Discover</h4>
                        <ul className="space-y-4 text-sm text-slate-400">
                            <li><a className="hover:text-white transition-colors" href="#">Destinations</a></li>
                            <li><a className="hover:text-white transition-colors" href="#">Experiences</a></li>
                            <li><a className="hover:text-white transition-colors" href="#">Group Tours</a></li>
                            <li><a className="hover:text-white transition-colors" href="#">Private Charters</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-headline font-bold mb-6">Support</h4>
                        <ul className="space-y-4 text-sm text-slate-400">
                            <li><a className="hover:text-white transition-colors" href="#">Travel Insurance</a></li>
                            <li><a className="hover:text-white transition-colors" href="#">Visa Assistance</a></li>
                            <li><a className="hover:text-white transition-colors" href="#">Contact Concierge</a></li>
                            <li><a className="hover:text-white transition-colors" href="#">FAQs</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-headline font-bold mb-6">Journal</h4>
                        <p className="text-sm text-slate-400 mb-4">Đăng ký để nhận ấn phẩm hàng tháng về du lịch và văn hóa.</p>
                        <div className="flex">
                            <input className="bg-white/10 border-none rounded-l-lg px-4 py-3 w-full text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Email address" type="email" />
                            <button className="bg-primary px-5 py-3 rounded-r-lg hover:bg-primary-container transition-colors">
                                <span className="material-symbols-outlined text-sm">send</span>
                            </button>
                        </div>
                    </div>
                </div>
                <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-6">
                    <p className="text-xs text-slate-500">© 2026 Azure Horizon. All rights reserved.</p>
                    <div className="flex gap-6">
                        <a className="text-slate-500 hover:text-white transition-colors" href="#"><span className="material-symbols-outlined text-lg">public</span></a>
                        <a className="text-slate-500 hover:text-white transition-colors" href="#"><span className="material-symbols-outlined text-lg">camera_alt</span></a>
                        <a className="text-slate-500 hover:text-white transition-colors" href="#"><span className="material-symbols-outlined text-lg">movie</span></a>
                    </div>
                </div>
            </div>
        </footer>
    );
}