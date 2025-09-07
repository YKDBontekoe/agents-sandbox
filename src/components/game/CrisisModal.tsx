import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { ActionButton, ResourceIcon } from '@arcane/ui';
import type { ResourceType } from '@arcane/ui';

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
  <Dialog.Root open>
    <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]" />
    <Dialog.Content className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="bg-gray-800 border border-gray-700 text-gray-200 rounded-lg shadow-xl p-6 w-full max-w-md">
      <Dialog.Title className="text-xl font-bold mb-2 text-gray-100">
        {crisis.type === 'unrest' ? 'Unrest Boils Over' : 'Threat Escalates'}
      </Dialog.Title>
      <Dialog.Description className="text-gray-300 mb-4">
        {crisis.message}
      </Dialog.Description>
      <div className="mb-4">
        <h3 className="font-semibold text-gray-200 mb-2">Temporary Penalty</h3>
        <ul className="space-y-1">
          {Object.entries(crisis.penalty).map(([key, val]) => (
            <li key={key} className="flex items-center gap-2 text-sm text-gray-300">
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
      </div>
    </Dialog.Content>
  </Dialog.Root>
);

export default CrisisModal;
