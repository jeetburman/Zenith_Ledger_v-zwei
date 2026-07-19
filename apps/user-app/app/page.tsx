import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';

export default async function Home() {
  const session = await getServerSession();

  // If logged in, go to dashboard
  // If not, go to login
  if (session) {
    redirect('/dashboard');
  } else {
    redirect('/login');
  }
}