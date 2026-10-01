import { Outlet } from 'react-router'
import { Header } from '../components/Header'
import { Footer } from '../components/Footer'
import { ScrollManager } from './ScrollManager'

export function Layout() {
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
