'use client';

import type { ComponentProps } from 'react';
import PlayPage from './PlayPageInternal';
import { StoreProvider } from '@/state/store';

type PlayClientProps = ComponentProps<typeof PlayPage>;

export default function PlayClient(props: PlayClientProps) {
  return (
    <StoreProvider>
      <PlayPage {...props} />
    </StoreProvider>
  );
}
