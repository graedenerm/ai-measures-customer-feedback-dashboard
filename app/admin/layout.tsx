import { AdminPasswordGate } from '@/components/admin-password-gate'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminPasswordGate>{children}</AdminPasswordGate>
}
