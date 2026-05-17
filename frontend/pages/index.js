import { useEffect, useState } from 'react'
import styles from '../styles/Home.module.css'

export default function Home() {
  const [status, setStatus] = useState(null)

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => setStatus(data.status))
      .catch(() => setStatus('unreachable'))
  }, [])

  return (
    <main className={styles.main}>
      <h1>Next.js + Flask</h1>
      <p>Backend status: <strong>{status ?? 'loading...'}</strong></p>
    </main>
  )
}
