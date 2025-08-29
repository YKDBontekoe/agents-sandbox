import { WorkflowTemplate } from '@/types/workflow';
import { generateId } from './utils';

class WorkflowStore {
  private workflows: Map<string, WorkflowTemplate> = new Map();
  private storageKey = 'workflow-templates';

  constructor() {
    this.loadFromStorage();
  }

  createWorkflow(data: Omit<WorkflowTemplate, 'id' | 'createdAt' | 'updatedAt'>): WorkflowTemplate {
    const workflow: WorkflowTemplate = {
      ...data,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.workflows.set(workflow.id, workflow);
    this.saveToStorage();
    return workflow;
  }

  updateWorkflow(id: string, updates: Partial<WorkflowTemplate>): WorkflowTemplate | null {
    const existing = this.workflows.get(id);
    if (!existing) return null;
    const updated: WorkflowTemplate = {
      ...existing,
      ...updates,
      id,
      updatedAt: new Date(),
    };
    this.workflows.set(id, updated);
    this.saveToStorage();
    return updated;
  }

  deleteWorkflow(id: string): boolean {
    const deleted = this.workflows.delete(id);
    if (deleted) {
      this.saveToStorage();
    }
    return deleted;
  }

  getWorkflow(id: string): WorkflowTemplate | null {
    return this.workflows.get(id) || null;
  }

  getAllWorkflows(): WorkflowTemplate[] {
    return Array.from(this.workflows.values());
  }

  private saveToStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      const data = Array.from(this.workflows.entries());
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save workflows to storage:', error);
    }
  }

  private loadFromStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) return;
      const data: [string, WorkflowTemplate][] = JSON.parse(stored);
      this.workflows = new Map(
        data.map(([id, workflow]) => [
          id,
          {
            ...workflow,
            createdAt: new Date(workflow.createdAt),
            updatedAt: new Date(workflow.updatedAt),
          },
        ]),
      );
    } catch (error) {
      console.error('Failed to load workflows from storage:', error);
    }
  }

  clearAll(): void {
    this.workflows.clear();
    this.saveToStorage();
  }
}

export const workflowStore = new WorkflowStore();
