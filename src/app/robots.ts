import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/dashboard/', '/onboarding/', '/configuracion/'],
    },
    sitemap: 'https://yellow-erp.cl/sitemap.xml',
  }
}