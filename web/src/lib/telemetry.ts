import { supabase } from "../lib/supabase";

export async function logEvent(name: string, props: Record<string, any> = {}): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("event_log").insert({
      user_id: user.id,
      name,
      props
    });
  } catch (error) {
    console.error("Failed to log telemetry event:", error);
  }
}

export async function logSuccess(event: string, props?: Record<string, any>) {
  await logEvent(`${event}_success`, props);
}

export async function logError(event: string, error: Error, props?: Record<string, any>) {
  await logEvent(`${event}_error`, {
    ...props,
    error: error.message,
    stack: error.stack
  });
}

// Convenience functions for common events
export const telemetry = {
  auth: {
    signUp: (props?: Record<string, any>) => logEvent('auth_signup', props),
    signIn: (props?: Record<string, any>) => logEvent('auth_signin', props),
    signOut: (props?: Record<string, any>) => logEvent('auth_signout', props),
  },
  
  posts: {
    create: (props?: Record<string, any>) => logEvent('post_create', props),
    edit: (props?: Record<string, any>) => logEvent('post_edit', props),
    delete: (props?: Record<string, any>) => logEvent('post_delete', props),
    like: (props?: Record<string, any>) => logEvent('post_like', props),
    save: (props?: Record<string, any>) => logEvent('post_save', props),
  },
  
  messages: {
    send: (props?: Record<string, any>) => logEvent('message_send', props),
    react: (props?: Record<string, any>) => logEvent('message_react', props),
    attach: (props?: Record<string, any>) => logEvent('message_attach', props),
  },
  
  social: {
    follow: (props?: Record<string, any>) => logEvent('user_follow', props),
    unfollow: (props?: Record<string, any>) => logEvent('user_unfollow', props),
    block: (props?: Record<string, any>) => logEvent('user_block', props),
    report: (props?: Record<string, any>) => logEvent('content_report', props),
  },
  
  pets: {
    create: (props?: Record<string, any>) => logEvent('pet_create', props),
    update: (props?: Record<string, any>) => logEvent('pet_update', props),
    delete: (props?: Record<string, any>) => logEvent('pet_delete', props),
  },
  
  health: {
    record: (props?: Record<string, any>) => logEvent('health_record', props),
    update: (props?: Record<string, any>) => logEvent('health_update', props),
  },
  
  groups: {
    create: (props?: Record<string, any>) => logEvent('group_create', props),
    join: (props?: Record<string, any>) => logEvent('group_join', props),
    leave: (props?: Record<string, any>) => logEvent('group_leave', props),
  },
  
  events: {
    create: (props?: Record<string, any>) => logEvent('event_create', props),
    rsvp: (props?: Record<string, any>) => logEvent('event_rsvp', props),
  },
  
  donations: {
    create: (props?: Record<string, any>) => logEvent('donation_create', props),
    cause: (props?: Record<string, any>) => logEvent('cause_create', props),
  },
  
  payments: {
    checkoutStart: (props?: Record<string, any>) => logEvent('payment_checkout_start', props),
    checkoutComplete: (props?: Record<string, any>) => logEvent('payment_checkout_complete', props),
    subscriptionStart: (props?: Record<string, any>) => logEvent('subscription_start', props),
    subscriptionCancel: (props?: Record<string, any>) => logEvent('subscription_cancel', props),
  },
  
  mobile: {
    cameraCapture: (props?: Record<string, any>) => logEvent('mobile_camera_capture', props),
    gpsAccess: (props?: Record<string, any>) => logEvent('mobile_gps_access', props),
    pushRegister: (props?: Record<string, any>) => logEvent('mobile_push_register', props),
  },
  
  ai: {
    classify: (props?: Record<string, any>) => logEvent('ai_classify', props),
    autoTag: (props?: Record<string, any>) => logEvent('ai_auto_tag', props),
    symptomAnalysis: (props?: Record<string, any>) => logEvent('ai_symptom_analysis', props),
  },
  
  gamification: {
    achievementUnlocked: (props?: Record<string, any>) => logEvent('achievement_unlocked', props),
    pointsEarned: (props?: Record<string, any>) => logEvent('points_earned', props),
    levelUp: (props?: Record<string, any>) => logEvent('level_up', props),
  },
  
  search: {
    query: (props?: Record<string, any>) => logEvent('search_query', props),
    advanced: (props?: Record<string, any>) => logEvent('search_advanced', props),
  },
  
  notifications: {
    push: (props?: Record<string, any>) => logEvent('notification_push', props),
    email: (props?: Record<string, any>) => logEvent('notification_email', props),
  }
};