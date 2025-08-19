export async function getHealthTip(symptoms: string): Promise<string> {
  const r = await fetch('/api/ai-health-tip', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ symptoms })
  });
  if (!r.ok) return '';
  const { tip } = await r.json();
  return tip || '';
}