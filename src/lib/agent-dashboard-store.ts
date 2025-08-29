import { create } from 'zustand';
import { AgentConfig, AgentSession } from '@/types/agent';
import { agentStore } from './agent-store';

interface DashboardState {
  agents: AgentConfig[];
  sessions: AgentSession[];
  showForm: boolean;
  editingAgent: AgentConfig | null;
  deleteDialogOpen: boolean;
  agentToDelete: string | null;
  loadAgents: () => void;
  loadSessions: () => void;
  openForm: (agent?: AgentConfig) => void;
  closeForm: () => void;
  saveAgent: (data: Omit<AgentConfig, 'id' | 'createdAt' | 'updatedAt'>) => void;
  openDeleteDialog: (id: string) => void;
  closeDeleteDialog: () => void;
  confirmDeleteAgent: () => void;
}

export const useAgentDashboardStore = create<DashboardState>((set, get) => ({
  agents: [],
  sessions: [],
  showForm: false,
  editingAgent: null,
  deleteDialogOpen: false,
  agentToDelete: null,
  loadAgents: () => set({ agents: agentStore.getAllAgents() }),
  loadSessions: () => set({ sessions: agentStore.getAllSessions() }),
  openForm: (agent) => set({ showForm: true, editingAgent: agent || null }),
  closeForm: () => set({ showForm: false, editingAgent: null }),
  saveAgent: (data) => {
    const { editingAgent } = get();
    if (editingAgent) {
      const updated = agentStore.updateAgent(editingAgent.id, data);
      if (updated) {
        set((state) => ({
          agents: state.agents.map((a) => (a.id === updated.id ? updated : a)),
        }));
      }
    } else {
      const newAgent = agentStore.createAgent(data);
      set((state) => ({ agents: [...state.agents, newAgent] }));
    }
    set({ showForm: false, editingAgent: null });
  },
  openDeleteDialog: (id) => set({ deleteDialogOpen: true, agentToDelete: id }),
  closeDeleteDialog: () => set({ deleteDialogOpen: false, agentToDelete: null }),
  confirmDeleteAgent: () => {
    const id = get().agentToDelete;
    if (id) {
      agentStore.deleteAgent(id);
      set((state) => ({
        agents: state.agents.filter((a) => a.id !== id),
        deleteDialogOpen: false,
        agentToDelete: null,
      }));
    } else {
      set({ deleteDialogOpen: false, agentToDelete: null });
    }
  },
}));
