'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AgentConfig, ChatMessage, AgentSession } from '@/types/agent';
import { APIClient } from '@/lib/api-client';
import { agentStore } from '@/lib/agent-store';
import { formatDate } from '@/lib/utils';
import { Mic, MicOff, Bot, User, ArrowLeft, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VoiceInterfaceProps {
  agent: AgentConfig;
  onBack?: () => void;
}

export function VoiceInterface({ agent, onBack }: VoiceInterfaceProps) {
  const [session, setSession] = useState<AgentSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [audioUrls, setAudioUrls] = useState<Record<string, string>>({});
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [streamingContent, setStreamingContent] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [apiClient, setApiClient] = useState<APIClient | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [speechSynthesis, setSpeechSynthesis] = useState<SpeechSynthesis | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioUrlRefs = useRef<string[]>([]);

  useEffect(() => {
    // Initialize API client
    try {
      const client = new APIClient(agent.modelConfig, agent.id);
      setApiClient(client);
    } catch (error) {
      console.error('Failed to initialize API client:', error);
    }

    // Initialize speech synthesis
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setSpeechSynthesis(window.speechSynthesis);
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

  useEffect(() => {
    return () => {
      audioUrlRefs.current.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/wav' });
        await handleAudioMessage(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      setMediaRecorder(recorder);
      setAudioChunks(chunks);
      recorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
      alert('Failed to access microphone. Please check your permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const handleAudioMessage = async (audioBlob: Blob) => {
    if (!apiClient || !session) return;

    setIsProcessing(true);

    try {
      // Create audio URL for playback
      const audioUrl = URL.createObjectURL(audioBlob);
      audioUrlRefs.current.push(audioUrl);

      // Transcribe audio to text (only available for OpenAI)
      let transcription = '';
      if (agent.modelConfig.provider === 'openai') {
        try {
          // Convert Blob to File for the API
          const audioFile = new File([audioBlob], 'audio.wav', { type: 'audio/wav' });
          transcription = await apiClient.transcribeAudio(audioFile);
        } catch (error) {
          console.error('Transcription failed:', error);
          transcription = '[Audio message - transcription unavailable]';
        }
      } else {
        transcription = '[Audio message - transcription not supported for this provider]';
      }

      // Add user voice message
      const userMessage = agentStore.addMessageToSession(session.id, {
        role: 'user',
        content: transcription,
        agentId: agent.id,
      });

      if (userMessage) {
        setMessages(prev => [...prev, userMessage]);
        // Store audio URL for this message
        setAudioUrls(prev => ({ ...prev, [userMessage.id]: audioUrl }));
      }

      const chatMessages = messages.concat(userMessage ? [userMessage] : []);
      if (typeof window !== 'undefined' && window.EventSource) {
        let full = '';
        setStreamingContent('');
        const es = new EventSource(
          `/api/agents/${agent.id}/stream?messages=${encodeURIComponent(JSON.stringify(chatMessages))}`
        );
        es.onmessage = async e => {
          if (e.data === '[DONE]') {
            es.close();
            const aiMessage = agentStore.addMessageToSession(session.id, {
              role: 'assistant',
              content: full,
              agentId: agent.id,
            });
            if (aiMessage) {
              setMessages(prev => [...prev, aiMessage]);
              if (agent.modelConfig.provider === 'openai') {
                try {
                  const speechArrayBuffer = await apiClient.generateSpeech(full);
                  const speechBlob = new Blob([speechArrayBuffer], { type: 'audio/mpeg' });
                  const responseAudioUrl = URL.createObjectURL(speechBlob);
                  audioUrlRefs.current.push(responseAudioUrl);
                  setAudioUrls(prev => ({ ...prev, [aiMessage.id]: responseAudioUrl }));
                  playAudio(responseAudioUrl);
                } catch (err) {
                  console.error('Speech generation failed:', err);
                  speakText(full);
                }
              } else {
                speakText(full);
              }
            }
            setStreamingContent(null);
            setIsProcessing(false);
          } else {
            full += e.data;
            setStreamingContent(full);
            speakText(e.data, false);
          }
        };
        es.onerror = async () => {
          es.close();
          setStreamingContent(null);
          try {
            const response = await apiClient.sendMessage(
              chatMessages,
              agent.systemPrompt,
              agent.temperature,
              agent.maxTokens
            );
            const aiMessage = agentStore.addMessageToSession(session.id, {
              role: 'assistant',
              content: response,
              agentId: agent.id,
            });
            if (aiMessage) {
              setMessages(prev => [...prev, aiMessage]);
              if (agent.modelConfig.provider === 'openai') {
                try {
                  const buf = await apiClient.generateSpeech(response);
                  const blob = new Blob([buf], { type: 'audio/mpeg' });
                  const url = URL.createObjectURL(blob);
                  audioUrlRefs.current.push(url);
                  setAudioUrls(prev => ({ ...prev, [aiMessage.id]: url }));
                  playAudio(url);
                } catch (err) {
                  console.error('Speech generation failed:', err);
                  speakText(response);
                }
              } else {
                speakText(response);
              }
            }
          } catch (err) {
            console.error('Failed to process audio message:', err);
          }
          setIsProcessing(false);
        };
      } else {
        const response = await apiClient.sendMessage(
          chatMessages,
          agent.systemPrompt,
          agent.temperature,
          agent.maxTokens
        );
        const aiMessage = agentStore.addMessageToSession(session.id, {
          role: 'assistant',
          content: response,
          agentId: agent.id,
        });
        if (aiMessage) {
          setMessages(prev => [...prev, aiMessage]);
          if (agent.modelConfig.provider === 'openai') {
            try {
              const buf = await apiClient.generateSpeech(response);
              const blob = new Blob([buf], { type: 'audio/mpeg' });
              const url = URL.createObjectURL(blob);
              audioUrlRefs.current.push(url);
              setAudioUrls(prev => ({ ...prev, [aiMessage.id]: url }));
              playAudio(url);
            } catch (err) {
              console.error('Speech generation failed:', err);
              speakText(response);
            }
          } else {
            speakText(response);
          }
        }
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('Failed to process audio message:', error);

      const errorMessage = agentStore.addMessageToSession(session.id, {
        role: 'assistant',
        content: 'Sorry, I encountered an error while processing your voice message. Please try again.',
        agentId: agent.id,
      });

      if (errorMessage) {
        setMessages(prev => [...prev, errorMessage]);
        speakText(errorMessage.content);
      }
      setIsProcessing(false);
    }
  };

  const playAudio = (audioUrl: string) => {
    const audio = new Audio(audioUrl);
    setIsSpeaking(true);
    
    audio.onended = () => {
      setIsSpeaking(false);
    };
    
    audio.onerror = () => {
      setIsSpeaking(false);
      console.error('Failed to play audio');
    };
    
    audio.play().catch(error => {
      console.error('Failed to play audio:', error);
      setIsSpeaking(false);
    });
  };

  const speakText = (text: string, cancel = true) => {
    if (!speechSynthesis) return;

    if (cancel) speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if (speechSynthesis) {
      speechSynthesis.cancel();
      setIsSpeaking(false);
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
              <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">{agent.name}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Voice Agent • {agent.modelConfig.provider} • {agent.modelConfig.model}
                </p>
              </div>
            </div>
            <div className="ml-auto flex items-center gap-2">
              {isSpeaking && (
                <Button variant="ghost" size="icon" onClick={stopSpeaking}>
                  <VolumeX className="h-4 w-4" />
                </Button>
              )}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  isRecording ? "bg-red-500 animate-pulse" : "bg-green-500"
                )} />
                {isRecording ? 'Recording' : 'Ready'}
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
              <Mic className="h-8 w-8 text-purple-500" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-700">Start a voice conversation</h3>
              <p className="text-sm text-gray-500 mt-1">
                Press and hold the microphone to record your message
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
                  : "bg-purple-500"
              )}>
                {message.role === 'user' ? (
                  <User className="h-4 w-4 text-white" />
                ) : (
                  <Bot className="h-4 w-4 text-white" />
                )}
              </div>
              <div className={cn(
                "flex flex-col gap-2 max-w-[70%]",
                message.role === 'user' ? "items-end" : "items-start"
              )}>
                <div className={cn(
                  "px-4 py-2 rounded-lg text-sm",
                  message.role === 'user'
                    ? "bg-green-500 text-white"
                    : "bg-white border shadow-sm"
                )}>
                  <p className="whitespace-pre-wrap mb-2">{message.content}</p>
                  {audioUrls[message.id] && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant={message.role === 'user' ? 'secondary' : 'default'}
                        size="sm"
                        onClick={() => playAudio(audioUrls[message.id])}
                        className="h-8"
                      >
                        <Volume2 className="h-3 w-3 mr-1" />
                        Play
                      </Button>
                    </div>
                  )}
                </div>
                <span className="text-xs text-muted-foreground px-1">
                  {formatDate(message.timestamp)}
                </span>
              </div>
            </div>
          ))
        )}
        
        {streamingContent !== null ? (
          <div className="flex gap-3 max-w-4xl mr-auto">
            <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <div className="flex flex-col gap-1">
              <div className="px-4 py-2 bg-white border shadow-sm rounded-lg">
                {streamingContent ? (
                  <p className="whitespace-pre-wrap">{streamingContent}</p>
                ) : (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">Processing audio...</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          isProcessing && (
            <div className="flex gap-3 max-w-4xl mr-auto">
              <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div className="flex flex-col gap-1">
                <div className="px-4 py-2 bg-white border shadow-sm rounded-lg">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">Processing audio...</span>
                  </div>
                </div>
              </div>
            </div>
          )
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Voice Controls */}
      <Card className="rounded-none border-t">
        <CardContent className="p-6">
          <div className="flex flex-col items-center space-y-4">
            <div className="flex items-center justify-center">
              <Button
                size="lg"
                variant={isRecording ? "destructive" : "default"}
                className={cn(
                  "w-16 h-16 rounded-full",
                  isRecording && "animate-pulse"
                )}
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                onTouchStart={startRecording}
                onTouchEnd={stopRecording}
                disabled={isProcessing || !apiClient}
              >
                {isRecording ? (
                  <MicOff className="h-6 w-6" />
                ) : (
                  <Mic className="h-6 w-6" />
                )}
              </Button>
            </div>
            
            <div className="text-center">
              <p className="text-sm font-medium">
                {isRecording ? 'Release to send' : 'Hold to record'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {isProcessing ? 'Processing your message...' : 'Press and hold the microphone button'}
              </p>
            </div>
            
            {!apiClient && (
              <p className="text-sm text-red-500 text-center">
                Failed to initialize API client. Please check your agent configuration.
              </p>
            )}
            
            {agent.modelConfig.provider !== 'openai' && (
              <p className="text-sm text-amber-600 text-center">
                Note: Full voice features are only available with OpenAI. Other providers support text transcription only.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}