import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from '@repo/db';
import bcrypt from 'bcryptjs';

// Merchant auth — login with email + password.
// Separate from user-app which uses phone + password.
const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'Email',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },

      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required');
        }

        // Look up merchant by email
        const merchant = await prisma.merchant.findUnique({
          where: { email: credentials.email },
        });

        if (!merchant) {
          throw new Error('No merchant account found with this email');
        }

        const isValidPassword = await bcrypt.compare(
          credentials.password,
          merchant.password
        );

        if (!isValidPassword) {
          throw new Error('Incorrect password');
        }

        return {
          id: String(merchant.id),
          name: merchant.name,
          email: merchant.email,
        };
      },
    }),
  ],

  session: { strategy: 'jwt' },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },

    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },

  pages: {
    signIn: '/login',
  },

  secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };