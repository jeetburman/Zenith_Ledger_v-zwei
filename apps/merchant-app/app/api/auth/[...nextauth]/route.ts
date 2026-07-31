import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from '@repo/db';
import bcrypt from 'bcryptjs';

import { JWT } from 'next-auth/jwt';
import { Session, User } from 'next-auth';

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'Email',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },

      async authorize(credentials: Record<string, string> | undefined) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required');
        }

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

  session: { strategy: 'jwt' as const },

  callbacks: {
    async jwt({ token, user }: { token: JWT; user: User }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },

    async session({ session, token }: { session: Session; token: JWT }) {
      if (token && session.user) {
        session.user.id = token.id;
      }
      return session;
    },
  },

  pages: {
    signIn: '/login',
  },

  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };