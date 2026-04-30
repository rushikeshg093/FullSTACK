/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle2, 
  Circle, 
  Plus, 
  Trash2, 
  Calendar, 
  Layout, 
  ListTodo, 
  Search, 
  Filter, 
  ChevronRight,
  Clock,
  Tag,
  LogOut,
  Bell,
  Sparkles,
  Loader2,
  Grid2X2,
  List,
  Moon,
  Sun,
  X,
  Edit2,
  AlertCircle
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import confetti from 'canvas-confetti';
import { cn } from './lib/utils';

// --- Types ---
type Priority = 'low' | 'medium' | 'high';
type Category = 'Work' | 'Personal' | 'Urgent' | 'Shopping';
type ViewMode = 'list' | 'grid';
type SortOption = 'newest' | 'priority' | 'due_date';

interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'completed';
  priority: Priority;
  category: Category;
  dueDate: string;
  createdAt: number;
}

// --- Constants ---
const INITIAL_TASKS: Task[] = [
  {
    id: '1',
    title: 'Design TaskFlow Landing Page',
    description: 'Create a high-fidelity mockup for the new landing page using the Minimalist recipe.',
    status: 'todo',
    priority: 'high',
    category: 'Work',
    dueDate: '2026-05-02',
    createdAt: Date.now() - 86400000
  },
  {
    id: '2',
    title: 'Review Quarterly Reports',
    description: 'Go through the Q1 metrics and prepare a summary for the team.',
    status: 'completed',
    priority: 'medium',
    category: 'Work',
    dueDate: '2026-04-30',
    createdAt: Date.now() - 172800000
  },
  {
    id: '3',
    title: 'Buy Groceries',
    description: 'Milk, Eggs, Bread, and Coffee beans.',
    status: 'todo',
    priority: 'low',
    category: 'Shopping',
    dueDate: '2026-05-01',
    createdAt: Date.now()
  }
];

const CATEGORIES: Category[] = ['Work', 'Personal', 'Urgent', 'Shopping'];

// --- Components ---

function Badge({ children, variant = 'gray' }: { children: React.ReactNode, variant?: 'red' | 'blue' | 'green' | 'gray' | 'orange' }) {
  const styles = {
    red: 'bg-red-50/50 text-red-600 border-red-100/50',
    blue: 'bg-blue-50/50 text-blue-600 border-blue-100/50',
    green: 'bg-emerald-50/50 text-emerald-600 border-emerald-100/50',
    gray: 'bg-slate-100/50 text-slate-500 border-slate-200/50',
    orange: 'bg-orange-50/50 text-orange-600 border-orange-100/50',
  };

  return (
    <span className={cn(
      "px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border",
      styles[variant]
    )}>
      {children}
    </span>
  );
}

export default function App() {
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('taskflow_demo_tasks');
    return saved ? JSON.parse(saved) : INITIAL_TASKS;
  });
  
  const [activeCategory, setActiveCategory] = useState<Category | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<Priority>('medium');
  const [selectedCategory, setSelectedCategory] = useState<Category>('Work');
  const [isAiLoading, setIsAiLoading] = useState(false);
  
  // New features state
  const [viewMode, setViewMode] = useState<ViewMode>(() => (localStorage.getItem('taskflow_view_mode') as ViewMode) || 'list');
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('taskflow_dark_mode') === 'true');
  const [sortOption, setSortOption] = useState<SortOption>('newest');
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  useEffect(() => {
    localStorage.setItem('taskflow_demo_tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('taskflow_view_mode', viewMode);
  }, [viewMode]);

  useEffect(() => {
    localStorage.setItem('taskflow_dark_mode', String(isDarkMode));
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const stats = useMemo(() => {
    const completed = tasks.filter(t => t.status === 'completed').length;
    const total = tasks.length;
    const percentage = total > 0 ? (completed / total) * 100 : 0;
    return { completed, total, percentage };
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    let result = tasks
      .filter(t => activeCategory === 'All' || t.category === activeCategory)
      .filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase()));

    // Sorting
    result.sort((a, b) => {
      if (sortOption === 'newest') return b.createdAt - a.createdAt;
      if (sortOption === 'due_date') return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      if (sortOption === 'priority') {
        const pMap = { high: 3, medium: 2, low: 1 };
        return pMap[b.priority] - pMap[a.priority];
      }
      return 0;
    });

    return result;
  }, [tasks, activeCategory, searchQuery, sortOption]);

  const addTask = (e?: React.FormEvent, customTitle?: string) => {
    e?.preventDefault();
    const title = customTitle || newTaskTitle;
    if (!title.trim()) return;

    const newTask: Task = {
      id: Math.random().toString(36).substr(2, 9),
      title: title,
      status: 'todo',
      priority: selectedPriority,
      category: selectedCategory,
      dueDate: new Date().toISOString().split('T')[0],
      createdAt: Date.now()
    };

    setTasks([newTask, ...tasks]);
    if (!customTitle) setNewTaskTitle('');
  };

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === id) {
        const newStatus = t.status === 'completed' ? 'todo' : 'completed';
        if (newStatus === 'completed') {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#6366f1', '#10b981', '#f59e0b']
          });
        }
        return { ...t, status: newStatus as 'todo' | 'completed' };
      }
      return t;
    }));
  };

  const updateTask = (updatedTask: Task) => {
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
    setEditingTask(null);
  };

  const deleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const suggestAITask = async () => {
    if (isAiLoading) return;
    setIsAiLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `Based on these existing tasks: ${tasks.map(t => t.title).join(', ')}. Suggest 1 new professional task (max 6 words). Return ONLY the task title.`;
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      const suggestion = response.text?.trim().replace(/"/g, '') || "New Project Concept";
      setNewTaskTitle(suggestion);
    } catch (error) {
      console.error("AI Skill Check: Missing API Key or Error", error);
      setNewTaskTitle("Brainstorm new ideas");
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className={cn(
      "min-h-screen flex font-sans transition-colors duration-500 selection:bg-indigo-100 selection:text-indigo-900",
      isDarkMode ? "bg-[#09090b] text-slate-100" : "bg-[#fafafa] text-[#09090b]"
    )}>
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex w-64 h-screen flex-col bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 sticky top-0 overflow-hidden">
        <div className="p-6 flex-1 overflow-y-auto">
          <div className="flex items-center gap-3 mb-10 group cursor-pointer px-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-sm group-hover:scale-110 transition-transform">
              <Layout size={18} />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white italic">TaskFlow</h1>
          </div>

          <nav className="space-y-1">
            <NavItem 
              icon={<ListTodo size={18} />} 
              label="All Tasks" 
              active={activeCategory === 'All'} 
              onClick={() => setActiveCategory('All')} 
              count={tasks.length}
            />
            <div className="pt-6 pb-2 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1">Categories</div>
            {CATEGORIES.map(cat => (
              <NavItem 
                key={cat}
                icon={<Tag size={18} />} 
                label={cat} 
                active={activeCategory === cat} 
                onClick={() => setActiveCategory(cat)}
                count={tasks.filter(t => t.category === cat).length}
              />
            ))}
          </nav>
        </div>

        <div className="p-8 pt-0 bg-gradient-to-t from-white dark:from-slate-900 via-white dark:via-slate-900 to-transparent">
          <div className="bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-6 mb-6">
             <div className="flex justify-between items-center mb-2">
                <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Storage Used</h3>
                <span className="text-[10px] font-bold text-indigo-600">45%</span>
             </div>
             <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
               <motion.div 
                 initial={{ width: 0 }}
                 animate={{ width: '45%' }}
                 className="h-full bg-indigo-600" 
               />
             </div>
          </div>
          
          <div className="flex items-center gap-3 py-4 border-t border-slate-50 dark:border-slate-800 px-2 text-slate-400">
            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="User" className="w-8 h-8 rounded-full border border-slate-100 dark:border-slate-800 shadow-sm" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight truncate">Rushikesh G.</p>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Free Plan</p>
            </div>
            <LogOut size={14} className="text-slate-300 hover:text-red-500 cursor-pointer transition-colors" />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 h-screen overflow-y-auto">
        <header className="h-16 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800 flex items-center justify-between px-8 sticky top-0 z-20">
          <div className="flex items-center flex-1 max-w-xl bg-slate-100/50 dark:bg-slate-800/20 rounded-lg px-4 py-2 border border-transparent focus-within:bg-white dark:focus-within:bg-slate-800 focus-within:border-slate-200 dark:focus-within:border-slate-700 transition-all">
            <Search size={16} className="text-slate-400 mr-2" />
            <input 
              type="text" 
              placeholder="Search tasks..."
              className="bg-transparent border-none outline-none w-full text-xs font-medium text-slate-600 dark:text-slate-300 placeholder:text-slate-400 dark:placeholder:text-slate-600"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-4 ml-6">
            <div className="relative cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 p-2 rounded-lg transition-colors">
              <Bell size={18} className="text-slate-400 dark:text-slate-400" />
              <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
            </div>
            <div className="h-4 w-px bg-slate-100 dark:bg-slate-800"></div>
            <button className="flex items-center gap-2 bg-slate-900 dark:bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-black dark:hover:bg-indigo-700 active:scale-[0.98] transition-all whitespace-nowrap">
              <Plus size={16} />
              <span>Create Task</span>
            </button>
          </div>
        </header>

        <div className="p-8 pb-20 max-w-6xl mx-auto">
          {/* Dashboard Stats */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <StatCard 
              label="Tasks Completed" 
              value={`${stats.percentage.toFixed(0)}%`} 
              subValue={`${stats.completed}/${stats.total} total tasks`} 
              accent="indigo"
              progress={stats.percentage}
            />
            <StatCard 
              label="Efficiency Score" 
              value="84" 
              subValue="Super productive week!" 
              accent="green"
              progress={84}
            />
            <StatCard 
              label="Next Deadline" 
              value="12h" 
              subValue="Quarterly Review prep" 
              accent="orange"
            />
          </section>

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12">
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-0.5">Dashboard</div>
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                Activity Control
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700">
                <button 
                  onClick={() => setViewMode('list')}
                  className={cn(
                    "p-1.5 rounded-md transition-all",
                    viewMode === 'list' ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  )}
                >
                  <List size={18} />
                </button>
                <button 
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    "p-1.5 rounded-md transition-all",
                    viewMode === 'grid' ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  )}
                >
                  <Grid2X2 size={18} />
                </button>
              </div>

              <div className="relative group">
                <button className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 hover:border-slate-300 transition-all shadow-sm">
                  <Filter size={14} />
                  <span className="capitalize">{sortOption.replace('_', ' ')}</span>
                </button>
                <div className="absolute right-0 top-full mt-1.5 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-30">
                  <button onClick={() => setSortOption('newest')} className="w-full text-left px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">Newest</button>
                  <button onClick={() => setSortOption('priority')} className="w-full text-left px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">Priority</button>
                  <button onClick={() => setSortOption('due_date')} className="w-full text-left px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">Due Date</button>
                </div>
              </div>

              <button 
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 shadow-sm active:scale-95 transition-all"
              >
                {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
              </button>
            </div>
          </div>

          {/* Task Form */}
          <motion.form 
            onSubmit={addTask}
            className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 mb-12 shadow-sm focus-within:border-slate-200 dark:focus-within:border-slate-700 transition-all group"
          >
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                  {isAiLoading ? <Loader2 className="animate-spin" size={18} /> : <Plus size={20} />}
                </div>
                <div className="flex-1 flex items-center gap-4">
                  <input 
                    type="text" 
                    placeholder="Describe your next task..."
                    className="flex-1 bg-transparent border-none outline-none text-xl font-bold text-slate-900 dark:text-white placeholder:text-slate-200 dark:placeholder:text-slate-700"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                  />
                  <button 
                    type="button"
                    onClick={suggestAITask}
                    disabled={isAiLoading}
                    className="p-2 text-slate-300 hover:text-indigo-500 transition-colors"
                    title="AI Help"
                  >
                    <Sparkles size={18} />
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-4 sm:pl-14 pt-4 border-t border-slate-50 dark:border-slate-800/50">
                <select 
                  className="bg-transparent text-[10px] font-bold text-slate-400 uppercase tracking-widest outline-none cursor-pointer appearance-none"
                  value={selectedPriority}
                  onChange={(e) => setSelectedPriority(e.target.value as Priority)}
                >
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                </select>
                
                <div className="w-1 h-1 bg-slate-200 dark:bg-slate-700 rounded-full"></div>

                <select 
                  className="bg-transparent text-[10px] font-bold text-slate-400 uppercase tracking-widest outline-none cursor-pointer appearance-none"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value as Category)}
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>

                <button type="submit" className="ml-auto flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-xs font-bold hover:bg-indigo-700 active:scale-95 transition-all shadow-sm">
                  Add Task
                </button>
              </div>
            </div>
          </motion.form>

          {/* Task List */}
          <div className="space-y-6">
            <div className="flex items-center justify-between px-2 mb-4">
               <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Tasks</h3>
               <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800 mx-6"></div>
               <span className="text-xs font-bold text-slate-400">{filteredTasks.length} total</span>
            </div>

            <div className={cn(
              "transition-all duration-500",
              viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 gap-6" : "space-y-6"
            )}>
              <AnimatePresence mode="popLayout" initial={false}>
                {filteredTasks.map((task) => (
                  <TaskItem 
                    key={task.id} 
                    task={task} 
                    viewMode={viewMode}
                    onToggle={toggleTask} 
                    onDelete={deleteTask} 
                    onEdit={() => setEditingTask(task)}
                  />
                ))}
              </AnimatePresence>
            </div>

            {filteredTasks.length === 0 && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }} 
                animate={{ opacity: 1, scale: 1 }}
                className="bg-slate-50/50 dark:bg-slate-800/20 border-4 border-dotted border-slate-100 dark:border-slate-800 rounded-[2.5rem] p-20 flex flex-col items-center text-center"
              >
                <div className="w-20 h-20 bg-white dark:bg-slate-900 rounded-3xl shadow-sm flex items-center justify-center text-slate-200 dark:text-slate-700 mb-6 border border-slate-100 dark:border-slate-800">
                  <ListTodo size={40} />
                </div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">No tasks yet</h3>
                <p className="text-slate-400 dark:text-slate-500 max-sm:text-xs max-w-sm font-medium">Your workspace is empty. Start by adding a task or use the AI suggest button above.</p>
              </motion.div>
            )}
          </div>
        </div>
      </main>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingTask && (
          <EditModal 
            task={editingTask} 
            onClose={() => setEditingTask(null)} 
            onSave={updateTask} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// --- New Subcomponents ---

function EditModal({ task, onClose, onSave }: { task: Task, onClose: () => void, onSave: (task: Task) => void }) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [priority, setPriority] = useState<Priority>(task.priority);
  const [category, setCategory] = useState<Category>(task.category);
  const [dueDate, setDueDate] = useState(task.dueDate);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl"
      >
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-600">
               <Edit2 size={20} />
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Edit Task</h2>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Task Title</label>
            <input 
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 py-4 text-slate-900 dark:text-white font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Description</label>
            <textarea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 py-4 text-slate-900 dark:text-white font-medium outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all resize-none"
              placeholder="Add more details about this task..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Priority</label>
              <select 
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 py-4 text-slate-900 dark:text-white font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Due Date</label>
              <input 
                type="date" 
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 py-4 text-slate-900 dark:text-white font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
              />
            </div>
          </div>
        </div>

        <div className="p-8 bg-slate-50 dark:bg-slate-800/50 flex gap-4">
          <button 
            onClick={onClose}
            className="flex-1 py-4 text-sm font-black text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={() => onSave({ ...task, title, description, priority, category, dueDate })}
            className="flex-[2] bg-indigo-600 text-white py-4 rounded-2xl text-sm font-black shadow-xl shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 transition-all"
          >
            Save Changes
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// --- Subcomponents ---

function NavItem({ icon, label, active, onClick, count }: { icon: React.ReactNode, label: string, active?: boolean, onClick: () => void, count?: number }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold transition-all group",
        active 
          ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white' 
          : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-600'
      )}
    >
      <span className={cn("transition-colors", active ? 'text-indigo-500' : 'text-slate-300 group-hover:text-slate-400')}>{icon}</span>
      <span className="flex-1 text-left">{label}</span>
      {count !== undefined && (
        <span className={cn(
          "text-[10px] px-1.5 py-0.5 rounded-md font-bold",
          active ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600' : 'bg-slate-50 dark:bg-slate-800 text-slate-400'
        )}>
          {count}
        </span>
      )}
    </button>
  );
}

function StatCard({ label, value, subValue, progress }: { label: string, value: string, subValue: string, accent: 'indigo' | 'green' | 'orange', progress?: number }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm group transition-all">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">{label}</p>
      <div className="flex items-baseline gap-2 mb-1">
        <h4 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{value}</h4>
        {progress !== undefined && (
          <span className="text-[10px] font-bold text-emerald-500">+{progress.toFixed(0)}%</span>
        )}
      </div>
      <p className="text-[10px] text-slate-400 font-medium tracking-tight">
        {subValue}
      </p>
    </div>
  );
}

function TaskItem({ task, onToggle, onDelete, onEdit, viewMode }: { task: Task, onToggle: (id: string) => void, onDelete: (id: string) => void, onEdit: () => void, viewMode: ViewMode }) {
  const isCompleted = task.status === 'completed';
  const isGridView = viewMode === 'grid';
  
  const priorityColors = {
    low: 'blue' as const,
    medium: 'orange' as const,
    high: 'red' as const,
  };

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className={cn(
        "group bg-white dark:bg-slate-900 border rounded-xl flex transition-all",
        isGridView ? "flex-col p-6 h-full" : "p-4 items-center gap-4",
        isCompleted 
          ? 'border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/10' 
          : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 hover:shadow-sm'
      )}
    >
      <div className={cn("flex items-center gap-3", isGridView && "mb-4")}>
        <button 
          onClick={() => onToggle(task.id)}
          className={cn(
            "flex-shrink-0 transition-all duration-300 transform active:scale-90",
            isCompleted ? 'text-emerald-500' : 'text-slate-200 dark:text-slate-700 hover:text-slate-300'
          )}
        >
          {isCompleted ? <CheckCircle2 size={20} /> : <Circle size={20} />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h5 className={cn(
              "text-sm font-bold transition-all truncate",
              isCompleted ? 'text-slate-300 dark:text-slate-700 line-through' : 'text-slate-900 dark:text-white'
            )}>
              {task.title}
            </h5>
            {!isGridView && (
              <Badge variant={priorityColors[task.priority]}>{task.priority}</Badge>
            )}
          </div>
        </div>
      </div>

      {!isGridView && task.description && !isCompleted && (
        <p className="hidden md:block flex-1 text-xs text-slate-400 dark:text-slate-500 truncate font-medium">
          {task.description}
        </p>
      )}

      {isGridView && task.description && !isCompleted && (
        <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-4 flex-1 line-clamp-2 leading-relaxed">
          {task.description}
        </p>
      )}

      <div className={cn(
        "flex items-center gap-4 text-[10px] font-bold text-slate-300 dark:text-slate-600 uppercase tracking-wider",
        isGridView ? "mt-auto pt-4 border-t border-slate-50 dark:border-slate-800 w-full" : "ml-auto"
      )}>
        {!isGridView && (
          <div className="flex items-center gap-1.5">
            <Calendar size={12} />
            <span>{task.dueDate}</span>
          </div>
        )}
        
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
          <button 
            onClick={onEdit}
            className="p-1.5 text-slate-300 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            <Edit2 size={14} />
          </button>
          <button 
            onClick={() => onDelete(task.id)}
            className="p-1.5 text-slate-300 hover:text-red-500 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
