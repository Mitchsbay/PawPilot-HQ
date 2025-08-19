import React from "react";
import { supabase } from "../../lib/supabase";
import { isEnabled } from "../../lib/flags";
import { telemetry } from "../../lib/telemetry";

async function startSubscription(successUrl: string, cancelUrl: string) {
  const { data: { user } } = await supabase.auth.getUser();
  const res = await supabase.functions.invoke('create-checkout', {
    body: { user_id: user!.id, success_url: successUrl, cancel_url: cancelUrl }
  });
  if (res.error) throw new Error(res.error.message);
  const { url } = res.data;
  window.location.href = url;
}

const Billing: React.FC = () => {
  const [on, setOn] = React.useState(false);
  React.useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setOn(await isEnabled("payments_billing", user?.id));
    })();
  }, []);
  if (!on) return null;

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Billing</h1>
      <button
        className="px-4 py-2 rounded bg-blue-600 text-white"
        onClick={async () => {
          await telemetry.payments.checkoutStart();
          await startSubscription(`${location.origin}/billing/success`, `${location.origin}/billing/cancel`);
        }}
      >
        Start Subscription
      </button>
    </div>
  );
};

export default Billing;