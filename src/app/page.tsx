import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/lib/auth';
import ITPSelfAssessment from '@/components/ITPSelfAssessment';

export default async function HomePage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect('/login');
  }

  return <ITPSelfAssessment user={user} />;
}
