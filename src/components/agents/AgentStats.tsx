'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, MessageSquare } from 'lucide-react';
import { useAgentDashboardStore } from '@/lib/agent-dashboard-store';

export function AgentStats() {
  const { agents, sessions } = useAgentDashboardStore();
  const chatCount = agents.filter(a => a.type === 'chat').length;
  const voiceCount = agents.filter(a => a.type === 'voice').length;
  const providerCount = new Set(agents.map(a => a.modelConfig.provider)).size;

  return (
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
                <div className="w-3 h-3 bg-blue-500 rounded-full" />
                <span className="text-slate-600">{chatCount} chat</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-indigo-500 rounded-full" />
                <span className="text-slate-600">{voiceCount} voice</span>
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
            <p className="text-slate-600 font-medium">Running conversations</p>
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
            <div className="text-4xl font-bold text-slate-800">{providerCount}</div>
            <p className="text-slate-600 font-medium">Connected services</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
