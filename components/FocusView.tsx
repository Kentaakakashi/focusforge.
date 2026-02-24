
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { auth } from '../firebaseClient';
import { useMusic } from './MusicContext';

const PlayIcon = (props: any) => <svg {...props} viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>;
const PauseIcon = (props: any) => <svg {...props} viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>;

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const FOCUS_TIME = 25 * 60;
const BREAK_TIME = 5 * 60;

const FocusView: React.FC = () => {
  const [time, setTime] = useState(FOCUS_TIME);
  const [isActive, setIsActive] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [sessions, setSessions] = useState(0);
  const { activeSong, isPlaying: isMusicPlaying, togglePlay } = useMusic();

  // FIX: Use ReturnType<typeof setInterval> for browser compatibility instead of NodeJS.Timeout
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = useCallback(() => {
    setIsActive(true);
  }, []);

  const pauseTimer = useCallback(() => {
    setIsActive(false);
  }, []);

  const resetTimer = useCallback(() => {
    setIsActive(false);
    setIsBreak(false);
    setTime(FOCUS_TIME);
    setSessions(0);
  }, []);

  const handleNext = useCallback(() => {
    if (isBreak) {
      setIsBreak(false);
      setTime(FOCUS_TIME);
    } else {
      setIsBreak(true);
      setTime(BREAK_TIME);
      setSessions(s => s + 1);
    }
    setIsActive(true);
  }, [isBreak]);

  const logSession = useCallback(async (sessionType: 'focus' | 'break', durationSeconds: number) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        return;
      }
      const token = await currentUser.getIdToken();
      await fetch(`${API_BASE_URL}/focus-sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ type: sessionType, durationSeconds }),
      });
    } catch {
    }
  }, []);

  useEffect(() => {
    if (isActive) {
      intervalRef.current = setInterval(() => {
        setTime(prevTime => {
          if (prevTime <= 1) {
            logSession(isBreak ? 'break' : 'focus', isBreak ? BREAK_TIME : FOCUS_TIME);
            handleNext();
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, handleNext, isBreak, logSession]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const getBackgroundColor = () => {
    if (isBreak) return 'bg-acid-green';
    return 'bg-electric-blue';
  };

  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <div className={`w-full max-w-2xl p-8 md:p-12 border-4 border-black dark:border-white rounded-lg shadow-hard dark:shadow-hard-dark ${getBackgroundColor()}`}>
        <h1 className="font-grotesk text-3xl md:text-4xl font-bold text-white mb-2">
          {isBreak ? 'Break Time!' : 'Focus Mode'}
        </h1>
        <p className="font-mono text-7xl md:text-9xl font-bold text-white my-8">
          {formatTime(time)}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          {!isActive ? (
            <button onClick={startTimer} className="w-full sm:w-auto text-3xl font-grotesk font-bold p-4 bg-white dark:bg-gray-200 text-black border-4 border-black dark:border-white rounded-lg shadow-hard-sm dark:shadow-hard-sm-dark hover:bg-gray-200 dark:hover:bg-gray-300 transition-transform hover:-translate-y-1">
              START
            </button>
          ) : (
            <button onClick={pauseTimer} className="w-full sm:w-auto text-3xl font-grotesk font-bold p-4 bg-white dark:bg-gray-200 text-black border-4 border-black dark:border-white rounded-lg shadow-hard-sm dark:shadow-hard-sm-dark hover:bg-gray-200 dark:hover:bg-gray-300 transition-transform hover:-translate-y-1">
              PAUSE
            </button>
          )}
          <button onClick={resetTimer} className="w-full sm:w-auto text-3xl font-grotesk font-bold p-4 bg-white dark:bg-gray-200 text-black border-4 border-black dark:border-white rounded-lg shadow-hard-sm dark:shadow-hard-sm-dark hover:bg-gray-200 dark:hover:bg-gray-300 transition-transform hover:-translate-y-1">
            RESET
          </button>
        </div>
      </div>
      <div className="mt-8 p-4 bg-white dark:bg-gray-800 border-4 border-black dark:border-white rounded-lg shadow-hard dark:shadow-hard-dark">
        <p className="font-grotesk text-2xl font-bold">Sessions Completed: <span className="font-mono text-neon-purple">{sessions}</span></p>
      </div>

      {/* Music Mini-Player */}
      {activeSong && (
        <div className="mt-8 w-full max-w-2xl p-4 bg-white dark:bg-gray-800 border-4 border-black dark:border-white rounded-lg shadow-hard flex items-center gap-4 animate-in slide-in-from-bottom-4 duration-500">
          <img src={activeSong.coverUrl} alt={activeSong.title} className="w-16 h-16 border-2 border-black rounded" />
          <div className="flex-grow text-left overflow-hidden">
            <p className="text-xs font-black uppercase text-gray-500">Currently Playing</p>
            <h3 className="text-xl font-grotesk font-black uppercase truncate">{activeSong.title}</h3>
            <p className="text-sm font-bold text-electric-blue truncate">{activeSong.artist}</p>
          </div>
          <button
            onClick={togglePlay}
            className="p-4 bg-acid-green border-4 border-black rounded-full shadow-hard-sm hover:-translate-y-1 transition-all active:translate-y-0"
          >
            {isMusicPlaying ? <PauseIcon className="w-6 h-6" /> : <PlayIcon className="w-6 h-6" />}
          </button>
        </div>
      )}
    </div>
  );
};

export default FocusView;
