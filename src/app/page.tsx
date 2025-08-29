'use client';

import React, { useState } from 'react';
import { AgentDashboard } from '@/components/agents/AgentDashboard';
import { ChatInterface } from '@/components/chat/ChatInterface';
import { VoiceInterface } from '@/components/voice/VoiceInterface';
import { AgentConfig } from '@/types/agent';

type ViewMode = 'dashboard' | 'chat' | 'voice';

interface ViewState {
  mode: ViewMode;
  agent?: AgentConfig;
}

export default function Home() {
  const [viewState, setViewState] = useState<ViewState>({ mode: 'dashboard' });

  const handleStartChat = (agent: AgentConfig) => {
    setViewState({ mode: 'chat', agent });
  };

  const handleStartVoice = (agent: AgentConfig) => {
    setViewState({ mode: 'voice', agent });
  };

  const handleBackToDashboard = () => {
    setViewState({ mode: 'dashboard' });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {viewState.mode === 'dashboard' && (
        <AgentDashboard
          onStartChat={handleStartChat}
          onStartVoice={handleStartVoice}
        />
      )}
      
      {viewState.mode === 'chat' && viewState.agent && (
        <ChatInterface
          agent={viewState.agent}
          onBack={handleBackToDashboard}
        />
      )}
      
      {viewState.mode === 'voice' && viewState.agent && (
        <VoiceInterface
          agent={viewState.agent}
          onBack={handleBackToDashboard}
        />
      )}
    </div>
  );
}
