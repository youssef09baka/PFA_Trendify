function FeedItem({ item }) {
  return (
    <div className='bg-[#111827] border border-gray-800 rounded-2xl p-5'>
      <div className='flex items-center justify-between mb-4'>
        <span className='text-purple-400 font-semibold'>
          Trending Now
        </span>

        <span className='text-sm text-gray-400'>
          AI Score: {item.score}
        </span>
      </div>

      <h2 className='text-xl font-bold mb-3'>
        {item.title}
      </h2>

      <p className='text-gray-400'>
        {item.description}
      </p>
    </div>
  )
}

export default FeedItem