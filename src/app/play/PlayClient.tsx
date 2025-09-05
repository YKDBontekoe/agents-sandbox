'use client';

import PlayPage from './PlayPageInternal';
import { StoreProvider } from '@/state/store';

export default function PlayClient(props: any) {
  return (
    <StoreProvider>
      <PlayPage {...props} />
    </StoreProvider>
  );
}
