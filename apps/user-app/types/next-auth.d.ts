import NextAuth from 'next-auth';

// Extend the built-in NextAuth types to include
// our custom fields (id and number).
// Without this, TypeScript will error when you
// access session.user.id anywhere in the app.
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      number?: string;
    };
  }

  interface User {
    id: string;
    number?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    number?: string;
  }
}