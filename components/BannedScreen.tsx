import React, { useState } from 'react';
import { ShieldIcon, LogoutIcon, SendIcon } from './icons/Icons';
import { auth } from '../firebaseClient';
import { signOut } from 'firebase/auth';

const BannedScreen: React.FC = () => {
    const [reason, setReason] = useState('');
    const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

    const handleAppeal = async () => {
        if (!reason.trim()) return;
        setStatus('sending');
        try {
            const token = await auth.currentUser?.getIdToken();
            const res = await fetch(`${API_BASE_URL}/appeals`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ reason })
            });
            if (res.ok) setStatus('sent');
            else setStatus('error');
        } catch {
            setStatus('error');
        }
    };

    return (
        <div className="min-h-screen bg-bright-red flex flex-col items-center justify-center p-6 font-grotesk overflow-hidden relative">
            {/* Background Static Noise / Text */}
            <div className="absolute inset-0 opacity-10 pointer-events-none overflow-hidden select-none font-mono text-[8px] leading-none break-all text-white">
                {"BANNED_USER ".repeat(5000)}
            </div>

            <div className="relative z-10 w-full max-w-2xl text-center space-y-8 animate-in slide-in-from-bottom-12 duration-1000">
                <div className="inline-block p-10 bg-black border-8 border-white shadow-[20px_20px_0px_0px_rgba(255,255,255,1)]">
                    <h1 className="text-9xl font-black text-white leading-none">EXTERMINATED</h1>
                </div>

                <div className="bg-black text-white p-8 border-8 border-white shadow-hard text-left space-y-6">
                    <h2 className="text-4xl font-black uppercase tracking-tighter text-bright-red">Access Permanently Revoked</h2>
                    <p className="font-mono text-lg opacity-80">
                        This account has been flagged for violation of the FocusForge integrity protocols. All synchronization capabilities have been severed.
                    </p>

                    <div className="space-y-4">
                        <label className="block text-xs font-black uppercase tracking-[0.3em] text-acid-green">Submit_Appeal_Statement</label>
                        {status === 'sent' ? (
                            <div className="p-8 border-4 border-acid-green bg-acid-green/10 text-acid-green font-black uppercase text-center animate-bounce">
                                Appeal_Transmitted_Successfully. Waiting_For_Overseer_Decision.
                            </div>
                        ) : (
                            <>
                                <textarea
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    placeholder="STATE_YOUR_CASE_OR_REMAIN_EXILED"
                                    className="w-full h-32 p-4 bg-gray-900 border-4 border-white text-white font-mono placeholder:opacity-30 outline-none focus:border-acid-green transition-colors resize-none"
                                />
                                <button
                                    onClick={handleAppeal}
                                    disabled={status === 'sending' || !reason.trim()}
                                    className="w-full py-6 bg-white text-black font-black uppercase text-xl hover:bg-acid-green transition-all shadow-hard-sm flex items-center justify-center gap-4 disabled:opacity-50"
                                >
                                    {status === 'sending' ? 'TRANSMITTING...' : (
                                        <>
                                            <SendIcon className="w-6 h-6" />
                                            INITIATE_PARDON_PROTOCOL
                                        </>
                                    )}
                                </button>
                                {status === 'error' && <p className="text-white text-xs font-black uppercase text-center">Transmission_Failed. Try_Again.</p>}
                            </>
                        )}
                    </div>
                </div>

                <button
                    onClick={() => signOut(auth)}
                    className="group flex items-center gap-3 text-xl font-black uppercase text-white hover:text-black transition-colors mx-auto"
                >
                    <LogoutIcon className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                    DISCONNECT_CORE
                </button>
            </div>
        </div>
    );
};

export default BannedScreen;
