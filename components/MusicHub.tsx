
import React, { useState } from 'react';
import MusicView from './MusicView';
import MusicLibrary from './MusicLibrary';

const MusicHub: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'now-playing' | 'library'>('now-playing');

    return (
        <div className="space-y-6">
            <div className="flex bg-gray-100 dark:bg-gray-800 p-1 border-4 border-black dark:border-white rounded-lg shadow-hard-sm w-fit">
                <button
                    onClick={() => setActiveTab('now-playing')}
                    className={`px-6 py-2 font-grotesk font-black uppercase transition-all ${activeTab === 'now-playing'
                        ? 'bg-black text-white dark:bg-white dark:text-black shadow-none'
                        : 'hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                >
                    Now Playing
                </button>
                <button
                    onClick={() => setActiveTab('library')}
                    className={`px-6 py-2 font-grotesk font-black uppercase transition-all ${activeTab === 'library'
                        ? 'bg-black text-white dark:bg-white dark:text-black shadow-none'
                        : 'hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                >
                    Library
                </button>
            </div>

            <div className="animate-in fade-in duration-500">
                {activeTab === 'now-playing' ? <MusicView /> : <MusicLibrary />}
            </div>
        </div>
    );
};

export default MusicHub;
