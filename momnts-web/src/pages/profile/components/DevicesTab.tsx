import { useState, useEffect } from 'react'
import { authApi } from '../../../features/auth/services/auth.api'
import { toast } from 'sonner'
import { Button } from '../../../components/ui/button'
import { Skeleton } from '../../../components/ui/skeleton'
import { Badge } from '../../../components/ui/badge'
import {
  Desktop,
  DeviceMobile,
  DeviceTablet,
  Question,
  SignOut,
  Warning
} from '@phosphor-icons/react'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../../components/ui/alert-dialog'

interface Session {
  id: string
  device_name: string | null
  device_type: string | null
  browser: string | null
  os: string | null
  ip_address: string | null
  created_at: string
  last_used_at: string
  is_current: boolean
}

const DevicesTab = () => {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [sessionToRevoke, setSessionToRevoke] = useState<Session | null>(null)
  const [revoking, setRevoking] = useState(false)

  const fetchSessions = async () => {
    try {
      setLoading(true)
      const data = await authApi.getSessions()
      setSessions(data)
    } catch (error) {
      toast.error('Failed to load active sessions')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSessions()
  }, [])

  const handleRevoke = async () => {
    if (!sessionToRevoke) return
    setRevoking(true)
    try {
      await authApi.revokeSession(sessionToRevoke.id)
      toast.success('Session revoked successfully')
      setSessions(prev => prev.filter(s => s.id !== sessionToRevoke.id))
      setSessionToRevoke(null)
    } catch (error: any) {
      toast.error(error.message || 'Failed to revoke session')
    } finally {
      setRevoking(false)
    }
  }

  const getDeviceIcon = (deviceType: string | null) => {
    switch (deviceType) {
      case 'desktop': return <Desktop size={24} weight="duotone" className="text-neutral-500" />
      case 'mobile': return <DeviceMobile size={24} weight="duotone" className="text-neutral-500" />
      case 'tablet': return <DeviceTablet size={24} weight="duotone" className="text-neutral-500" />
      default: return <Question size={24} weight="duotone" className="text-neutral-500" />
    }
  }

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return 'Just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`
    return date.toLocaleDateString()
  }

  const maskIp = (ip: string | null) => {
    if (!ip) return 'Unknown IP'
    if (ip.includes(':')) return 'IPv6 Address'
    const parts = ip.split('.')
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.*.*`
    }
    return 'Unknown IP'
  }

  return (
    <div className="glass-card rounded-3xl p-6 sm:p-8">
      <div className="mb-8">
        <h3 className="text-xl font-bold select-none text-neutral-900 dark:text-neutral-100 mb-2">
          Signed-in Devices
        </h3>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Manage your active sessions. If you notice any unfamiliar devices, revoke them immediately.
        </p>
      </div>

      <div className="space-y-4">
        {loading ? (
          Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 rounded-2xl border border-neutral-100 dark:border-neutral-800">
              <Skeleton className="w-12 h-12 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))
        ) : sessions.length === 0 ? (
          <div className="text-center py-8 text-neutral-500">
            No active sessions found.
          </div>
        ) : (
          sessions.map((session) => (
            <div 
              key={session.id} 
              className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border ${
                session.is_current 
                  ? 'border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/30 dark:bg-emerald-950/10' 
                  : 'border-border bg-background'
              }`}
            >
              <div className="flex items-start sm:items-center gap-4">
                <div className="p-3 bg-muted rounded-xl shrink-0">
                  {getDeviceIcon(session.device_type)}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-neutral-900 dark:text-neutral-100">
                      {session.browser || 'Unknown Browser'} on {session.os || 'Unknown OS'}
                    </p>
                    {session.is_current && (
                      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none px-2 py-0 h-5 text-[10px] tracking-wide uppercase">
                        Current
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-neutral-500">
                    <span className="flex items-center gap-1 before:content-[''] before:block before:w-1 before:h-1 before:bg-neutral-300 dark:before:bg-neutral-600 before:rounded-full">
                      {maskIp(session.ip_address)}
                    </span>
                    <span className="flex items-center gap-1 before:content-[''] before:block before:w-1 before:h-1 before:bg-neutral-300 dark:before:bg-neutral-600 before:rounded-full">
                      Active {formatRelativeTime(session.last_used_at)}
                    </span>
                  </div>
                </div>
              </div>

              {!session.is_current && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full sm:w-auto text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl"
                  onClick={() => setSessionToRevoke(session)}
                >
                  <SignOut size={16} className="mr-2" />
                  Revoke
                </Button>
              )}
            </div>
          ))
        )}
      </div>

      <AlertDialog open={!!sessionToRevoke} onOpenChange={(open) => !open && setSessionToRevoke(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <Warning size={24} weight="fill" />
              Revoke Session
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to sign out this device? They will be immediately disconnected and required to sign in again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revoking}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={revoking}
              onClick={handleRevoke}
            >
              {revoking ? 'Revoking...' : 'Revoke Session'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default DevicesTab
