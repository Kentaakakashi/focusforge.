import React from 'react';
import { ShieldIcon, LogoutIcon } from './icons/Icons';
import { auth } from '../firebaseClient';
import { signOut } from 'firebase/auth';

interface GatekeeperScreenProps {
    status: 'pending' | 'waitlisted';
}

const GatekeeperScreen: React.FC<GatekeeperScreenProps> = ({ status }) => {
    return (
        <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col items-center justify-center p-6 font-grotesk overflow-hidden relative">
            {/* Background Decorative Elements */}
            <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-electric-blue rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-acid-green rounded-full blur-[120px]" />
            </div>

            <div className="relative z-10 w-full max-w-2xl text-center space-y-8 animate-in fade-in zoom-in duration-700">
                <div className="inline-block p-8 bg-black border-8 border-black shadow-[20px_20px_0px_0px_rgba(173,255,47,1)] mb-4">
                    <ShieldIcon className="w-24 h-24 text-acid-green animate-pulse" />
                </div>

                <div className="space-y-4">
                    <h1 className="text-6xl md:text-8xl font-black uppercase tracking-tighter leading-none">
                        Access <span className="text-electric-blue">Denied</span>
                    </h1>
                    <div className="h-4 bg-black w-full" />
                    <p className="text-2xl font-black uppercase tracking-widest bg-acid-green text-black inline-block px-4 py-2">
                        Protocol: {status === 'pending' ? 'Verification_Required' : 'Waitlist_Active'}
                    </p>
                </div>

                <div className="p-8 border-8 border-black dark:border-white bg-white dark:bg-gray-900 shadow-hard space-y-6 text-left">
                    <p className="font-mono text-lg leading-relaxed">
                        Your identification is currently being processed by the system overseers. Access to the FocusForge core is restricted until manual clearance is granted.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 border-4 border-black dark:border-white bg-gray-50 dark:bg-black/40">
                            <p className="text-xs font-black uppercase opacity-50 mb-1">Queue_Position</p>
                            <p className="text-3xl font-black font-mono">#SYNC_PENDING</p>
                        </div>
                        <div className="p-4 border-4 border-black dark:border-white bg-gray-50 dark:bg-black/40">
                            <p className="text-xs font-black uppercase opacity-50 mb-1">Security_Level</p>
                            <p className="text-3xl font-black font-mono">LEVEL_0</p>
                        </div>
                    </div>

                    <div className="pt-4 flex flex-col md:flex-row gap-4">
                        <input
                            type="text"
                            placeholder="ENTER_REFERRAL_CODE"
                            className="flex-grow p-4 border-4 border-black dark:border-white bg-white dark:bg-gray-950 font-black uppercase text-center focus:ring-4 focus:ring-electric-blue outline-none transition-all"
                        />
                        <button className="px-8 py-4 bg-black text-white border-4 border-black font-black uppercase hover:bg-white hover:text-black transition-all shadow-hard-sm">
                            BYPASS
                        </button>
                    </div>
                </div>

                <button
                    onClick={() => signOut(auth)}
                    className="group flex items-center gap-3 text-xl font-black uppercase hover:text-bright-red transition-colors mx-auto"
                >
                    <LogoutIcon className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                    Abort_Session
                </button>
            </div>
        </div>
    );
};

export default GatekeeperScreen;
