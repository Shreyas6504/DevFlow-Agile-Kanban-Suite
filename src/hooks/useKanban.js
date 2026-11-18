import { useState, useEffect, useCallback, useMemo } from 'react';

/**
 * Custom React Hook managing Kanban state, optimistic drag-and-drop updates,
 * and background API synchronization with Node.js backend.
 */
export function useKanban(apiBaseUrl = '/api') {
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterPriority, setFilterPriority] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch tasks on initial mount
  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/tasks`);
      const json = await res.json();
      if (json.success) {
        setTasks(json.data);
      }
    } catch (err) {
      setError('Failed to synchronize sprint board with server.');
    } finally {
      setIsLoading(false);
    }
  }, [apiBaseUrl]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Optimistic Move Handler for 60fps Drag-and-Drop
  const moveTask = useCallback(async (taskId, targetStatus) => {
    // 1. Optimistic UI update
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: targetStatus } : t));

    // 2. Network sync
    try {
      await fetch(`${apiBaseUrl}/tasks/${taskId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetStatus })
      });
    } catch (err) {
      console.error('Failed to persist task move. Reverting...', err);
      fetchTasks(); // Rollback on failure
    }
  }, [apiBaseUrl, fetchTasks]);

  // Filtered tasks memoization
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      const matchesPriority = filterPriority === 'all' || t.priority.toLowerCase() === filterPriority.toLowerCase();
      const matchesSearch = !searchQuery || 
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesPriority && matchesSearch;
    });
  }, [tasks, filterPriority, searchQuery]);

  return {
    tasks: filteredTasks,
    rawTasks: tasks,
    isLoading,
    error,
    moveTask,
    refetch: fetchTasks,
    setFilterPriority,
    setSearchQuery,
    filterPriority,
    searchQuery
  };
}
