import { Link, Navigate, NavLink, type LinkProps, type NavigateProps, type NavLinkProps } from 'react-router'
import { localize } from './locales'
import { useLocale } from './useLocale'

type WithPath<P> = Omit<P, 'to'> & { to: string }

// Router links that keep the visitor in the current language.
export function LocalLink({ to, ...rest }: WithPath<LinkProps>) {
  return <Link to={localize(to, useLocale())} {...rest} />
}

export function LocalNavLink({ to, ...rest }: WithPath<NavLinkProps>) {
  return <NavLink to={localize(to, useLocale())} {...rest} />
}

export function LocalNavigate({ to, ...rest }: WithPath<NavigateProps>) {
  return <Navigate to={localize(to, useLocale())} {...rest} />
}
