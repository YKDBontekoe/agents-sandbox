import { WorkflowTemplate } from '@/types/workflow';
import { fetchJson } from './http';

class WorkflowStore {
  private workflows: WorkflowTemplate[] = [];

  async fetchWorkflows(): Promise<WorkflowTemplate[]> {
    const data = await fetchJson<WorkflowTemplate[]>('/workflows');
    this.workflows = data.map(w => this.parseWorkflow(w));
    return this.workflows;
  }

  getAllWorkflows(): WorkflowTemplate[] {
    return this.workflows;
  }

  async createWorkflow(data: Omit<WorkflowTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<WorkflowTemplate> {
    const workflow = this.parseWorkflow(
      await fetchJson<WorkflowTemplate>('/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
    );
    this.workflows.push(workflow);
    return workflow;
  }

  async updateWorkflow(id: string, updates: Partial<WorkflowTemplate>): Promise<WorkflowTemplate | null> {
    try {
      const workflow = this.parseWorkflow(
        await fetchJson<WorkflowTemplate>(`/workflows/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        })
      );
      this.workflows = this.workflows.map(w => (w.id === id ? workflow : w));
      return workflow;
    } catch {
      return null;
    }
  }

  async deleteWorkflow(id: string): Promise<boolean> {
    try {
      await fetchJson(`/workflows/${id}`, { method: 'DELETE' });
      this.workflows = this.workflows.filter(w => w.id !== id);
      return true;
    } catch {
      return false;
    }
  }

  clearAll(): void {
    this.workflows = [];
  }

  private parseWorkflow(raw: WorkflowTemplate): WorkflowTemplate {
    return {
      ...raw,
      createdAt: new Date(raw.createdAt),
      updatedAt: new Date(raw.updatedAt),
    };
  }
}

export const workflowStore = new WorkflowStore();
