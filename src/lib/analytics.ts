export interface AgentMetrics {
  responseTimes: number[];
  errorCount: number;
  tokensUsed: number;
}

interface Thresholds {
  responseTimeMs?: number;
  errorCount?: number;
  tokensUsed?: number;
}

const metrics: Record<string, AgentMetrics> = {};
let thresholds: Thresholds = {
  responseTimeMs: Number(process.env.ANALYTICS_RESPONSE_TIME_THRESHOLD) || undefined,
  errorCount: Number(process.env.ANALYTICS_ERROR_THRESHOLD) || undefined,
  tokensUsed: Number(process.env.ANALYTICS_TOKENS_THRESHOLD) || undefined,
};

export type AlertHandler = (
  agentId: string,
  metric: keyof Thresholds,
  value: number
) => void | Promise<void>;

const alertHandlers: AlertHandler[] = [];

function ensureAgent(agentId: string) {
  if (!metrics[agentId]) {
    metrics[agentId] = { responseTimes: [], errorCount: 0, tokensUsed: 0 };
  }
}

function notifyUpdate() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('analytics-updated'));
  }
}

function checkAlert(agentId: string, metric: keyof Thresholds, value: number) {
  const threshold = thresholds[metric];
  if (threshold !== undefined && value > threshold) {
    for (const handler of alertHandlers) {
      try {
        handler(agentId, metric, value);
      } catch (err) {
        console.error('Alert handler failed', err);
      }
    }
  }
}

export function recordResponseTime(agentId: string, ms: number) {
  ensureAgent(agentId);
  metrics[agentId].responseTimes.push(ms);
  checkAlert(agentId, 'responseTimeMs', ms);
  notifyUpdate();
}

export function incrementError(agentId: string) {
  ensureAgent(agentId);
  metrics[agentId].errorCount += 1;
  checkAlert(agentId, 'errorCount', metrics[agentId].errorCount);
  notifyUpdate();
}

export function recordTokens(agentId: string, tokens: number) {
  ensureAgent(agentId);
  metrics[agentId].tokensUsed += tokens;
  checkAlert(agentId, 'tokensUsed', metrics[agentId].tokensUsed);
  notifyUpdate();
}

export function getMetrics(agentId: string): AgentMetrics | undefined {
  return metrics[agentId];
}

export function getAllMetrics(): Record<string, AgentMetrics> {
  return metrics;
}

export function setThresholds(newThresholds: Thresholds) {
  thresholds = { ...thresholds, ...newThresholds };
}

export function onAlert(handler: AlertHandler) {
  alertHandlers.push(handler);
}

export async function sendSlackAlert(
  agentId: string,
  metric: keyof Thresholds,
  value: number
) {
  if (!process.env.SLACK_WEBHOOK_URL) return;
  try {
    await fetch(process.env.SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `Agent ${agentId} exceeded ${metric}: ${value}`,
      }),
    });
  } catch (err) {
    console.error('Failed to send Slack alert', err);
  }
}

export async function sendEmailAlert(
  agentId: string,
  metric: keyof Thresholds,
  value: number
) {
  if (!process.env.EMAIL_WEBHOOK_URL) return;
  try {
    await fetch(process.env.EMAIL_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId, metric, value }),
    });
  } catch (err) {
    console.error('Failed to send email alert', err);
  }
}

// Register default alert handlers if environment variables are provided
if (process.env.SLACK_WEBHOOK_URL) {
  onAlert((agentId, metric, value) => {
    sendSlackAlert(agentId, metric, value);
  });
}

if (process.env.EMAIL_WEBHOOK_URL) {
  onAlert((agentId, metric, value) => {
    sendEmailAlert(agentId, metric, value);
  });
}
