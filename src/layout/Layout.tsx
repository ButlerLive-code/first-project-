import { Outlet } from 'react-router'
import { useSyncUserLocale } from '../auth/useSyncUserLocale'
import { Header } from '../components/Header'
import { Footer } from '../components/Footer'
import { ScrollManager } from './ScrollManager'

export function Layout() {
  useSyncUserLocale()
  return (
    <>
      <ScrollManager />
      <Header />
      <main>
        <Outlet />
      </main>
      <Footer />
    </>
  )
}
