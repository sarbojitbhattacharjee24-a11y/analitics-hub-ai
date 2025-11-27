import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const url = new URL(req.url);
    const userId = url.searchParams.get('userId'); // This is IP address in our case

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId parameter is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching user stats for: ${userId}, requester: ${user.id}`);

    // Get all apps for user
    const { data: apps } = await supabase
      .from('apps')
      .select('id')
      .eq('user_id', user.id);

    if (!apps || apps.length === 0) {
      return new Response(
        JSON.stringify({ userId, totalEvents: 0, deviceDetails: {}, ipAddress: userId }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const appIds = apps.map(app => app.id);

    // Fetch events for this user (identified by IP address)
    const { data: events, error: eventsError } = await supabase
      .from('analytics_events')
      .select('*')
      .in('app_id', appIds)
      .eq('ip_address', userId)
      .order('timestamp', { ascending: false });

    if (eventsError) {
      console.error('Error fetching user events:', eventsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch user stats' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const totalEvents = events?.length || 0;

    // Get most recent device details
    const latestEvent = events?.[0];
    const deviceDetails = latestEvent ? {
      browser: latestEvent.browser,
      os: latestEvent.os,
      screenSize: latestEvent.screen_size,
      device: latestEvent.device,
    } : {};

    console.log(`User stats: ${totalEvents} total events for user ${userId}`);

    return new Response(
      JSON.stringify({
        userId,
        totalEvents,
        deviceDetails,
        ipAddress: userId,
        recentEvents: events?.slice(0, 10).map(e => ({
          event: e.event,
          url: e.url,
          timestamp: e.timestamp,
        })) || [],
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