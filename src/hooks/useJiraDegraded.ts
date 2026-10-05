import { useEffect, useState } from 'react'
import { subscribeJiraDegraded } from '../utils/jiraFetch'

export function useJiraDegraded() {
  const [degraded, setDegraded] = useState(false)
  useEffect(() => subscribeJiraDegraded(setDegraded), [])
  return degraded
}
