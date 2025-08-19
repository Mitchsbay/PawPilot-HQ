import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface EmailNotification {
  to: string;
  subject: string;
  html: string;
  type: 'welcome' | 'digest' | 'alert' | 'reminder';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization')!;
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { notifications }: { notifications: EmailNotification[] } = await req.json();

    if (!notifications || !Array.isArray(notifications)) {
      return new Response(
        JSON.stringify({ error: 'Invalid notifications array' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if SendGrid API key is available
    const sendGridApiKey = Deno.env.get('SENDGRID_API_KEY');
    
    if (sendGridApiKey) {
      // Use SendGrid for production email sending
      const results = await Promise.all(
        notifications.map(async (notification) => {
          try {
            const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${sendGridApiKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                personalizations: [{
                  to: [{ email: notification.to }],
                  subject: notification.subject
                }],
                from: { 
                  email: 'noreply@pawpilothq.com',
                  name: 'PawPilot HQ'
                },
                content: [{
                  type: 'text/html',
                  value: notification.html
                }]
              })
            });

            if (response.ok) {
              await supabaseClient.from('event_log').insert({
                user_id: user.id,
                name: 'email_sent',
                props: {
                  to: notification.to,
                  subject: notification.subject,
                  type: notification.type,
                  provider: 'sendgrid'
                }
              });

              return {
                to: notification.to,
                status: 'sent',
                messageId: response.headers.get('x-message-id')
              };
            } else {
              throw new Error(`SendGrid API error: ${response.status}`);
            }
          } catch (error) {
            console.error(`Email send error for ${notification.to}:`, error);
            
            await supabaseClient.from('event_log').insert({
              user_id: user.id,
              name: 'email_send_error',
              props: {
                to: notification.to,
                error: error.message,
                provider: 'sendgrid'
              }
            });
            
            return {
              to: notification.to,
              status: 'failed',
              error: error.message
            };
          }
        })
      );

      const successCount = results.filter(r => r.status === 'sent').length;
      const failureCount = results.length - successCount;

      return new Response(
        JSON.stringify({ 
          success: true, 
          sent: successCount, 
          failed: failureCount,
          results,
          provider: 'sendgrid'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    } else {
      // Fallback to mock email sending for development
      const results = await Promise.all(
        notifications.map(async (notification) => {
          try {
            // Simulate email sending delay
            await new Promise(resolve => setTimeout(resolve, 100));
            
            console.log(`Mock email to ${notification.to}: ${notification.subject}`);
            
            await supabaseClient.from('event_log').insert({
              user_id: user.id,
              name: 'email_sent_mock',
              props: {
                to: notification.to,
                subject: notification.subject,
                type: notification.type,
                provider: 'mock'
              }
            });
            
            return {
              to: notification.to,
              status: 'sent',
              messageId: `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            };
          } catch (error) {
            console.error(`Mock email error for ${notification.to}:`, error);
            
            await supabaseClient.from('event_log').insert({
              user_id: user.id,
              name: 'email_send_error',
              props: {
                to: notification.to,
                error: error.message,
                provider: 'mock'
              }
            });
            
            return {
              to: notification.to,
              status: 'failed',
              error: error.message
            };
          }
        })
      );

      const successCount = results.filter(r => r.status === 'sent').length;
      const failureCount = results.length - successCount;

      return new Response(
        JSON.stringify({ 
          success: true, 
          sent: successCount, 
          failed: failureCount,
          results,
          provider: 'mock'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }
  } catch (error) {
    console.error('Error sending email notifications:', error);
    
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});