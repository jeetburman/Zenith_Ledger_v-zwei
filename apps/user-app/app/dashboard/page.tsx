import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const session = await getServerSession();

  // Protect this page — redirect to login if not authenticated
  if (!session) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-2xl font-semibold text-gray-900">
        Welcome, {session.user?.name || 'User'}
      </h1>
      <p className="text-gray-500 mt-1">
        Signed in as {(session.user as any)?.number}
      </p>
    </div>
  );
}