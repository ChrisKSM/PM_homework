import { useEffect, useState } from 'react'
import { subscribeJiraDegraded } from '../utils/jiraDegradedBus'

export function useJiraDegraded() {
  const [degraded, setDegraded] = useState(false)
  useEffect(() => subscribeJiraDegraded(setDegraded), [])
  return degraded
}
