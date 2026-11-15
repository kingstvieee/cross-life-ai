import { useEffect } from 'react';
import { cancelCheckins } from '@/src/checkins';
import { useAuth } from '@/src/auth';

export function CheckinBoundary() {
  const { user } = useAuth();
  // Scheduled reminders are deliberately cleared on account transitions and
  // cold launch. They are re-enabled only by a deliberate action in settings.
  useEffect(() => { void cancelCheckins().catch(() => {}); }, [user?.user_id]);
  return null;
}
