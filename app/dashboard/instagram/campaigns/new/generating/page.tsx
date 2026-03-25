import { Suspense } from 'react'
import GeneratingScreen from '@/components/instagram/campaigns/GeneratingScreen'

export default function GeneratingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="h-16 w-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
        </div>
      }
    >
      <GeneratingScreen />
    </Suspense>
  )
}
