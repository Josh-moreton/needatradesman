import { redirect } from 'next/navigation'
import { currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export default async function Home() {
  const clerkUser = await currentUser()
  
  if (!clerkUser) {
    // Show landing page for unauthenticated users
    return <LandingPage />
  }

  // Check if user exists in our database
  const user = await prisma.user.findUnique({
    where: { clerkId: clerkUser.id }
  })

  if (!user || !user.role) {
    // User needs onboarding
    redirect('/onboarding')
  }

  // User has a role, redirect to dashboard
  redirect('/dashboard')
}

function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Need a Tradesman?
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Connect with trusted tradespeople in your area. Post jobs, get quotes, and hire with confidence.
          </p>
          
          <div className="flex justify-center space-x-4">
            <div className="bg-white p-6 rounded-lg shadow-md max-w-sm">
              <div className="text-4xl mb-4">🏠</div>
              <h3 className="text-lg font-semibold mb-2">For Homeowners</h3>
              <p className="text-gray-600">
                Post your job and receive quotes from qualified tradespeople
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md max-w-sm">
              <div className="text-4xl mb-4">🔨</div>
              <h3 className="text-lg font-semibold mb-2">For Tradespeople</h3>
              <p className="text-gray-600">
                Find work opportunities and grow your business
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
