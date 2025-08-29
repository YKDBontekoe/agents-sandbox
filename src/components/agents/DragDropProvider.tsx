'use client';

import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useState } from 'react';
import { AgentConfig } from '@/types/agent';

interface DragDropProviderProps {
  children: React.ReactNode;
  agents?: AgentConfig[];
  onDragEnd?: (event: DragEndEvent) => void;
}

export function DragDropProvider({ 
  children, 
  agents = [], 
  onDragEnd 
}: DragDropProviderProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    if (onDragEnd) {
      onDragEnd(event);
    }
  };

  const agentIds = agents.map(agent => agent.id);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={agentIds} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
      <DragOverlay>
        {activeId ? (
          <div className="opacity-50 rotate-3 transform">
            {/* Render dragged item preview */}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}