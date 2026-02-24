
import React, { useState, useEffect } from 'react';
import type { StudyGroup, ChatMessage, SharedFile, Task } from '../types';
import { 
    ArrowRightIcon, 
    PlusIcon, 
    SendIcon, 
    PaperclipIcon, 
    MicIcon, 
    PinIcon, 
    MoreIcon, 
    CheckIcon, 
    SettingsIcon, 
    LockIcon,
    ShieldCheckIcon
} from './icons/Icons';

interface GroupDetailViewProps {
  group: StudyGroup;
  onBack: () => void;
}

type GroupTab = 'chat' | 'files' | 'tasks' | 'session' | 'members';

const mockUsers = [
    { id: 1, name: 'StudyChamp', avatar: 'https://picsum.photos/seed/user1/40/40' },
    { id: 2, name: 'Alice', avatar: 'https://picsum.photos/seed/alice/40/40' },
    { id: 3, name: 'Bob', avatar: 'https://picsum.photos/seed/bob/40/40' },
];

const mockMessages: ChatMessage[] = [
    { id: 1, author: mockUsers[1], text: 'Ready for the midterm review session tomorrow?', timestamp: '2:15 PM' },
    { id: 2, author: mockUsers[2], text: "Yep, I've compiled my notes on chapters 3-5. I'll upload them to the files section.", timestamp: '2:16 PM' },
    { id: 3, author: mockUsers[0], text: 'Important: Midterm is moved to Wednesday!', timestamp: '1:00 PM' },
];

const mockFiles: SharedFile[] = [
    { id: 1, name: 'Chapter 3 Notes.pdf', type: 'pdf', uploader: 'Alice', date: '2024-07-20'},
    { id: 2, name: 'Q-Mech Diagram.png', type: 'image', uploader: 'Bob', date: '2024-07-19'},
];

const initialTasks: Task[] = [
    { id: 1, text: 'Review Chapter 5', completed: false, priority: 'high' },
    { id: 2, text: 'Complete practice problems', completed: true, priority: 'medium' },
];

const initialMembers = [
    { id: 1, name: 'StudyChamp', avatar: 'https://picsum.photos/seed/user1/40/40', role: 'Admin', studying: true },
    { id: 2, name: 'Alice', avatar: 'https://picsum.photos/seed/alice/40/40', role: 'Member', studying: true },
    { id: 3, name: 'Bob', avatar: 'https://picsum.photos/seed/bob/40/40', role: 'Member', studying: false },
    { id: 4, name: 'Charlie', avatar: 'https://picsum.photos/seed/charlie/40/40', role: 'Member', studying: true },
]

const GroupDetailView: React.FC<GroupDetailViewProps> = ({ group: initialGroup, onBack }) => {
    const [activeTab, setActiveTab] = useState<GroupTab>('chat');
    const [group, setGroup] = useState<StudyGroup>(initialGroup);
    const [groupTasks, setGroupTasks] = useState<Task[]>(initialTasks);
    const [groupMembers, setGroupMembers] = useState(initialMembers);
    const [pinnedMessageIds, setPinnedMessageIds] = useState<number[]>([3]);
    const [toast, setToast] = useState<string | null>(null);
    const [newTaskText, setNewTaskText] = useState('');
    const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    // MOCK: Current user is Admin
    const isAdmin = true;

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    const showToast = (message: string) => setToast(message);

    const handleAddTask = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskText.trim()) return;
        const newTask: Task = {
            id: Date.now(),
            text: newTaskText,
            completed: false,
            priority: newTaskPriority,
        };
        setGroupTasks([newTask, ...groupTasks]);
        setNewTaskText('');
        setNewTaskPriority('medium');
        showToast("New Objective Logged.");
    };

    const toggleGroupTask = (id: number) => {
        setGroupTasks(prev => prev.map(t => {
            if (t.id === id) {
                const nextState = !t.completed;
                if (nextState) showToast(`Task Completed: ${t.text}`);
                return { ...t, completed: nextState };
            }
            return t;
        }));
    };

    const handleKickMember = (id: number) => {
        if (!isAdmin) return;
        setGroupMembers(groupMembers.filter(m => m.id !== id));
        showToast("Member removed from group.");
    };

    const handlePromoteMember = (id: number) => {
        if (!isAdmin) return;
        setGroupMembers(groupMembers.map(m => m.id === id ? { ...m, role: 'Admin' } : m));
        showToast("Member promoted to Admin.");
    };

    const togglePinMessage = (id: number) => {
        if (!isAdmin) return;
        setPinnedMessageIds(prev => 
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
        );
        showToast(pinnedMessageIds.includes(id) ? "Message unpinned." : "Message pinned to top.");
    };

    const handleUpdateSettings = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        setGroup({
            ...group,
            name: formData.get('name') as string,
            description: formData.get('description') as string,
            icon: formData.get('icon') as string,
            maxMembers: parseInt(formData.get('maxMembers') as string),
            isPrivate: formData.get('isPrivate') === 'on',
        });
        setIsSettingsOpen(false);
        showToast("Settings updated successfully.");
    };

    const TabButton: React.FC<{tabId: GroupTab, label: string}> = ({ tabId, label }) => (
        <button
            onClick={() => setActiveTab(tabId)}
            className={`p-3 font-grotesk font-bold text-lg border-2 rounded-lg transition-all ${activeTab === tabId ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-hard-sm' : 'border-transparent hover:border-black dark:hover:border-white'}`}
        >
            {label}
        </button>
    );

    const pinnedMessages = mockMessages.filter(m => pinnedMessageIds.includes(m.id));

    const renderContent = () => {
        switch(activeTab) {
            case 'chat': return (
                 <div className="flex-1 flex flex-col bg-white dark:bg-gray-800 border-4 border-black dark:border-white rounded-lg shadow-hard dark:shadow-hard-dark overflow-hidden h-[60vh]">
                    <header className="p-4 border-b-4 border-black dark:border-white flex-shrink-0 flex justify-between items-center">
                        <div>
                            <h2 className="font-grotesk text-xl font-bold uppercase tracking-tight">Group Feed</h2>
                            <p className="text-xs font-mono text-gray-500 uppercase">{groupMembers.length} active members</p>
                        </div>
                        <div className="flex gap-2">
                           <button className="p-2 border-2 border-black dark:border-white rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"><PinIcon className="w-5 h-5"/></button>
                           <button className="p-2 border-2 border-black dark:border-white rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"><MoreIcon className="w-5 h-5"/></button>
                        </div>
                    </header>
                    
                    {pinnedMessages.length > 0 && (
                        <div className="bg-electric-blue/10 dark:bg-electric-blue/20 border-b-4 border-black dark:border-white p-3 space-y-2">
                            <div className="flex items-center gap-2 text-[10px] font-bold text-electric-blue dark:text-blue-400 uppercase tracking-widest mb-1">
                                <PinIcon className="w-3 h-3" /> Pinned Updates
                            </div>
                            {pinnedMessages.map(pm => (
                                <div key={pm.id} className="flex items-center justify-between gap-4 bg-white dark:bg-gray-800 p-2 border-2 border-black dark:border-white rounded-md shadow-hard-sm">
                                    <div className="truncate text-xs font-medium">
                                        <span className="font-bold">{pm.author.name}:</span> {pm.text}
                                    </div>
                                    {isAdmin && (
                                        <button onClick={() => togglePinMessage(pm.id)} className="text-[10px] font-bold text-bright-red hover:underline whitespace-nowrap px-1">REMOVE</button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex-grow p-4 space-y-4 overflow-y-auto bg-gray-50 dark:bg-gray-900/50">
                        {mockMessages.map(msg => (
                            <div key={msg.id} className="group flex items-start gap-4 p-2 relative">
                                <img src={msg.author.avatar} alt={msg.author.name} className="w-10 h-10 rounded-md border-2 border-black dark:border-white shadow-hard-sm" />
                                <div className="flex-grow">
                                    <div className="flex items-baseline gap-2">
                                        <span className="font-grotesk font-bold text-sm">{msg.author.name}</span>
                                        <span className="text-[10px] font-mono text-gray-500">{msg.timestamp}</span>
                                    </div>
                                    <div className="relative flex items-center">
                                        <p className="text-sm bg-white dark:bg-gray-800 p-3 border-2 border-black dark:border-white rounded-lg mt-1 inline-block shadow-hard-sm dark:shadow-hard-sm-dark">
                                            {msg.text}
                                        </p>
                                        {isAdmin && (
                                            <button 
                                                onClick={() => togglePinMessage(msg.id)}
                                                className={`ml-3 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 border-2 border-black dark:border-white rounded-md ${pinnedMessageIds.includes(msg.id) ? 'bg-electric-blue text-white' : 'bg-white dark:bg-gray-700'}`}
                                                title="Pin message"
                                            >
                                                <PinIcon className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                     <div className="p-4 border-t-4 border-black dark:border-white bg-white dark:bg-gray-800">
                        <div className="flex gap-2">
                            <input type="text" placeholder="Type a message..." className="flex-grow p-4 text-sm bg-gray-100 dark:bg-gray-900 border-4 border-black dark:border-white rounded-lg focus:outline-none focus:ring-4 focus:ring-neon-purple font-medium"/>
                            <button className="p-4 bg-electric-blue text-white border-2 border-black rounded-lg shadow-hard-sm hover:-translate-y-0.5 transform transition"><SendIcon className="w-6 h-6"/></button>
                        </div>
                     </div>
                </div>
            );
            case 'files': return (
                <div className="space-y-4">
                    <button className="p-3 bg-acid-green text-black font-bold border-4 border-black rounded-md shadow-hard hover:-translate-y-1 transition-transform uppercase tracking-tighter">Upload Shared Note</button>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {mockFiles.map(file => (
                            <div key={file.id} className="p-4 bg-white dark:bg-gray-800 border-4 border-black dark:border-white rounded-lg shadow-hard dark:shadow-hard-dark flex justify-between items-center">
                                <div>
                                    <p className="font-bold font-grotesk text-lg">{file.name}</p>
                                    <p className="text-xs font-mono text-gray-500 uppercase">Shared by {file.uploader} • {file.date}</p>
                                </div>
                                <button className="p-2 border-2 border-black dark:border-white rounded-md font-bold text-xs hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors">GET</button>
                            </div>
                        ))}
                    </div>
                </div>
            );
            case 'tasks': return (
                 <div className="space-y-6">
                    <form onSubmit={handleAddTask} className="flex flex-col gap-4 p-6 bg-white dark:bg-gray-800 border-4 border-black dark:border-white rounded-lg shadow-hard dark:shadow-hard-dark">
                        <h3 className="text-xl font-grotesk font-bold uppercase">Assign New Task</h3>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <input
                                type="text"
                                value={newTaskText}
                                onChange={(e) => setNewTaskText(e.target.value)}
                                placeholder="Group objective..."
                                className="flex-grow p-4 text-lg bg-gray-50 dark:bg-gray-900 border-4 border-black dark:border-white rounded-lg focus:outline-none focus:ring-4 focus:ring-electric-blue font-bold"
                            />
                            <div className="flex gap-2">
                                {(['low', 'medium', 'high'] as const).map(p => (
                                    <button 
                                        key={p}
                                        type="button"
                                        onClick={() => setNewTaskPriority(p)}
                                        className={`px-4 py-2 font-mono text-[10px] font-bold border-4 border-black rounded-lg uppercase transition-all ${newTaskPriority === p ? 'bg-black text-white dark:bg-white dark:text-black scale-105' : 'bg-white dark:bg-gray-700 text-black dark:text-white'}`}
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <button type="submit" className="w-full flex items-center justify-center gap-2 p-4 bg-acid-green text-black font-grotesk text-xl font-bold border-4 border-black dark:border-white rounded-lg shadow-hard dark:shadow-hard-dark hover:bg-green-400 transition-all hover:-translate-y-1">
                            <PlusIcon className="w-6 h-6" />
                            COMMIT TO TASK
                        </button>
                    </form>

                    <div className="space-y-4">
                        {groupTasks.length === 0 ? (
                            <div className="p-8 text-center bg-gray-50 dark:bg-gray-900 border-4 border-dashed border-black dark:border-white rounded-lg">
                                <p className="text-xl font-grotesk font-bold text-gray-400">MISSION CLEAR. NO ACTIVE TASKS.</p>
                            </div>
                        ) : (
                            groupTasks.map(task => (
                                <div 
                                    key={task.id} 
                                    className={`flex items-center gap-4 p-5 bg-white dark:bg-gray-800 border-4 border-black dark:border-white rounded-lg shadow-hard dark:shadow-hard-dark transition-all ${task.completed ? 'opacity-40 grayscale' : 'hover:scale-[1.01]'}`}
                                >
                                    <button 
                                        onClick={() => toggleGroupTask(task.id)}
                                        className={`w-12 h-12 flex-shrink-0 border-4 border-black dark:border-white rounded-md flex items-center justify-center transition-colors shadow-hard-sm ${task.completed ? 'bg-acid-green' : 'bg-gray-100 dark:bg-gray-700 hover:border-neon-purple'}`}
                                    >
                                        {task.completed && <CheckIcon className="w-8 h-8 text-black"/>}
                                    </button>
                                    <div className="flex-grow">
                                        <p className={`font-grotesk text-2xl font-bold ${task.completed ? 'line-through decoration-black decoration-[6px]' : ''}`}>
                                            {task.text}
                                        </p>
                                        <div className="flex gap-2 mt-2">
                                            <span className={`px-2 py-0.5 font-mono text-[10px] font-bold border-2 border-black dark:border-white rounded uppercase ${task.priority === 'high' ? 'bg-bright-red text-white' : task.priority === 'medium' ? 'bg-yellow-400 text-black' : 'bg-acid-green text-black'}`}>
                                                PRIORITY: {task.priority}
                                            </span>
                                            {task.completed && <span className="text-[10px] font-bold text-acid-green uppercase">Mission Success</span>}
                                        </div>
                                    </div>
                                    <button className="text-gray-400 hover:text-bright-red p-2">
                                        <MoreIcon className="w-6 h-6" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                 </div>
            );
            case 'session': return (
                <div className="p-10 text-center bg-white dark:bg-gray-800 border-4 border-black dark:border-white rounded-lg shadow-hard dark:shadow-hard-dark">
                    <h2 className="font-grotesk text-3xl font-bold uppercase tracking-tight mb-2">LIVE STUDY CHAMBER</h2>
                    <p className="text-gray-500 mb-8 font-mono">{groupMembers.filter(m => m.studying).length} / {groupMembers.length} RECRUITS ACTIVE</p>
                    <div className="flex flex-wrap justify-center gap-6 my-10">
                        {groupMembers.filter(m => m.studying).map(m => (
                            <div key={m.id} className="flex flex-col items-center">
                                <div className="relative">
                                    <img src={m.avatar} className="w-24 h-24 rounded-full border-8 border-acid-green shadow-hard"/>
                                    <div className="absolute -bottom-2 -right-2 bg-acid-green w-8 h-8 rounded-full border-4 border-black animate-pulse" />
                                </div>
                                <p className="font-bold mt-4 font-grotesk text-lg uppercase tracking-widest">{m.name}</p>
                            </div>
                        ))}
                    </div>
                    <button className="p-6 bg-acid-green text-black font-grotesk font-bold text-3xl border-4 border-black rounded-lg shadow-hard hover:bg-green-400 transition-all hover:-translate-y-2 hover:shadow-[10px_10px_0px_#000]">
                        ENTER CHAMBER
                    </button>
                </div>
            );
            case 'members': return (
                <div className="space-y-4">
                    <div className="flex justify-between items-center bg-white dark:bg-gray-800 p-6 border-4 border-black dark:border-white rounded-lg shadow-hard">
                        <h3 className="text-2xl font-grotesk font-bold uppercase tracking-tighter">Personnel Directory</h3>
                        <p className="text-sm font-bold font-mono bg-gray-100 dark:bg-gray-700 px-3 py-1 border-2 border-black rounded">CAPACITY: {groupMembers.length}/{group.maxMembers}</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {groupMembers.map(m => (
                            <div 
                                key={m.id} 
                                className={`p-6 flex flex-col sm:flex-row items-center justify-between bg-white dark:bg-gray-800 border-4 rounded-lg transition-all ${m.role === 'Admin' ? 'border-neon-purple shadow-[6px_6px_0px_#8a2be2] bg-neon-purple/5' : 'border-black dark:border-white shadow-hard dark:shadow-hard-dark'}`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="relative">
                                        <img src={m.avatar} className="w-16 h-16 rounded-md border-4 border-black dark:border-white shadow-hard-sm"/>
                                        {m.studying && <span className="absolute -top-2 -right-2 block h-5 w-5 bg-acid-green rounded-full border-4 border-white dark:border-black" />}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="font-bold font-grotesk text-xl uppercase tracking-tighter">{m.name}</p>
                                            {m.role === 'Admin' && (
                                                <span className="flex items-center gap-1 bg-neon-purple text-white text-[10px] px-2 py-0.5 rounded border-2 border-black font-bold uppercase shadow-hard-sm">
                                                    <ShieldCheckIcon className="w-3 h-3"/> Leader
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">{m.studying ? 'In Active Session' : 'Standby'}</p>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2 mt-6 sm:mt-0 justify-center">
                                    {isAdmin && m.role !== 'Admin' && (
                                        <>
                                            <button 
                                                onClick={() => handlePromoteMember(m.id)}
                                                className="px-4 py-2 bg-electric-blue text-white font-bold text-[10px] border-2 border-black rounded-md shadow-hard-sm hover:translate-y-0.5 hover:shadow-none transition-all uppercase"
                                            >
                                                PROMOTE
                                            </button>
                                            <button 
                                                onClick={() => handleKickMember(m.id)}
                                                className="px-4 py-2 bg-bright-red text-white font-bold text-[10px] border-2 border-black rounded-md shadow-hard-sm hover:translate-y-0.5 hover:shadow-none transition-all uppercase"
                                            >
                                                EXCLUDE
                                            </button>
                                        </>
                                    )}
                                    <button className="px-4 py-2 bg-white dark:bg-gray-700 font-bold text-[10px] border-2 border-black dark:border-white rounded-md uppercase tracking-tight">DIRECT MESSAGE</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            );
            default: return null;
        }
    }

    return (
        <div className="space-y-8 animate-fade-in relative pb-24">
            {/* Toast Notification System */}
            {toast && (
                <div className="fixed bottom-24 right-8 z-[250] bg-black dark:bg-white text-white dark:text-black p-5 border-4 border-white dark:border-black rounded-lg shadow-[8px_8px_0px_rgba(0,0,0,0.5)] dark:shadow-[8px_8px_0px_rgba(255,255,255,0.5)] animate-slide-up flex items-center gap-4">
                    <div className="flex-shrink-0 bg-acid-green p-1.5 rounded border-2 border-black dark:border-white shadow-hard-sm">
                        <CheckIcon className="w-7 h-7 text-black" />
                    </div>
                    <div className="flex flex-col">
                        <span className="font-grotesk font-bold text-lg uppercase tracking-tighter leading-none">Objective Completed</span>
                        <span className="text-xs font-mono text-gray-400 dark:text-gray-500 mt-1 line-clamp-1">{toast}</span>
                    </div>
                    <button onClick={() => setToast(null)} className="ml-2 font-bold hover:text-bright-red transition-colors text-xl">&times;</button>
                </div>
            )}

            {isSettingsOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-xl border-8 border-black dark:border-white rounded-2xl shadow-[20px_20px_0px_#000] dark:shadow-[20px_20px_0px_#fff] p-10 animate-pop-in">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-4xl font-grotesk font-bold uppercase tracking-tighter">Group Configuration</h2>
                            <button onClick={() => setIsSettingsOpen(false)} className="text-5xl font-bold hover:text-bright-red transition-colors">&times;</button>
                        </div>
                        <form onSubmit={handleUpdateSettings} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="col-span-1 md:col-span-2">
                                    <label className="block font-grotesk font-bold mb-2 uppercase text-xs tracking-widest">Identify Group Name</label>
                                    <input name="name" defaultValue={group.name} className="w-full p-4 border-4 border-black dark:border-white rounded-xl bg-gray-50 dark:bg-gray-900 font-bold text-xl" required />
                                </div>
                                <div className="col-span-1 md:col-span-2">
                                    <label className="block font-grotesk font-bold mb-2 uppercase text-xs tracking-widest">Mission Description</label>
                                    <textarea name="description" defaultValue={group.description} className="w-full p-4 border-4 border-black dark:border-white rounded-xl bg-gray-50 dark:bg-gray-900" rows={2} />
                                </div>
                                <div>
                                    <label className="block font-grotesk font-bold mb-2 uppercase text-xs tracking-widest">Icon Glyph</label>
                                    <input name="icon" defaultValue={group.icon} className="w-full p-4 border-4 border-black dark:border-white rounded-xl bg-gray-50 dark:bg-gray-900 text-3xl text-center" />
                                </div>
                                <div>
                                    <label className="block font-grotesk font-bold mb-2 uppercase text-xs tracking-widest">Personnel Cap</label>
                                    <input type="number" name="maxMembers" defaultValue={group.maxMembers} className="w-full p-4 border-4 border-black dark:border-white rounded-xl bg-gray-50 dark:bg-gray-900 font-mono font-bold" />
                                </div>
                            </div>
                            <div className="flex items-center gap-4 p-5 border-4 border-black dark:border-white rounded-xl bg-gray-50 dark:bg-gray-900">
                                <input type="checkbox" name="isPrivate" defaultChecked={group.isPrivate} className="w-8 h-8 border-4 border-black rounded-md accent-electric-blue" />
                                <label className="font-grotesk font-bold flex items-center gap-3 text-lg uppercase tracking-tight">
                                    <LockIcon className="w-6 h-6"/> Confidential Entry Only
                                </label>
                            </div>
                            <div className="flex gap-4 mt-10">
                                <button type="button" onClick={() => setIsSettingsOpen(false)} className="flex-1 p-5 border-4 border-black font-bold rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 uppercase tracking-widest">ABORT</button>
                                <button type="submit" className="flex-1 p-5 bg-acid-green text-black border-4 border-black font-bold rounded-xl shadow-hard hover:-translate-y-2 transition-transform uppercase tracking-widest">SYNCHRONIZE</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <button onClick={onBack} className="font-bold font-grotesk text-xl flex items-center gap-2 hover:translate-x-[-8px] transition-transform uppercase tracking-tighter">
                <ArrowRightIcon className="w-6 h-6 transform rotate-180" /> RETREAT TO HUB
            </button>

            <header className="p-8 bg-white dark:bg-gray-800 border-4 border-black dark:border-white rounded-xl shadow-hard dark:shadow-hard-dark flex flex-col lg:flex-row items-center justify-between gap-8">
                <div className="flex flex-col md:flex-row items-center gap-8 text-center md:text-left w-full lg:w-auto">
                    <div className="text-7xl p-6 bg-gray-50 dark:bg-gray-900 border-4 border-black dark:border-white rounded-2xl shadow-hard">{group.icon}</div>
                    <div>
                        <div className="flex items-center justify-center md:justify-start gap-4">
                            <h1 className="text-5xl md:text-6xl font-grotesk font-bold uppercase tracking-tighter leading-none">{group.name}</h1>
                            {group.isPrivate && <LockIcon className="w-8 h-8 text-status-orange drop-shadow-hard-sm"/>}
                        </div>
                        <p className="text-xl text-gray-500 dark:text-gray-400 font-medium mt-2">{group.description}</p>
                        <div className="flex items-center justify-center md:justify-start gap-4 mt-4">
                            <span className="px-3 py-1 bg-neon-purple text-white text-xs font-bold border-2 border-black rounded uppercase shadow-hard-sm">{group.subject}</span>
                            <span className="text-sm font-mono font-bold text-gray-500 tracking-tighter uppercase">{groupMembers.length} / {group.maxMembers} PERSONNEL LOGGED</span>
                        </div>
                    </div>
                </div>
                <div className="flex flex-wrap gap-4 justify-center w-full lg:w-auto">
                    <button className="p-5 bg-electric-blue text-white font-grotesk font-bold text-2xl border-4 border-black dark:border-white rounded-xl shadow-hard hover:bg-blue-600 transition-all hover:-translate-y-1 active:translate-y-0 active:shadow-none uppercase">
                        RECRUIT
                    </button>
                    {isAdmin && (
                        <button 
                            onClick={() => setIsSettingsOpen(true)}
                            className="p-5 bg-white dark:bg-gray-700 text-black dark:text-white border-4 border-black dark:border-white rounded-xl shadow-hard hover:bg-gray-100 dark:hover:bg-gray-600 transition-all hover:-translate-y-1 uppercase"
                        >
                            <SettingsIcon className="w-8 h-8" />
                        </button>
                    )}
                    <button 
                        onClick={() => {
                            if (window.confirm("ARE YOU SURE YOU WANT TO ABANDON THIS GROUP?")) {
                                onBack();
                            }
                        }}
                        className="p-5 bg-bright-red text-white font-grotesk font-bold text-2xl border-4 border-black dark:border-white rounded-xl shadow-hard hover:bg-red-600 transition-all hover:-translate-y-1 uppercase"
                    >
                        ABANDON
                    </button>
                </div>
            </header>

            <nav className="flex flex-wrap gap-3 p-3 bg-white dark:bg-gray-800 border-4 border-black dark:border-white rounded-xl shadow-hard dark:shadow-hard-dark overflow-x-auto whitespace-nowrap scrollbar-hide">
                <TabButton tabId="chat" label="GROUP FEED" />
                <TabButton tabId="files" label="ARCHIVES" />
                <TabButton tabId="tasks" label="OBJECTIVES" />
                <TabButton tabId="session" label="CHAMBER" />
                <TabButton tabId="members" label="PERSONNEL" />
            </nav>

            <div className="min-h-[500px]">
                {renderContent()}
            </div>
        </div>
    );
};

export default GroupDetailView;
