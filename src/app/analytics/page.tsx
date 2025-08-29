'use client';

import { useEffect, useState } from 'react';
import AnalyticsDashboard from '@/components/analytics/AnalyticsDashboard';

export default function AnalyticsPage() {
  const [, setTick] = useState(0);

  useEffect(() => {
    const handler = () => setTick(t => t + 1);
    window.addEventListener('analytics-updated', handler);
    return () => window.removeEventListener('analytics-updated', handler);
  }, []);

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-4">Analytics</h1>
      <AnalyticsDashboard />
    </div>
  );
}
