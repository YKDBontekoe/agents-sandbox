'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DragDropProvider } from './DragDropProvider';
import { AgentConfig } from '@/types/agent';
import { DragEndEvent } from '@dnd-kit/core';
import { Plus, Users, MessageSquare } from 'lucide-react';
import { useAgentDashboardStore } from '@/lib/agent-dashboard-store';
import { AgentStats } from './AgentStats';
import { AgentList } from './AgentList';
import { AgentDialogs } from './AgentDialogs';

interface AgentDashboardProps {
  onStartChat?: (agent: AgentConfig) => void;
  onStartVoice?: (agent: AgentConfig) => void;
}

export function AgentDashboard({ onStartChat, onStartVoice }: AgentDashboardProps) {
  const { agents, loadAgents, loadSessions, openForm } = useAgentDashboardStore();

  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  useEffect(() => {
    loadSessions();
    const handler = () => loadSessions();
    window.addEventListener('agent-sessions-changed', handler);
    return () => window.removeEventListener('agent-sessions-changed', handler);
  }, [loadSessions]);

  const handleCreateAgent = () => openForm();

  const handleShareAgent = async (agent: AgentConfig) => {
    try {
      await fetch('/api/marketplace/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...agent,
          visibility: 'public',
          version: agent.version || '1.0.0',
        }),
      });
    } catch (error) {
      console.error('Failed to share agent:', error);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const agentId = active.id as string;
    const agent = agents.find(a => a.id === agentId);
    if (!agent) return;
    if (over.id === 'chat-drop-zone' && onStartChat) {
      onStartChat(agent);
    } else if (over.id === 'voice-drop-zone' && onStartVoice) {
      onStartVoice(agent);
    }
  };

  const handleStartChat = (agent: AgentConfig) => onStartChat?.(agent);
  const handleStartVoice = (agent: AgentConfig) => onStartVoice?.(agent);

  return (
    <DragDropProvider agents={agents} onDragEnd={handleDragEnd}>
      <AgentDialogs />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        {/* Modern Header */}
        <div className="glass-effect border-b border-blue-100">
          <div className="container mx-auto px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Agent Dashboard
                </h1>
                <p className="text-slate-600 text-lg font-medium">
                  Create, manage, and deploy your AI agents
                </p>
              </div>
              <div className="flex items-center gap-4">
                <Link href="/workflows">
                  <Button
                    variant="outline"
                    className="border-blue-200 text-blue-600 hover:bg-blue-50"
                  >
                    Workflow Builder
                  </Button>
                </Link>
                <Button
                  onClick={handleCreateAgent}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-3 text-base font-semibold"
                >
                  <Plus className="h-5 w-5" />
                  Create Agent
                </Button>
              </div>
            </div>
          </div>
        </div>

        <AgentStats />
        <AgentList
          onStartChat={handleStartChat}
          onStartVoice={handleStartVoice}
          onShare={handleShareAgent}
        />

        {/* Modern Workflow Section */}
        <div className="container mx-auto px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Workflow Canvas */}
            <div className="lg:col-span-2">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Workflow Canvas</h2>
                <p className="text-slate-600">Drag agents here to create multi-agent workflows</p>
              </div>

              <Card className="agent-card border-0 shadow-xl p-12 text-center bg-gradient-to-br from-slate-50 to-blue-50 min-h-[400px] flex items-center justify-center">
                <div className="space-y-6">
                  <div className="mx-auto w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center animate-float">
                    <Plus className="h-12 w-12 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">Start Building Workflows</h3>
                    <p className="text-slate-600 max-w-sm mx-auto">
                      Drag agents from your collection to create powerful multi-agent workflows and automations
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center">
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">Sequential</span>
                    <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium">Parallel</span>
                    <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">Conditional</span>
                  </div>
                </div>
              </Card>
            </div>

            {/* Enhanced Quick Actions */}
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Quick Actions</h2>
                <p className="text-slate-600">Get started with common tasks</p>
              </div>

              <div className="space-y-4">
                <Card className="agent-card border-0 shadow-lg p-6 hover:shadow-xl transition-all duration-300 cursor-pointer group">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl group-hover:scale-110 transition-transform">
                      <MessageSquare className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800">Start Chat Session</h3>
                      <p className="text-sm text-slate-600">Begin conversation with an agent</p>
                    </div>
                  </div>
                </Card>

                <Card className="agent-card border-0 shadow-lg p-6 hover:shadow-xl transition-all duration-300 cursor-pointer group">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl group-hover:scale-110 transition-transform">
                      <Users className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800">Create Workflow</h3>
                      <p className="text-sm text-slate-600">Build multi-agent automation</p>
                    </div>
                  </div>
                </Card>

                <Card className="agent-card border-0 shadow-lg p-6 hover:shadow-xl transition-all duration-300 cursor-pointer group">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl group-hover:scale-110 transition-transform">
                      <Plus className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800">Import Template</h3>
                      <p className="text-sm text-slate-600">Use pre-built agent templates</p>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Pro Tips */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-800">Pro Tips</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                    <span className="text-sm text-slate-700 font-medium">Combine multiple agents for complex workflows</span>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-indigo-50 rounded-xl">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2 flex-shrink-0" />
                    <span className="text-sm text-slate-700 font-medium">Use voice agents for hands-free interactions</span>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-xl">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0" />
                    <span className="text-sm text-slate-700 font-medium">Save successful workflows as templates</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DragDropProvider>
  );
}
