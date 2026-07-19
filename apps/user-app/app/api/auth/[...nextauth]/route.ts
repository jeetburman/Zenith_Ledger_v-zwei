import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from '@repo/db';
import bcrypt from 'bcryptjs';

// This is the NextAuth configuration for the user app.
// Users log in with their phone number and password.
// NextAuth handles sessions, cookies, and JWT automatically.
const handler = NextAuth({
  providers: [
    CredentialsProvider({
      // The name shown on the default NextAuth sign-in page
      name: 'Phone Number',

      // These fields appear if you use NextAuth's built-in UI.
      // We'll build our own UI so these are just for reference.
      credentials: {
        number: { label: 'Phone Number', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },

      // authorize() is called when a user submits the login form.
      // Return the user object if credentials are valid.
      // Return null if invalid — NextAuth handles the 401.
      async authorize(credentials) {
        // Validate that both fields were provided
        if (!credentials?.number || !credentials?.password) {
          throw new Error('Phone number and password are required');
        }

        // Look up the user by phone number
        const user = await prisma.user.findUnique({
          where: { number: credentials.number },
        });

        if (!user) {
          throw new Error('No account found with this phone number');
        }

        // Compare the provided password against the stored hash.
        // bcryptjs.compare() handles this securely —
        // never compare plain text passwords directly.
        const isValidPassword = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isValidPassword) {
          throw new Error('Incorrect password');
        }

        // Return the user object — NextAuth stores this in the JWT.
        // Only return what you need in the session.
        // Never return the password hash.
        return {
          id: String(user.id),
          name: user.name,
          email: user.email,
          number: user.number,
        };
      },
    }),
  ],

  // We use JWT strategy — sessions are stored in a signed cookie,
  // not in the database. Simpler and works well at our scale.
  session: {
    strategy: 'jwt',
  },

  // Callbacks let us customise what goes into the JWT and session.
  callbacks: {
    // jwt() runs when the token is created or updated.
    // We add extra fields here so they're available in the session.
    async jwt({ token, user }) {
      if (user) {
        // user is only available on first sign-in.
        // We store the user's id and number in the token.
        token.id = user.id;
        token.number = (user as any).number;
      }
      return token;
    },

    // session() runs whenever getServerSession() or useSession()
    // is called. We expose token data to the client here.
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        (session.user as any).number = token.number;
      }
      return session;
    },
  },

  // Custom pages — we'll build these ourselves
  pages: {
    signIn: '/login',
  },

  secret: process.env.NEXTAUTH_SECRET,
});

// Next.js App Router exports GET and POST from route handlers.
// NextAuth needs both to handle its various endpoints:
// GET  /api/auth/session
// GET  /api/auth/csrf
// POST /api/auth/signin/credentials
// POST /api/auth/signout
// etc.
export { handler as GET, handler as POST };