import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://yellow-erp.cl'

  const routes = [
    '',
    '/diseno',
    '/contacto',
    '/nosotros',
    '/privacidad',
    '/terminos',
    '/cookies',
    '/login',
    '/register',
  ]

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: route === '' ? 1 : 0.8,
  }))
}