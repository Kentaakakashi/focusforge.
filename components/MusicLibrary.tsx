
import React, { useState, useEffect } from 'react';
import { musicApi, DPDXSong, DPDXPlaylist } from '../lib/musicApi';
import { useMusic } from './MusicContext';

const SearchIcon = (props: any) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
);

const PlayIcon = (props: any) => <svg {...props} viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>;

const MusicLibrary: React.FC = () => {
    const [songs, setSongs] = useState<DPDXSong[]>([]);
    const [playlists, setPlaylists] = useState<DPDXPlaylist[]>([]);
    const [activeTab, setActiveTab] = useState<string>('all'); // 'all' or playlist id
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const { playSong, activeSong } = useMusic();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const accessKey = localStorage.getItem('dpdx_access_key');
                if (!accessKey) {
                    setIsLoading(false);
                    return;
                }

                const [allSongs, userPlaylists] = await Promise.all([
                    musicApi.getAllSongs(accessKey),
                    musicApi.getUserPlaylists(accessKey)
                ]);

                setSongs(allSongs);
                setPlaylists(userPlaylists);
            } catch (err) {
                console.error('Failed to fetch library:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    const sourceSongs = activeTab === 'all'
        ? songs
        : (playlists.find(p => p.id === activeTab)?.songs || []);

    const filteredSongs = sourceSongs.filter(song =>
        song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        song.artist.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-2">
                    <h1 className="text-5xl md:text-6xl font-grotesk font-black uppercase">Music <span className="text-acid-green">Library</span></h1>
                    <p className="text-xl font-bold opacity-70">Discover and play tracks from the DPDX collection.</p>
                </div>

                <a
                    href="https://music.dpdx.in"
                    target="_blank"
                    rel="noreferrer"
                    className="bg-neon-purple text-white px-8 py-4 border-4 border-black dark:border-white rounded-lg font-grotesk font-bold text-2xl shadow-hard hover:-translate-y-1 transition-all active:translate-y-0 active:shadow-none"
                >
                    UPLOAD MUSIC +
                </a>
            </div>

            <div className="flex gap-4">
                <div className="relative flex-grow">
                    <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search the library..."
                        className="w-full p-6 pl-14 text-2xl border-4 border-black dark:border-white rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-4 focus:ring-acid-green shadow-hard-sm"
                    />
                </div>
            </div>

            {playlists.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
                    <button
                        onClick={() => setActiveTab('all')}
                        className={`px-6 py-2 border-4 rounded-full font-black uppercase whitespace-nowrap transition-all ${activeTab === 'all' ? 'bg-black text-white dark:bg-white dark:text-black border-transparent shadow-hard-sm' : 'border-black dark:border-white hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                    >
                        ALL TRACKS
                    </button>
                    {playlists.map(p => (
                        <button
                            key={p.id}
                            onClick={() => setActiveTab(p.id)}
                            className={`px-6 py-2 border-4 rounded-full font-black uppercase whitespace-nowrap transition-all ${activeTab === p.id ? 'bg-electric-blue text-white border-transparent shadow-hard-sm' : 'border-black dark:border-white hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                        >
                            {p.name}
                        </button>
                    ))}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {isLoading ? (
                    <div className="col-span-full text-center py-20">
                        <div className="inline-block w-16 h-16 border-8 border-black dark:border-white border-t-acid-green rounded-full animate-spin"></div>
                        <p className="mt-4 text-2xl font-bold">LOADING TRACKS...</p>
                    </div>
                ) : filteredSongs.length > 0 ? (
                    filteredSongs.map(song => (
                        <div
                            key={song.id}
                            onClick={() => playSong(song, filteredSongs)}
                            className={`group relative p-6 bg-white dark:bg-gray-800 border-4 border-black dark:border-white rounded-lg shadow-hard hover:-translate-y-2 transition-all cursor-pointer ${activeSong?.id === song.id ? 'bg-acid-green bg-opacity-10 border-acid-green' : ''}`}
                        >
                            <div className="relative aspect-square mb-6 border-4 border-black dark:border-white rounded-md overflow-hidden bg-gray-800 shadow-hard-sm group-hover:shadow-hard transition-all">
                                <img
                                    src={song.coverUrl || `https://picsum.photos/seed/${encodeURIComponent(song.id)}/300/300`}
                                    alt={song.title}
                                    loading="lazy"
                                    referrerPolicy="no-referrer"
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    onError={(e) => {
                                        const img = e.target as HTMLImageElement;
                                        img.referrerPolicy = 'no-referrer';
                                        img.src = `https://picsum.photos/seed/${encodeURIComponent(song.title)}/300/300`;
                                    }}
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 flex items-center justify-center transition-all">
                                    <PlayIcon className="w-20 h-20 text-white opacity-0 group-hover:opacity-100 scale-50 group-hover:scale-100 transition-all duration-300" />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-2xl font-grotesk font-black truncate uppercase">{song.title}</h3>
                                <p className="text-lg font-bold text-electric-blue">{song.artist}</p>
                            </div>
                            {activeSong?.id === song.id && (
                                <div className="absolute top-4 right-4 flex gap-1">
                                    <div className="w-1 h-4 bg-acid-green animate-music-bar-1"></div>
                                    <div className="w-1 h-4 bg-acid-green animate-music-bar-2"></div>
                                    <div className="w-1 h-4 bg-acid-green animate-music-bar-3"></div>
                                </div>
                            )}
                        </div>
                    ))
                ) : (
                    <div className="col-span-full text-center py-20 border-4 border-dashed border-black dark:border-white rounded-lg">
                        <p className="text-3xl font-bold opacity-50 uppercase">No tracks found matching your search</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MusicLibrary;
