import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function Home() {
  return (
    <div className="min-h-screen grid place-items-center p-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold mb-4">Redirecting to Login…</h1>
        <Button asChild>
          <Link href="/login">Go to Login</Link>
        </Button>
      </div>
    </div>
  )
}
