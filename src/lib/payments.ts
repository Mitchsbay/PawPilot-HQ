export async function startCheckout(priceId: string, success?: string, cancel?: string) {
  const r = await fetch('/api/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ priceId, success_url: success, cancel_url: cancel })
  });
  if (!r.ok) throw new Error('Checkout failed');
  const { url } = await r.json();
  window.location.href = url;
}