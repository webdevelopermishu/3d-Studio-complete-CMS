# SEO guide

What the site does automatically, what editors should fill in, and how to check the result.

## What happens automatically

For every public URL the site generates:

- **`<title>`** from the page's SEO title, or the title template (default `%s | Site name`) applied to the content title. The home page uses the site name.
- **Meta description** from the SEO description, otherwise the excerpt, tagline or summary, otherwise the site-wide default.
- **Canonical URL**: `NEXT_PUBLIC_SITE_URL` + the path, unless a custom canonical is set. URLs never carry a trailing slash.
- **Robots meta**: `index, follow` with `max-image-preview:large`, unless the SEO panel switches it off. Draft previews, the admin and the 404 page are never indexed.
- **Open Graph and Twitter cards**: social title, description and image fall back to the SEO title, the description and the cover image, then to the site-wide share image. Images are delivered at 1200 px wide.
- **JSON-LD structured data**:
  - `Organization` and `WebSite` on every page (name, logo, email, social profiles from the Social menu)
  - `BreadcrumbList` on every inner page
  - `Service` on expertise pages
  - `CreativeWork` on case studies
  - `Article` on newsroom articles (headline, dates, author, image)
- **`/sitemap.xml`** lists every published page, service, case study and article that is indexable and not excluded from the sitemap, with its last-modified date. Unpublished, deleted, future-dated and noindex content is left out.
- **`/robots.txt`** allows everything except `/admin` and `/api/`, and points to the sitemap. Set `ALLOW_INDEXING=false` on staging to block all crawling; Vercel preview deployments are blocked automatically.
- **Redirects** from Admin → SEO → Redirects answer before the page renders, with 308 (permanent) or 307 (temporary).
- **Semantic HTML**: one `h1` per page, landmarks (`header`, `nav`, `main`, `footer`), descriptive link text, `alt` on informative images, `lang="en"`.

## What editors should fill in

For each page, service, case study and article, open **Search & social**:

| Field | Recommendation |
|---|---|
| SEO title | 30–60 characters. Put the main topic first. Leave empty to use the content title with the template |
| Description | 70–155 characters, written for people: what they will find and why it matters. Required; missing descriptions are reported as errors |
| Focus keyword | The one phrase this page should rank for. The checks warn if it is missing from the title and note when it is missing from the description or URL |
| Share image | 1200×630 or larger. Falls back to the cover image |
| Canonical URL | Leave empty unless the same content is published elsewhere first |
| Allow search engines to index | Switch off only for thank-you pages, duplicates or private landing pages |
| Include in sitemap.xml | Switch off together with indexing; the checks warn if a noindex page is still in the sitemap |

Also:

- **Alt text** on every meaningful image (Media library → select the file). Describe what the image shows and why it is there, not "image of". Purely decorative images can stay empty. The SEO screen counts images that have none.
- **Slugs**: short, lowercase, hyphenated, descriptive (`/expertise/product-3d`, not `/expertise/page-2`). If you change a published slug, add a permanent redirect from the old path.
- **Headings**: the page title is the only `h1`. Inside rich text, use Heading 2 for sections and Heading 3 below them, without skipping levels.
- **Internal links**: link related case studies, services and articles to each other. The "Keep exploring" and "Case insights" sections do this with a picker.

## Site-wide defaults

Admin → SEO → **Site-wide defaults**: the title template, the default description (used when a page has none), the default share image and the X/Twitter handle. Set these before launch.

Admin → Settings → **Identity**: the site name, logo and favicon also feed the structured data and browser tabs.

## Checking the result

1. **Admin → SEO** lists errors (red), warnings (amber) and notes for all content, plus images missing alt text. Use the *With problems* filter and fix each item from its editor.
2. View the page source (or use the browser's "Inspect") and check the `<title>`, `<meta name="description">`, `<link rel="canonical">`, `og:*` tags and the `application/ld+json` blocks.
3. Test structured data with Google's [Rich Results Test](https://search.google.com/test/rich-results) and social previews with each network's card validator.
4. After launch, add the site to Google Search Console and Bing Webmaster Tools and submit `https://<your-domain>/sitemap.xml`.
5. Run Lighthouse (Chrome DevTools → Lighthouse) on the main templates; `docs/TESTING.md` lists the scores measured during the build.

## When moving from an old site

1. List every URL of the old site that has traffic or backlinks (Search Console → Pages, your analytics, a crawl).
2. Map each one to its new path and add it under Admin → SEO → Redirects as *permanent*.
3. After launch, check the redirect hit counters and Search Console's "Not found" report for paths you missed.
