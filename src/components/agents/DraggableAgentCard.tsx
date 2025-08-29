'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '../ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { AgentConfig } from '@/types/agent';
import { MessageSquare, Mic, Edit, Trash2, GripVertical, MoreHorizontal, Settings } from 'lucide-react';

interface DraggableAgentCardProps {
  agent: AgentConfig;
  onEdit?: (agent: AgentConfig) => void;
  onDelete?: (agentId: string) => void;
  onStartChat?: (agent: AgentConfig) => void;
  onStartVoice?: (agent: AgentConfig) => void;
}

export const DraggableAgentCard: React.FC<DraggableAgentCardProps> = ({
  agent,
  onEdit,
  onDelete,
  onStartChat,
  onStartVoice
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: agent.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleStartChat = () => {
    onStartChat?.(agent);
  };

  const handleStartVoice = () => {
    onStartVoice?.(agent);
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={`relative group ${
        isDragging ? 'opacity-50 scale-105' : ''
      }`}
      {...attributes}
      {...listeners}
    >
      <Card className="agent-card border-0 shadow-lg hover:shadow-2xl transition-all duration-300 cursor-move overflow-hidden group-hover:-translate-y-2">
        {/* Gradient Header */}
        <div className={`h-2 w-full ${
          agent.type === 'chat' 
            ? 'bg-gradient-to-r from-blue-500 to-indigo-600' 
            : 'bg-gradient-to-r from-purple-500 to-pink-600'
        }`} />
        
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold shadow-lg ${
                agent.type === 'chat' 
                  ? 'bg-gradient-to-br from-blue-500 to-indigo-600' 
                  : 'bg-gradient-to-br from-purple-500 to-pink-600'
              }`}>
                {agent.type === 'chat' ? (
                  <MessageSquare className="h-6 w-6" />
                ) : (
                  <Mic className="h-6 w-6" />
                )}
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-800 mb-1">{agent.name}</h3>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant="secondary" 
                    className="text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200"
                  >
                    {agent.modelConfig?.provider || 'Unknown'}
                  </Badge>
                  <Badge 
                    variant="outline" 
                    className="text-xs font-medium border-slate-200 text-slate-600"
                  >
                    {agent.modelConfig?.model || 'Unknown'}
                  </Badge>
                </div>
              </div>
            </div>
            
            <DropdownMenu>
               <DropdownMenuTrigger asChild>
                 <Button 
                   variant="ghost" 
                   size="sm" 
                   className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-100"
                 >
                   <MoreHorizontal className="h-4 w-4" />
                 </Button>
               </DropdownMenuTrigger>
               <DropdownMenuContent align="end" className="shadow-xl border-0">
                 <DropdownMenuItem 
                   onClick={() => onEdit?.(agent)}
                   className="hover:bg-blue-50 hover:text-blue-700"
                 >
                   <Settings className="mr-2 h-4 w-4" />
                   Edit Agent
                 </DropdownMenuItem>
                 <DropdownMenuItem 
                   onClick={() => onDelete?.(agent.id)}
                   className="text-red-600 hover:bg-red-50 hover:text-red-700"
                 >
                   <Trash2 className="mr-2 h-4 w-4" />
                   Delete Agent
                 </DropdownMenuItem>
               </DropdownMenuContent>
             </DropdownMenu>
          </div>
          
          <p className="text-slate-600 mb-6 line-clamp-3 leading-relaxed">
             {agent.systemPrompt || 'This agent is ready to assist with various tasks and conversations.'}
           </p>
          
          <div className="flex gap-3">
            <Button 
              onClick={handleStartChat}
              className={`flex-1 font-semibold shadow-md hover:shadow-lg transition-all duration-200 ${
                agent.type === 'chat'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
                  : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'
              }`}
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              Start Chat
            </Button>
            {agent.type === 'voice' && (
              <Button 
                onClick={handleStartVoice}
                variant="outline"
                className="border-2 border-purple-200 text-purple-600 hover:bg-purple-50 hover:border-purple-300 font-semibold"
              >
                <Mic className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        
        {/* Status Indicator */}
        <div className="absolute top-4 right-4">
          <div className="w-3 h-3 bg-green-400 rounded-full shadow-sm animate-pulse" />
        </div>
      </Card>
    </div>
  );
}