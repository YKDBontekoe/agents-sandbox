import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { ActionButton, ResourceIcon, Modal } from '../ui';
import type { ResourceType } from '../ui/ResourceIcon';

export interface CrisisData {
  type: 'unrest' | 'threat';
  message: string;
  penalty: Record<string, number>;
}

interface CrisisModalProps {
  crisis: CrisisData;
  onResolve: () => void;
}

const CrisisModal: React.FC<CrisisModalProps> = ({ crisis, onResolve }) => (
  <Modal open overlayClassName="fixed inset-0 bg-black/50 z-50" className="bg-white p-6">
    <Dialog.Title className="text-xl font-bold mb-2">
      {crisis.type === 'unrest' ? 'Unrest Boils Over' : 'Threat Escalates'}
    </Dialog.Title>
    <Dialog.Description className="text-slate-700 mb-4">
      {crisis.message}
    </Dialog.Description>
    <div className="mb-4">
      <h3 className="font-semibold text-slate-800 mb-2">Temporary Penalty</h3>
      <ul className="space-y-1">
        {Object.entries(crisis.penalty).map(([key, val]) => (
          <li key={key} className="flex items-center gap-2 text-sm text-slate-700">
            <ResourceIcon type={key as ResourceType} value={val} />
            <span>-{Math.abs(val)} {key}</span>
          </li>
        ))}
      </ul>
    </div>
    <div className="text-right">
      <Dialog.Close asChild>
        <ActionButton onClick={onResolve} variant="primary">Endure</ActionButton>
      </Dialog.Close>
    </div>
  </Modal>
);

export default CrisisModal;
