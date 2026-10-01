import { Route, Routes } from 'react-router'
import { RequireAuth } from './auth/RequireAuth'
import { LocaleProvider } from './i18n/LocaleProvider'
import { Layout } from './layout/Layout'
import { About } from './pages/About'
import { Affiliate } from './pages/Affiliate'
import { Blog } from './pages/Blog'
import { BlogPost } from './pages/BlogPost'
import { Checkout } from './pages/Checkout'
import { Countries } from './pages/Countries'
import { Country } from './pages/Country'
import { Billing } from './pages/dashboard/Billing'
import { DashboardLayout } from './pages/dashboard/DashboardLayout'
import { Devices } from './pages/dashboard/Devices'
import { Overview } from './pages/dashboard/Overview'
import { Settings } from './pages/dashboard/Settings'
import { Download } from './pages/Download'
import { Faq } from './pages/Faq'
import { Help } from './pages/Help'
import { Home } from './pages/Home'
import { Legal } from './pages/Legal'
import { Locations } from './pages/Locations'
import { Login } from './pages/Login'
import { NotFound } from './pages/NotFound'
import { Partners } from './pages/Partners'
import { Servers } from './pages/Servers'
import { Signup } from './pages/Signup'
import { Tutorial } from './pages/Tutorial'
import { Tutorials } from './pages/Tutorials'
import { WhatIsVpn } from './pages/WhatIsVpn'
import './App.css'
import './pages/pages.css'
import './pages/content.css'

// The same pages are mounted twice: English at the root, Russian under /ru.
function siteRoutes() {
  return (
    <>
      <Route index element={<Home />} />
      <Route path="login" element={<Login />} />
      <Route path="signup" element={<Signup />} />
      <Route
        path="checkout"
        element={
          <RequireAuth>
            <Checkout />
          </RequireAuth>
        }
      />
      <Route
        path="dashboard"
        element={
          <RequireAuth>
            <DashboardLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Overview />} />
        <Route path="devices" element={<Devices />} />
        <Route path="billing" element={<Billing />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="download" element={<Download />} />
      <Route path="locations" element={<Locations />} />
      <Route path="servers" element={<Servers />} />
      <Route path="countries" element={<Countries />} />
      <Route path="countries/:slug" element={<Country />} />
      <Route path="faq" element={<Faq />} />
      <Route path="tutorials" element={<Tutorials />} />
      <Route path="tutorials/:platform" element={<Tutorial />} />
      <Route path="blog" element={<Blog />} />
      <Route path="blog/:slug" element={<BlogPost />} />
      <Route path="what-is-vpn" element={<WhatIsVpn />} />
      <Route path="about" element={<About />} />
      <Route path="help" element={<Help />} />
      <Route path="affiliate" element={<Affiliate />} />
      <Route path="partners" element={<Partners />} />
      <Route path="privacy" element={<Legal key="privacy" doc="privacy" />} />
      <Route path="terms" element={<Legal key="terms" doc="terms" />} />
      <Route path="*" element={<NotFound />} />
    </>
  )
}

function App() {
  return (
    <Routes>
      <Route
        path="ru"
        caseSensitive
        element={
          <LocaleProvider locale="ru">
            <Layout />
          </LocaleProvider>
        }
      >
        {siteRoutes()}
      </Route>
      <Route
        element={
          <LocaleProvider locale="en">
            <Layout />
          </LocaleProvider>
        }
      >
        {siteRoutes()}
      </Route>
    </Routes>
  )
}

export default App
