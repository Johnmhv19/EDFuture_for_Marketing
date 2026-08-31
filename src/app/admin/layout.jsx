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
            <nav className="flex items-center gap-1 text-sm">
              <AdminLink href="/admin/programmes/new" color="emerald">+ Add</AdminLink>
              <AdminLink href="/admin/programmes" color="blue">Edit</AdminLink>
              <AdminLink href="/admin/programmes?view=delete" color="red">Delete</AdminLink>
              <span className="mx-2 h-5 w-px bg-gray-700" />
              <AdminLink href="/admin/files" color="gray">Files</AdminLink>
              <AdminLink href="/" color="gray">View site →</AdminLink>
            </nav>
          </div>
          <LogoutButton />
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}

function AdminLink({ href, color, children }) {
  const colors = {
    emerald: 'text-emerald-300 hover:text-emerald-100 hover:bg-emerald-900/30',
    blue:    'text-blue-300 hover:text-blue-100 hover:bg-blue-900/30',
    red:     'text-red-300 hover:text-red-100 hover:bg-red-900/30',
    gray:    'text-gray-300 hover:text-white',
  };
  return (
    <Link
      href={href}
      className={`px-3 py-1.5 rounded font-semibold transition ${colors[color] || colors.gray}`}
    >
      {children}
    </Link>
  );
}
