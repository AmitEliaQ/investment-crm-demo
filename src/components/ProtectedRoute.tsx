import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import type { Role } from '../lib/types'
import { Spinner } from './Spinner'

export function ProtectedRoute({ role, children }: { role?: Role; children: ReactNode }) {
  const { session, role: current, loading } = useAuth()

  if (loading) return <Spinner fullScreen />
  if (!session) return <Navigate to="/login" replace />
  if (role && current !== role) return <Navigate to={current === 'admin' ? '/admin' : '/dashboard'} replace />
  return <>{children}</>
}

export function HomeRedirect() {
  const { session, role, loading } = useAuth()
  if (loading) return <Spinner fullScreen />
  if (!session) return <Navigate to="/login" replace />
  return <Navigate to={role === 'admin' ? '/admin' : '/dashboard'} replace />
}
