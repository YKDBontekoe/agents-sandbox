if (process.env.SLACK_WEBHOOK_URL) {
  await import('./alerts/slack');
}

if (process.env.EMAIL_WEBHOOK_URL) {
  await import('./alerts/email');
}

