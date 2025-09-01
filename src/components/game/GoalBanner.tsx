import { useState, useEffect } from 'react';

const DISMISSED_KEY = 'ad_goal_banner_dismissed';
const COLLAPSED_KEY = 'ad_goal_banner_collapsed';

export default function GoalBanner() {
  const [dismissed, setDismissed] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      setDismissed(localStorage.getItem(DISMISSED_KEY) === '1');
      setCollapsed(localStorage.getItem(COLLAPSED_KEY) === '1');
    } catch {}
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    try { localStorage.setItem(DISMISSED_KEY, '1'); } catch {}
  };

  const toggleCollapse = () => {
    setCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0'); } catch {}
      return next;
    });
  };

  if (dismissed) return null;

  return (
    <div className="w-full bg-indigo-700 text-white text-sm px-4 py-2 flex items-center justify-between">
      <div className="flex-1">
        {collapsed ? (
          <span className="cursor-pointer" onClick={toggleCollapse}>Dominion goal</span>
        ) : (
          <span>Hold the Dominion as long as you can—keep Unrest &lt;80 and Threat &lt;70.</span>
        )}
      </div>
      <div className="flex items-center gap-3 ml-4">
        <button
          onClick={toggleCollapse}
          className="text-white hover:text-indigo-200 text-xs underline"
        >
          {collapsed ? 'Show' : 'Hide'}
        </button>
        <button
          onClick={handleDismiss}
          className="text-white hover:text-indigo-200"
          aria-label="Dismiss goal banner"
        >
          ×
        </button>
      </div>
    </div>
  );
}

