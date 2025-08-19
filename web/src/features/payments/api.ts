import { supabase } from "../../lib/supabase";
import { telemetry } from "../../lib/telemetry";

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  interval: 'month' | 'year';
  features: string[];
  stripePriceId: string;
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'basic',
    name: 'PawPilot Basic',
    price: 4.99,
    interval: 'month',
    stripePriceId: 'price_basic_monthly',
    features: [
      'Up to 3 pets',
      'Basic health tracking',
      'Community access',
      'Photo albums',
      'Lost & found alerts'
    ]
  },
  {
    id: 'premium',
    name: 'PawPilot Premium',
    price: 9.99,
    interval: 'month',
    stripePriceId: 'price_premium_monthly',
    features: [
      'Unlimited pets',
      'Advanced health analytics',
      'AI symptom analyzer',
      'Priority support',
      'Advanced privacy controls',
      'Export health records'
    ]
  },
  {
    id: 'family',
    name: 'PawPilot Family',
    price: 14.99,
    interval: 'month',
    stripePriceId: 'price_family_monthly',
    features: [
      'Everything in Premium',
      'Multiple user accounts',
      'Shared pet management',
      'Family calendar',
      'Bulk photo uploads',
      'Custom branding'
    ]
  }
];

export async function startSubscription(
  planId: string,
  successUrl?: string,
  cancelUrl?: string
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const plan = SUBSCRIPTION_PLANS.find(p => p.id === planId);
    if (!plan) {
      throw new Error('Invalid plan selected');
    }

    await telemetry.payments.checkoutStart({ plan_id: planId, price: plan.price });

    const response = await supabase.functions.invoke('create-checkout', {
      body: {
        price_id: plan.stripePriceId,
        success_url: successUrl || `${window.location.origin}/billing/success`,
        cancel_url: cancelUrl || `${window.location.origin}/billing/cancel`
      }
    });

    if (response.error) {
      throw new Error(response.error.message);
    }

    const { url } = response.data;
    if (url) {
      window.location.href = url;
    } else {
      throw new Error('No checkout URL received');
    }
  } catch (error) {
    console.error('Error starting subscription:', error);
    await telemetry.payments.checkoutStart({ 
      plan_id: planId, 
      error: error.message 
    });
    throw error;
  }
}

export async function getCurrentSubscription() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error loading subscription:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error loading subscription:', error);
    return null;
  }
}

export async function cancelSubscription(subscriptionId: string): Promise<boolean> {
  try {
    await telemetry.payments.subscriptionCancel({ subscription_id: subscriptionId });

    // In a real implementation, you'd call Stripe API to cancel
    // For now, we'll just update the local status
    const { error } = await supabase
      .from('subscriptions')
      .update({ status: 'canceled' })
      .eq('id', subscriptionId);

    if (error) {
      console.error('Error canceling subscription:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error canceling subscription:', error);
    return false;
  }
}

export async function getCustomerPortalUrl(): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // In a real implementation, you'd call Stripe to create a portal session
    // For now, return a placeholder
    return `https://billing.stripe.com/p/login/test_${user.id}`;
  } catch (error) {
    console.error('Error getting customer portal URL:', error);
    return null;
  }
}