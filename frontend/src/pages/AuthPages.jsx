import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, LifeBuoy, MessageSquare, Shield, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { errorMessage } from '@/lib/utils';

const perks = [
  { icon: Zap, title: 'Fast resolution', text: 'Raise a ticket in seconds and track it live.' },
  { icon: MessageSquare, title: 'Direct conversation', text: 'Chat with support right on your ticket.' },
  { icon: Shield, title: 'Secure by design', text: 'JWT auth with role-based access control.' },
];

function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="aurora grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between p-12 lg:flex">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow">
            <LifeBuoy className="h-5 w-5" />
          </span>
          Helpdesk
        </div>
        <div className="space-y-8">
          <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-md text-4xl font-bold leading-tight tracking-tight">
            Support that keeps <span className="text-primary">everyone in the loop.</span>
          </motion.h1>
          <ul className="space-y-5">
            {perks.map(({ icon: Icon, title: t, text }, i) => (
              <motion.li key={t} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.1 }} className="flex gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-card shadow-sm ring-1 ring-border">
                  <Icon className="h-5 w-5 text-primary" />
                </span>
                <div>
                  <p className="font-medium">{t}</p>
                  <p className="text-sm text-muted-foreground">{text}</p>
                </div>
              </motion.li>
            ))}
          </ul>
        </div>
        <p className="text-sm text-muted-foreground">Mini Helpdesk - Support Ticket Management System</p>
      </div>

      <div className="flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, y: 20, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.35 }} className="w-full max-w-md">
          <Card className="p-8 shadow-xl">
            <div className="mb-6 space-y-1">
              <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            </div>
            {children}
          </Card>
          <p className="mt-6 text-center text-sm text-muted-foreground">{footer}</p>
        </motion.div>
      </div>
    </div>
  );
}

function PasswordInput(props) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input type={show ? 'text' : 'password'} className="pr-10" {...props} />
      <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label={show ? 'Hide password' : 'Show password'}>
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

function FormError({ message }) {
  if (!message) return null;
  return (
    <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {message}
    </motion.p>
  );
}

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(form);
      navigate('/');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to manage your support tickets."
      footer={<>New here? <Link to="/register" className="font-medium text-primary hover:underline">Create an account</Link></>}
    >
      <form onSubmit={submit} className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" required placeholder="you@company.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="password">Password</Label>
          <PasswordInput id="password" autoComplete="current-password" required placeholder="Your password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </div>
        <FormError message={error} />
        <Button type="submit" loading={loading} size="lg">Sign in</Button>
      </form>
    </AuthShell>
  );
}

export function RegisterPage() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', adminCode: '' });
  const [showAdmin, setShowAdmin] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const body = { ...form };
      if (!body.adminCode) delete body.adminCode;
      await register(body);
      navigate('/');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Start raising and tracking tickets in a minute."
      footer={<>Already registered? <Link to="/login" className="font-medium text-primary hover:underline">Sign in</Link></>}
    >
      <form onSubmit={submit} className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="name">Full name</Label>
          <Input id="name" required minLength={2} autoComplete="name" placeholder="Jane Doe" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" required autoComplete="email" placeholder="you@company.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="password">Password</Label>
          <PasswordInput id="password" required minLength={8} autoComplete="new-password" placeholder="8+ characters, letters and numbers" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </div>

        {showAdmin ? (
          <div className="grid gap-2">
            <Label htmlFor="adminCode">Admin signup code</Label>
            <Input id="adminCode" placeholder="Only if you were given one" value={form.adminCode} onChange={(e) => setForm({ ...form, adminCode: e.target.value })} />
          </div>
        ) : (
          <button type="button" onClick={() => setShowAdmin(true)} className="text-left text-xs text-muted-foreground hover:text-foreground">
            Have an admin code?
          </button>
        )}

        <FormError message={error} />
        <Button type="submit" loading={loading} size="lg">Create account</Button>
      </form>
    </AuthShell>
  );
}
