
import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { DPDXSong, musicApi } from '../lib/musicApi';

interface MusicContextType {
    activeSong: DPDXSong | null;
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    volume: number;
    queue: DPDXSong[];
    playSong: (song: DPDXSong, autoQueue?: DPDXSong[]) => void;
    togglePlay: () => void;
    seek: (time: number) => void;
    setVolume: (volume: number) => void;
    skipNext: () => void;
    skipPrev: () => void;
}

const MusicContext = createContext<MusicContextType | undefined>(undefined);

export const MusicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [activeSong, setActiveSong] = useState<DPDXSong | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolumeState] = useState(0.7);
    const [queue, setQueue] = useState<DPDXSong[]>([]);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        const audio = new Audio();
        audio.volume = volume;
        audioRef.current = audio;

        const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
        const handleDurationChange = () => setDuration(audio.duration);
        const handleEnded = () => skipNext();
        const handlePlay = () => setIsPlaying(true);
        const handlePause = () => setIsPlaying(false);

        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('durationchange', handleDurationChange);
        audio.addEventListener('ended', handleEnded);
        audio.addEventListener('play', handlePlay);
        audio.addEventListener('pause', handlePause);

        return () => {
            audio.pause();
            audio.removeEventListener('timeupdate', handleTimeUpdate);
            audio.removeEventListener('durationchange', handleDurationChange);
            audio.removeEventListener('ended', handleEnded);
            audio.removeEventListener('play', handlePlay);
            audio.removeEventListener('pause', handlePause);
        };
    }, []);

    const playSong = (song: DPDXSong, autoQueue?: DPDXSong[]) => {
        if (audioRef.current) {
            if (activeSong?.id !== song.id) {
                const accessKey = localStorage.getItem('dpdx_access_key') || undefined;
                audioRef.current.src = musicApi.getStreamUrl(song.id, accessKey);
                setActiveSong(song);
                if (autoQueue) setQueue(autoQueue);
            }
            audioRef.current.play().catch(console.error);
            setIsPlaying(true);
        }
    };

    const togglePlay = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else if (activeSong) {
                audioRef.current.play().catch(console.error);
            }
        }
    };

    const seek = (time: number) => {
        if (audioRef.current) {
            audioRef.current.currentTime = time;
            setCurrentTime(time);
        }
    };

    const setVolume = (v: number) => {
        setVolumeState(v);
        if (audioRef.current) audioRef.current.volume = v;
    };

    const skipNext = () => {
        if (queue.length > 0 && activeSong) {
            const currentIndex = queue.findIndex(s => s.id === activeSong.id);
            if (currentIndex !== -1 && currentIndex < queue.length - 1) {
                playSong(queue[currentIndex + 1]);
            }
        }
    };

    const skipPrev = () => {
        if (queue.length > 0 && activeSong) {
            const currentIndex = queue.findIndex(s => s.id === activeSong.id);
            if (currentIndex > 0) {
                playSong(queue[currentIndex - 1]);
            }
        }
    };

    return (
        <MusicContext.Provider value={{
            activeSong, isPlaying, currentTime, duration, volume, queue,
            playSong, togglePlay, seek, setVolume, skipNext, skipPrev
        }}>
            {children}
        </MusicContext.Provider>
    );
};

export const useMusic = () => {
    const context = useContext(MusicContext);
    if (context === undefined) {
        throw new Error('useMusic must be used within a MusicProvider');
    }
    return context;
};
