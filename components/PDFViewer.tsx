
import React from 'react';
import { auth } from '../firebaseClient';

interface PDFViewerProps {
    url: string;
    title: string;
    onClose: () => void;
    bookId: number;
}

const PDFViewer: React.FC<PDFViewerProps> = ({ url, title, onClose, bookId }) => {
    const [note, setNote] = React.useState('');
    const [isSaving, setIsSaving] = React.useState(false);
    const [showNotes, setShowNotes] = React.useState(false);
    const [isFullscreen, setIsFullscreen] = React.useState(false);
    const containerRef = React.useRef<HTMLDivElement>(null);

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
    const user = auth.currentUser;

    React.useEffect(() => {
        const fetchNote = async () => {
            try {
                const token = await user?.getIdToken();
                const res = await fetch(`${API_BASE_URL}/books/${bookId}/note`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setNote(data.content || '');
                }
            } catch (err) {
                console.error("Failed to fetch notes", err);
            }
        };
        fetchNote();
    }, [bookId]);

    const handleSaveNote = async () => {
        setIsSaving(true);
        try {
            const token = await user?.getIdToken();
            await fetch(`${API_BASE_URL}/books/${bookId}/note`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ content: note })
            });
        } catch (err) {
            console.error("Failed to save note", err);
        } finally {
            setIsSaving(false);
        }
    };

    // Auto-save debouncing
    React.useEffect(() => {
        const timer = setTimeout(() => {
            if (note) handleSaveNote();
        }, 1500);
        return () => clearTimeout(timer);
    }, [note]);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-black/60 backdrop-blur-xl animate-in fade-in duration-300"
            style={{ backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
        >
            <div
                ref={containerRef}
                className={`w-full h-full max-w-7xl bg-white dark:bg-gray-900 border-8 border-black dark:border-white rounded-lg shadow-hard flex flex-col overflow-hidden transition-all ${isFullscreen ? 'p-0 border-0' : ''}`}
            >
                {/* Header */}
                <div className="p-4 bg-neon-purple border-b-8 border-black dark:border-white flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-4 flex-1 truncate">
                        <h2 className="text-2xl font-grotesk font-black text-white uppercase truncate">
                            {title}
                        </h2>
                        <button
                            onClick={toggleFullscreen}
                            className="hidden md:block px-3 py-1 bg-white text-black border-2 border-black font-black text-[10px] uppercase hover:-translate-y-0.5 shadow-hard-sm"
                        >
                            {isFullscreen ? 'EXIT_FULL' : 'GO_FULL'}
                        </button>
                        <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1 bg-electric-blue text-white border-2 border-black font-black text-[10px] uppercase hover:-translate-y-0.5 shadow-hard-sm"
                        >
                            DIRECT_LINK [↗]
                        </a>
                    </div>

                    <div className="flex gap-4">
                        <button
                            onClick={() => setShowNotes(!showNotes)}
                            className={`px-4 py-2 border-4 border-black font-black transition-all ${showNotes ? 'bg-acid-green text-black' : 'bg-white text-black hover:bg-gray-100'}`}
                        >
                            {showNotes ? 'HIDE_NOTES' : 'MY_NOTES'}
                        </button>
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-bright-red text-white border-4 border-black shadow-hard-sm hover:-translate-y-1 transition-all font-black"
                        >
                            CLOSE [X]
                        </button>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-grow flex overflow-hidden">
                    {/* Viewer Container */}
                    <div className="flex-grow relative bg-gray-100 dark:bg-gray-800">
                        <iframe
                            src={`https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`}
                            title={title}
                            className="w-full h-full border-none"
                        />
                    </div>

                    {/* Notes Sidebar */}
                    {showNotes && (
                        <div className="w-80 md:w-96 border-l-8 border-black dark:border-white bg-white dark:bg-gray-900 flex flex-col shrink-0 animate-in slide-in-from-right duration-300">
                            <div className="p-4 border-b-4 border-black dark:border-white bg-gray-50 dark:bg-black font-grotesk font-black uppercase flex justify-between items-center">
                                <span>Notebook</span>
                                {isSaving ? (
                                    <span className="text-[10px] text-neon-purple animate-pulse">Saving...</span>
                                ) : (
                                    <span className="text-[10px] text-acid-green opacity-50">Saved</span>
                                )}
                            </div>
                            <textarea
                                value={note}
                                onChange={e => setNote(e.target.value)}
                                placeholder="Type your personal notes here... they are saved automatically."
                                className="flex-grow p-6 font-mono text-sm bg-transparent focus:outline-none resize-none leading-relaxed dark:text-white"
                            />
                        </div>
                    )}
                </div>

                {/* Footer info */}
                {!isFullscreen && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 border-t-8 border-black dark:border-white flex justify-between items-center font-mono text-xs font-bold shrink-0">
                        <p className="opacity-50 uppercase tracking-widest">FocusForge Reader v2.0 // Secured</p>
                        <div className="flex gap-4">
                            <p className="text-neon-purple uppercase">Path: /vault/{title.replace(/\s+/g, '_')}</p>
                            <p className="text-electric-blue uppercase">Connection_Live</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PDFViewer;
