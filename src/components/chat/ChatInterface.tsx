'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Container, Stack, Inline, Center } from '@/components/ui/layout';
import { AgentConfig, ChatMessage, AgentSession } from '@/types/agent';
import { APIClient } from '@/lib/api-client';
import { sessionStore } from '@/lib/agents/session-store';
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
  const [streamingContent, setStreamingContent] = useState<string | null>(null);
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
    const newSession = sessionStore.createSession(agent.id);
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
      const newUserMessage = sessionStore.addMessageToSession(session.id, {
        role: 'user',
        content: userMessage,
        agentId: agent.id,
      });

      if (newUserMessage) {
        setMessages(prev => [...prev, newUserMessage]);
      }

      const history = messages.concat(newUserMessage ? [newUserMessage] : []);

      if (typeof window !== 'undefined' && window.EventSource) {
        let full = '';
        setStreamingContent('');
        const es = new EventSource(
          `/api/agents/${agent.id}/stream?messages=${encodeURIComponent(JSON.stringify(history))}`
        );
        es.onmessage = e => {
          if (e.data === '[DONE]') {
            es.close();
            const aiMessage = sessionStore.addMessageToSession(session.id, {
              role: 'assistant',
              content: full,
              agentId: agent.id,
            });
            if (aiMessage) setMessages(prev => [...prev, aiMessage]);
            setStreamingContent(null);
            setIsLoading(false);
            inputRef.current?.focus();
          } else {
            full += e.data;
            setStreamingContent(full);
          }
        };
        es.onerror = async () => {
          es.close();
          setStreamingContent(null);
          try {
            const response = await apiClient.sendMessage(
              history,
              agent.systemPrompt,
              agent.temperature,
              agent.maxTokens
            );
            const aiMessage = sessionStore.addMessageToSession(session.id, {
              role: 'assistant',
              content: response,
              agentId: agent.id,
            });
            if (aiMessage) setMessages(prev => [...prev, aiMessage]);
          } catch (err) {
            console.error('Failed to send message:', err);
            const errorMessage = sessionStore.addMessageToSession(session.id, {
              role: 'assistant',
              content:
                'Sorry, I encountered an error while processing your message. Please check your API configuration and try again.',
              agentId: agent.id,
            });
            if (errorMessage) setMessages(prev => [...prev, errorMessage]);
          } finally {
            setIsLoading(false);
            inputRef.current?.focus();
          }
        };
      } else {
        const response = await apiClient.sendMessage(
          history,
          agent.systemPrompt,
          agent.temperature,
          agent.maxTokens
        );
        const aiMessage = sessionStore.addMessageToSession(session.id, {
          role: 'assistant',
          content: response,
          agentId: agent.id,
        });
        if (aiMessage) {
          setMessages(prev => [...prev, aiMessage]);
        }
        setIsLoading(false);
        inputRef.current?.focus();
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage = sessionStore.addMessageToSession(session.id, {
        role: 'assistant',
        content:
          'Sorry, I encountered an error while processing your message. Please check your API configuration and try again.',
        agentId: agent.id,
      });
      if (errorMessage) setMessages(prev => [...prev, errorMessage]);
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
    <div className="flex flex-col h-screen bg-background-primary">
      {/* Header */}
      <Card variant="outlined" className="rounded-none border-b border-border-primary">
        <CardHeader className="py-4">
          <Inline align="center" justify="between" spacing="md">
            <Inline align="center" spacing="sm">
              {onBack && (
                <Button variant="ghost" size="sm" onClick={onBack} leftIcon={<ArrowLeft className="h-4 w-4" />} />
              )}
              <Inline align="center" spacing="sm">
                <div className="w-8 h-8 bg-interactive-primary rounded-full flex items-center justify-center">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <Stack spacing="xs">
                  <CardTitle className="text-lg text-text-primary">{agent.name}</CardTitle>
                  <p className="text-sm text-text-secondary">
                    {agent.modelConfig.provider} • {agent.modelConfig.model}
                  </p>
                </Stack>
              </Inline>
            </Inline>
            <Inline align="center" spacing="xs" className="text-sm text-text-secondary">
              <div className="w-2 h-2 bg-status-success rounded-full" />
              Online
            </Inline>
          </Inline>
        </CardHeader>
      </Card>

      {/* Messages */}
      <Container size="full" padding="md" className="flex-1 overflow-y-auto">
        <Stack spacing="md">
          {messages.length === 0 ? (
            <Center className="h-full">
              <Stack align="center" spacing="md" className="text-center">
                <div className="w-16 h-16 bg-background-secondary rounded-full flex items-center justify-center">
                  <Bot className="h-8 w-8 text-interactive-primary" />
                </div>
                <Stack spacing="xs">
                  <h3 className="text-lg font-medium text-text-primary">Start a conversation</h3>
                  <p className="text-sm text-text-secondary">
                    Send a message to {agent.name} to begin chatting
                  </p>
                </Stack>
              </Stack>
            </Center>
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
                    ? "bg-status-success" 
                    : "bg-interactive-primary"
                )}>
                  {message.role === 'user' ? (
                    <User className="h-4 w-4 text-white" />
                  ) : (
                    <Bot className="h-4 w-4 text-white" />
                  )}
                </div>
                <Stack spacing="xs" className={cn(
                  "max-w-[70%]",
                  message.role === 'user' ? "items-end" : "items-start"
                )}>
                  <div className={cn(
                    "px-4 py-2 rounded-lg text-sm",
                    message.role === 'user'
                      ? "bg-status-success text-white"
                      : "bg-background-primary border border-border-primary shadow-sm"
                  )}>
                    <p className="whitespace-pre-wrap text-text-primary">{message.content}</p>
                  </div>
                  <span className="text-xs text-text-tertiary px-1">
                    {formatDate(message.timestamp)}
                  </span>
                </Stack>
              </div>
            ))
        )}
          
          {streamingContent !== null && (
            <div className="flex gap-3 max-w-4xl mr-auto">
              <div className="w-8 h-8 bg-interactive-primary rounded-full flex items-center justify-center flex-shrink-0">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <Stack spacing="xs">
                <div className="px-4 py-2 bg-background-primary border border-border-primary shadow-sm rounded-lg">
                  {streamingContent ? (
                    <p className="whitespace-pre-wrap text-text-primary">{streamingContent}</p>
                  ) : (
                    <Inline align="center" spacing="xs">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm text-text-secondary">Thinking...</span>
                    </Inline>
                  )}
                </div>
              </Stack>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </Stack>
      </Container>
      {/* Input */}
      <Card variant="outlined" className="rounded-none border-t border-border-primary">
        <CardContent className="p-4">
          <Stack spacing="sm">
            <Inline spacing="sm">
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={`Message ${agent.name}...`}
                disabled={isLoading || !apiClient}
                className="flex-1"
                size="md"
              />
              <Button 
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isLoading || !apiClient}
                size="md"
                leftIcon={isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              />
            </Inline>
            {!apiClient && (
              <p className="text-sm text-status-error">
                Failed to initialize API client. Please check your agent configuration.
              </p>
            )}
          </Stack>
        </CardContent>
      </Card>
    </div>
  );
}