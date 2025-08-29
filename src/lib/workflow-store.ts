import { WorkflowTemplate } from '@/types/workflow';

class WorkflowStore {
  private workflows: WorkflowTemplate[] = [];
  private baseUrl = '/api/workflows';

  async fetchWorkflows(): Promise<WorkflowTemplate[]> {
    const res = await fetch(this.baseUrl);
    const data = (await res.json()) as WorkflowTemplate[];
    this.workflows = data.map(w => this.parseWorkflow(w));
    return this.workflows;
  }

  getAllWorkflows(): WorkflowTemplate[] {
    return this.workflows;
  }

  async createWorkflow(data: Omit<WorkflowTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<WorkflowTemplate> {
    const res = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const workflow = this.parseWorkflow((await res.json()) as WorkflowTemplate);
    this.workflows.push(workflow);
    return workflow;
  }

  async updateWorkflow(id: string, updates: Partial<WorkflowTemplate>): Promise<WorkflowTemplate | null> {
    const res = await fetch(`${this.baseUrl}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) return null;
    const workflow = this.parseWorkflow((await res.json()) as WorkflowTemplate);
    this.workflows = this.workflows.map(w => (w.id === id ? workflow : w));
    return workflow;
  }

  async deleteWorkflow(id: string): Promise<boolean> {
    const res = await fetch(`${this.baseUrl}/${id}`, { method: 'DELETE' });
    if (!res.ok) return false;
    this.workflows = this.workflows.filter(w => w.id !== id);
    return true;
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
