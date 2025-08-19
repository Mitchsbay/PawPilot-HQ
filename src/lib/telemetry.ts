import { supabase } from './supabase';

export interface TelemetryEvent {
  event: string;
  meta?: Record<string, any>;
}

export const logEvent = async (eventData: TelemetryEvent): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    await supabase
      .from('app_events')
      .insert({
        user_id: user?.id || null,
        event: eventData.event,
        meta: eventData.meta || {},
        occurred_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('Failed to log telemetry event:', error);
  }
};

export const logSuccess = (event: string, meta?: Record<string, any>) => {
  logEvent({ event: `${event}_success`, meta });
};

export const logError = (event: string, error: Error, meta?: Record<string, any>) => {
  logEvent({ 
    event: `${event}_error`, 
    meta: { 
      ...meta, 
      error: error.message,
      stack: error.stack 
    } 
  });
};

// Convenience functions for common events
export const telemetry = {
  auth: {
    signUp: (meta?: Record<string, any>) => logEvent({ event: 'auth_signup', meta }),
    signIn: (meta?: Record<string, any>) => logEvent({ event: 'auth_signin', meta }),
    signOut: (meta?: Record<string, any>) => logEvent({ event: 'auth_signout', meta }),
  },
  
  posts: {
    create: (meta?: Record<string, any>) => logEvent({ event: 'post_create', meta }),
    edit: (meta?: Record<string, any>) => logEvent({ event: 'post_edit', meta }),
    delete: (meta?: Record<string, any>) => logEvent({ event: 'post_delete', meta }),
    like: (meta?: Record<string, any>) => logEvent({ event: 'post_like', meta }),
    save: (meta?: Record<string, any>) => logEvent({ event: 'post_save', meta }),
  },
  
  messages: {
    send: (meta?: Record<string, any>) => logEvent({ event: 'message_send', meta }),
    react: (meta?: Record<string, any>) => logEvent({ event: 'message_react', meta }),
    attach: (meta?: Record<string, any>) => logEvent({ event: 'message_attach', meta }),
  },
  
  social: {
    follow: (meta?: Record<string, any>) => logEvent({ event: 'user_follow', meta }),
    unfollow: (meta?: Record<string, any>) => logEvent({ event: 'user_unfollow', meta }),
    block: (meta?: Record<string, any>) => logEvent({ event: 'user_block', meta }),
    report: (meta?: Record<string, any>) => logEvent({ event: 'content_report', meta }),
  },
  
  pets: {
    create: (meta?: Record<string, any>) => logEvent({ event: 'pet_create', meta }),
    update: (meta?: Record<string, any>) => logEvent({ event: 'pet_update', meta }),
    delete: (meta?: Record<string, any>) => logEvent({ event: 'pet_delete', meta }),
  },
  
  health: {
    record: (meta?: Record<string, any>) => logEvent({ event: 'health_record', meta }),
    update: (meta?: Record<string, any>) => logEvent({ event: 'health_update', meta }),
  },
  
  groups: {
    create: (meta?: Record<string, any>) => logEvent({ event: 'group_create', meta }),
    join: (meta?: Record<string, any>) => logEvent({ event: 'group_join', meta }),
    leave: (meta?: Record<string, any>) => logEvent({ event: 'group_leave', meta }),
  },
  
  events: {
    create: (meta?: Record<string, any>) => logEvent({ event: 'event_create', meta }),
    rsvp: (meta?: Record<string, any>) => logEvent({ event: 'event_rsvp', meta }),
  },
  
  donations: {
    create: (meta?: Record<string, any>) => logEvent({ event: 'donation_create', meta }),
    cause: (meta?: Record<string, any>) => logEvent({ event: 'cause_create', meta }),
  },
  
  search: {
    query: (meta?: Record<string, any>) => logEvent({ event: 'search_query', meta }),
    advanced: (meta?: Record<string, any>) => logEvent({ event: 'search_advanced', meta }),
  },
  
  notifications: {
    push: (meta?: Record<string, any>) => logEvent({ event: 'notification_push', meta }),
    email: (meta?: Record<string, any>) => logEvent({ event: 'notification_email', meta }),
  }
};