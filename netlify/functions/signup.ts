import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import sgMail from '@sendgrid/mail';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { email, password } = JSON.parse(event.body!);
    
    if (!email || !password) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Email and password are required' })
      };
    }

    // Create the user
    const { data: userData, error: signUpError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (signUpError) throw signUpError;

    // If this is the admin email, grant admin privileges
    if (email === 'joebruce1313@gmail.com') {
      const { error: adminError } = await supabase
        .from('admin_users')
        .insert({ user_id: userData.user.id });

      if (adminError) throw adminError;
    }

    // Generate verification token
    const verificationToken = Buffer.from(email + Date.now().toString()).toString('base64');
    
    // Create verification URL
    const verificationUrl = `${process.env.URL}/verify?token=${verificationToken}`;

    // Send welcome email
    const msg = {
      to: email,
      from: 'noreply@auramind.app',
      subject: 'Welcome to AuraMind',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to AuraMind!</h2>
          <p>Your account has been created successfully. You can now sign in to access your account.</p>
          <p>If you didn't create this account, please contact support immediately.</p>
        </div>
      `,
    };

    await sgMail.send(msg);

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        message: 'Account created successfully',
        email 
      })
    };
  } catch (error: any) {
    console.error('Signup error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to process signup',
        details: error.message
      })
    };
  }
};