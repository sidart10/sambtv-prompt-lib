/**
 * Langfuse Authentication Configuration for SambaTV AI Platform
 * This file should be placed in the Langfuse fork at: packages/web/src/server/auth-config.ts
 */

import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { prisma } from './db';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: '201626763325-m89upvbto8ei6oromvckqvtebltqp80.apps.googleusercontent.com',
      clientSecret: 'GOCSPX-TK3BlPluoxYCnjNqPQUSBAl5tj',
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
          hd: 'samba.tv' // Only allow @samba.tv domain
        }
      }
    })
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Enforce @samba.tv domain restriction
      if (!user.email?.endsWith('@samba.tv')) {
        return false;
      }
      
      // Check if user exists in main app
      try {
        const response = await fetch('https://prompts.sambatv.com/api/langfuse/session', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${account?.access_token}`
          }
        });
        
        if (response.ok) {
          const mainAppUser = await response.json();
          // Sync user data if needed
          if (mainAppUser.user) {
            user.id = mainAppUser.user.id; // Use same user ID
          }
        }
      } catch (error) {
        console.error('Failed to sync with main app:', error);
      }
      
      return true;
    },
    
    async session({ session, token, user }) {
      // Add shared session token for main app communication
      const sharedToken = generateSharedToken(user.id, user.email);
      
      return {
        ...session,
        user: {
          ...session.user,
          id: user.id
        },
        sharedToken, // This allows seamless navigation to main app
        mainAppUrl: 'https://prompts.sambatv.com'
      };
    },
    
    async jwt({ token, user, account }) {
      if (user) {
        token.userId = user.id;
      }
      if (account) {
        token.accessToken = account.access_token;
      }
      return token;
    }
  },
  
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error'
  },
  
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60 // 24 hours (same as main app)
  },
  
  secret: 'i24xRNq7qtxsRqNndBIBLK7Au64SzkSdjDf4z3QD4/M=' // Same as infrastructure setup
};

// Helper function to generate shared token
function generateSharedToken(userId: string, email: string): string {
  const jose = require('jose');
  const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);
  
  return new jose.SignJWT({
    sub: userId,
    email: email,
    iss: 'sambatv-ai-platform',
    aud: 'sambatv-prompt-library',
    exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24) // 24 hours
  })
    .setProtectedHeader({ alg: 'HS256' })
    .sign(secret);
}

// Export for use in middleware
export const ALLOWED_DOMAIN = 'samba.tv';
export const MAIN_APP_URL = 'https://prompts.sambatv.com';
export const SESSION_SYNC_ENDPOINT = `${MAIN_APP_URL}/api/langfuse/session`;