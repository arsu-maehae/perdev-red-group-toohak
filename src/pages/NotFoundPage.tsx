import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Layout } from '../components/Layout'

export function NotFoundPage() {
  return <Layout><div className="not-found"><span>404</span><h1>That question wandered off.</h1><p>The page may have moved, or the link is no longer active.</p><Link className="button button-primary" to="/"><ArrowLeft /> Back home</Link></div></Layout>
}
