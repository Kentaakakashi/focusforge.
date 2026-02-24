import React, { useState, useEffect } from 'react';
import type { ChatMessage, ChatChannel } from '../types';
import { SendIcon, PaperclipIcon, EmojiIcon, PlusIcon, TrashIcon } from './icons/Icons';
import { auth } from '../firebaseClient';
import { useToast } from './Toast';


const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const MessageBubble: React.FC<{ msg: ChatMessage; isAdmin: boolean; onDelete: (id: number) => void }> = ({ msg, isAdmin, onDelete }) => (
    <div className="flex items-start gap-4 p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg group">
        <img src={msg.author.avatar || `https://ui-avatars.com/api/?name=${msg.author.name}`} alt={msg.author.name} className="w-12 h-12 rounded-md border-2 border-black dark:border-white" />
        <div className="flex-grow">
            <div className="flex items-baseline gap-2">
                <span className="font-grotesk font-bold text-lg">{msg.author.name}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
            </div>
            <p className="text-md">{msg.text}</p>
        </div>
        {isAdmin && (
            <button
                onClick={() => onDelete(msg.id)}
                className="opacity-0 group-hover:opacity-100 p-2 text-bright-red hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-all"
                title="Delete Message"
            >
                <TrashIcon className="w-5 h-5" />
            </button>
        )}
    </div>
);


import { io, Socket } from 'socket.io-client';

const ChatView: React.FC<{ isAdmin?: boolean }> = ({ isAdmin = false }) => {
    const [activeChannel, setActiveChannel] = useState('global');
    const [channels, setChannels] = useState<ChatChannel[]>([]);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
    const [socket, setSocket] = useState<Socket | null>(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const { showToast } = useToast();

    const user = auth.currentUser;

    useEffect(() => {
        const newSocket = io(window.location.origin);
        setSocket(newSocket);

        if (user) {
            newSocket.emit('join', {
                uid: user.uid,
                name: user.displayName || user.email?.split('@')[0],
                avatar: user.photoURL
            });
        }

        newSocket.on('new_message', (msg) => {
            if (msg.channelId === activeChannel) {
                setMessages(prev => [...prev, msg]);
            }
        });

        newSocket.on('presence_update', (users) => {
            setOnlineUsers(users);
        });

        return () => {
            newSocket.disconnect();
        };
    }, [user, activeChannel]);

    useEffect(() => {
        const loadChannels = async () => {
            try {
                if (!user) return;
                const token = await user.getIdToken();
                const res = await fetch(`${API_BASE_URL}/chat/channels`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                setChannels(data);
            } catch (err) { }
        };
        loadChannels();
    }, [user]);

    useEffect(() => {
        const loadMessages = async () => {
            setIsLoading(true);
            try {
                if (!user) return;
                const token = await user.getIdToken();
                const res = await fetch(`${API_BASE_URL}/chat/channels/${activeChannel}/messages`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                setMessages(data);
            } catch (err) { } finally {
                setIsLoading(false);
            }
        };
        loadMessages();
    }, [activeChannel, user]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !socket) return;
        const text = newMessage.trim();
        setNewMessage('');
        try {
            if (!user) return;
            const token = await user.getIdToken();
            const res = await fetch(`${API_BASE_URL}/chat/channels/${activeChannel}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ text })
            });
            const created = await res.json();
            socket.emit('send_message', { ...created, channelId: activeChannel });
        } catch (err) { }
    };

    const handleDeleteMessage = async (messageId: number) => {
        if (!confirm('Are you sure you want to delete this message?')) return;
        try {
            const user = auth.currentUser;
            if (!user) return;
            const token = await user.getIdToken();
            const res = await fetch(`${API_BASE_URL}/admin/chat/${messageId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setMessages(prev => prev.filter(m => m.id !== messageId));
                showToast('Message deleted', 'success');
            } else {
                showToast('Could not delete message', 'error');
            }
        } catch (err) {
            showToast('Something went wrong', 'error');
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setUploadProgress(0);

        try {
            if (!user) return;
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
            setNewMessage(prev => prev ? `${prev} ${data.link}` : data.link);
            showToast('File uploaded!', 'success');
        } catch (err) {
            showToast('Upload failed, try again', 'error');
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
            e.target.value = '';
        }
    };

    const fileInputRef = React.useRef<HTMLInputElement>(null);

    return (
        <div className="absolute inset-4 md:inset-8 pt-20 flex flex-col md:grid md:grid-cols-[240px_1fr_200px] gap-4 md:gap-8">
            {/* Left Panel: Channels */}
            <aside className="hidden md:flex flex-col gap-2 p-4 bg-white dark:bg-gray-800 border-4 border-black dark:border-white rounded-lg shadow-hard dark:shadow-hard-dark h-full">
                <h2 className="font-grotesk text-2xl font-bold mb-2">Channels</h2>
                {channels.map(ch => (
                    <button
                        key={ch.id}
                        onClick={() => setActiveChannel(ch.id)}
                        className={`p-3 text-left font-grotesk font-bold text-lg border-2 rounded-lg transition-all ${activeChannel === ch.id ? 'bg-electric-blue text-white border-black dark:border-white' : 'border-transparent hover:border-black dark:hover:border-white'}`}
                    >
                        {ch.name}
                    </button>
                ))}
            </aside>

            {/* Center Panel: Chat */}
            <main className="flex-1 flex flex-col bg-white dark:bg-gray-800 border-4 border-black dark:border-white rounded-lg shadow-hard dark:shadow-hard-dark overflow-hidden">
                <header className="p-4 border-b-4 border-black dark:border-white flex-shrink-0">
                    <h1 className="font-grotesk text-3xl font-bold">{channels.find(c => c.id === activeChannel)?.name}</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{onlineUsers.length} users online</p>

                </header>

                <div className="flex-grow p-4 space-y-4 overflow-y-auto">
                    {messages.map(msg => (
                        <MessageBubble key={msg.id} msg={msg} isAdmin={isAdmin} onDelete={handleDeleteMessage} />
                    ))}
                </div>

                {isUploading && (
                    <div className="px-4 pt-2">
                        <div className="w-full h-6 bg-gray-200 dark:bg-gray-700 border-4 border-black dark:border-white rounded-md overflow-hidden">
                            <div
                                className="h-full bg-electric-blue transition-all duration-200 flex items-center justify-center"
                                style={{ width: `${uploadProgress}%` }}
                            >
                                <span className="text-xs font-bold text-white">{uploadProgress}%</span>
                            </div>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSendMessage} className="p-4 border-t-4 border-black dark:border-white flex-shrink-0">
                    <div className="relative">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Type a message..."
                            className="w-full p-4 pr-16 text-lg bg-gray-100 dark:bg-gray-900 border-4 border-black dark:border-white rounded-lg focus:outline-none focus:ring-4 focus:ring-electric-blue"
                        />
                        <button
                            type="submit"
                            disabled={isLoading || isUploading}
                            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-electric-blue text-white border-2 border-black dark:border-white rounded-md shadow-hard-sm dark:shadow-hard-sm-dark disabled:opacity-50"
                        >
                            <SendIcon className="w-6 h-6" />
                        </button>
                    </div>
                    <div className="flex gap-2 mt-2">
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            className="hidden"
                        />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isLoading || isUploading}
                            className="p-2 border-2 border-black dark:border-white rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50"
                        >
                            <PaperclipIcon className="w-5 h-5" />
                        </button>
                        <button type="button" className="p-2 border-2 border-black dark:border-white rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"><EmojiIcon className="w-5 h-5" /></button>
                    </div>
                </form>
            </main>

            {/* Right Panel: Users */}
            <aside className="hidden md:flex flex-col gap-2 p-4 bg-white dark:bg-gray-800 border-4 border-black dark:border-white rounded-lg shadow-hard dark:shadow-hard-dark">
                <h2 className="font-grotesk text-xl font-bold mb-2">Online Users</h2>
                <div className="space-y-3">
                    {onlineUsers.map(u => (
                        <div key={u.uid} className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-acid-green rounded-full animate-pulse" />
                            <img src={u.avatar || `https://ui-avatars.com/api/?name=${u.name}`} alt={u.name} className="w-8 h-8 rounded-md border border-black dark:border-white" />
                            <span className="font-bold text-sm truncate">{u.name}</span>
                        </div>
                    ))}
                    {onlineUsers.length === 0 && <p className="text-sm text-gray-500">No users online</p>}
                </div>
            </aside>
        </div>
    );
};

export default ChatView;
