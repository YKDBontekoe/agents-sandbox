'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AgentConfig, ChatMessage, AgentSession } from '@/types/agent';
import { APIClient } from '@/lib/api-client';
import { agentStore } from '@/lib/agent-store';
import { formatDate } from '@/lib/utils';
import { Send, Bot, User, Loader2, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatInterfaceProps {
  agent: AgentConfig;
  onBack?: () => void;
}

export function ChatInterface({ agent, onBack }: ChatInterfaceProps) {
  const [session, setSession] = useState<AgentSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiClient, setApiClient] = useState<APIClient | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Initialize API client
    try {
      const client = new APIClient(agent.modelConfig, agent.id);
      setApiClient(client);
    } catch (error) {
      console.error('Failed to initialize API client:', error);
    }

    // Create or load session
    const newSession = agentStore.createSession(agent.id);
    setSession(newSession);
    setMessages(newSession.messages);
  }, [agent]);

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !apiClient || !session || isLoading) {
      return;
    }

    const userMessage = inputValue.trim();
    setInputValue('');
    setIsLoading(true);

    try {
      // Add user message
      const newUserMessage = agentStore.addMessageToSession(session.id, {
        role: 'user',
        content: userMessage,
        agentId: agent.id,
      });

      if (newUserMessage) {
        setMessages(prev => [...prev, newUserMessage]);
      }

      // Get AI response
      const response = await apiClient.sendMessage(
        messages.concat(newUserMessage ? [newUserMessage] : []),
        agent.systemPrompt,
        agent.temperature,
        agent.maxTokens
      );

      // Add AI response
      const aiMessage = agentStore.addMessageToSession(session.id, {
        role: 'assistant',
        content: response,
        agentId: agent.id,
      });

      if (aiMessage) {
        setMessages(prev => [...prev, aiMessage]);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      // Add error message
      const errorMessage = agentStore.addMessageToSession(session.id, {
        role: 'assistant',
        content: 'Sorry, I encountered an error while processing your message. Please check your API configuration and try again.',
        agentId: agent.id,
      });

      if (errorMessage) {
        setMessages(prev => [...prev, errorMessage]);
      }
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <Card className="rounded-none border-b">
        <CardHeader className="py-4">
          <div className="flex items-center gap-3">
            {onBack && (
              <Button variant="ghost" size="icon" onClick={onBack}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">{agent.name}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {agent.modelConfig.provider} • {agent.modelConfig.model}
                </p>
              </div>
            </div>
            <div className="ml-auto">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                Online
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <Bot className="h-8 w-8 text-blue-500" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-700">Start a conversation</h3>
              <p className="text-sm text-gray-500 mt-1">
                Send a message to {agent.name} to begin chatting
              </p>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-3 max-w-4xl",
                message.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                message.role === 'user' 
                  ? "bg-green-500" 
                  : "bg-blue-500"
              )}>
                {message.role === 'user' ? (
                  <User className="h-4 w-4 text-white" />
                ) : (
                  <Bot className="h-4 w-4 text-white" />
                )}
              </div>
              <div className={cn(
                "flex flex-col gap-1 max-w-[70%]",
                message.role === 'user' ? "items-end" : "items-start"
              )}>
                <div className={cn(
                  "px-4 py-2 rounded-lg text-sm",
                  message.role === 'user'
                    ? "bg-green-500 text-white"
                    : "bg-white border shadow-sm"
                )}>
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
                <span className="text-xs text-muted-foreground px-1">
                  {formatDate(message.timestamp)}
                </span>
              </div>
            </div>
          ))
        )}
        
        {isLoading && (
          <div className="flex gap-3 max-w-4xl mr-auto">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <div className="flex flex-col gap-1">
              <div className="px-4 py-2 bg-white border shadow-sm rounded-lg">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Thinking...</span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <Card className="rounded-none border-t">
        <CardContent className="p-4">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={`Message ${agent.name}...`}
              disabled={isLoading || !apiClient}
              className="flex-1"
            />
            <Button 
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading || !apiClient}
              size="icon"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          {!apiClient && (
            <p className="text-sm text-red-500 mt-2">
              Failed to initialize API client. Please check your agent configuration.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}