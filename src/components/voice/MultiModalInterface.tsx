'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AgentConfig } from '@/types/agent';
import { APIClient } from '@/lib/api-client';
import { ArrowLeft, Image as ImageIcon, Video as VideoIcon, Loader2 } from 'lucide-react';

interface MultiModalInterfaceProps {
  agent: AgentConfig;
  onBack?: () => void;
}

export function MultiModalInterface({ agent, onBack }: MultiModalInterfaceProps) {
  const [apiClient, setApiClient] = useState<APIClient | null>(null);
  const [result, setResult] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    try {
      const client = new APIClient(agent.modelConfig);
      setApiClient(client);
    } catch (error) {
      console.error('Failed to initialize API client:', error);
    }
  }, [agent]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !apiClient) return;
    setIsProcessing(true);
    try {
      const analysis = await apiClient.analyzeImage(file);
      setResult(analysis);
    } catch (error) {
      console.error('Image analysis failed:', error);
      setResult('Image analysis failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVideoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !apiClient) return;
    setIsProcessing(true);
    try {
      const analysis = await apiClient.analyzeVideo(file);
      setResult(analysis);
    } catch (error) {
      console.error('Video analysis failed:', error);
      setResult('Video analysis failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Card className="rounded-none border-b">
        <CardHeader className="py-4">
          <div className="flex items-center gap-3">
            {onBack && (
              <Button variant="ghost" size="icon" onClick={onBack}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <CardTitle className="text-lg">Multimodal Interface</CardTitle>
          </div>
        </CardHeader>
      </Card>

      <Card className="m-4">
        <CardContent className="space-y-4">
          {agent.supportsImages && (
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                <ImageIcon className="h-4 w-4" /> Image Input
              </label>
              <input type="file" accept="image/*" onChange={handleImageChange} />
            </div>
          )}
          {agent.supportsVideo && (
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                <VideoIcon className="h-4 w-4" /> Video Input
              </label>
              <input type="file" accept="video/*" onChange={handleVideoChange} />
            </div>
          )}
          {isProcessing && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Processing...
            </div>
          )}
          {result && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Analysis Result</label>
              <p className="text-sm whitespace-pre-wrap">{result}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default MultiModalInterface;
