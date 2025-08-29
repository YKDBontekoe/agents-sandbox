'use client';

import React from 'react';
import { AgentForm } from './AgentForm';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useAgentDashboardStore } from '@/lib/agent-dashboard-store';

export function AgentDialogs() {
  const {
    showForm,
    editingAgent,
    saveAgent,
    closeForm,
    deleteDialogOpen,
    closeDeleteDialog,
    confirmDeleteAgent,
  } = useAgentDashboardStore();

  return (
    <>
      {showForm && (
        <div className="container mx-auto p-6">
          <AgentForm
            agent={editingAgent || undefined}
            onSave={saveAgent}
            onCancel={closeForm}
          />
        </div>
      )}
      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete Agent"
        description="Are you sure you want to delete this agent?"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={confirmDeleteAgent}
        onCancel={closeDeleteDialog}
      />
    </>
  );
}
