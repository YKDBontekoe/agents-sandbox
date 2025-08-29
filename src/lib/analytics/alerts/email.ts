import { registerAlertHandler, Thresholds } from '..';

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

registerAlertHandler((agentId, metric, value) => {
  sendEmailAlert(agentId, metric, value);
});

