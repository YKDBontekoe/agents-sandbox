'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DragDropProvider } from './DragDropProvider';
import { DraggableAgentCard } from './DraggableAgentCard';
import { AgentForm } from './AgentForm';
import { AgentConfig, AgentSession } from '@/types/agent';
import { DragEndEvent } from '@dnd-kit/core';
import { agentStore } from '@/lib/agent-store';
import { Plus, Users, MessageSquare } from 'lucide-react';

interface AgentDashboardProps {
  onStartChat?: (agent: AgentConfig) => void;
  onStartVoice?: (agent: AgentConfig) => void;
}

export function AgentDashboard({ onStartChat, onStartVoice }: AgentDashboardProps) {
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingAgent, setEditingAgent] = useState<AgentConfig | null>(null);
  const [sessions, setSessions] = useState<AgentSession[]>([]);

  useEffect(() => {
    // Load agents from store
    setAgents(agentStore.getAllAgents());
  }, []);

  useEffect(() => {
    const loadSessions = () => {
      setSessions(agentStore.getAllSessions());
    };

    loadSessions();
    window.addEventListener('agent-sessions-changed', loadSessions);
    return () => window.removeEventListener('agent-sessions-changed', loadSessions);
  }, []);

  const handleCreateAgent = () => {
    setEditingAgent(null);
    setShowForm(true);
  };

  const handleEditAgent = (agent: AgentConfig) => {
    setEditingAgent(agent);
    setShowForm(true);
  };

  const handleSaveAgent = (agentData: Omit<AgentConfig, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingAgent) {
      // Update existing agent
      const updatedAgent = agentStore.updateAgent(editingAgent.id, agentData);
      if (updatedAgent) {
        setAgents(prev => prev.map(a => a.id === editingAgent.id ? updatedAgent : a));
      }
    } else {
      // Create new agent
      const newAgent = agentStore.createAgent(agentData);
      setAgents(prev => [...prev, newAgent]);
    }
    setShowForm(false);
    setEditingAgent(null);
  };

  const handleDeleteAgent = (agentId: string) => {
    if (confirm('Are you sure you want to delete this agent?')) {
      agentStore.deleteAgent(agentId);
      setAgents(prev => prev.filter(a => a.id !== agentId));
    }
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingAgent(null);
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

  const handleStartChat = (agent: AgentConfig) => {
    if (onStartChat) {
      onStartChat(agent);
    }
  };

  const handleStartVoice = (agent: AgentConfig) => {
    if (onStartVoice) {
      onStartVoice(agent);
    }
  };

  if (showForm) {
    return (
      <div className="container mx-auto p-6">
        <AgentForm
          agent={editingAgent || undefined}
          onSave={handleSaveAgent}
          onCancel={handleCancelForm}
        />
      </div>
    );
  }

  return (
    <DragDropProvider agents={agents} onDragEnd={handleDragEnd}>
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

        {/* Modern Statistics Cards */}
        <div className="container mx-auto px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="agent-card border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-lg font-semibold text-slate-700">Total Agents</CardTitle>
                <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
                  <Users className="h-6 w-6 text-white" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-4xl font-bold text-slate-800">{agents.length}</div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-slate-600">{agents.filter(a => a.type === 'chat').length} chat</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>
                    <span className="text-slate-600">{agents.filter(a => a.type === 'voice').length} voice</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="agent-card border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-lg font-semibold text-slate-700">Active Sessions</CardTitle>
                <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl">
                  <MessageSquare className="h-6 w-6 text-white" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-4xl font-bold text-slate-800">{sessions.length}</div>
                <p className="text-slate-600 font-medium">
                  Running conversations
                </p>
              </CardContent>
            </Card>
            
            <Card className="agent-card border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-lg font-semibold text-slate-700">Providers</CardTitle>
                <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl">
                  <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-4xl font-bold text-slate-800">
                  {new Set(agents.map(a => a.modelConfig.provider)).size}
                </div>
                <p className="text-slate-600 font-medium">
                  Connected services
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Modern Agents Section */}
        <div className="container mx-auto px-8 py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-slate-800 mb-2">Your Agents</h2>
              <p className="text-slate-600 text-lg">
                {agents.length === 0 ? 'No agents created yet' : `${agents.length} intelligent agents ready to work`}
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
                  onClick={handleCreateAgent}
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
                  onEdit={handleEditAgent}
                  onDelete={handleDeleteAgent}
                  onStartChat={handleStartChat}
                  onStartVoice={handleStartVoice}
                />
              ))}
            </div>
          )}
        </div>
 
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