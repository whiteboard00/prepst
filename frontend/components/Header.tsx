'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export function Header() {
  const { user, signOut, loading } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <header className="border-b">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold">
          SAT Prep
        </Link>

        <nav className="flex items-center gap-4">
          {!loading && (
            <>
              {user ? (
                <>
                  <span className="text-sm text-muted-foreground">
                    {user.email}
                  </span>
                  <Button onClick={handleSignOut} variant="outline" size="sm">
                    Logout
                  </Button>
                </>
              ) : (
                <Link href="/login">
                  <Button size="sm">Login</Button>
                </Link>
              )}
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
