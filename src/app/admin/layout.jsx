// Admin layout: shared header for all /admin/* pages. Server-rendered.
// Auth is already enforced by middleware.

import Link from 'next/link';
import { isAdmin } from '@/lib/auth';
import { redirect } from 'next/navigation';
import LogoutButton from './LogoutButton';

export default async function AdminLayout({ children }) {
  if (!(await isAdmin())) redirect('/');
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gray-900 text-white">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="font-bold text-lg">⚙️ Admin</Link>
            <nav className="flex items-center gap-4 text-sm">
              <Link href="/admin/programmes" className="text-gray-300 hover:text-white">Programmes</Link>
              <Link href="/admin/files" className="text-gray-300 hover:text-white">Files</Link>
              <Link href="/" className="text-gray-300 hover:text-white">View site →</Link>
            </nav>
          </div>
          <LogoutButton />
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
