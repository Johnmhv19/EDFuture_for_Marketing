// Login page. Server-rendered shell + client form. We split the
// form into its own component and wrap it in <Suspense> so the
// `useSearchParams` hook does not force the whole page to bail out
// of static prerendering.

import { Suspense } from 'react';
import LoginForm from './LoginForm';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-cyan-50 p-6">
      <div className="card p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-900">YCYW Programmes Platform</h1>
        <p className="mt-1 text-sm text-gray-500">Paste your access token to continue.</p>
        <Suspense fallback={<div className="mt-6 text-gray-500 text-sm">Loading…</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
