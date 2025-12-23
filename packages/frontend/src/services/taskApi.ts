import { Task, TaskStatus, TaskFilters, TaskNote, TaskHistory } from '@goal-mandala/shared';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

class TaskApiClient {
  private maxRetries = 3;
  private baseDelay = 1000; // 1秒

  /**
   * 指数バックオフによるリトライ処理
   * @param fn 実行する関数
   * @param retries 残りのリトライ回数
   * @returns 関数の実行結果
   */
  private async retryWithBackoff<T>(fn: () => Promise<T>, retries = this.maxRetries): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (retries === 0) {
        throw error;
      }

      // ネットワークエラーまたは5xxエラーの場合のみリトライ
      const shouldRetry =
        error instanceof Error &&
        (error.message.includes('Network error') ||
          error.message.includes('HTTP 5') ||
          error.message.includes('Failed to fetch'));

      if (!shouldRetry) {
        throw error;
      }

      // 指数バックオフ: 1秒 → 2秒 → 4秒
      const delay = this.baseDelay * Math.pow(2, this.maxRetries - retries);
      await new Promise(resolve => setTimeout(resolve, delay));

      return this.retryWithBackoff(fn, retries - 1);
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    return this.retryWithBackoff(async () => {
      const token = localStorage.getItem('accessToken');

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
          ...options.headers,
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Network error' }));
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      return response.json();
    });
  }

  // Task CRUD operations
  async getTasks(filters?: TaskFilters, searchQuery?: string): Promise<{ tasks: Task[] }> {
    const params = new URLSearchParams();

    if (filters?.statuses?.length) {
      filters.statuses.forEach(status => params.append('status', status));
    }
    if (filters?.deadlineRange) {
      params.append('deadlineRange', filters.deadlineRange);
    }
    if (filters?.actionIds?.length) {
      filters.actionIds.forEach(id => params.append('actionIds', id));
    }
    if (searchQuery) {
      params.append('search', searchQuery);
    }

    const queryString = params.toString();
    return this.request(`/tasks${queryString ? `?${queryString}` : ''}`);
  }

  async getTaskById(
    taskId: string
  ): Promise<{ task: Task; notes: TaskNote[]; history: TaskHistory[] }> {
    return this.request(`/tasks/${taskId}`);
  }

  async updateTaskStatus(taskId: string, status: TaskStatus): Promise<{ task: Task }> {
    return this.request(`/tasks/${taskId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  // Note operations
  async addNote(taskId: string, content: string): Promise<{ note: TaskNote }> {
    return this.request(`/tasks/${taskId}/notes`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }

  async updateNote(taskId: string, noteId: string, content: string): Promise<{ note: TaskNote }> {
    return this.request(`/tasks/${taskId}/notes/${noteId}`, {
      method: 'PATCH',
      body: JSON.stringify({ content }),
    });
  }

  async deleteNote(taskId: string, noteId: string): Promise<{ success: boolean }> {
    return this.request(`/tasks/${taskId}/notes/${noteId}`, {
      method: 'DELETE',
    });
  }

  // Bulk operations
  async bulkUpdateStatus(
    taskIds: string[],
    status: TaskStatus
  ): Promise<{ success: boolean; updatedCount: number }> {
    return this.request('/tasks/bulk/status', {
      method: 'POST',
      body: JSON.stringify({ taskIds, status }),
    });
  }

  async bulkDelete(taskIds: string[]): Promise<{ success: boolean; deletedCount: number }> {
    return this.request('/tasks/bulk', {
      method: 'DELETE',
      body: JSON.stringify({ taskIds }),
    });
  }

  // Saved views
  async getSavedViews(): Promise<{
    views: Array<{ id: string; name: string; filters: TaskFilters; searchQuery?: string }>;
  }> {
    return this.request('/saved-views');
  }

  async saveView(name: string, filters: TaskFilters, searchQuery?: string): Promise<{ view: any }> {
    return this.request('/saved-views', {
      method: 'POST',
      body: JSON.stringify({ name, filters, searchQuery }),
    });
  }

  async deleteSavedView(viewId: string): Promise<{ success: boolean }> {
    return this.request(`/saved-views/${viewId}`, {
      method: 'DELETE',
    });
  }
}

export const taskApi = new TaskApiClient();
