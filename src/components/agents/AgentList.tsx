'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, Users } from 'lucide-react';
import { DraggableAgentCard } from './DraggableAgentCard';
import { AgentConfig } from '@/types/agent';
import { useAgentDashboardStore } from '@/lib/agent-dashboard-store';

interface AgentListProps {
  onStartChat?: (agent: AgentConfig) => void;
  onStartVoice?: (agent: AgentConfig) => void;
  onShare?: (agent: AgentConfig) => void;
}

export function AgentList({ onStartChat, onStartVoice, onShare }: AgentListProps) {
  const { agents, openForm, openDeleteDialog } = useAgentDashboardStore();

  const handleEdit = (agent: AgentConfig) => openForm(agent);
  const handleDelete = (id: string) => openDeleteDialog(id);
  const handleCreate = () => openForm();

  return (
    <div className="container mx-auto px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 mb-2">Your Agents</h2>
          <p className="text-slate-600 text-lg">
            {agents.length === 0
              ? 'No agents created yet'
              : `${agents.length} intelligent agents ready to work`}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-sm text-slate-500">Quick Actions</div>
            <div className="flex gap-2 mt-2">
              <Button
                variant="outline"
                size="sm"
                className="border-blue-200 text-blue-600 hover:bg-blue-50"
              >
                Import
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-blue-200 text-blue-600 hover:bg-blue-50"
              >
                Templates
              </Button>
            </div>
          </div>
        </div>
      </div>

      {agents.length === 0 ? (
        <Card className="agent-card border-0 shadow-xl p-16 text-center bg-gradient-to-br from-blue-50 to-indigo-50">
          <div className="mx-auto w-32 h-32 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center mb-8 animate-float">
            <Users className="h-16 w-16 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-slate-800 mb-4">Create Your First Agent</h3>
          <p className="text-slate-600 text-lg mb-8 max-w-md mx-auto">
            Start building intelligent workflows with AI agents that can chat, analyze, and automate tasks for you.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={handleCreate}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-3 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <Plus className="mr-2 h-5 w-5" />
              Create Agent
            </Button>
            <Button
              variant="outline"
              className="border-2 border-blue-200 text-blue-600 hover:bg-blue-50 px-8 py-3 text-lg font-semibold rounded-xl"
            >
              Browse Templates
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {agents.map((agent) => (
            <DraggableAgentCard
              key={agent.id}
              agent={agent}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onStartChat={onStartChat}
              onStartVoice={onStartVoice}
              onShare={onShare}
            />
          ))}
        </div>
      )}
    </div>
  );
}
