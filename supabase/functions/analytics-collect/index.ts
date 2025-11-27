import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { crypto } from 'https://deno.land/std@0.177.0/crypto/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

interface AnalyticsEvent {
  event: string;
  url: string;
  referrer?: string;
  device?: string;
  ipAddress?: string;
  timestamp?: string;
  metadata?: {
    browser?: string;
    os?: string;
    screenSize?: string;
    [key: string]: any;
  };
}

// Rate limiting storage (in-memory for simplicity)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 100; // requests per minute
const RATE_LIMIT_WINDOW = 60000; // 1 minute in ms

function checkRateLimit(apiKeyHash: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(apiKeyHash);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(apiKeyHash, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT) {
    return false;
  }

  record.count++;
  return true;
}

async function hashApiKey(apiKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = req.headers.get('x-api-key');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Missing x-api-key header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Hash the API key
    const keyHash = await hashApiKey(apiKey);

    // Check rate limit
    if (!checkRateLimit(keyHash)) {
      console.log(`Rate limit exceeded for API key: ${apiKey.substring(0, 12)}...`);
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Maximum 100 requests per minute.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify API key and get app_id
    const { data: apiKeyRecord, error: keyError } = await supabase
      .from('api_keys')
      .select('id, app_id, is_active, expires_at')
      .eq('key_hash', keyHash)
      .single();

    if (keyError || !apiKeyRecord) {
      console.error('Invalid API key:', keyError);
      return new Response(
        JSON.stringify({ error: 'Invalid API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!apiKeyRecord.is_active) {
      return new Response(
        JSON.stringify({ error: 'API key has been revoked' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (apiKeyRecord.expires_at && new Date(apiKeyRecord.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: 'API key has expired' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse event data
    const eventData: AnalyticsEvent = await req.json();

    if (!eventData.event || !eventData.url) {
      return new Response(
        JSON.stringify({ error: 'Event name and URL are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Collecting event: ${eventData.event} for app: ${apiKeyRecord.app_id}`);

    // Insert analytics event
    const { error: insertError } = await supabase
      .from('analytics_events')
      .insert({
        app_id: apiKeyRecord.app_id,
        event: eventData.event,
        url: eventData.url,
        referrer: eventData.referrer || null,
        device: eventData.device || null,
        ip_address: eventData.ipAddress || null,
        user_agent: req.headers.get('user-agent') || null,
        browser: eventData.metadata?.browser || null,
        os: eventData.metadata?.os || null,
        screen_size: eventData.metadata?.screenSize || null,
        metadata: eventData.metadata || null,
        timestamp: eventData.timestamp ? new Date(eventData.timestamp).toISOString() : new Date().toISOString(),
      });

    if (insertError) {
      console.error('Error inserting analytics event:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to store analytics event' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update last_used_at for API key
    await supabase
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', apiKeyRecord.id);

    console.log(`Successfully collected event: ${eventData.event}`);

    return new Response(
      JSON.stringify({ success: true, message: 'Event collected successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});