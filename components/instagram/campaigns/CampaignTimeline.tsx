'use client'

import type { CampaignPost } from '@/types/instagram'

const FORMAT_COLOR: Record<string, string> = {
  REEL: 'bg-purple-500',
  CAROUSEL: 'bg-blue-500',
  IMAGE: 'bg-emerald-500',
  STORY: 'bg-orange-500',
}

const STATUS_RING: Record<string, string> = {
  PENDING: 'ring-gray-300',
  APPROVED: 'ring-green-500',
  REVISION_REQUESTED: 'ring-yellow-500',
}

interface CampaignTimelineProps {
  posts: CampaignPost[]
}

export default function CampaignTimeline({ posts }: CampaignTimelineProps) {
  if (posts.length === 0) return null

  const sorted = [...posts].sort((a, b) => a.post_order - b.post_order)

  return (
    <div className="flex items-center gap-1 overflow-x-auto py-2 px-1">
      {sorted.map((post, i) => {
        const color = FORMAT_COLOR[post.format] ?? 'bg-gray-400'
        const ring = STATUS_RING[post.status] ?? STATUS_RING.PENDING

        return (
          <div key={post.id} className="flex items-center shrink-0">
            <div
              className={`w-8 h-8 rounded-full ${color} ring-2 ${ring} flex items-center justify-center text-white text-xs font-bold`}
              title={`#${post.post_order} ${post.format} - ${post.status}`}
            >
              {post.post_order}
            </div>
            {i < sorted.length - 1 && (
              <div className="w-4 h-0.5 bg-muted-foreground/20" />
            )}
          </div>
        )
      })}
      <div className="shrink-0 ml-2 flex gap-3">
        {Object.entries(FORMAT_COLOR).map(([fmt, color]) => (
          <span key={fmt} className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <span className={`w-2 h-2 rounded-full ${color}`} />
            {fmt}
          </span>
        ))}
      </div>
    </div>
  )
}
