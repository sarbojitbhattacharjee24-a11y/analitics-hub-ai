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
    const event = url.searchParams.get('event');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const appId = url.searchParams.get('app_id');

    if (!event) {
      return new Response(
        JSON.stringify({ error: 'Event parameter is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching event summary for: ${event}, app: ${appId || 'all'}, user: ${user.id}`);

    // Build query
    let query = supabase
      .from('analytics_events')
      .select('*');

    // Filter by app_id if provided, otherwise get all apps for this user
    if (appId) {
      // Verify user owns this app
      const { data: app } = await supabase
        .from('apps')
        .select('id')
        .eq('id', appId)
        .eq('user_id', user.id)
        .single();

      if (!app) {
        return new Response(
          JSON.stringify({ error: 'App not found or unauthorized' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      query = query.eq('app_id', appId);
    } else {
      // Get all apps for user
      const { data: apps } = await supabase
        .from('apps')
        .select('id')
        .eq('user_id', user.id);

      if (!apps || apps.length === 0) {
        return new Response(
          JSON.stringify({ event, count: 0, uniqueUsers: 0, deviceData: {} }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const appIds = apps.map(app => app.id);
      query = query.in('app_id', appIds);
    }

    // Apply filters
    query = query.eq('event', event);

    if (startDate) {
      query = query.gte('timestamp', new Date(startDate).toISOString());
    }

    if (endDate) {
      query = query.lte('timestamp', new Date(endDate).toISOString());
    }

    const { data: events, error: eventsError } = await query;

    if (eventsError) {
      console.error('Error fetching events:', eventsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch analytics data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate summary statistics
    const count = events?.length || 0;
    const uniqueIps = new Set(events?.map(e => e.ip_address).filter(Boolean));
    const uniqueUsers = uniqueIps.size;

    const deviceData: Record<string, number> = {};
    events?.forEach(e => {
      if (e.device) {
        deviceData[e.device] = (deviceData[e.device] || 0) + 1;
      }
    });

    console.log(`Event summary: ${count} total events, ${uniqueUsers} unique users`);

    return new Response(
      JSON.stringify({
        event,
        count,
        uniqueUsers,
        deviceData,
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