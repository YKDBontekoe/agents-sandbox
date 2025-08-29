import { registerAlertHandler, Thresholds } from '..';

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

registerAlertHandler((agentId, metric, value) => {
  sendSlackAlert(agentId, metric, value);
});

