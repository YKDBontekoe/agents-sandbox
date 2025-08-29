'use client';

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Card } from '@/components/ui/card';
import { Plus, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DropZoneProps {
  id: string;
  onDrop?: (agentId: string) => void;
  className?: string;
  children?: React.ReactNode;
  title?: string;
  description?: string;
  isActive?: boolean;
}

export function DropZone({ 
  id,
  onDrop, 
  className, 
  children, 
  title = "Drop Zone",
  description = "Drag an agent here to start a new session",
  isActive: externalIsActive = false
}: DropZoneProps) {
  const { isOver, setNodeRef } = useDroppable({
    id,
  });

  const isActive = isOver || externalIsActive;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "transition-all duration-200",
        className
      )}
    >
      <Card
        className={cn(
          "border-2 border-dashed transition-all duration-200 min-h-[200px] flex flex-col items-center justify-center p-8",
          isActive ? "border-blue-600 bg-blue-100/50 scale-105" : "border-gray-300"
        )}
      >
        {children || (
          <div className="text-center space-y-4">
            <div className={cn(
              "mx-auto w-12 h-12 rounded-full flex items-center justify-center transition-colors",
              isActive ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-400"
            )}>
              {isActive ? <Upload className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
            </div>
            <div>
              <h3 className={cn(
                "font-medium transition-colors",
                isActive ? "text-blue-700" : "text-gray-700"
              )}>
                {isActive ? "Release to create session" : title}
              </h3>
              <p className={cn(
                "text-sm mt-1 transition-colors",
                isActive ? "text-blue-600" : "text-gray-500"
              )}>
                {isActive ? "Drop the agent to start" : description}
              </p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}