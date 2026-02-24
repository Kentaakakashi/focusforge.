import React, { useState, useEffect } from 'react';
import type { Suggestion } from '../types';
import { UpvoteIcon, CommentIcon, PlusIcon } from './icons/Icons';
import { auth } from '../firebaseClient';

const SuggestionCard: React.FC<{
  suggestion: Suggestion;
  onUpvote: (id: number) => void;
}> = ({ suggestion, onUpvote }) => {
  return (
    <div className="p-6 bg-white dark:bg-gray-800 border-4 border-black dark:border-white rounded-lg shadow-hard dark:shadow-hard-dark flex flex-col sm:flex-row items-start sm:items-center gap-4">
      <div className="flex-grow">
        <p className="text-lg font-medium">{suggestion.text}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">by @{suggestion.author}</p>
      </div>
      <div className="flex items-center gap-4 mt-4 sm:mt-0">
        <div className="flex items-center gap-2 font-mono text-lg">
          <CommentIcon className="w-6 h-6" />
          {suggestion.comments || 0}
        </div>
        <button
          onClick={() => onUpvote(suggestion.id)}
          className="flex items-center gap-2 p-3 bg-white dark:bg-gray-700 border-2 border-black dark:border-white rounded-md font-bold text-lg shadow-hard-sm dark:shadow-hard-sm-dark hover:-translate-y-0.5 transform transition"
        >
          <UpvoteIcon className="w-6 h-6" />
          {suggestion.upvotes}
        </button>
      </div>
    </div>
  );
}

const CommunityView: React.FC = () => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [newIdea, setNewIdea] = useState('');
  const user = auth.currentUser;
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

  const fetchSuggestions = async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${API_BASE_URL}/community/suggestions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setSuggestions(data);
    } catch (err) {
      console.error("Failed to fetch suggestions:", err);
    }
  };

  useEffect(() => {
    fetchSuggestions();
  }, [user]);

  const handleSubmit = async () => {
    if (!newIdea.trim() || !user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${API_BASE_URL}/community/suggestions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ text: newIdea })
      });
      if (res.ok) {
        setNewIdea('');
        fetchSuggestions();
      }
    } catch (err) {
      console.error("Failed to submit idea:", err);
    }
  };

  const handleUpvote = async (id: number) => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${API_BASE_URL}/community/suggestions/${id}/upvote`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setSuggestions(prev => prev.map(s =>
          s.id === id ? { ...s, upvotes: s.upvotes + 1 } : s
        ));
      }
    } catch (err) {
      console.error("Failed to upvote:", err);
    }
  };

  return (
    <div className="space-y-8">
      <h1 className="text-4xl md:text-5xl font-grotesk font-bold">Community Suggestions</h1>
      <p className="text-lg text-gray-600 dark:text-gray-400">Vote on your favorite ideas or submit your own!</p>

      <div className="p-6 bg-neon-purple text-white border-4 border-black dark:border-white rounded-lg shadow-hard dark:shadow-hard-dark space-y-4">
        <h2 className="text-2xl font-grotesk font-bold">Add a Feature Idea</h2>
        <textarea
          placeholder="What's your brilliant suggestion?"
          value={newIdea}
          onChange={(e) => setNewIdea(e.target.value)}
          className="w-full p-4 text-lg bg-white dark:bg-gray-200 text-black border-4 border-black dark:border-white rounded-lg focus:outline-none focus:ring-4 focus:ring-white"
          rows={3}
        ></textarea>
        <button
          onClick={handleSubmit}
          className="flex items-center justify-center gap-2 p-4 bg-white dark:bg-gray-200 text-neon-purple font-grotesk text-xl font-bold border-4 border-black dark:border-white rounded-lg shadow-hard dark:shadow-hard-dark hover:bg-gray-200 dark:hover:bg-gray-300 transition-all hover:-translate-y-1"
        >
          <PlusIcon className="w-6 h-6" />
          Submit Idea
        </button>
      </div>

      <div className="space-y-4">
        {suggestions.map(suggestion => (
          <SuggestionCard
            key={suggestion.id}
            suggestion={suggestion}
            onUpvote={handleUpvote}
          />
        ))}
        {suggestions.length === 0 && (
          <p className="text-center text-gray-500 py-8">No suggestions yet. Be the first!</p>
        )}
      </div>
    </div>
  );
};

export default CommunityView;
