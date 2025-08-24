import { supabase } from "../../lib/supabase";
import { telemetry } from "../../lib/telemetry";

export async function loadSubscription(user) {
  try {
    telemetry.track('subscription_load_attempt', {
      user_id: user.id
    });

    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .limit(1);

    if (error && error.code !== 'PGRST116') {
      console.error('Error loading subscription:', error);
      return null;
    }

    return firstRow(data);
  } catch (error) {
    console.error('Error loading subscription:', error);
    return null;
  }
}

function firstRow(data) {
  return data && data.length > 0 ? data[0] : null;
}
