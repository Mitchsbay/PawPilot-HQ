import React, { useState, useEffect } from "react";
import { useAuth } from "../../lib/auth";
import { supabase } from "../../lib/supabase";
import { isEnabled } from "../../lib/flags";
import { telemetry } from "../../lib/telemetry";
import { 
  startSubscription, 
  getCurrentSubscription, 
  cancelSubscription,
  getCustomerPortalUrl,
  SUBSCRIPTION_PLANS,
  type SubscriptionPlan 
} from "./api";
import { 
  CreditCard, Check, Crown, Users, Shield, 
  Calendar, ExternalLink, X, Star, Zap
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import ConfirmDialog from "../../components/UI/ConfirmDialog";

interface Subscription {
  id: string;
  status: string;
  price_id: string;
  current_period_end: string;
}

const Billing: React.FC = () => {
  const { profile } = useAuth();
  const [isFeatureEnabled, setIsFeatureEnabled] = useState(false);
  const [currentSubscription, setCurrentSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [canceling, setCanceling] = useState(false);

  useEffect(() => {
    if (profile) {
      checkFeatureFlag();
      loadSubscription();
    }
  }, [profile]);

  const checkFeatureFlag = async () => {
    if (!profile) return;
    
    const enabled = await isEnabled("payments_billing", profile.id);
    setIsFeatureEnabled(enabled);
  };

  const loadSubscription = async () => {
    try {
      const subscription = await getCurrentSubscription();
      setCurrentSubscription(subscription);
    } catch (error) {
      console.error('Error loading subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartSubscription = async (plan: SubscriptionPlan) => {
    try {
      await startSubscription(plan.id);
    } catch (error) {
      toast.error('Failed to start subscription');
      console.error('Subscription error:', error);
    }
  };

  const handleCancelSubscription = async () => {
    if (!currentSubscription) return;

    setCanceling(true);
    try {
      const success = await cancelSubscription(currentSubscription.id);
      if (success) {
        toast.success('Subscription canceled successfully');
        loadSubscription();
      } else {
        toast.error('Failed to cancel subscription');
      }
    } catch (error) {
      toast.error('Failed to cancel subscription');
      console.error('Cancel error:', error);
    } finally {
      setCanceling(false);
      setShowCancelDialog(false);
    }
  };

  const openCustomerPortal = async () => {
    try {
      const portalUrl = await getCustomerPortalUrl();
      if (portalUrl) {
        window.open(portalUrl, '_blank');
      } else {
        toast.error('Unable to open customer portal');
      }
    } catch (error) {
      toast.error('Failed to open customer portal');
      console.error('Portal error:', error);
    }
  };

  const getCurrentPlan = () => {
    if (!currentSubscription) return null;
    return SUBSCRIPTION_PLANS.find(plan => 
      plan.stripePriceId === currentSubscription.price_id
    );
  };

  if (!isFeatureEnabled) {
    return null;
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-96 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const currentPlan = getCurrentPlan();

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Choose Your PawPilot Plan
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Unlock premium features to give your pets the best care possible
        </p>
      </div>

      {/* Current Subscription Status */}
      {currentSubscription && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-blue-900">
                Current Plan: {currentPlan?.name || 'Unknown Plan'}
              </h3>
              <p className="text-blue-700">
                Status: <span className="capitalize">{currentSubscription.status}</span>
                {currentSubscription.current_period_end && (
                  <span className="ml-2">
                    • Renews {new Date(currentSubscription.current_period_end).toLocaleDateString()}
                  </span>
                )}
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={openCustomerPortal}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                <span>Manage Billing</span>
              </button>
              <button
                onClick={() => setShowCancelDialog(true)}
                className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                Cancel Plan
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Pricing Plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {SUBSCRIPTION_PLANS.map((plan, index) => {
          const isCurrentPlan = currentPlan?.id === plan.id;
          const isPopular = plan.id === 'premium';
          
          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`relative bg-white rounded-2xl shadow-lg overflow-hidden ${
                isPopular ? 'ring-2 ring-blue-500' : 'border border-gray-200'
              }`}
            >
              {/* Popular Badge */}
              {isPopular && (
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                    Most Popular
                  </span>
                </div>
              )}

              {/* Current Plan Badge */}
              {isCurrentPlan && (
                <div className="absolute top-4 right-4">
                  <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                    Current Plan
                  </span>
                </div>
              )}

              <div className="p-8">
                {/* Plan Header */}
                <div className="text-center mb-8">
                  <div className="mb-4">
                    {plan.id === 'basic' && <Shield className="h-12 w-12 text-blue-600 mx-auto" />}
                    {plan.id === 'premium' && <Crown className="h-12 w-12 text-purple-600 mx-auto" />}
                    {plan.id === 'family' && <Users className="h-12 w-12 text-green-600 mx-auto" />}
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <div className="flex items-baseline justify-center">
                    <span className="text-4xl font-bold text-gray-900">${plan.price}</span>
                    <span className="text-gray-600 ml-1">/{plan.interval}</span>
                  </div>
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center">
                      <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Action Button */}
                <button
                  onClick={() => handleStartSubscription(plan)}
                  disabled={isCurrentPlan}
                  className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
                    isCurrentPlan
                      ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                      : isPopular
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-900 text-white hover:bg-gray-800'
                  }`}
                >
                  {isCurrentPlan ? 'Current Plan' : `Choose ${plan.name}`}
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* FAQ Section */}
      <div className="mt-16">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
          Frequently Asked Questions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Can I change plans anytime?</h3>
            <p className="text-gray-600">
              Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">What payment methods do you accept?</h3>
            <p className="text-gray-600">
              We accept all major credit cards, debit cards, and digital wallets through Stripe.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Is there a free trial?</h3>
            <p className="text-gray-600">
              Yes! All plans come with a 14-day free trial. Cancel anytime during the trial period.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Can I cancel anytime?</h3>
            <p className="text-gray-600">
              Absolutely. You can cancel your subscription at any time with no cancellation fees.
            </p>
          </div>
        </div>
      </div>

      {/* Cancel Subscription Dialog */}
      <ConfirmDialog
        isOpen={showCancelDialog}
        onClose={() => setShowCancelDialog(false)}
        onConfirm={handleCancelSubscription}
        title="Cancel Subscription"
        message="Are you sure you want to cancel your subscription? You'll lose access to premium features at the end of your current billing period."
        confirmText="Cancel Subscription"
        type="warning"
      />
    </div>
  );
};

export default Billing;