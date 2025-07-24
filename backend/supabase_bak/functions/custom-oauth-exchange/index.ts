import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TokenExchangeRequest {
  code: string;
  config: {
    clientId: string;
    clientSecret?: string; // Optional for providers that use API key authentication
    redirectUri: string;
    tokenUrl: string;
    userInfoUrl: string;
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Custom OAuth exchange started - v2.0');
    console.log('Request method:', req.method);
    console.log('Request URL:', req.url);
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check if required environment variables are present
    if (!Deno.env.get('SUPABASE_URL') || !Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) {
      throw new Error('Missing required environment variables');
    }

    let requestBody;
    try {
      requestBody = await req.json();
    } catch (jsonError) {
      console.error('Failed to parse JSON body:', jsonError);
      throw new Error('Invalid JSON in request body');
    }

    const { code, config }: TokenExchangeRequest = requestBody;
    console.log('Received request with code:', code ? 'present' : 'missing');
    console.log('Config provided:', config ? 'present' : 'missing');

    if (!code || !config) {
      throw new Error('Missing required parameters: code or config');
    }

    if (!config.clientId || !config.redirectUri || !config.tokenUrl || !config.userInfoUrl) {
      throw new Error('Missing required config parameters');
    }

    console.log('Exchanging OAuth code for tokens...');

    // Exchange authorization code for access token
    // For DexanPassport, the API key is embedded in the tokenUrl
    const tokenResponse = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: config.clientId,
        code: code,
        redirect_uri: config.redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      throw new Error(`Token exchange failed: ${errorText}`);
    }

    const tokenData = await tokenResponse.json();
    
    if (!tokenData.access_token) {
      throw new Error('No access token received');
    }

    console.log('Successfully received tokens, fetching user info...');

    // Fetch user information using the access token
    const userResponse = await fetch(config.userInfoUrl, {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Accept': 'application/json',
      },
    });

    if (!userResponse.ok) {
      throw new Error('Failed to fetch user information');
    }

    const userData = await userResponse.json();
    console.log('User data received:', { id: userData.id, email: userData.email });

    // First try to find existing user by email
    const { data: users } = await supabase.auth.admin.listUsers();
    let user = users.users.find(u => u.email === userData.email);
    let isNewUser = false;

    if (!user) {
      // User doesn't exist, create new user
      console.log('Creating new user with guest role...');
      isNewUser = true;
      
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: userData.email,
        email_confirm: true,
        user_metadata: {
          provider: 'custom_oauth',
          provider_id: userData.id,
          name: userData.name,
          avatar_url: userData.avatar_url,
          ...userData,
        },
      });

      if (authError) {
        console.error('Error creating user:', authError);
        throw authError;
      }

      user = authData.user;
      
      if (!user) {
        throw new Error('Failed to create user');
      }

      // Assign guest role to new user
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: user.id,
          role: 'guest'
        });

      if (roleError) {
        console.error('Error assigning guest role:', roleError);
        // Don't throw error here as user is created, just log it
      } else {
        console.log('Guest role assigned to new user');
      }
    } else {
      console.log('Found existing user:', user.email);
    }

    // Generate session tokens using temporary password approach
    console.log('Generating session tokens for user:', user.id);
    
    // Generate a temporary password
    const tempPassword = crypto.randomUUID();
    
    // Update the user with the temporary password
    const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
      password: tempPassword
    });

    if (updateError) {
      console.error('Failed to update user password:', updateError);
      throw new Error('Failed to prepare user for authentication');
    }

    // Sign in with the temporary password to get session tokens
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: tempPassword
    });

    if (signInError || !signInData.session) {
      console.error('Failed to sign in with temporary password:', signInError);
      throw new Error('Failed to generate session tokens');
    }

    const accessToken = signInData.session.access_token;
    const refreshToken = signInData.session.refresh_token;

    console.log('Session tokens generated successfully');

    console.log('OAuth exchange completed successfully');

    return new Response(
      JSON.stringify({
        access_token: accessToken,
        refresh_token: refreshToken,
        user: user,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Custom OAuth exchange error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    // Ensure we return a proper error response with details
    const errorMessage = error.message || 'Unknown error occurred';
    const errorResponse = {
      error: errorMessage,
      details: error.stack || 'No stack trace available',
      timestamp: new Date().toISOString()
    };
    
    return new Response(
      JSON.stringify(errorResponse),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});