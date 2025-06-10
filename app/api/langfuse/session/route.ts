import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { SignJWT, jwtVerify } from 'jose';
import { z } from 'zod';

// Schema for session token request
const sessionTokenSchema = z.object({
  returnUrl: z.string().url().optional()
});

// Generate a secure session token for Langfuse
async function generateSessionToken(userId: string, email: string, name?: string | null) {
  const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET!);
  
  const token = await new SignJWT({
    sub: userId,
    email: email,
    name: name,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24), // 24 hours
    iss: 'sambatv-prompt-library',
    aud: 'sambatv-ai-platform'
  })
    .setProtectedHeader({ alg: 'HS256' })
    .sign(secret);
  
  return token;
}

// Endpoint to generate session token for Langfuse
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const data = sessionTokenSchema.parse(body);
    
    // Generate session token
    const sessionToken = await generateSessionToken(
      session.user.id!,
      session.user.email!,
      session.user.name
    );
    
    // Build Langfuse URL with session token
    const langfuseUrl = process.env.NEXT_PUBLIC_LANGFUSE_URL || 'https://ai.sambatv.com';
    const authUrl = new URL('/api/auth/session', langfuseUrl);
    authUrl.searchParams.set('token', sessionToken);
    
    if (data.returnUrl) {
      authUrl.searchParams.set('returnUrl', data.returnUrl);
    }

    return NextResponse.json({
      authUrl: authUrl.toString(),
      token: sessionToken,
      expiresAt: new Date(Date.now() + (60 * 60 * 24 * 1000)).toISOString()
    });

  } catch (error) {
    console.error('Session token generation error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to generate session token' },
      { status: 500 }
    );
  }
}

// Endpoint to verify session token (for Langfuse to call)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    
    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET!);
    
    try {
      const { payload } = await jwtVerify(token, secret, {
        issuer: 'sambatv-prompt-library',
        audience: 'sambatv-ai-platform'
      });

      // Verify email domain
      if (!payload.email?.endsWith('@samba.tv')) {
        return NextResponse.json(
          { error: 'Invalid email domain' },
          { status: 403 }
        );
      }

      return NextResponse.json({
        valid: true,
        user: {
          id: payload.sub,
          email: payload.email,
          name: payload.name
        }
      });

    } catch (verifyError) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

  } catch (error) {
    console.error('Session verification error:', error);
    return NextResponse.json(
      { error: 'Failed to verify session' },
      { status: 500 }
    );
  }
}