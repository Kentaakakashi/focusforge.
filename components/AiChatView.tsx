import React, { useState, useRef, useEffect } from 'react';
import { SendIcon, SparklesIcon } from './icons/Icons';
import { auth } from '../firebaseClient';

type ChatMessage = {
    id: string;
    role: 'user' | 'ai';
    text: string;
};

const WELCOME_MSG: ChatMessage = {
    id: 'welcome',
    role: 'ai',
    text: "Hello! I'm your AI Study Tutor. Ask me any questions about your syllabus, concepts, or study plans!"
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const AiChatView: React.FC = () => {
    const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MSG]);
    const [inputText, setInputText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const isUserScrollingRef = useRef(false);

    // Load history from DB on mount
    useEffect(() => {
        const loadHistory = async () => {
            try {
                const user = auth.currentUser;
                if (!user) { setIsLoadingHistory(false); return; }
                const token = await user.getIdToken();
                const res = await fetch(`${API_BASE_URL}/ai/history`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const history: ChatMessage[] = await res.json();
                    setMessages(history.length > 0 ? history : [WELCOME_MSG]);
                }
            } catch (err) {
                console.error('Failed to load AI chat history:', err);
            } finally {
                setIsLoadingHistory(false);
            }
        };
        loadHistory();
    }, []);

    const scrollToBottom = () => {
        const container = messagesContainerRef.current;
        if (!container) return;
        const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
        if (isAtBottom || !isUserScrollingRef.current) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    };

    useEffect(() => {
        if (!isLoadingHistory) scrollToBottom();
    }, [messages, isTyping, isLoadingHistory]);

    const handleScroll = () => {
        const container = messagesContainerRef.current;
        if (!container) return;
        const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
        isUserScrollingRef.current = !isAtBottom;
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputText.trim() || isTyping) return;

        isUserScrollingRef.current = false;

        const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: inputText.trim() };
        setMessages(prev => [...prev, userMsg]);
        setInputText('');
        setIsTyping(true);

        try {
            const user = auth.currentUser;
            const token = user ? await user.getIdToken() : '';

            const res = await fetch(`${API_BASE_URL}/ai/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    message: userMsg.text,
                    contextHistory: messages.map(m => ({ role: m.role, text: m.text }))
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Request failed');

            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'ai', text: data.reply }]);
        } catch (err: any) {
            console.error('AI Chat Error:', err);
            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'ai', text: `[Error]: ${err.message}` }]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleClearChat = async () => {
        try {
            const user = auth.currentUser;
            if (!user) return;
            const token = await user.getIdToken();
            await fetch(`${API_BASE_URL}/ai/history`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setMessages([WELCOME_MSG]);
        } catch (err) {
            console.error('Failed to clear AI chat history:', err);
        }
    };

    return (
        <div className="max-w-4xl mx-auto h-[80vh] flex flex-col bg-white dark:bg-dark-bg border-4 border-black dark:border-white rounded-lg shadow-hard overflow-hidden font-grotesk">
            {/* Header */}
            <div className="bg-electric-blue text-white p-4 border-b-4 border-black dark:border-white flex items-center gap-3">
                <SparklesIcon className="w-8 h-8 text-acid-green" />
                <div className="flex-grow">
                    <h1 className="text-2xl font-black">AI Tutor</h1>
                    <p className="text-sm opacity-90 font-medium">Your personal 24/7 study companion</p>
                </div>
                <button
                    onClick={handleClearChat}
                    className="px-3 py-1 text-xs font-black uppercase border-2 border-white rounded-lg hover:bg-white/20 transition-all"
                    title="Clear chat history"
                >
                    Clear
                </button>
            </div>

            {/* Messages Area */}
            <div
                ref={messagesContainerRef}
                onScroll={handleScroll}
                className="flex-grow p-4 overflow-y-auto space-y-4"
            >
                {isLoadingHistory ? (
                    <div className="flex justify-center items-center h-full opacity-50">
                        <div className="w-8 h-8 border-4 border-electric-blue border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-2xl p-4 border-2 shadow-hard-sm ${msg.role === 'user'
                            ? 'bg-acid-green text-black border-black dark:border-white rounded-br-none'
                            : 'bg-gray-100 dark:bg-gray-800 text-black dark:text-white border-black dark:border-white rounded-bl-none'
                            }`}>
                            {msg.role === 'ai' && <div className="font-black text-xs uppercase mb-1 flex items-center gap-1"><SparklesIcon className="w-4 h-4" /> AI Tutor</div>}
                            {msg.role === 'user' && <div className="font-black text-xs uppercase mb-1 opacity-70">You</div>}
                            <div className="prose dark:prose-invert max-w-none text-sm leading-relaxed whitespace-pre-wrap font-sans">
                                {msg.text}
                            </div>
                        </div>
                    </div>
                ))}
                {isTyping && (
                    <div className="flex justify-start">
                        <div className="bg-gray-100 dark:bg-gray-800 border-2 border-black dark:border-white rounded-2xl rounded-bl-none p-4 shadow-hard-sm">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-electric-blue rounded-full animate-bounce"></div>
                                <div className="w-2 h-2 bg-bright-red rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                <div className="w-2 h-2 bg-acid-green rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t-4 border-black dark:border-white bg-white dark:bg-dark-bg">
                <form onSubmit={handleSend} className="flex gap-2 relative">
                    <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="Ask a study question..."
                        disabled={isTyping || isLoadingHistory}
                        className="flex-grow p-4 rounded-xl border-4 border-black dark:border-white focus:outline-none focus:ring-4 focus:ring-electric-blue/50 text-black dark:text-white bg-white dark:bg-gray-800 font-bold transition-all disabled:opacity-50 font-sans"
                    />
                    <button
                        type="submit"
                        disabled={isTyping || !inputText.trim() || isLoadingHistory}
                        className="p-4 bg-black dark:bg-white text-white dark:text-black rounded-xl border-4 border-transparent hover:border-acid-green transition-all shadow-hard-sm disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                    >
                        <SendIcon className="w-6 h-6" />
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AiChatView;
