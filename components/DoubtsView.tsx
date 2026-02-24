import React, { useState, useEffect, useRef } from 'react';
import type { Doubt, DoubtAnswer } from '../types';
import { PlusIcon, PaperclipIcon, SendIcon, ShieldIcon, ArrowRightIcon } from './icons/Icons';
import { auth } from '../firebaseClient';
import { useToast } from './Toast';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const DoubtCard: React.FC<{ doubt: Doubt; onClick: (d: Doubt) => void }> = ({ doubt, onClick }) => (
    <div
        onClick={() => onClick(doubt)}
        className="p-6 bg-white dark:bg-gray-800 border-4 border-black dark:border-white rounded-lg shadow-hard dark:shadow-hard-dark cursor-pointer hover:-translate-y-1 transition-all"
    >
        <div className="flex justify-between items-start mb-4">
            <div className="space-y-1">
                <span className="px-3 py-1 bg-neon-purple text-white text-xs font-bold border-2 border-black rounded uppercase">
                    {doubt.topic}
                </span>
                <span className="ml-2 px-3 py-1 bg-acid-green text-black text-xs font-bold border-2 border-black rounded uppercase">
                    Grade {doubt.grade}
                </span>
            </div>
            <span className="text-sm text-gray-500 font-mono">
                {new Date(doubt.createdAt).toLocaleDateString()}
            </span>
        </div>
        <h3 className="text-2xl font-grotesk font-bold mb-2">{doubt.title}</h3>
        <p className="text-gray-600 dark:text-gray-400 line-clamp-2 mb-4">{doubt.text}</p>
        <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-2">
                <img src={doubt.author.avatar} alt={doubt.author.name} className="w-8 h-8 rounded-full border-2 border-black" />
                <span className="font-bold text-sm">@{doubt.author.name}</span>
            </div>
            <div className="flex items-center gap-2 font-bold text-electric-blue">
                <span>{doubt.answerCount} Replies</span>
                <ArrowRightIcon className="w-5 h-5" />
            </div>
        </div>
    </div>
);

const DoubtDetailView: React.FC<{ doubt: Doubt; onBack: () => void }> = ({ doubt, onBack }) => {
    const [answers, setAnswers] = useState<DoubtAnswer[]>([]);
    const [newAnswer, setNewAnswer] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const user = auth.currentUser;

    const fetchAnswers = async () => {
        if (!user) return;
        try {
            const token = await user.getIdToken();
            const res = await fetch(`${API_BASE_URL}/doubts/${doubt.id}/answers`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setAnswers(data);
        } catch (err) { } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAnswers();
    }, [doubt.id, user]);

    const handlePostAnswer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newAnswer.trim() || !user) return;
        try {
            const token = await user.getIdToken();
            const res = await fetch(`${API_BASE_URL}/doubts/${doubt.id}/answers`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ text: newAnswer })
            });
            if (res.ok) {
                setNewAnswer('');
                fetchAnswers();
            }
        } catch (err) { }
    };

    return (
        <div className="space-y-8 animate-fade-in">
            <button onClick={onBack} className="flex items-center gap-2 font-bold hover:underline">
                ← Back to all questions
            </button>

            <div className="p-8 bg-white dark:bg-gray-800 border-4 border-black dark:border-white rounded-lg shadow-hard dark:shadow-hard-dark">
                <div className="flex items-center gap-4 mb-6">
                    <img src={doubt.author.avatar} alt={doubt.author.name} className="w-12 h-12 rounded-lg border-2 border-black" />
                    <div>
                        <h2 className="text-3xl font-grotesk font-bold">{doubt.title}</h2>
                        <p className="text-gray-500 font-bold">Posted by @{doubt.author.name} • {doubt.topic} • Grade {doubt.grade}</p>
                    </div>
                </div>

                <p className="text-xl leading-relaxed mb-6">{doubt.text}</p>
                {doubt.imageUrl && (
                    <img src={doubt.imageUrl} alt="Doubt attachment" className="max-w-full rounded-lg border-4 border-black dark:border-white mb-6" />
                )}
            </div>

            <div className="space-y-6">
                <h3 className="text-2xl font-grotesk font-bold">Solutions ({answers.length})</h3>

                <form onSubmit={handlePostAnswer} className="relative">
                    <textarea
                        value={newAnswer}
                        onChange={(e) => setNewAnswer(e.target.value)}
                        placeholder="Got an answer? Drop it here!"
                        className="w-full p-6 text-lg bg-gray-100 dark:bg-gray-900 border-4 border-black dark:border-white rounded-lg focus:outline-none focus:ring-4 focus:ring-neon-purple min-h-[150px]"
                    />
                    <button
                        type="submit"
                        className="absolute bottom-6 right-6 p-4 bg-electric-blue text-white border-4 border-black font-bold rounded-lg shadow-hard-sm hover:-translate-y-1 transition-all"
                    >
                        Reply
                    </button>
                </form>

                <div className="space-y-4">
                    {answers.map(answer => (
                        <div key={answer.id} className="p-6 bg-white dark:bg-gray-800 border-4 border-black dark:border-white rounded-lg flex gap-4">
                            <img src={answer.author.avatar} alt={answer.author.name} className="w-10 h-10 rounded-full border-2 border-black shrink-0" />
                            <div className="flex-grow">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="font-bold">@{answer.author.name}</span>
                                    {answer.author.isVerifiedSolver && (
                                        <span className="flex items-center gap-1 text-neon-purple font-bold text-xs">
                                            <ShieldIcon className="w-4 h-4" /> VERIFIED SOLVER
                                        </span>
                                    )}
                                    <span className="text-xs text-gray-400 font-mono">
                                        {new Date(answer.createdAt).toLocaleTimeString()}
                                    </span>
                                </div>
                                <p className="text-lg">{answer.text}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const DoubtsView: React.FC = () => {
    const [doubts, setDoubts] = useState<Doubt[]>([]);
    const [selectedDoubt, setSelectedDoubt] = useState<Doubt | null>(null);
    const [isPosting, setIsPosting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [newDoubt, setNewDoubt] = useState({ title: '', text: '', topic: 'Math', grade: '12', imageUrl: '' });
    const user = auth.currentUser;
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const { showToast } = useToast();

    const fetchDoubts = async () => {
        if (!user) return;
        try {
            const token = await user.getIdToken();
            const res = await fetch(`${API_BASE_URL}/doubts`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setDoubts(data);
        } catch (err) { } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchDoubts();
    }, [user]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        setIsUploading(true);
        setUploadProgress(0);

        try {
            const token = await user.getIdToken();
            const formData = new FormData();
            formData.append('file', file);

            const xhr = new XMLHttpRequest();
            xhr.open('POST', `${API_BASE_URL}/upload`);
            xhr.setRequestHeader('Authorization', `Bearer ${token}`);

            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                    setUploadProgress(Math.round((event.loaded / event.total) * 100));
                }
            };

            const uploadPromise = new Promise<{ link: string }>((resolve, reject) => {
                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        resolve(JSON.parse(xhr.responseText));
                    } else {
                        reject(new Error('Upload failed'));
                    }
                };
                xhr.onerror = () => reject(new Error('Network error'));
            });

            xhr.send(formData);
            const data = await uploadPromise;
            setNewDoubt(prev => ({ ...prev, imageUrl: data.link }));
            showToast('Image attached!', 'success');
        } catch (err) {
            showToast('Upload failed, try again', 'error');
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
        }
    };

    const handlePostDoubt = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newDoubt.title.trim() || !user) return;
        try {
            const token = await user.getIdToken();
            const res = await fetch(`${API_BASE_URL}/doubts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(newDoubt)
            });
            if (res.ok) {
                setIsPosting(false);
                setNewDoubt({ title: '', text: '', topic: 'Math', grade: '12', imageUrl: '' });
                fetchDoubts();
            }
        } catch (err) { }
    };

    if (selectedDoubt) {
        return <DoubtDetailView doubt={selectedDoubt} onBack={() => setSelectedDoubt(null)} />;
    }

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl md:text-5xl font-grotesk font-bold">Questions</h1>
                    <p className="text-lg text-gray-600 dark:text-gray-400">Ask anything, help others, earn points!</p>
                </div>
                <button
                    onClick={() => setIsPosting(true)}
                    className="flex items-center justify-center gap-2 p-4 bg-electric-blue text-white font-grotesk text-xl font-bold border-4 border-black dark:border-white rounded-lg shadow-hard dark:shadow-hard-dark hover:-translate-y-1 transition-all"
                >
                    <PlusIcon className="w-6 h-6" /> Ask a Question
                </button>
            </div>

            {isPosting && (
                <div className="p-8 bg-neon-purple text-white border-4 border-black dark:border-white rounded-lg shadow-hard dark:shadow-hard-dark space-y-6">
                    <h2 className="text-3xl font-grotesk font-bold">What's your question?</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-black">
                        <select
                            value={newDoubt.topic}
                            onChange={(e) => setNewDoubt(prev => ({ ...prev, topic: e.target.value }))}
                            className="p-4 bg-white border-4 border-black rounded-lg font-bold"
                        >
                            {['Math', 'Physics', 'Chemistry', 'Biology', 'Coding', 'Other'].map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <select
                            value={newDoubt.grade}
                            onChange={(e) => setNewDoubt(prev => ({ ...prev, grade: e.target.value }))}
                            className="p-4 bg-white border-4 border-black rounded-lg font-bold"
                        >
                            {['9', '10', '11', '12', 'College'].map(g => <option key={g} value={g}>Grade {g}</option>)}
                        </select>
                    </div>

                    <input
                        type="text"
                        placeholder="Title of your doubt"
                        value={newDoubt.title}
                        onChange={(e) => setNewDoubt(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full p-4 text-lg bg-white text-black border-4 border-black rounded-lg focus:outline-none"
                    />

                    <textarea
                        placeholder="Explain what you need help with..."
                        value={newDoubt.text}
                        onChange={(e) => setNewDoubt(prev => ({ ...prev, text: e.target.value }))}
                        className="w-full p-4 text-lg bg-white text-black border-4 border-black rounded-lg focus:outline-none min-h-[150px]"
                    />

                    <div className="flex flex-wrap items-center gap-4">
                        <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="p-4 bg-white text-black border-4 border-black rounded-lg font-bold flex items-center gap-2 hover:bg-gray-100"
                        >
                            <PaperclipIcon className="w-5 h-5" />
                            {newDoubt.imageUrl ? 'Image Added ✓' : 'Add Image'}
                        </button>

                        {isUploading && (
                            <div className="flex-grow">
                                <div className="w-full h-6 bg-white border-4 border-black rounded-md overflow-hidden">
                                    <div
                                        className="h-full bg-electric-blue transition-all duration-200 flex items-center justify-center"
                                        style={{ width: `${uploadProgress}%` }}
                                    >
                                        <span className="text-xs font-bold text-white">{uploadProgress}%</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex-grow"></div>

                        <button onClick={() => setIsPosting(false)} className="p-4 font-bold hover:underline">Cancel</button>
                        <button
                            onClick={handlePostDoubt}
                            disabled={isUploading}
                            className="p-4 bg-white text-neon-purple font-grotesk text-xl font-bold border-4 border-black rounded-lg shadow-hard hover:-translate-y-1 transition-all disabled:opacity-50"
                        >
                            Post Question
                        </button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {doubts.map(doubt => (
                    <DoubtCard key={doubt.id} doubt={doubt} onClick={setSelectedDoubt} />
                ))}
            </div>

            {doubts.length === 0 && !isLoading && (
                <div className="p-12 text-center bg-gray-100 dark:bg-gray-800 border-4 border-dashed border-black dark:border-white rounded-lg">
                    <p className="text-2xl font-grotesk text-gray-500">No questions yet. Be the first to ask!</p>
                </div>
            )}
        </div>
    );
};

export default DoubtsView;
