import DashboardLayout from '@/app/layouts/DashboardLayout'
import FeedItem from '@/components/feed/FeedItem'

const feed = [
  {
    id: 1,
    title: 'AI video generation is exploding',
    score: 94,
    description: 'AI generated media discussions increased massively.',
  },
  {
    id: 2,
    title: 'Cybersecurity threats trending',
    score: 87,
    description: 'Online discussions about vulnerabilities are increasing.',
  },
]

function FeedPage() {
  return (
    <DashboardLayout>
      <div className='space-y-5'>
        {feed.map((item) => (
          <FeedItem key={item.id} item={item} />
        ))}
      </div>
    </DashboardLayout>
  )
}

export default FeedPage