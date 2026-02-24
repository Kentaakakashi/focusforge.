import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AreaChart, Area } from 'recharts'; // Added AreaChart and Area for the new chart type
import { auth } from '../firebaseClient';
import {
    UsersIcon, ChatIcon, ShieldIcon,
    TrashIcon, TrendingUpIcon, GroupIcon,
    FolderIcon, FileTextIcon, PlusIcon, ArrowLeftIcon, EditIcon,
    MusicIcon
} from './icons/Icons';
import PDFViewer from './PDFViewer';
import { useToast } from './Toast';

interface AdminStats {
    totalUsers: number;
    activeToday: number;
    groups: number;
    dailyUsers: { name: string; users: number }[];
}

interface AdminUser {
    id: string;
    name: string;
    avatar: string;
    is_verified: boolean;
    is_admin: boolean;
    registration_status: string;
}

const AdminView: React.FC = () => {
    const [activeTab, setActiveTab] = React.useState<'overview' | 'users' | 'moderation' | 'groups' | 'books' | 'requests' | 'access' | 'appeals'>('overview');
    const [stats, setStats] = React.useState<AdminStats | null>(null);
    const [users, setUsers] = React.useState<AdminUser[]>([]);
    const [messages, setMessages] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const user = auth.currentUser;
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
    const { showToast } = useToast();

    const fetchData = async () => {
        if (!user) {
            setLoading(false);
            return;
        }
        try {
            const token = await user.getIdToken();
            const [statsRes, usersRes] = await Promise.all([
                fetch(`${API_BASE_URL}/admin/stats`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_BASE_URL}/admin/users`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            if (!statsRes.ok || !usersRes.ok) {
                const errData = await (!statsRes.ok ? statsRes : usersRes).json();
                throw new Error(errData.error || "Permission Denied (403/500)");
            }

            const [statsData, usersData] = await Promise.all([
                statsRes.json(),
                usersRes.json()
            ]);

            // Fetch global messages for moderation
            const msgRes = await fetch(`${API_BASE_URL}/chat/channels/global/messages`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const msgData = await msgRes.json();

            setStats(statsData);
            setUsers(Array.isArray(usersData) ? usersData : []);
            setMessages(Array.isArray(msgData) ? msgData : []);
            setError(null);
        } catch (err: any) {
            console.error("Failed to fetch admin data:", err);
            setError(err.message || "Failed to sync with HQ.");
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        fetchData();
    }, [user]);

    const handleDeleteMessage = async (id: number) => {
        if (!user) return;
        if (!confirm("Are you sure you want to delete this message?")) return;
        try {
            const token = await user.getIdToken();
            const res = await fetch(`${API_BASE_URL}/admin/chat/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setMessages(prev => prev.filter(m => m.id !== id));
            } else {
                showToast('Could not delete message', 'error');
            }
        } catch (err) {
            console.error("Delete failed:", err);
        }
    };

    const handleUpdateUserStatus = async (userId: string, status: string) => {
        if (!user) return;
        try {
            const token = await user.getIdToken();
            const res = await fetch(`${API_BASE_URL}/admin/users/${userId}/status`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status })
            });
            if (res.ok) {
                setUsers(prev => prev.map(u => u.id === userId ? { ...u, registration_status: status } : u));
            }
        } catch (err) {
            console.error("Status update failed:", err);
        }
    };

    const handleDisbandGroup = async (id: number) => {
        if (!user) return;
        try {
            const token = await user.getIdToken();
            const res = await fetch(`${API_BASE_URL}/admin/group/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) showToast('Group disbanded', 'success');
        } catch (err) {
            console.error("Disband failed:", err);
        }
    };

    const handleVerifySolver = async (userId: string) => {
        if (!user) return;
        try {
            const token = await user.getIdToken();
            const res = await fetch(`${API_BASE_URL}/admin/verify-solver/${userId}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                showToast('User verified as solver!', 'success');
                fetchData();
            }
        } catch (err) {
            console.error("Verification failed:", err);
        }
    };

    if (loading) return <div className="p-12 text-center font-grotesk text-2xl animate-pulse">Scanning Neural Network...</div>;

    if (error) return (
        <div className="p-12 text-center space-y-6">
            <div className="p-8 border-4 border-black bg-bright-red text-white font-bold text-2xl shadow-hard">
                SYSTEM ACCESS DENIED: {error}
            </div>
            <button
                onClick={() => { setLoading(true); fetchData(); }}
                className="p-4 bg-white border-4 border-black font-bold shadow-hard hover:-translate-y-1 transition text-black"
            >
                RETRY CONNECTION
            </button>
        </div>
    );

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <h1 className="text-4xl md:text-5xl font-grotesk font-bold">Admin Panel</h1>

                {/* Tab Bar */}
                <div className="flex bg-gray-100 dark:bg-gray-800 p-1 border-4 border-black dark:border-white rounded-lg shadow-hard-sm overflow-x-auto whitespace-nowrap">
                    {(['overview', 'users', 'moderation', 'groups', 'books', 'requests', 'access', 'appeals'] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-6 py-2 font-grotesk font-black uppercase transition-all ${activeTab === tab
                                ? 'bg-black text-white dark:bg-white dark:text-black shadow-none'
                                : 'hover:bg-gray-200 dark:hover:bg-gray-700'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            {activeTab === 'overview' && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="p-6 bg-white dark:bg-gray-800 border-4 border-black dark:border-white rounded-lg shadow-hard dark:shadow-hard-dark">
                            <h3 className="text-gray-500 font-bold uppercase text-sm mb-2">Total Users</h3>
                            <p className="text-5xl font-mono font-bold text-electric-blue">{stats?.totalUsers || 0}</p>
                        </div>
                        <div className="p-6 bg-white dark:bg-gray-800 border-4 border-black dark:border-white rounded-lg shadow-hard dark:shadow-hard-dark">
                            <h3 className="text-gray-500 font-bold uppercase text-sm mb-2">Active Today</h3>
                            <p className="text-5xl font-mono font-bold text-acid-green">{stats?.activeToday || 0}</p>
                        </div>
                        <div className="p-6 bg-white dark:bg-gray-800 border-4 border-black dark:border-white rounded-lg shadow-hard dark:shadow-hard-dark">
                            <h3 className="text-gray-500 font-bold uppercase text-sm mb-2">Study Groups</h3>
                            <p className="text-5xl font-mono font-bold text-bright-red">{stats?.groups || 0}</p>
                        </div>
                    </div>

                    <div className="p-6 bg-white dark:bg-gray-800 border-4 border-black dark:border-white rounded-lg shadow-hard dark:shadow-hard-dark flex flex-col h-[400px]">
                        <h3 className="text-2xl font-grotesk font-bold mb-6">User Growth (Last 7 Days)</h3>
                        <div className="flex-grow min-h-0 w-full relative">
                            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                <AreaChart data={stats?.dailyUsers || []}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={document.documentElement.classList.contains('dark') ? '#4A4A4A' : '#E0E0E0'} />
                                    <XAxis dataKey="name" tick={{ fill: document.documentElement.classList.contains('dark') ? 'white' : 'black', fontFamily: 'Space Grotesk' }} />
                                    <YAxis tick={{ fill: document.documentElement.classList.contains('dark') ? 'white' : 'black', fontFamily: 'Space Grotesk' }} />
                                    <Tooltip contentStyle={{ backgroundColor: document.documentElement.classList.contains('dark') ? '#333' : '#fff', border: '2px solid black' }} cursor={{ fill: 'rgba(138, 43, 226, 0.2)' }} />
                                    <Area type="monotone" dataKey="users" stroke="#0070f3" fill="#0070f3" fillOpacity={0.2} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </>
            )}

            {activeTab === 'users' && (
                <div className="p-6 bg-white dark:bg-gray-800 border-4 border-black dark:border-white rounded-lg shadow-hard dark:shadow-hard-dark">
                    <h2 className="font-grotesk text-2xl font-bold mb-4">User Management</h2>
                    <input type="text" placeholder="Search users..." className="w-full p-3 mb-4 text-lg bg-white dark:bg-gray-900 border-4 border-black dark:border-white rounded-lg focus:outline-none focus:ring-4 focus:ring-neon-purple" />
                    <div className="space-y-4">
                        {users.map((u) => (
                            <div key={u.id} className="p-4 bg-white dark:bg-gray-800 border-4 border-black dark:border-white rounded-lg flex items-center gap-4">
                                <img src={u.avatar || `https://picsum.photos/seed/${u.id}/50/50`} className="w-12 h-12 rounded-full border-2 border-black" />
                                <div className="flex-grow">
                                    <p className="font-bold">{u.name}</p>
                                    <p className="text-sm text-gray-500 font-mono">{u.id}</p>
                                </div>
                                <div className="flex gap-2 items-center">
                                    <span className={`px-2 py-1 text-[10px] font-black uppercase border-2 border-black ${u.registration_status === 'active' ? 'bg-acid-green text-black' : u.registration_status === 'banned' ? 'bg-bright-red text-white' : 'bg-neon-purple text-white'}`}>
                                        {u.registration_status}
                                    </span>
                                    {u.is_admin && <span className="p-2 bg-black text-white text-xs font-bold rounded ring-2 ring-white">ADMIN</span>}

                                    <div className="flex gap-1 ml-4 border-l-2 border-black pl-4">
                                        {u.registration_status !== 'active' && (
                                            <button
                                                onClick={() => handleUpdateUserStatus(u.id, 'active')}
                                                className="px-3 py-1 bg-acid-green text-black border-2 border-black text-[10px] font-black uppercase hover:translate-y-0.5 shadow-hard-sm transition-all"
                                            >
                                                APPROVE
                                            </button>
                                        )}
                                        {u.registration_status !== 'banned' && (
                                            <button
                                                onClick={() => handleUpdateUserStatus(u.id, 'banned')}
                                                className="px-3 py-1 bg-bright-red text-white border-2 border-black text-[10px] font-black uppercase hover:translate-y-0.5 shadow-hard-sm transition-all"
                                            >
                                                BAN
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'moderation' && (
                <div className="p-6 bg-white dark:bg-gray-800 border-4 border-black dark:border-white rounded-lg shadow-hard dark:shadow-hard-dark">
                    <h2 className="font-grotesk text-2xl font-bold mb-4">Doubt Moderation (#global)</h2>
                    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                        {messages.length > 0 ? (
                            messages.map(msg => (
                                <div key={msg.id} className="p-4 bg-gray-100 dark:bg-gray-900 border-4 border-black dark:border-white rounded-lg flex items-center gap-4">
                                    <div className="flex-grow">
                                        <p className="text-sm text-gray-500">@{msg.author.name} says:</p>
                                        <p className="font-medium italic">"{msg.text}"</p>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteMessage(msg.id)}
                                        className="p-3 bg-bright-red text-white border-2 border-black rounded-lg shadow-hard-sm"
                                    >
                                        <TrashIcon className="w-6 h-6" />
                                    </button>
                                </div>
                            ))
                        ) : (
                            <p className="text-gray-500 text-center py-4">No recent messages to moderate.</p>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'groups' && (
                <div className="p-6 bg-white dark:bg-gray-800 border-4 border-black dark:border-white rounded-lg shadow-hard dark:shadow-hard-dark">
                    <h2 className="font-grotesk text-2xl font-bold mb-4">Study Group Management</h2>
                    <div className="space-y-2 h-96 overflow-y-auto pr-2">
                        <div className="p-4 border-2 border-black dark:border-white rounded-md flex justify-between items-center group hover:bg-gray-50 dark:hover:bg-gray-900">
                            <p><span className="font-bold">Physics PhDs</span> (15 members)</p>
                            <button onClick={() => handleDisbandGroup(1)} className="text-xs p-2 bg-bright-red text-white border border-black rounded font-bold shadow-hard-sm hover:translate-y-0.5 transition-all">Disband Group</button>
                        </div>
                        <div className="p-4 border-2 border-black dark:border-white rounded-md flex justify-between items-center group hover:bg-gray-50 dark:hover:bg-gray-900">
                            <p><span className="font-bold">Calculus Crew</span> (12 members)</p>
                            <button onClick={() => handleDisbandGroup(2)} className="text-xs p-2 bg-bright-red text-white border border-black rounded font-bold shadow-hard-sm hover:translate-y-0.5 transition-all">Disband Group</button>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'books' && <BooksManager />}
            {activeTab === 'requests' && <BookRequestsManager />}
            {activeTab === 'access' && <AccessManager />}
            {activeTab === 'appeals' && <AppealsManager />}
        </div>
    );
};

const BooksManager: React.FC = () => {
    const [currentFolder, setCurrentFolder] = React.useState<number | null>(null);
    const [folders, setFolders] = React.useState<any[]>([]);
    const [books, setBooks] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [path, setPath] = React.useState<{ id: number | null, name: string }[]>([{ id: null, name: 'Root' }]);

    const [showFolderModal, setShowFolderModal] = React.useState(false);
    const [newFolderName, setNewFolderName] = React.useState('');

    const [editingFolder, setEditingFolder] = React.useState<{ id: number, name: string } | null>(null);
    const [editFolderName, setEditFolderName] = React.useState('');

    const [showUploadModal, setShowUploadModal] = React.useState(false);
    const [uploadFile, setUploadFile] = React.useState<File | null>(null);
    const [bookTitle, setBookTitle] = React.useState('');
    const [bookAuthor, setBookAuthor] = React.useState('');
    const [viewingBook, setViewingBook] = React.useState<{ url: string, title: string } | null>(null);

    const [editingBook, setEditingBook] = React.useState<any | null>(null);
    const [bookGrade, setBookGrade] = React.useState('');
    const [bookExam, setBookExam] = React.useState('');
    const [bookSubject, setBookSubject] = React.useState('');
    const [pdfUrlAlt, setPdfUrlAlt] = React.useState('');
    const [mirrors, setMirrors] = React.useState<string[]>([]);
    const [newMirror, setNewMirror] = React.useState('');
    const [primarySource, setPrimarySource] = React.useState('catbox');
    const [isReuploading, setIsReuploading] = React.useState<number | null>(null);
    const [isActionLoading, setIsActionLoading] = React.useState(false);
    const [uploadProgress, setUploadProgress] = React.useState<number>(0);

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
            console.error("Failed to fetch books content", err);
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        fetchContent(currentFolder);
    }, [currentFolder]);

    const handleCreateFolder = async () => {
        if (!newFolderName.trim()) return;
        try {
            const token = await user?.getIdToken();
            const res = await fetch(`${API_BASE_URL}/admin/books/folders`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name: newFolderName, parentId: currentFolder })
            });
            if (res.ok) {
                setShowFolderModal(false);
                setNewFolderName('');
                fetchContent(currentFolder);
            }
        } catch (err) {
            showToast('Could not create folder', 'error');
        }
    };

    const handleUpdateFolder = async () => {
        if (!editFolderName.trim() || !editingFolder) return;
        try {
            const token = await user?.getIdToken();
            const res = await fetch(`${API_BASE_URL}/admin/books/folders/${editingFolder.id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name: editFolderName })
            });
            if (res.ok) {
                setEditingFolder(null);
                setEditFolderName('');
                fetchContent(currentFolder);
            }
        } catch (err) {
            showToast('Could not update folder', 'error');
        }
    };

    const handleUpload = async () => {
        if (!uploadFile || !bookTitle.trim()) return;
        setIsActionLoading(true);
        console.log(`[ADMIN] Starting upload process for "${bookTitle}"`);
        try {
            const token = await user?.getIdToken();
            const formData = new FormData();
            formData.append('file', uploadFile);

            // Use XHR or fetch with progress via axios if available
            // Assuming we use fetch, we can't easily get progress without a wrapper or axios.
            // Let's use XMLHttpRequest to show progress as requested.

            const xhr = new XMLHttpRequest();
            xhr.open('POST', `${API_BASE_URL}/upload`);
            xhr.setRequestHeader('Authorization', `Bearer ${token}`);

            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                    const percent = Math.round((event.loaded / event.total) * 100);
                    setUploadProgress(percent);
                }
            };

            const uploadPromise = new Promise<{ link: string }>((resolve, reject) => {
                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        resolve(JSON.parse(xhr.responseText));
                    } else {
                        reject(new Error("Upload failed"));
                    }
                };
                xhr.onerror = () => reject(new Error("Network error"));
                xhr.send(formData);
            });

            const { link } = await uploadPromise;
            console.log(`[ADMIN] Binary upload successful: ${link}`);

            const saveRes = await fetch(`${API_BASE_URL}/admin/books`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    folderId: currentFolder,
                    title: bookTitle,
                    author: bookAuthor,
                    pdfUrl: link,
                    pdfUrlAlt: pdfUrlAlt,
                    grade: bookGrade,
                    exam: bookExam,
                    subject: bookSubject,
                    mirrors: mirrors,
                    primarySource: primarySource
                })
            });

            if (saveRes.ok) {
                console.log(`[ADMIN] Book record created in DB`);
                setShowUploadModal(false);
                resetUploadForm();
                fetchContent(currentFolder);
            }
        } catch (err) {
            console.error(`[ADMIN] Upload sequence failed:`, err);
            showToast('Upload failed', 'error');
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleReupload = async (bookId: number, file: File) => {
        setIsReuploading(bookId);
        const formData = new FormData();
        formData.append('file', file);
        try {
            const token = await user?.getIdToken();
            const res = await fetch(`${API_BASE_URL}/admin/books/${bookId}/reupload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            if (res.ok) {
                showToast('File replaced!', 'success');
                fetchContent(currentFolder);
            } else {
                throw new Error("Reupload failed");
            }
        } catch (err) {
            console.error(err);
            showToast('Reupload failed', 'error');
        } finally {
            setIsReuploading(null);
        }
    };

    const handleUpdateBook = async () => {
        if (!editingBook || !bookTitle.trim()) return;
        setIsActionLoading(true);
        try {
            const token = await user?.getIdToken();
            const res = await fetch(`${API_BASE_URL}/admin/books/${editingBook.id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title: bookTitle,
                    author: bookAuthor,
                    grade: bookGrade,
                    exam: bookExam,
                    subject: bookSubject,
                    pdf_url: editingBook.pdf_url,
                    pdf_url_alt: pdfUrlAlt || editingBook.pdf_url_alt,
                    mirrors: mirrors.length > 0 ? mirrors : editingBook.mirrors,
                    primary_source: primarySource
                })
            });

            if (res.ok) {
                setEditingBook(null);
                resetUploadForm();
                fetchContent(currentFolder);
            }
        } catch (err) {
            showToast('Update failed', 'error');
        } finally {
            setIsActionLoading(false);
        }
    };

    const resetUploadForm = () => {
        setBookTitle('');
        setBookAuthor('');
        setBookGrade('');
        setBookExam('');
        setBookSubject('');
        setPdfUrlAlt('');
        setMirrors([]);
        setUploadFile(null);
        setPrimarySource('catbox');
        setUploadProgress(0);
    };

    const navigateTo = (id: number | null, name: string) => {
        if (id === currentFolder) return;

        if (id === null) {
            setPath([{ id: null, name: 'Root' }]);
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

    const handleDeleteFolder = async (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
        if (!confirm("Delete this folder and all contents?")) return;
        try {
            const token = await user?.getIdToken();
            const res = await fetch(`${API_BASE_URL}/admin/books/folders/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) fetchContent(currentFolder);
        } catch (err) {
            showToast('Delete failed', 'error');
        }
    };

    const handleDeleteBook = async (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
        if (!confirm("Delete this book?")) return;
        try {
            const token = await user?.getIdToken();
            const res = await fetch(`${API_BASE_URL}/admin/books/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) fetchContent(currentFolder);
        } catch (err) {
            showToast('Delete failed', 'error');
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1">
                    <h2 className="text-3xl font-grotesk font-black uppercase text-neon-purple">Vault Browser</h2>
                    <p className="text-sm font-bold opacity-50 uppercase tracking-widest">Manage academic resources</p>
                </div>

                <div className="flex gap-4">
                    <button
                        onClick={() => setShowFolderModal(true)}
                        className="bg-white text-black px-6 py-3 border-4 border-black dark:border-white rounded-lg font-grotesk font-black shadow-hard hover:-translate-y-1 transition-all flex items-center gap-2"
                    >
                        <PlusIcon className="w-5 h-5" /> NEW FOLDER
                    </button>
                    {currentFolder !== null && (
                        <button
                            onClick={() => setShowUploadModal(true)}
                            className="bg-acid-green text-black px-6 py-3 border-4 border-black rounded-lg font-grotesk font-black shadow-hard hover:-translate-y-1 transition-all flex items-center gap-2"
                        >
                            <PlusIcon className="w-5 h-5" /> UPLOAD PDF
                        </button>
                    )}
                </div>
            </div>

            {/* Breadcrumbs */}
            <div className="flex items-center gap-2 font-mono font-bold text-lg p-4 bg-gray-50 dark:bg-gray-900 border-4 border-black dark:border-white rounded-lg shadow-hard-sm overflow-x-auto whitespace-nowrap scrollbar-hide">
                {path.map((p, i) => (
                    <React.Fragment key={p.id}>
                        {i > 0 && <span className="opacity-30">/</span>}
                        <button
                            onClick={() => navigateTo(p.id, p.name)}
                            className={`hover:text-neon-purple transition-colors ${currentFolder === p.id ? 'text-neon-purple underline underline-offset-4 decoration-4' : ''}`}
                        >
                            {p.name.toUpperCase()}
                        </button>
                    </React.Fragment>
                ))}
            </div>

            {loading ? (
                <div className="text-center py-20 animate-pulse font-grotesk text-2xl font-black">INDEXING_SYSTEM_DATA...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {/* Back button */}
                    {currentFolder !== null && (
                        <div
                            onClick={() => {
                                const parentPath = path[path.length - 2];
                                navigateTo(parentPath.id, parentPath.name);
                            }}
                            className="p-6 bg-gray-50 dark:bg-gray-900 border-4 border-black dark:border-white rounded-lg shadow-hard hover:-translate-y-1 transition-all cursor-pointer flex flex-col items-center justify-center gap-4 group border-dashed"
                        >
                            <ArrowLeftIcon className="w-12 h-12 text-gray-400 group-hover:text-black dark:group-hover:text-white transition-colors" />
                            <span className="font-grotesk font-black">GO UP</span>
                        </div>
                    )}

                    {/* Folders */}
                    {folders.map(folder => (
                        <div
                            key={folder.id}
                            onClick={() => navigateTo(folder.id, folder.name)}
                            className="p-6 bg-white dark:bg-gray-800 border-4 border-black dark:border-white rounded-lg shadow-hard hover:-translate-y-1 transition-all cursor-pointer group flex flex-col gap-4 relative"
                        >
                            <FolderIcon className="w-16 h-16 text-yellow-400 fill-yellow-400 group-hover:scale-110 transition-transform" />
                            <h3 className="font-grotesk font-black text-xl uppercase truncate pr-8">{folder.name}</h3>
                            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingFolder({ id: folder.id, name: folder.name });
                                        setEditFolderName(folder.name);
                                    }}
                                    className="p-1 bg-white dark:bg-gray-900 border-2 border-black rounded hover:bg-neon-purple hover:text-white transition-colors"
                                >
                                    <EditIcon className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={(e) => handleDeleteFolder(e, folder.id)}
                                    className="p-1 bg-white dark:bg-gray-900 border-2 border-black rounded hover:bg-bright-red hover:text-white transition-colors"
                                >
                                    <TrashIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    ))}

                    {/* Books */}
                    {books.map(book => (
                        <div
                            key={book.id}
                            className="p-6 bg-white dark:bg-gray-700 border-4 border-black dark:border-white rounded-lg shadow-hard hover:-translate-y-1 transition-all group relative overflow-hidden flex flex-col gap-4"
                        >
                            <div className="absolute top-0 right-0 p-2 bg-neon-purple border-l-4 border-b-4 border-black dark:border-white font-mono text-[10px] text-white font-bold uppercase z-10">PDF_DATA</div>
                            <div className="flex justify-between items-start">
                                <FileTextIcon className="w-16 h-16 text-electric-blue group-hover:scale-110 transition-transform" />
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingBook(book);
                                            setBookTitle(book.title);
                                            setBookAuthor(book.author || '');
                                            setBookGrade(book.grade || '');
                                            setBookExam(book.exam || '');
                                            setBookSubject(book.subject || '');
                                            setPdfUrlAlt(book.pdf_url_alt || '');
                                            setMirrors(book.mirrors || []);
                                            setPrimarySource(book.primary_source || 'catbox');
                                        }}
                                        className="p-1 bg-white dark:bg-gray-900 border-2 border-black rounded hover:bg-electric-blue hover:text-white transition-colors"
                                        title="Edit Metadata"
                                    >
                                        <EditIcon className="w-5 h-5" />
                                    </button>
                                    <div className="relative group/reupload">
                                        <input
                                            type="file"
                                            accept=".pdf"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) handleReupload(book.id, file);
                                            }}
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                        />
                                        <button
                                            className={`p-1 bg-white dark:bg-gray-900 border-2 border-black rounded hover:bg-neon-purple hover:text-white transition-colors ${isReuploading === book.id ? 'animate-pulse' : ''}`}
                                            title="Reupload PDF"
                                        >
                                            <TrendingUpIcon className="w-5 h-5" />
                                        </button>
                                    </div>
                                    <button
                                        onClick={(e) => handleDeleteBook(e, book.id)}
                                        className="p-1 bg-white dark:bg-gray-900 border-2 border-black rounded hover:bg-bright-red hover:text-white transition-colors"
                                    >
                                        <TrashIcon className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <h3 className="font-grotesk font-black text-xl uppercase leading-tight line-clamp-2">{book.title}</h3>
                                {book.author && <p className="text-xs font-bold opacity-50 uppercase tracking-tighter">{book.author}</p>}
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {book.grade && <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-900 border-2 border-black rounded text-[10px] font-black uppercase">{book.grade}</span>}
                                    {book.exam && <span className="px-2 py-0.5 bg-neon-purple/10 border-2 border-black rounded text-[10px] font-black uppercase text-neon-purple">{book.exam}</span>}
                                    {book.subject && <span className="px-2 py-0.5 bg-acid-green/10 border-2 border-black rounded text-[10px] font-black uppercase text-acid-green">{book.subject}</span>}
                                </div>
                            </div>
                            <button
                                onClick={() => setViewingBook({ url: book.pdf_url, title: book.title })}
                                className="mt-auto w-full p-2 border-2 border-black dark:border-white font-black uppercase text-xs hover:bg-black hover:text-white transition-colors"
                            >
                                PREVIEW
                            </button>
                        </div>
                    ))}

                    {folders.length === 0 && books.length === 0 && currentFolder === null && (
                        <div className="col-span-full border-4 border-dashed border-black dark:border-white rounded-lg p-20 text-center space-y-4">
                            <FolderIcon className="w-20 h-20 mx-auto opacity-10" />
                            <p className="text-2xl font-black uppercase opacity-20">The system is empty. Create a folder to begin.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Folder Modal */}
            {showFolderModal && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl animate-in fade-in duration-300"
                    style={{ backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
                >
                    <div className="w-full max-w-md bg-white dark:bg-gray-900 border-8 border-black dark:border-white p-8 shadow-hard animate-in zoom-in-95 duration-200">
                        <h2 className="text-3xl font-grotesk font-black uppercase mb-6 flex items-center gap-3">
                            <FolderIcon className="w-8 h-8 text-yellow-500" /> New Dir
                        </h2>
                        <input
                            type="text"
                            placeholder="NAME_REQUIRED..."
                            autoFocus
                            value={newFolderName}
                            onChange={e => setNewFolderName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleCreateFolder()}
                            className="w-full p-6 text-2xl border-4 border-black dark:border-white bg-gray-50 dark:bg-gray-950 focus:outline-none focus:ring-8 focus:ring-neon-purple rounded-none font-black font-mono shadow-hard-sm"
                        />
                        <div className="flex gap-4 mt-8">
                            <button
                                onClick={() => setShowFolderModal(false)}
                                className="flex-1 p-4 border-4 border-black dark:border-white font-black uppercase hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            >
                                Abort
                            </button>
                            <button
                                onClick={handleCreateFolder}
                                className="flex-1 p-4 bg-neon-purple text-white border-4 border-black dark:border-white shadow-hard-sm hover:translate-y-0.5 font-black uppercase"
                            >
                                EXECUTE
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Folder Modal */}
            {editingFolder && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl animate-in fade-in duration-300"
                    style={{ backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
                >
                    <div className="w-full max-w-md bg-white dark:bg-gray-900 border-8 border-black dark:border-white p-8 shadow-hard animate-in zoom-in-95 duration-200">
                        <h2 className="text-3xl font-grotesk font-black uppercase mb-6 flex items-center gap-3">
                            <EditIcon className="w-8 h-8 text-electric-blue" /> Rename Dir
                        </h2>
                        <input
                            type="text"
                            placeholder="NEW_NAME..."
                            autoFocus
                            value={editFolderName}
                            onChange={e => setEditFolderName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleUpdateFolder()}
                            className="w-full p-6 text-2xl border-4 border-black dark:border-white bg-gray-50 dark:bg-gray-950 focus:outline-none focus:ring-8 focus:ring-electric-blue rounded-none font-black font-mono shadow-hard-sm"
                        />
                        <div className="flex gap-4 mt-8">
                            <button
                                onClick={() => setEditingFolder(null)}
                                className="flex-1 p-4 border-4 border-black dark:border-white font-black uppercase hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUpdateFolder}
                                className="flex-1 p-4 bg-electric-blue text-white border-4 border-black dark:border-white shadow-hard-sm hover:translate-y-0.5 font-black uppercase"
                            >
                                Update
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Upload/Edit Modal */}
            {(showUploadModal || editingBook) && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl animate-in fade-in duration-300"
                    style={{ backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
                >
                    <div className="w-full max-w-2xl bg-white dark:bg-gray-900 border-8 border-black dark:border-white p-10 shadow-hard animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto scrollbar-hide">
                        <h2 className="text-4xl font-grotesk font-black uppercase mb-8 text-acid-green">
                            {editingBook ? 'Edit Manifest' : 'Push To Vault'}
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-black uppercase mb-2 opacity-50 tracking-[0.2em]">Resource Title</label>
                                <input
                                    type="text"
                                    placeholder="BOOK_NAME..."
                                    value={bookTitle}
                                    onChange={e => setBookTitle(e.target.value)}
                                    className="w-full p-5 text-xl border-4 border-black dark:border-white bg-gray-50 dark:bg-gray-950 focus:outline-none focus:ring-8 focus:ring-acid-green font-bold font-mono"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black uppercase mb-2 opacity-50 tracking-[0.2em]">Contributor/Author</label>
                                <input
                                    type="text"
                                    placeholder="NAME..."
                                    value={bookAuthor}
                                    onChange={e => setBookAuthor(e.target.value)}
                                    className="w-full p-5 border-4 border-black dark:border-white bg-gray-50 dark:bg-gray-950 focus:outline-none focus:ring-4 focus:ring-acid-green font-bold font-mono"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black uppercase mb-2 opacity-50 tracking-[0.2em]">Subject</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Physics"
                                    value={bookSubject}
                                    onChange={e => setBookSubject(e.target.value)}
                                    className="w-full p-5 border-4 border-black dark:border-white bg-gray-50 dark:bg-gray-950 focus:outline-none focus:ring-4 focus:ring-acid-green font-bold font-mono"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black uppercase mb-2 opacity-50 tracking-[0.2em]">Grade/Class</label>
                                <select
                                    value={bookGrade}
                                    onChange={e => setBookGrade(e.target.value)}
                                    className="w-full p-5 border-4 border-black dark:border-white bg-gray-50 dark:bg-gray-950 focus:outline-none focus:ring-4 focus:ring-acid-green font-bold font-mono"
                                >
                                    <option value="">SELECT...</option>
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(g => (
                                        <option key={g} value={`Class ${g}`}>Class {g}</option>
                                    ))}
                                    <option value="Undergraduate">Undergraduate</option>
                                    <option value="Postgraduate">Postgraduate</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-black uppercase mb-2 opacity-50 tracking-[0.2em]">Exam Category</label>
                                <select
                                    value={bookExam}
                                    onChange={e => setBookExam(e.target.value)}
                                    className="w-full p-5 border-4 border-black dark:border-white bg-gray-50 dark:bg-gray-950 focus:outline-none focus:ring-4 focus:ring-acid-green font-bold font-mono"
                                >
                                    <option value="">SELECT...</option>
                                    <option value="UPSC">UPSC</option>
                                    <option value="JEE">JEE</option>
                                    <option value="NEET">NEET</option>
                                    <option value="CAT">CAT</option>
                                    <option value="OTHER">OTHER</option>
                                </select>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-black uppercase mb-2 opacity-50 tracking-[0.2em]">Alternate Link (Secondary Mirror)</label>
                                <input
                                    type="text"
                                    placeholder="https://..."
                                    value={pdfUrlAlt}
                                    onChange={e => setPdfUrlAlt(e.target.value)}
                                    className="w-full p-4 border-4 border-black dark:border-white bg-gray-50 dark:bg-gray-950 focus:outline-none focus:ring-4 focus:ring-acid-green font-mono text-sm"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-black uppercase mb-2 opacity-50 tracking-[0.2em]">Extra Mirrors</label>
                                <div className="flex gap-2 mb-2">
                                    <input
                                        type="text"
                                        placeholder="Add mirror URL..."
                                        value={newMirror}
                                        onChange={e => setNewMirror(e.target.value)}
                                        className="flex-grow p-4 border-4 border-black dark:border-white bg-gray-50 dark:bg-gray-950 focus:outline-none focus:ring-4 focus:ring-acid-green font-mono text-sm"
                                    />
                                    <button
                                        onClick={() => {
                                            if (newMirror.trim()) {
                                                setMirrors([...mirrors, newMirror.trim()]);
                                                setNewMirror('');
                                            }
                                        }}
                                        className="px-4 bg-black text-white border-4 border-black font-black uppercase"
                                    >
                                        ADD
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {mirrors.map((m, idx) => (
                                        <div key={idx} className="flex items-center gap-2 px-3 py-1 bg-gray-100 dark:bg-gray-800 border-2 border-black rounded text-[10px] font-black group">
                                            <span className="truncate max-w-[150px]">{m}</span>
                                            <button onClick={() => setMirrors(mirrors.filter((_, i) => i !== idx))} className="text-bright-red hover:scale-125 transition-transform">×</button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-black uppercase mb-2 opacity-50 tracking-[0.2em]">Primary Delivery Node</label>
                                <div className="grid grid-cols-3 gap-4">
                                    {['catbox', 'kappa', 'fileditch'].map(provider => (
                                        <button
                                            key={provider}
                                            type="button"
                                            onClick={() => setPrimarySource(provider)}
                                            className={`p-3 border-4 border-black font-black uppercase text-xs transition-all ${primarySource === provider ? 'bg-acid-green text-black scale-95 shadow-none' : 'bg-white text-black hover:bg-gray-50 shadow-hard-sm'}`}
                                        >
                                            {provider}
                                        </button>
                                    ))}
                                </div>
                                <p className="mt-2 text-[10px] font-mono opacity-50">Vault will attempt to serve content from this provider first. Fallback occurs automatically.</p>
                            </div>
                            {!editingBook && (
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-black uppercase mb-3 opacity-50 tracking-[0.2em]">Binary File [.pdf]</label>
                                    <input
                                        type="file"
                                        accept=".pdf"
                                        onChange={e => setUploadFile(e.target.files?.[0] || null)}
                                        className="w-full p-5 border-4 border-black dark:border-white bg-black text-white font-mono text-sm file:mr-4 file:py-2 file:px-4 file:rounded-none file:border-0 file:text-sm file:font-black file:bg-acid-green file:text-black hover:file:bg-white transition-all cursor-pointer"
                                    />
                                </div>
                            )}
                        </div>
                        <div className="flex gap-4 mt-12">
                            <button
                                onClick={() => { setShowUploadModal(false); setEditingBook(null); resetUploadForm(); }}
                                disabled={isActionLoading}
                                className="flex-1 p-5 border-4 border-black font-black uppercase hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                            >
                                ABORT
                            </button>
                            <button
                                onClick={editingBook ? handleUpdateBook : handleUpload}
                                disabled={isActionLoading || (!editingBook && (!uploadFile || !bookTitle))}
                                className="flex-1 p-5 bg-acid-green text-black border-4 border-black shadow-hard hover:translate-y-1 active:translate-y-0 font-black uppercase disabled:opacity-50 relative overflow-hidden"
                            >
                                {isActionLoading && uploadProgress > 0 && uploadProgress < 100 && (
                                    <div
                                        className="absolute bottom-0 left-0 h-2 bg-black opacity-30 transition-all duration-300"
                                        style={{ width: `${uploadProgress}%` }}
                                    />
                                )}
                                {isActionLoading ? (uploadProgress > 0 ? `UPLOADING ${uploadProgress}%` : 'SYNCING_DATA...') : (editingBook ? 'PATCH_FILE' : 'PUSH_IO')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Secure PDF Viewer */}
            {viewingBook && (
                <PDFViewer
                    url={viewingBook.url}
                    title={viewingBook.title}
                    onClose={() => setViewingBook(null)}
                />
            )}
        </div>
    );
};

const BookRequestsManager: React.FC = () => {
    const [requests, setRequests] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
    const user = auth.currentUser;
    const { showToast } = useToast();

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const token = await user?.getIdToken();
            const res = await fetch(`${API_BASE_URL}/admin/books/requests`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setRequests(await res.json());
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (id: number, status: string) => {
        try {
            const token = await user?.getIdToken();
            const res = await fetch(`${API_BASE_URL}/admin/books/requests/${id}/status`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status })
            });
            if (res.ok) fetchRequests();
        } catch (err) {
            showToast('Status update failed', 'error');
        }
    };

    React.useEffect(() => {
        fetchRequests();
    }, []);

    return (
        <div className="p-6 bg-white dark:bg-gray-800 border-4 border-black dark:border-white rounded-lg shadow-hard animate-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-3xl font-grotesk font-black uppercase mb-6 flex items-center gap-3">
                <MusicIcon className="w-8 h-8 text-bright-red" /> Intake Requests
            </h2>

            {loading ? (
                <div className="py-10 text-center font-black animate-pulse uppercase">Syncing_Queues...</div>
            ) : (
                <div className="space-y-4">
                    {requests.length === 0 ? (
                        <p className="py-10 text-center text-gray-400 font-bold uppercase">No pending requests in queue.</p>
                    ) : (
                        requests.map(req => (
                            <div key={req.id} className={`p-6 border-4 border-black rounded-lg flex flex-col md:flex-row justify-between gap-6 transition-all ${req.status === 'approved' ? 'bg-acid-green/10' :
                                req.status === 'rejected' ? 'bg-bright-red/10' : 'bg-gray-50 dark:bg-gray-900'
                                }`}>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2 py-0.5 text-[10px] font-black uppercase border-2 border-black rounded ${req.status === 'approved' ? 'bg-acid-green text-black' :
                                            req.status === 'rejected' ? 'bg-bright-red text-white' : 'bg-yellow-400 text-black'
                                            }`}>{req.status}</span>
                                        <p className="text-xs font-mono font-bold opacity-50">BY: @{req.user_name || 'ANON'}</p>
                                    </div>
                                    <h3 className="text-xl font-black uppercase">{req.title}</h3>
                                    {req.author && <p className="text-sm font-bold opacity-70">AUTHOR: {req.author}</p>}
                                    {req.description && <p className="text-sm italic opacity-60">"{req.description}"</p>}
                                </div>

                                <div className="flex items-center gap-3">
                                    {req.status === 'pending' && (
                                        <>
                                            <button
                                                onClick={() => handleUpdateStatus(req.id, 'approved')}
                                                className="px-4 py-2 bg-acid-green text-black border-2 border-black rounded font-black text-xs hover:translate-y-0.5 shadow-hard-sm transition-all"
                                            >
                                                APPROVE
                                            </button>
                                            <button
                                                onClick={() => handleUpdateStatus(req.id, 'rejected')}
                                                className="px-4 py-2 bg-bright-red text-white border-2 border-black rounded font-black text-xs hover:translate-y-0.5 shadow-hard-sm transition-all"
                                            >
                                                DENY
                                            </button>
                                        </>
                                    )}
                                    {req.status !== 'pending' && (
                                        <button
                                            onClick={() => handleUpdateStatus(req.id, 'pending')}
                                            className="px-4 py-2 bg-black text-white border-2 border-black rounded font-black text-xs hover:translate-y-0.5 shadow-hard-sm transition-all"
                                        >
                                            RESET
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

const AccessManager: React.FC = () => {
    const [settings, setSettings] = React.useState<any>({});
    const [loading, setLoading] = React.useState(true);
    const user = auth.currentUser;
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

    const fetchSettings = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/settings`);
            if (res.ok) setSettings(await res.json());
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    React.useEffect(() => { fetchSettings(); }, []);

    const toggleSetting = async (key: string) => {
        const newValue = settings[key] === 'true' ? 'false' : 'true';
        try {
            const token = await user?.getIdToken();
            const res = await fetch(`${API_BASE_URL}/admin/settings`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ key, value: newValue })
            });
            if (res.ok) setSettings({ ...settings, [key]: newValue });
        } catch (err) { console.error(err); }
    };

    if (loading) return <div className="p-10 font-black uppercase animate-pulse">Scanning Protocols...</div>;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="p-8 bg-white dark:bg-gray-800 border-8 border-black dark:border-white shadow-hard space-y-6">
                <h2 className="text-3xl font-grotesk font-black uppercase text-electric-blue flex items-center gap-3">
                    <ShieldIcon className="w-8 h-8" /> Global Protocol
                </h2>
                <div className="space-y-4">
                    {[
                        { key: 'require_referral', label: 'Require Referral Code', desc: 'New users must have a valid invite code to register.' },
                        { key: 'require_approval', label: 'Admin Approval Mode', desc: 'All new accounts must be manually cleared by an overseer.' }
                    ].map(cfg => (
                        <div key={cfg.key} className="p-4 border-4 border-black dark:border-white bg-gray-50 dark:bg-black/40 flex justify-between items-center group">
                            <div className="space-y-1">
                                <p className="font-black uppercase">{cfg.label}</p>
                                <p className="text-[10px] opacity-60 font-mono">{cfg.desc}</p>
                            </div>
                            <button
                                onClick={() => toggleSetting(cfg.key)}
                                className={`px-6 py-2 border-4 border-black font-black uppercase text-xs transition-all ${settings[cfg.key] === 'true' ? 'bg-acid-green text-black' : 'bg-white text-black opacity-30 hover:opacity-100'}`}
                            >
                                {settings[cfg.key] === 'true' ? 'ENABLED' : 'DISABLED'}
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            <div className="p-8 bg-black text-white border-8 border-white shadow-hard flex flex-col items-center justify-center text-center space-y-4">
                <ShieldIcon className="w-20 h-20 text-acid-green animate-pulse" />
                <h2 className="text-3xl font-grotesk font-black uppercase">Gatekeeper Active</h2>
                <p className="font-mono text-sm opacity-70">Overseeing all incoming synchronization requests. Security level: MAXIMUM.</p>
            </div>
        </div>
    );
};

const AppealsManager: React.FC = () => {
    const [appeals, setAppeals] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);
    const user = auth.currentUser;
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

    const fetchAppeals = async () => {
        try {
            const token = await user?.getIdToken();
            const res = await fetch(`${API_BASE_URL}/admin/appeals`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setAppeals(await res.json());
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    React.useEffect(() => { fetchAppeals(); }, []);

    const updateStatus = async (id: number, status: string) => {
        try {
            const token = await user?.getIdToken();
            const res = await fetch(`${API_BASE_URL}/admin/appeals/${id}/status`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status })
            });
            if (res.ok) fetchAppeals();
        } catch (err) { console.error(err); }
    };

    if (loading) return <div className="p-10 font-black uppercase animate-pulse">Retrieving Appeals...</div>;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-4xl font-grotesk font-black uppercase mb-8">Ban Appeals</h2>
            <div className="grid grid-cols-1 gap-6">
                {appeals.length === 0 ? (
                    <div className="p-12 border-8 border-dashed border-black/10 text-center font-black uppercase opacity-20 text-4xl">Zero_Pending_Appeals</div>
                ) : (
                    appeals.map(appeal => (
                        <div key={appeal.id} className="p-8 bg-white dark:bg-gray-800 border-8 border-black dark:border-white shadow-hard flex flex-col md:flex-row justify-between items-start md:items-center gap-10">
                            <div className="space-y-4 flex-grow">
                                <div className="flex items-center gap-4">
                                    <span className={`px-3 py-1 text-xs font-black uppercase border-2 border-black ${appeal.status === 'pending' ? 'bg-neon-purple text-white' : 'bg-gray-200 text-black'}`}>{appeal.status}</span>
                                    <h3 className="text-2xl font-black uppercase tracking-tight">{appeal.user_name}</h3>
                                </div>
                                <div className="p-6 bg-gray-50 dark:bg-black font-mono text-sm border-4 border-black italic shadow-hard-sm">
                                    <span className="text-neon-purple font-bold">STATEMENT:</span> "{appeal.reason}"
                                </div>
                            </div>
                            <div className="flex gap-4 shrink-0 w-full md:w-auto">
                                <button
                                    onClick={() => updateStatus(appeal.id, 'rejected')}
                                    className="flex-1 md:flex-none px-8 py-4 border-4 border-black bg-bright-red text-white font-black uppercase text-sm hover:-translate-y-1 transition-all shadow-hard-sm"
                                >
                                    DENY
                                </button>
                                <button
                                    onClick={() => updateStatus(appeal.id, 'approved')}
                                    className="flex-1 md:flex-none px-8 py-4 border-4 border-black bg-acid-green text-black font-black uppercase text-sm hover:-translate-y-1 transition-all shadow-hard-sm"
                                >
                                    PARDON
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default AdminView;
