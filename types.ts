
export type Theme = 'expressive-white' | 'midnight' | 'dark-forest' | 'minimalist';

export interface Task {
  id: number;
  text: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
}

export interface Suggestion {
  id: number;
  text: string;
  upvotes: number;
  comments: number;
  author: string;
}

export interface Friend {
  id: number;
  name: string;
  avatar: string;
  online: boolean;
  studying?: string; // e.g., 'Physics'
}

export interface Achievement {
  id: number;
  name: string;
  icon: string;
}

export interface ChatMessage {
  id: number;
  author: {
    id: number;
    name: string;
    avatar: string;
  };
  text: string;
  timestamp: string;
  reactions?: { [emoji: string]: number };
}

export interface ChatChannel {
  id: string;
  name: string;
}

export interface StudyGroup {
  id: number;
  name: string;
  icon: string;
  subject: string;
  description: string;
  memberCount: number;
  maxMembers: number;
  isPrivate: boolean;
}

export interface SharedFile {
  id: number;
  name: string;
  type: 'pdf' | 'image' | 'link' | 'doc';
  uploader: string;
  date: string;
}

export interface Doubt {
  id: number;
  title: string;
  text: string;
  topic: string;
  grade: string;
  imageUrl?: string;
  createdAt: string;
  answerCount: number;
  author: {
    id: string;
    name: string;
    avatar: string;
  };
}

export interface DoubtAnswer {
  id: number;
  text: string;
  createdAt: string;
  author: {
    id: string;
    name: string;
    avatar: string;
    isVerifiedSolver?: boolean;
  };
}

export interface DPDXSong {
  id: string;
  title: string;
  artist: string;
  audioUrl: string;
  coverUrl: string;
}

export interface DPDXProfile {
  id: string;
  name: string;
  role: string;
}
