
import React from 'react';
import { auth } from '../firebaseClient';
import { useToast } from './Toast';
import {
    FolderIcon, FileTextIcon, ArrowLeftIcon, BookOpenIcon
} from './icons/Icons';
import PDFViewer from './PDFViewer';

const VaultView: React.FC = () => {
    const [currentFolder, setCurrentFolder] = React.useState<number | null>(null);
    const [folders, setFolders] = React.useState<any[]>([]);
    const [books, setBooks] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [path, setPath] = React.useState<{ id: number | null, name: string }[]>([{ id: null, name: 'Library' }]);
    const [viewingBook, setViewingBook] = React.useState<any | null>(null);

    const [showRequestModal, setShowRequestModal] = React.useState(false);
    const [requestTitle, setRequestTitle] = React.useState('');
    const [requestAuthor, setRequestAuthor] = React.useState('');
    const [requestDesc, setRequestDesc] = React.useState('');
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
    const user = auth.currentUser;
    const { showToast } = useToast();

    const fetchContent = async (folderId: number | null) => {
        setLoading(true);
        try {
            const token = await user?.getIdToken();
            const [fRes, bRes] = await Promise.all([
                fetch(`${API_BASE_URL}/books/folders?parentId=${folderId === null ? 'null' : folderId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                folderId !== null ? fetch(`${API_BASE_URL}/books?folderId=${folderId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }) : Promise.resolve({ ok: true, json: () => Promise.resolve([]) } as any)
            ]);

            if (fRes.ok && bRes.ok) {
                setFolders(await fRes.json());
                setBooks(await bRes.json());
            }
        } catch (err) {
            console.error("Failed to fetch vault content", err);
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        fetchContent(currentFolder);
    }, [currentFolder]);

    const navigateTo = (id: number | null, name: string) => {
        if (id === currentFolder) return;

        if (id === null) {
            setPath([{ id: null, name: 'Library' }]);
        } else {
            const existingIdx = path.findIndex(p => p.id === id);
            if (existingIdx !== -1) {
                setPath(path.slice(0, existingIdx + 1));
            } else {
                setPath([...path, { id, name }]);
            }
        }
        setCurrentFolder(id);
    };

    const handleRequestSubmit = async () => {
        if (!requestTitle.trim()) return;
        setIsSubmitting(true);
        try {
            const token = await user?.getIdToken();
            const res = await fetch(`${API_BASE_URL}/books/requests`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title: requestTitle,
                    author: requestAuthor,
                    description: requestDesc
                })
            });
            if (res.ok) {
                setShowRequestModal(false);
                setRequestTitle('');
                setRequestAuthor('');
                setRequestDesc('');
                showToast('Request sent!', 'success');
            }
        } catch (err) {
            showToast('Could not send request', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const getOptimalLink = (book: any) => {
        const allLinks = [book.pdf_url, book.pdf_url_alt, ...(book.mirrors || [])].filter(Boolean);
        if (allLinks.length === 0) return null;

        const getProvider = (url: string) => {
            if (url.includes('catbox.moe')) return 'catbox';
            if (url.includes('kappa.lol')) return 'kappa';
            if (url.includes('fileditch.com')) return 'fileditch';
            return 'other';
        };

        // If a primary source is explicitly set, try to find it
        if (book.primary_source) {
            const primary = allLinks.find(l => getProvider(l) === book.primary_source);
            if (primary) return primary;
        }

        // Default priority: Catbox > Kappa > Fileditch
        const priority = ['catbox', 'kappa', 'fileditch'];
        for (const p of priority) {
            const found = allLinks.find(l => getProvider(l) === p);
            if (found) return found;
        }

        return allLinks[0];
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-2">
                    <h1 className="text-5xl md:text-6xl font-grotesk font-black uppercase tracking-tighter">
                        Knowledge <span className="text-neon-purple underline decoration-8 decoration-black dark:decoration-white underline-offset-8">Vault</span>
                    </h1>
                    <p className="font-mono text-sm font-bold opacity-50 uppercase tracking-[0.3em]">Access Restricted Archive_v2.0</p>
                </div>

                <button
                    onClick={() => setShowRequestModal(true)}
                    className="group relative px-8 py-4 bg-acid-green text-black border-4 border-black font-grotesk font-black uppercase hover:shadow-hard hover:-translate-y-1 transition-all"
                >
                    Request_Book
                    <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity"></div>
                </button>
            </div>

            {/* Path Navigator */}
            <nav className="flex items-center gap-2 font-mono font-bold text-lg p-5 bg-gray-50 dark:bg-gray-950 border-4 border-black dark:border-white rounded-none shadow-hard-sm overflow-x-auto whitespace-nowrap scrollbar-hide">
                {path.map((p, i) => (
                    <React.Fragment key={p.id}>
                        {i > 0 && <span className="opacity-20 mx-2 text-2xl font-light">›</span>}
                        <button
                            onClick={() => navigateTo(p.id, p.name)}
                            className={`transition-all ${currentFolder === p.id ? 'text-neon-purple scale-110' : 'opacity-40 hover:opacity-100 hover:text-neon-purple'}`}
                        >
                            {p.name.toUpperCase()}
                        </button>
                    </React.Fragment>
                ))}
            </nav>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-32 space-y-6">
                    <div className="w-20 h-20 border-8 border-black dark:border-white border-t-neon-purple rounded-full animate-spin"></div>
                    <p className="font-grotesk font-black text-3xl animate-pulse">DECRYPTING_ARCHIVE...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {/* Back to Parent */}
                    {currentFolder !== null && (
                        <div
                            onClick={() => {
                                const parentPath = path[path.length - 2];
                                navigateTo(parentPath.id, parentPath.name);
                            }}
                            className="p-8 bg-gray-100 dark:bg-gray-900 border-4 border-black dark:border-white rounded-none shadow-hard hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all cursor-pointer flex flex-col items-center justify-center gap-4 group border-dashed"
                        >
                            <ArrowLeftIcon className="w-16 h-16 opacity-30 group-hover:opacity-100 group-hover:text-neon-purple transition-all" />
                            <span className="font-grotesk font-black text-xl">RETURN</span>
                        </div>
                    )}

                    {/* Folders */}
                    {folders.map(folder => (
                        <div
                            key={folder.id}
                            onClick={() => navigateTo(folder.id, folder.name)}
                            className="p-8 bg-white dark:bg-gray-800 border-4 border-black dark:border-white rounded-none shadow-hard hover:-translate-y-1 hover:-translate-x-1 hover:shadow-hard-lg transition-all cursor-pointer group flex flex-col gap-6 relative overflow-hidden"
                        >
                            <div className="absolute -right-4 -top-4 w-24 h-24 bg-yellow-400 opacity-5 rounded-full group-hover:scale-150 transition-transform"></div>
                            <FolderIcon className="w-20 h-20 text-yellow-500 fill-yellow-500 group-hover:rotate-12 transition-transform" />
                            <div className="space-y-1">
                                <h3 className="font-grotesk font-black text-2xl uppercase truncate">{folder.name}</h3>
                                <div className="h-2 w-12 bg-neon-purple"></div>
                            </div>
                        </div>
                    ))}

                    {/* Books */}
                    {books.map(book => (
                        <div
                            key={book.id}
                            onClick={() => setViewingBook({ ...book, url: getOptimalLink(book) })}
                            className="p-8 bg-white dark:bg-gray-800 border-4 border-black dark:border-white rounded-none shadow-hard hover:-translate-y-2 transition-all cursor-pointer group relative overflow-hidden flex flex-col gap-6"
                        >
                            <div className="absolute top-0 right-0 p-3 bg-neon-purple border-l-4 border-b-4 border-black dark:border-white font-mono text-xs text-white font-black uppercase z-10 tracking-widest">
                                OPEN
                            </div>
                            <div className="flex justify-between items-start">
                                <FileTextIcon className="w-16 h-16 text-electric-blue group-hover:scale-110 transition-transform" />
                                <div className="flex flex-wrap gap-2 justify-end max-w-[50%]">
                                    {book.grade && <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-900 border-2 border-black rounded text-[10px] font-black uppercase">{book.grade}</span>}
                                    {book.exam && <span className="px-2 py-0.5 bg-neon-purple text-white border-2 border-black rounded text-[10px] font-black uppercase shadow-hard-sm">{book.exam}</span>}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <h3 className="font-grotesk font-black text-2xl uppercase leading-none line-clamp-3">{book.title}</h3>
                                <div className="flex items-center gap-2">
                                    {book.subject && <span className="text-xs font-black text-acid-green uppercase">{book.subject}</span>}
                                    {book.author && (
                                        <p className="font-mono text-[10px] font-bold opacity-40 uppercase tracking-widest truncate">
                                            AUTH://{book.author}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}

                    {folders.length === 0 && books.length === 0 && currentFolder === null && (
                        <div className="col-span-full border-8 border-dashed border-black dark:border-white p-32 text-center opacity-20">
                            <BookOpenIcon className="w-40 h-40 mx-auto mb-8" />
                            <p className="text-4xl font-black uppercase italic tracking-tighter">The Vault is currently sealed.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Secure PDF Viewer */}
            {viewingBook && (
                <PDFViewer
                    url={viewingBook.url}
                    title={viewingBook.title}
                    onClose={() => setViewingBook(null)}
                    bookId={viewingBook.id}
                />
            )}

            {/* Request Modal */}
            {showRequestModal && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-2xl animate-in fade-in duration-300"
                >
                    <div className="w-full max-w-lg bg-white dark:bg-gray-900 border-8 border-black dark:border-white p-10 shadow-hard animate-in zoom-in-95 duration-200">
                        <h2 className="text-4xl font-grotesk font-black uppercase mb-8 text-neon-purple italic">Log Request</h2>
                        <div className="space-y-6">
                            <div>
                                <label className="block text-xs font-black uppercase mb-2 opacity-40">Book Title *</label>
                                <input
                                    type="text"
                                    placeholder="e.g. HC Verma Concepts of Physics"
                                    value={requestTitle}
                                    onChange={e => setRequestTitle(e.target.value)}
                                    className="w-full p-4 border-4 border-black dark:border-white bg-gray-50 dark:bg-gray-950 focus:outline-none focus:ring-8 focus:ring-neon-purple font-bold font-mono"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black uppercase mb-2 opacity-40">Author (Optional)</label>
                                <input
                                    type="text"
                                    placeholder="Author Name"
                                    value={requestAuthor}
                                    onChange={e => setRequestAuthor(e.target.value)}
                                    className="w-full p-4 border-4 border-black dark:border-white bg-gray-50 dark:bg-gray-950 focus:outline-none focus:ring-4 focus:ring-neon-purple font-mono"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black uppercase mb-2 opacity-40">Additional Notes</label>
                                <textarea
                                    placeholder="Specific Edition, Volume, etc."
                                    rows={3}
                                    value={requestDesc}
                                    onChange={e => setRequestDesc(e.target.value)}
                                    className="w-full p-4 border-4 border-black dark:border-white bg-gray-50 dark:bg-gray-950 focus:outline-none focus:ring-4 focus:ring-neon-purple font-mono resize-none"
                                />
                            </div>
                        </div>
                        <div className="flex gap-4 mt-12">
                            <button
                                onClick={() => setShowRequestModal(false)}
                                disabled={isSubmitting}
                                className="flex-1 p-5 border-4 border-black dark:border-white font-black uppercase hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            >
                                CLOSE
                            </button>
                            <button
                                onClick={handleRequestSubmit}
                                disabled={isSubmitting || !requestTitle}
                                className="flex-1 p-5 bg-neon-purple text-white border-4 border-black dark:border-white shadow-hard hover:translate-y-1 active:translate-y-0 font-black uppercase"
                            >
                                {isSubmitting ? 'LOGGING...' : 'SUBMIT_REQ'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
};

export default VaultView;
