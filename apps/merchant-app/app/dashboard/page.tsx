import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import MerchantDashboardClient from './MerchantDashboardClient';

export default async function MerchantDashboardPage() {
  const session = await getServerSession();
  if (!session) redirect('/login');
  return <MerchantDashboardClient session={session} />;
}