import React, { useState } from 'react';
import { useMusic } from './MusicContext';
import { PlayIcon, PauseIcon, SkipBackIcon, SkipForwardIcon, VolumeIcon, MusicIcon, ChevronUpIcon, ChevronDownIcon } from './icons/Icons';

const PersistentPlayer: React.FC = () => {
    const { activeSong, isPlaying, togglePlay, currentTime, duration, seek, volume, setVolume, skipNext, skipPrev } = useMusic();
    const [isExpanded, setIsExpanded] = useState(false);

    if (!activeSong) return null;

    const formatTime = (time: number) => {
        const mins = Math.floor(time / 60);
        const secs = Math.floor(time % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const progress = (currentTime / duration) * 100 || 0;

    return (
        <div className={`fixed bottom-0 left-0 right-0 z-50 transition-all duration-500 transform md:hidden ${isExpanded ? 'h-auto' : 'h-24'} bg-black dark:bg-black border-t-8 border-black shadow-[-20px_-20px_0px_0px_rgba(255,255,255,0.1)]`}>
            {/* Progress Bar Container */}
            <div
                className="absolute top-[-8px] left-0 w-full h-2 bg-gray-800 cursor-pointer group"
                onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    seek((x / rect.width) * duration);
                }}
            >
                <div
                    className="h-full bg-acid-green transition-all"
                    style={{ width: `${progress}%` }}
                />
                <div className="absolute top-0 right-1 text-[8px] font-black text-white/40 group-hover:text-white">
                    {formatTime(currentTime)} / {formatTime(duration)}
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between gap-6">
                {/* Song Info */}
                <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="relative group cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
                        <img
                            src={activeSong.coverUrl || `https://picsum.photos/seed/${activeSong.id}/100/100`}
                            className="w-14 h-14 border-4 border-black group-hover:scale-110 transition-transform"
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            {isExpanded ? <ChevronDownIcon className="text-white w-6 h-6" /> : <ChevronUpIcon className="text-white w-6 h-6" />}
                        </div>
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-white font-black uppercase text-lg truncate tracking-tighter">{activeSong.title}</h3>
                        <p className="text-acid-green font-mono text-xs uppercase tracking-widest truncate">{activeSong.artist}</p>
                    </div>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-4 md:gap-8">
                    <button onClick={skipPrev} className="text-white hover:text-electric-blue transition-colors">
                        <SkipBackIcon className="w-8 h-8" />
                    </button>
                    <button
                        onClick={togglePlay}
                        className="bg-white text-black p-4 border-4 border-black shadow-hard-sm hover:translate-y-0.5 active:translate-y-1 transition-all"
                    >
                        {isPlaying ? <PauseIcon className="w-8 h-8" /> : <PlayIcon className="w-8 h-8" />}
                    </button>
                    <button onClick={skipNext} className="text-white hover:text-acid-green transition-colors">
                        <SkipForwardIcon className="w-8 h-8" />
                    </button>
                </div>

                {/* Volume & Extras */}
                <div className="hidden md:flex items-center gap-4 flex-1 justify-end">
                    <VolumeIcon className="text-white w-6 h-6" />
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={volume}
                        onChange={(e) => setVolume(parseFloat(e.target.value))}
                        className="w-24 h-2 bg-gray-800 rounded-none appearance-none cursor-pointer accent-electric-blue"
                    />
                </div>
            </div>

            {/* Expanded Content (Lyrics/Vibe) */}
            {isExpanded && (
                <div className="p-12 animate-in slide-in-from-bottom-20 duration-500 overflow-y-auto max-h-[60vh] bg-black text-white">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-5xl mx-auto">
                        <div className="space-y-8">
                            <img src={activeSong.coverUrl} className="w-full aspect-square border-8 border-white shadow-hard shadow-white/10" />
                            <div className="space-y-2">
                                <h1 className="text-6xl font-black uppercase tracking-tighter leading-none">{activeSong.title}</h1>
                                <p className="text-3xl text-electric-blue font-black uppercase">{activeSong.artist}</p>
                            </div>
                        </div>
                        <div className="space-y-6">
                            <h4 className="text-xs font-black uppercase tracking-[0.5em] text-acid-green border-b-4 border-acid-green pb-2 inline-block">Transmission_Lyrics</h4>
                            <div className="font-grotesk text-3xl font-black leading-relaxed opacity-40 hover:opacity-100 transition-opacity space-y-4">
                                <p>Transmission incoming...</p>
                                <p className="text-white">Connecting to FocusForge Core</p>
                                <p>Initializing deep work state</p>
                                <p>Awaiting lyrics metadata...</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PersistentPlayer;
