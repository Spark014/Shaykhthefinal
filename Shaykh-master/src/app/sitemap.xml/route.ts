// src/app/sitemap.xml/route.ts
import { supabase } from '@/lib/supabase'; // Assuming you have a Supabase client export
import type { Resource, Collection } from '@/types/database';

const URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://yourdomain.com'; // Replace with your actual domain

function generateSiteMap(
    resources: Resource[],
    collections: Collection[],
    staticPages: string[]
) {
  return `<?xml version="1.0" encoding="UTF-8"?>
   <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
     <!--Static Pages-->
     ${staticPages
       .map((page) => {
         return `
           <url>
               <loc>${`${URL}${page}`}</loc>
               <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
               <changefreq>weekly</changefreq>
               <priority>${page === '/' ? '1.0' : '0.8'}</priority>
           </url>
         `;
       })
       .join('')}

    <!--Collections-->
    ${collections
      .map(({ id, updated_at }) => {
        return `
          <url>
              <loc>${`${URL}/library/collections/${id}`}</loc>
              <lastmod>${updated_at ? new Date(updated_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}</lastmod>
              <changefreq>weekly</changefreq>
              <priority>0.7</priority>
          </url>
        `;
      })
      .join('')}
      
    <!--Individual Resources (if you want them indexed directly, otherwise rely on collection pages)-->
    <!-- This can generate many URLs. Consider if direct indexing of all resources is beneficial. -->
    ${resources
      .map(({ id, url, type, updated_at }) => { // Assuming 'url' is the public link and 'id' can be part of a detail page if you have one.
        // If your resources are just external links, you might not want them in sitemap
        // or use their external URL if canonical. Here, we assume a detail page pattern if needed.
        // For now, just linking to the type-specific library page as a generic example.
        // This part needs refinement based on your actual resource URL structure.
        let resourcePageUrl = `${URL}/resources`; // Generic fallback
        if (type === 'pdf' || type === 'article') resourcePageUrl = `${URL}/library/books`; // Or a detail page like /library/books/[id]
        else if (type === 'audio') resourcePageUrl = `${URL}/library/audio`; // Or /library/audio/[id]
        
        // If you have detail pages for resources: loc>${`${URL}/resources/${id}`}</loc
        return `
          <url>
              <loc>${url}</loc> <!-- Or a detail page URL -->
              <lastmod>${updated_at ? new Date(updated_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}</lastmod>
              <changefreq>monthly</changefreq>
              <priority>0.5</priority>
          </url>
        `;
      })
      .join('')}
   </urlset>
 `;
}

export async function GET() {
  // Define your static pages
  const staticPages = [
    '/',
    '/biography',
    '/library/books',
    '/library/audio',
    '/fatawa',
    '/resources',
    '/search' 
  ];

  let resources: Resource[] = [];
  let collections: Collection[] = [];

  if (supabase) {
    try {
      const { data: resourcesData, error: resourcesError } = await supabase
        .from('resources')
        .select('id, type, url, updated_at') // Select only necessary fields
        .limit(1000); // Adjust limit as needed, or implement pagination if you have many

      if (resourcesError) throw resourcesError;
      resources = resourcesData || [];

      const { data: collectionsData, error: collectionsError } = await supabase
        .from('collections')
        .select('id, updated_at') // Select only necessary fields
        .limit(500);

      if (collectionsError) throw collectionsError;
      collections = collectionsData || [];

    } catch (error) {
      console.error("Error fetching data for sitemap:", error);
      // Proceed with static pages even if dynamic content fails
    }
  } else {
    console.warn("Sitemap generation: Supabase client not available. Only static pages will be included.");
  }


  const body = generateSiteMap(resources, collections, staticPages);

  return new Response(body, {
    status: 200,
    headers: {
      'Cache-control': 'public, s-maxage=86400, stale-while-revalidate', // Cache for 1 day
      'content-type': 'application/xml',
    },
  });
}
