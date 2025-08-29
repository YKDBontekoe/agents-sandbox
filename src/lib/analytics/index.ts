import { countTokens } from '../utils';

export interface AgentMetrics {
  responseTimes: number[];
  errorCount: number;
  tokensUsed: number;
}

export interface Thresholds {
  responseTimeMs?: number;
  errorCount?: number;
  tokensUsed?: number;
}

let metrics: Record<string, AgentMetrics> = {};
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

export async function readMetrics(): Promise<Record<string, AgentMetrics>> {
  if (typeof window !== 'undefined') return {};
  const { persistence } = await import('../persistence/file');
  return persistence.read<Record<string, AgentMetrics>>(
    'analytics-metrics',
    {}
  );
}

export async function writeMetrics(): Promise<void> {
  if (typeof window !== 'undefined') return;
  const { persistence } = await import('../persistence/file');
  await persistence.write('analytics-metrics', metrics);
}

if (typeof window === 'undefined') {
  metrics = await readMetrics();
}

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

function persist() {
  writeMetrics().catch(err => console.error('Failed to write metrics', err));
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
  persist();
}

export function incrementError(agentId: string) {
  ensureAgent(agentId);
  metrics[agentId].errorCount += 1;
  checkAlert(agentId, 'errorCount', metrics[agentId].errorCount);
  notifyUpdate();
  persist();
}

export function recordTokens(agentId: string, textOrTokens: string | number) {
  ensureAgent(agentId);
  const tokens =
    typeof textOrTokens === 'number' ? textOrTokens : countTokens(textOrTokens);
  metrics[agentId].tokensUsed += tokens;
  checkAlert(agentId, 'tokensUsed', metrics[agentId].tokensUsed);
  notifyUpdate();
  persist();
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

export function registerAlertHandler(handler: AlertHandler) {
  alertHandlers.push(handler);
}

