
import React, { useState, useEffect } from 'react';
import type { Task } from '../types';
import { PlusIcon, CheckIcon } from './icons/Icons';
import { auth } from '../firebaseClient';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const PriorityTag: React.FC<{ priority: 'low' | 'medium' | 'high' }> = ({ priority }) => {
  const styles = {
    low: 'bg-acid-green text-black',
    medium: 'bg-yellow-400 text-black',
    high: 'bg-bright-red text-white',
  };
  return <span className={`px-3 py-1 text-sm font-bold rounded-md ${styles[priority]}`}>{priority.toUpperCase()}</span>;
};

const TasksView: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newTaskText, setNewTaskText] = useState('');

  useEffect(() => {
    const loadTasks = async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
          setIsLoading(false);
          return;
        }
        const token = await currentUser.getIdToken();
        const response = await fetch(`${API_BASE_URL}/tasks`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!response.ok) {
          setIsLoading(false);
          return;
        }
        const data: Task[] = await response.json();
        setTasks(data);
      } catch {
      } finally {
        setIsLoading(false);
      }
    };
    loadTasks();
  }, []);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newTaskText.trim() === '') return;
    const text = newTaskText.trim();
    setNewTaskText('');
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        return;
      }
      const token = await currentUser.getIdToken();
      const response = await fetch(`${API_BASE_URL}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text }),
      });
      if (!response.ok) {
        throw new Error('Failed to create task');
      }
      const created: Task = await response.json();
      setTasks(prevTasks => [created, ...prevTasks]);
    } catch {
      const newTask: Task = {
        id: Date.now(),
        text,
        completed: false,
        priority: 'medium',
      };
      setTasks(prevTasks => [newTask, ...prevTasks]);
    }
  };

  const toggleTask = async (id: number) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        return;
      }
      const token = await currentUser.getIdToken();
      const response = await fetch(`${API_BASE_URL}/tasks/${id}/toggle`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error('Failed to toggle task');
      }
      const updated: Task = await response.json();
      setTasks(prevTasks => prevTasks.map(task => (task.id === id ? updated : task)));
    } catch {
      setTasks(prevTasks =>
        prevTasks.map(task => (task.id === id ? { ...task, completed: !task.completed } : task))
      );
    }
  };

  return (
    <div className="space-y-8">
      <h1 className="text-4xl md:text-5xl font-grotesk font-bold">My Tasks</h1>

      <form onSubmit={handleAddTask} className="flex flex-col sm:flex-row gap-4">
        <input
          type="text"
          value={newTaskText}
          onChange={(e) => setNewTaskText(e.target.value)}
          placeholder="Add a new task..."
          className="flex-grow p-4 text-lg bg-white dark:bg-gray-800 border-4 border-black dark:border-white rounded-lg focus:outline-none focus:ring-4 focus:ring-electric-blue"
        />
        <button type="submit" className="flex items-center justify-center gap-2 p-4 bg-electric-blue text-white font-grotesk text-xl font-bold border-4 border-black dark:border-white rounded-lg shadow-hard dark:shadow-hard-dark hover:bg-blue-600 transition-all hover:-translate-y-1">
          <PlusIcon className="w-6 h-6" />
          Add Task
        </button>
      </form>

      <div className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <div className="w-12 h-12 border-4 border-black dark:border-white border-t-electric-blue rounded-full animate-spin"></div>
          </div>
        ) : tasks.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-gray-800 border-4 border-black dark:border-white rounded-lg shadow-hard dark:shadow-hard-dark">
            <p className="text-xl font-grotesk font-bold">No tasks yet. Start by adding one above!</p>
          </div>
        ) : tasks.map(task => (
          <div
            key={task.id}
            className={`flex items-center gap-4 p-4 bg-white dark:bg-gray-800 border-4 border-black dark:border-white rounded-lg shadow-hard dark:shadow-hard-dark ${task.completed ? 'opacity-50' : ''}`}
          >
            <button
              onClick={() => toggleTask(task.id)}
              className={`flex-shrink-0 w-8 h-8 border-4 border-black dark:border-white rounded-md flex items-center justify-center transition-colors ${task.completed ? 'bg-acid-green' : 'bg-gray-200 dark:bg-gray-700'}`}
            >
              {task.completed && <CheckIcon className="w-6 h-6 text-black" />}
            </button>
            <p className={`flex-grow text-lg font-medium ${task.completed ? 'line-through' : ''}`}>
              {task.text}
            </p>
            <PriorityTag priority={task.priority} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default TasksView;
