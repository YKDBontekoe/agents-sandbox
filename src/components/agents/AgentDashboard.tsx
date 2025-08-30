'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Container, Stack, Inline } from '@/components/ui/layout';
import { DragDropProvider } from './DragDropProvider';
import { DraggableAgentCard } from './DraggableAgentCard';
import { AgentForm } from './AgentForm';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { AgentConfig, AgentSession } from '@/types/agent';
import { DragEndEvent } from '@dnd-kit/core';
import {
  fetchAgents,
  createAgent,
  updateAgent,
  deleteAgent,
} from '@/lib/agents/repository';
import { sessionStore } from '@/lib/agents/session-store';
import { Plus, Users, MessageSquare, Workflow, Upload, Download, Bot, Search, Filter } from 'lucide-react';

interface DashboardState {
  showCreateAgent: boolean;
  showWorkflowBuilder: boolean;
  activeView: 'dashboard' | 'agents' | 'workflows' | 'chat';
  searchQuery: string;
  filterStatus: 'all' | 'active' | 'inactive';
}

interface AgentDashboardProps {
  onStartChat?: (agent: AgentConfig) => void;
  onStartVoice?: (agent: AgentConfig) => void;
}

export function AgentDashboard({ onStartChat, onStartVoice }: AgentDashboardProps) {
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingAgent, setEditingAgent] = useState<AgentConfig | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState<string | null>(null);
  const [sessions, setSessions] = useState<AgentSession[]>([]);
  const [sharingAgents, setSharingAgents] = useState<Set<string>>(new Set());
  const [sharedAgents, setSharedAgents] = useState<Set<string>>(new Set());
  const [dashboardState, setDashboardState] = useState<DashboardState>({
    showCreateAgent: false,
    showWorkflowBuilder: false,
    activeView: 'dashboard',
    searchQuery: '',
    filterStatus: 'all'
  });

  useEffect(() => {
    fetchAgents()
      .then(setAgents)
      .catch(error => {
        console.error(error);
        toast.error(
          error instanceof Error
            ? error.message
            : 'Failed to fetch agents'
        );
      });
  }, []);

  useEffect(() => {
    const loadSessions = () => {
      setSessions(sessionStore.getAllSessions());
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

  const handleSaveAgent = async (
    agentData: Omit<AgentConfig, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    try {
      if (editingAgent) {
        const updatedAgent = await updateAgent(editingAgent.id, agentData);
        setAgents(prev =>
          prev.map(a => (a.id === editingAgent.id ? updatedAgent : a))
        );
      } else {
        const newAgent = await createAgent(agentData);
        setAgents(prev => [...prev, newAgent]);
      }
      setShowForm(false);
      setEditingAgent(null);
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to save agent'
      );
    }
  };

  const handleDeleteAgent = (agentId: string) => {
    setAgentToDelete(agentId);
    setDeleteDialogOpen(true);
  };

  const handleShareAgent = async (agent: AgentConfig) => {
    if (sharingAgents.has(agent.id) || sharedAgents.has(agent.id)) return;
    setSharingAgents(prev => new Set(prev).add(agent.id));
    try {
      const response = await fetch('/api/marketplace/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...agent,
          visibility: 'public',
          version: agent.version || '1.0.0',
        }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        const message =
          data?.message ||
          data?.error ||
          (data?.errors && Object.values(data.errors).join(', ')) ||
          'Failed to share agent';
        toast.error(message);
        return;
      }

      toast.success('Agent shared successfully');
      setSharedAgents(prev => new Set(prev).add(agent.id));
    } catch (error) {
      toast.error('Failed to share agent');
    } finally {
      setSharingAgents(prev => {
        const next = new Set(prev);
        next.delete(agent.id);
        return next;
      });
    }
  };

  const handleSearchChange = (query: string) => {
    setDashboardState(prev => ({ ...prev, searchQuery: query }));
  };

  const handleFilterChange = (status: 'all' | 'active' | 'inactive') => {
    setDashboardState(prev => ({ ...prev, filterStatus: status }));
  };

  // Filter agents based on search and status
  const filteredAgents = agents.filter(agent => {
    const matchesSearch = agent.name.toLowerCase().includes(dashboardState.searchQuery.toLowerCase()) ||
                         agent.description.toLowerCase().includes(dashboardState.searchQuery.toLowerCase());
    
    if (dashboardState.filterStatus === 'all') return matchesSearch;
    
    // For now, consider agents with recent sessions as 'active'
    const hasRecentSessions = sessions.some(session => 
      session.agentId === agent.id && 
      new Date(session.createdAt).getTime() > Date.now() - 24 * 60 * 60 * 1000
    );
    
    const isActive = hasRecentSessions;
    return matchesSearch && (dashboardState.filterStatus === 'active' ? isActive : !isActive);
  });

  const confirmDeleteAgent = async () => {
    if (agentToDelete) {
      try {
        await deleteAgent(agentToDelete);
        setAgents(prev => prev.filter(a => a.id !== agentToDelete));
      } catch (error) {
        console.error(error);
        toast.error(
          error instanceof Error ? error.message : 'Failed to delete agent'
        );
      }
    }
    setDeleteDialogOpen(false);
    setAgentToDelete(null);
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

  const handleImportAgents = useCallback(() => {
    toast.success('Import functionality coming soon!');
  }, []);

  const handleBrowseTemplates = useCallback(() => {
    toast.success('Template browser coming soon!');
  }, []);

  const handleCreateWorkflow = useCallback(() => {
    setDashboardState(prev => ({ ...prev, showWorkflowBuilder: true }));
  }, []);

  const handleExportAgents = useCallback(() => {
     const dataStr = JSON.stringify(agents, null, 2);
     const dataBlob = new Blob([dataStr], { type: 'application/json' });
     const url = URL.createObjectURL(dataBlob);
     const link = document.createElement('a');
     link.href = url;
     link.download = 'agents-export.json';
     link.click();
     URL.revokeObjectURL(url);
     toast.success('Agents exported successfully!');
   }, [agents]);

   const handleStartChatSession = useCallback(() => {
     if (agents.length === 0) {
       toast.error('Create an agent first to start a chat session');
       return;
     }
     // Use the first available agent for quick start
     const firstAgent = agents[0];
     if (onStartChat) {
       onStartChat(firstAgent);
     } else {
       setDashboardState(prev => ({ ...prev, activeView: 'chat' }));
       toast.success(`Starting chat with ${firstAgent.name}`);
     }
   }, [agents, onStartChat]);

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
        <Toaster />
        <ConfirmDialog
          open={deleteDialogOpen}
          title="Delete Agent"
          description="Are you sure you want to delete this agent?"
          confirmLabel="Delete"
          cancelLabel="Cancel"
          onConfirm={confirmDeleteAgent}
          onCancel={() => {
            setDeleteDialogOpen(false);
            setAgentToDelete(null);
          }}
        />
      <Container size="full" className="min-h-screen bg-transparent">
        {/* Apple Header with Breadcrumbs */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <Container size="full" padding="lg">
            {/* Breadcrumb Navigation */}
            <nav className="py-2" aria-label="Breadcrumb">
              <ol className="flex items-center space-x-2 text-sm">
                <li>
                  <a href="/" className="apple-text-secondary hover:text-blue-600 transition-colors">
                    Home
                  </a>
                </li>
                <li className="apple-text-secondary">/</li>
                <li className="apple-text-primary font-medium" aria-current="page">
                  Agent Dashboard
                </li>
              </ol>
            </nav>
            
            <div className="flex items-center justify-between py-4">
              <div className="space-y-2">
                <h1 className="text-4xl font-bold apple-text-primary">
                  Agent Dashboard
                </h1>
                <p className="apple-text-secondary text-base max-w-2xl">
                  Design, deploy, and orchestrate intelligent AI agents
                </p>
                <div className="flex items-center gap-4 mt-3">
                  <span className="inline-flex items-center gap-1 text-xs apple-text-secondary">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    {agents.length} Active Agent{agents.length !== 1 ? 's' : ''}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs apple-text-secondary">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    {sessions.length} Active Session{sessions.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  className="apple-button-secondary flex items-center gap-2" 
                  onClick={handleCreateWorkflow}
                  title="Open workflow builder"
                >
                  <Workflow className="h-4 w-4" />
                  Workflow Builder
                </button>
                <button 
                  className="apple-button flex items-center gap-2" 
                  onClick={handleCreateAgent}
                  title="Create a new AI agent"
                >
                  <Plus className="h-4 w-4" />
                  Create Agent
                </button>
              </div>
            </div>
          </Container>
        </div>

        {/* Apple Statistics Cards */}
        <Container size="full" padding="lg">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <div className="apple-card-elevated p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm apple-text-secondary mb-1">Total Agents</h3>
                  <div className="apple-stats-number">{agents.length}</div>
                </div>
                <div className="apple-icon-container bg-blue-500">
                  <Bot className="h-5 w-5 text-white" />
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="apple-text-secondary text-sm">{agents.filter(a => a.type === 'chat').length} Chat</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="apple-text-secondary text-sm">{agents.filter(a => a.type === 'voice').length} Voice</span>
                </div>
              </div>
            </div>
            
            <div className="apple-card-elevated p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm apple-text-secondary mb-1">Active Sessions</h3>
                  <div className="apple-stats-number">{sessions.length}</div>
                </div>
                <div className="apple-icon-container bg-green-500">
                  <MessageSquare className="h-5 w-5 text-white" />
                </div>
              </div>
              <p className="apple-text-secondary text-sm">
                Running conversations
              </p>
            </div>
            
            <div className="apple-card-elevated p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm apple-text-secondary mb-1">Providers</h3>
                  <div className="apple-stats-number">
                    {new Set(agents.map(a => a.modelConfig.provider)).size}
                  </div>
                </div>
                <div className="apple-icon-container bg-purple-500">
                   <Users className="h-5 w-5 text-white" />
                 </div>
              </div>
              <p className="apple-text-secondary text-sm">
                Connected services
              </p>
            </div>
          </div>
        </Container>
 
        {/* Apple Agents Section */}
        <Container size="xl" padding="lg">
          <div className="apple-card p-6">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 mb-6">
              <div>
                <h2 className="apple-text-primary text-xl font-semibold mb-2">Your Agents</h2>
                <p className="apple-text-secondary text-sm">
                  {agents.length === 0 ? 'No agents created yet' : `${filteredAgents.length} of ${agents.length} agents shown`}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {/* Search Bar */}
                {agents.length > 0 && (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 apple-text-secondary" />
                    <input
                      type="text"
                      placeholder="Search agents..."
                      value={dashboardState.searchQuery}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent apple-text-primary bg-white min-w-[200px]"
                      aria-label="Search agents"
                      role="searchbox"
                    />
                  </div>
                )}
                
                {/* Filter Dropdown */}
                {agents.length > 0 && (
                  <div className="relative">
                    <select
                       value={dashboardState.filterStatus}
                       onChange={(e) => handleFilterChange(e.target.value as 'all' | 'active' | 'inactive')}
                       className="appearance-none pl-3 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent apple-text-primary bg-white cursor-pointer"
                       aria-label="Filter agents by status"
                     >
                      <option value="all">All Agents</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                    <Filter className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 apple-text-secondary pointer-events-none" />
                  </div>
                )}
                
                <div className="text-right">
                  <div className="apple-text-secondary text-xs font-medium mb-2">Quick Actions</div>
                  <div className="flex gap-2">
                    <button 
                      onClick={handleImportAgents}
                      className="apple-button-secondary text-sm px-3 py-2 flex items-center gap-2"
                      title="Import agent from file"
                    >
                      <Upload className="h-3 w-3" />
                      Import
                    </button>
                    <button 
                      onClick={handleBrowseTemplates}
                      className="apple-button-secondary text-sm px-3 py-2 flex items-center gap-2"
                      title="Browse agent templates"
                    >
                      <Download className="h-3 w-3" />
                      Templates
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            {agents.length === 0 ? (
              <div className="apple-card-glass p-12 text-center">
                <div className="mx-auto w-24 h-24 apple-icon-container bg-blue-500 mb-6">
                  <Bot className="h-12 w-12 text-white" />
                </div>
                <h3 className="apple-text-primary text-2xl font-semibold mb-3">Welcome to Agent Dashboard</h3>
                <p className="apple-text-secondary text-sm mb-6 max-w-lg mx-auto leading-relaxed">
                  Create your first AI agent to get started. Agents can help you automate tasks, analyze data, provide customer support, and much more.
                </p>
                
                {/* Getting Started Steps */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 max-w-2xl mx-auto">
                  <div className="apple-card-subtle p-4 text-left">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
                      <span className="text-blue-600 font-semibold text-sm">1</span>
                    </div>
                    <h4 className="apple-text-primary font-medium text-sm mb-2">Create Agent</h4>
                    <p className="apple-text-secondary text-xs leading-relaxed">Define your agent's role, capabilities, and personality</p>
                  </div>
                  <div className="apple-card-subtle p-4 text-left">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mb-3">
                      <span className="text-green-600 font-semibold text-sm">2</span>
                    </div>
                    <h4 className="apple-text-primary font-medium text-sm mb-2">Configure</h4>
                    <p className="apple-text-secondary text-xs leading-relaxed">Set up tools, knowledge base, and behavior settings</p>
                  </div>
                  <div className="apple-card-subtle p-4 text-left">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mb-3">
                      <span className="text-purple-600 font-semibold text-sm">3</span>
                    </div>
                    <h4 className="apple-text-primary font-medium text-sm mb-2">Deploy</h4>
                    <p className="apple-text-secondary text-xs leading-relaxed">Start chatting and integrate into your workflows</p>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button 
                    onClick={handleCreateAgent}
                    className="apple-button px-6 py-3 text-sm font-medium flex items-center gap-2"
                    title="Create your first AI agent"
                  >
                    <Plus className="h-4 w-4" />
                    Create Your First Agent
                  </button>
                  <button 
                    onClick={handleBrowseTemplates}
                    className="apple-button-secondary px-6 py-3 text-sm font-medium flex items-center gap-2"
                    title="Browse pre-built agent templates"
                  >
                    <Download className="h-4 w-4" />
                    Browse Templates
                  </button>
                </div>
                
                <p className="apple-text-secondary text-xs mt-6">
                  Need help? Check out our <a href="#" className="text-blue-600 hover:text-blue-700 underline">getting started guide</a>
                </p>
              </div>
            ) : filteredAgents.length === 0 ? (
              <div className="apple-card-glass p-12 text-center">
                <div className="mx-auto w-20 h-20 apple-icon-container bg-gray-400 mb-6">
                  <Search className="h-10 w-10 text-white" />
                </div>
                <h3 className="apple-text-primary text-lg font-semibold mb-2">No agents found</h3>
                <p className="apple-text-secondary text-sm max-w-md mx-auto leading-relaxed mb-4">
                  {dashboardState.searchQuery ? 
                    `No agents match "${dashboardState.searchQuery}"` : 
                    `No ${dashboardState.filterStatus} agents found`
                  }
                </p>
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  <button 
                    onClick={() => {
                      handleSearchChange('');
                      handleFilterChange('all');
                    }}
                    className="apple-button-secondary px-4 py-2 text-sm font-medium"
                    aria-label="Clear all filters and search"
                  >
                    Clear Filters
                  </button>
                  <button 
                    onClick={handleCreateAgent}
                    className="apple-button px-4 py-2 text-sm font-medium flex items-center gap-2"
                    aria-label="Create a new agent"
                  >
                    <Plus className="h-4 w-4" />
                    Create Agent
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredAgents.map((agent) => (
                  <DraggableAgentCard
                    key={agent.id}
                    agent={agent}
                    onEdit={handleEditAgent}
                    onDelete={handleDeleteAgent}
                    onStartChat={handleStartChat}
                    onStartVoice={handleStartVoice}
                    onShare={handleShareAgent}
                    shareDisabled={
                      sharingAgents.has(agent.id) || sharedAgents.has(agent.id)
                    }
                  />
                ))}
              </div>
            )}
          </div>
        </Container>
 
        {/* Apple Workflow Section */}
        <Container size="xl" padding="lg">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Workflow Canvas */}
            <div className="lg:col-span-2">
              <div className="mb-6">
                <h2 className="apple-text-primary text-2xl font-semibold mb-2">Workflow Canvas</h2>
                <p className="apple-text-secondary text-sm">Drag agents here to create multi-agent workflows</p>
              </div>
              
              <div className="apple-card-glass p-12 text-center min-h-[350px] flex items-center justify-center">
                <div className="space-y-6">
                  <div className="mx-auto w-20 h-20 apple-icon-container bg-gray-500">
                    <Plus className="h-10 w-10 text-white" />
                  </div>
                  <div>
                    <h3 className="apple-text-primary text-lg font-semibold mb-2">Start Building Workflows</h3>
                    <p className="apple-text-secondary text-sm max-w-md mx-auto leading-relaxed">
                      Drag agents from your collection to create powerful multi-agent workflows and automations
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center">
                    <span className="apple-badge-blue">Sequential</span>
                    <span className="apple-badge-green">Parallel</span>
                    <span className="apple-badge-purple">Conditional</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Apple Quick Actions */}
            <div className="space-y-6">
              <div>
                <h2 className="apple-text-primary text-xl font-semibold mb-2">Quick Actions</h2>
                <p className="apple-text-secondary text-sm">Get started with common tasks</p>
              </div>
              
              <div className="space-y-4">
                <div className="apple-card-elevated p-6 hover:shadow-lg transition-all duration-200 cursor-pointer group" onClick={handleStartChatSession}>
                    <div className="flex items-center gap-4">
                      <div className="p-3 apple-icon-container bg-green-500 group-hover:scale-105 transition-all duration-200">
                        <MessageSquare className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="apple-text-primary text-sm font-medium mb-1">Start Chat Session</h3>
                        <p className="apple-text-secondary text-xs">Begin a conversation with your AI agents</p>
                      </div>
                    </div>
                  </div>
                 
                 <div className="apple-card-elevated p-6 hover:shadow-lg transition-all duration-200 cursor-pointer group" onClick={handleCreateWorkflow}>
                   <div className="flex items-center gap-4">
                     <div className="p-3 apple-icon-container bg-purple-500 group-hover:scale-105 transition-all duration-200">
                       <Workflow className="h-5 w-5 text-white" />
                     </div>
                     <div>
                       <h3 className="apple-text-primary text-sm font-medium mb-1">Create Workflow</h3>
                       <p className="apple-text-secondary text-xs">Build multi-agent automation</p>
                     </div>
                   </div>
                 </div>
                 
                 <div className="apple-card-elevated p-6 hover:shadow-lg transition-all duration-200 cursor-pointer group" onClick={handleBrowseTemplates}>
                   <div className="flex items-center gap-4">
                     <div className="p-3 apple-icon-container bg-orange-500 group-hover:scale-105 transition-all duration-200">
                       <Download className="h-5 w-5 text-white" />
                     </div>
                     <div>
                       <h3 className="apple-text-primary text-sm font-medium mb-1">Import Template</h3>
                       <p className="apple-text-secondary text-xs">Use pre-built agent templates</p>
                     </div>
                   </div>
                 </div>
              </div>
              
              {/* Pro Tips */}
              <div className="space-y-4">
                <h3 className="apple-text-primary text-lg font-semibold">Pro Tips</h3>
                <div className="space-y-3">
                  <div className="apple-card-glass p-4 hover:shadow-md transition-all duration-200">
                     <div className="flex items-start gap-3">
                       <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                       <span className="apple-text-primary text-xs font-medium">Combine multiple agents for complex workflows</span>
                     </div>
                   </div>
                   <div className="apple-card-glass p-4 hover:shadow-md transition-all duration-200">
                     <div className="flex items-start gap-3">
                       <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                       <span className="apple-text-primary text-xs font-medium">Use voice agents for hands-free interactions</span>
                     </div>
                   </div>
                   <div className="apple-card-glass p-4 hover:shadow-md transition-all duration-200">
                     <div className="flex items-start gap-3">
                       <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0" />
                       <span className="apple-text-primary text-xs font-medium">Save successful workflows as templates</span>
                     </div>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </Container>
    </DragDropProvider>
  );
}
