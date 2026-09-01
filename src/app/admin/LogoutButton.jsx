'use client';

import { useRouter } from 'next/navigation';
import { withBase } from '@/lib/basePath';

export default function LogoutButton() {
  const router = useRouter();
  async function logout() {
    await fetch(withBase('/api/auth/login'), { method: 'DELETE' });
    router.push('/login');
    router.refresh();
  }
  return (
    <button onClick={logout} className="text-sm text-gray-300 hover:text-white">
      Sign out
    </button>
  );
}
