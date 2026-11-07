import { useEffect, useState } from 'react';
import { loadFullName } from '@/lib/profile';

export function useProfileName(userId: string | null): string | null {
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setName(null);
      return;
    }

    let active = true;
    loadFullName(userId).then(
      (fullName) => {
        if (active) setName(fullName);
      },
      () => {
        if (active) setName(null);
      },
    );
    return () => {
      active = false;
    };
  }, [userId]);

  return name;
}
