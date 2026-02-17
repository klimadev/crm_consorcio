'use client';

import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { authApi } from '@/services/api';

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function SignupPage() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    const companySlug = generateSlug(companyName);

    try {
      await authApi.signup({ companyName, email, password });
      const signInResult = await signIn('credentials', {
        redirect: false,
        companySlug,
        email,
        password,
        callbackUrl: '/leads',
      });

      if (signInResult?.error) {
        router.push(`/login?companySlug=${encodeURIComponent(companySlug)}`);
        return;
      }

      router.push('/leads');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Signup failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-[linear-gradient(145deg,#dcfce7_0%,#fffbeb_50%,#e2e8f0_100%)] p-4">
      <div className="w-full max-w-md rounded-2xl border border-emerald-200 bg-white/90 p-6 shadow-2xl backdrop-blur md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">Criar Conta</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Nova Empresa</h1>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <input
            type="text"
            value={companyName}
            onChange={(event) => setCompanyName(event.target.value)}
            placeholder="Nome da empresa"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            required
          />
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="seu@email.com"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            required
          />
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Senha"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            required
            minLength={6}
          />
          {error && <p className="text-sm font-medium text-rose-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
          >
            {loading ? 'Criando...' : 'Criar conta'}
          </button>
        </form>
        <p className="mt-5 text-sm text-slate-600">
          Já tem conta?{' '}
          <Link href="/login" className="font-semibold text-emerald-700 hover:text-emerald-600">
            Fazer login
          </Link>
        </p>
      </div>
    </main>
  );
}
