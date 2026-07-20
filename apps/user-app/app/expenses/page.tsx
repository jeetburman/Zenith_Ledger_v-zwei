import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import ExpensesClient from './ExpensesClient';

export default async function ExpensesPage() {
  const session = await getServerSession();
  if (!session) redirect('/login');
  return <ExpensesClient />;
}