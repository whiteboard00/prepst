import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-6 max-w-2xl px-4">
        <h1 className="text-5xl font-bold tracking-tight">SAT Prep Platform</h1>
        <p className="text-xl text-muted-foreground">
          AI-powered personalized SAT practice that adapts to your weaknesses
        </p>
        <div className="flex gap-4 justify-center pt-4">
          <Link href="/onboard">
            <Button size="lg">Get Started</Button>
          </Link>
          <Link href="/study-plan">
            <Button size="lg" variant="outline">
              View Study Plan
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
