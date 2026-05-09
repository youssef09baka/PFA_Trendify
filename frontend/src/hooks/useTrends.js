import { useEffect } from 'react'

import useTrendStore from '@/store/trendStore'

import { trends as mockTrends } from '@/data/mockData'

function useTrends() {
  const { trends, setTrends } = useTrendStore()

  useEffect(() => {
    setTrends(mockTrends)
  }, [])

  return {
    trends,
  }
}

export default useTrends