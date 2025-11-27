import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { crypto } from 'https://deno.land/std@0.177.0/crypto/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RegisterRequest {
  name: string;
  domain: string;
  description?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { name, domain, description }: RegisterRequest = await req.json();

    if (!name || !domain) {
      return new Response(
        JSON.stringify({ error: 'Name and domain are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Registering new app: ${name} for user: ${user.id}`);

    // Create app
    const { data: app, error: appError } = await supabase
      .from('apps')
      .insert({
        user_id: user.id,
        name,
        domain,
        description: description || null,
      })
      .select()
      .single();

    if (appError) {
      console.error('Error creating app:', appError);
      return new Response(
        JSON.stringify({ error: 'Failed to create app' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate API key
    const apiKey = `ak_${crypto.randomUUID().replace(/-/g, '')}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(apiKey);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const keyHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    const keyPrefix = apiKey.substring(0, 12);

    // Store API key
    const { error: keyError } = await supabase
      .from('api_keys')
      .insert({
        app_id: app.id,
        user_id: user.id,
        key_hash: keyHash,
        key_prefix: keyPrefix,
        is_active: true,
      });

    if (keyError) {
      console.error('Error creating API key:', keyError);
      return new Response(
        JSON.stringify({ error: 'Failed to create API key' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Successfully registered app ${app.id} with API key`);

    return new Response(
      JSON.stringify({
        app: {
          id: app.id,
          name: app.name,
          domain: app.domain,
          description: app.description,
        },
        apiKey,
      }),
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