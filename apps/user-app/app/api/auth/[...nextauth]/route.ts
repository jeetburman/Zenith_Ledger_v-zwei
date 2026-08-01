import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from '@repo/db';
import bcrypt from 'bcryptjs';

import { JWT } from 'next-auth/jwt';
import { Session, User } from 'next-auth';

// Export authOptions separately so server components
// can pass it to getServerSession().
// Without this, getServerSession() can't find the
// session configuration and always returns null.
export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'Phone Number',
      credentials: {
        number: { label: 'Phone Number', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },

      async authorize(credentials) {
        if (!credentials?.number || !credentials?.password) {
          throw new Error('Phone number and password are required');
        }

        const user = await prisma.user.findUnique({
          where: { number: credentials.number },
        });

        if (!user) {
          throw new Error('No account found with this phone number');
        }

        const isValidPassword = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isValidPassword) {
          throw new Error('Incorrect password');
        }

        return {
          id: String(user.id),
          name: user.name,
          email: user.email,
          number: user.number,
        };
      },
    }),
  ],

  session: { strategy: 'jwt' as const },

  callbacks: {
  async jwt({ token, user }: { token: JWT; user: User }) {
    if (user) {
      token.id = user.id;
      token.number = (user as User & { number?: string }).number;
    }
    return token;
  },

  async session({ session, token }: { session: Session; token: JWT }) {
    if (token && session.user) {
      session.user.id = token.id as string;
      (session.user as Session['user'] & { number?: string }).number = token.number as string;
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