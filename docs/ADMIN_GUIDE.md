# Admin guide

The admin lives at **`/admin`**. Sign in with the account created during setup (`npm run admin:create`). Everything on the public site (text, images, videos, menus, colours, typeface, SEO) is edited here; nothing requires a code change.

## Roles

| Role | Can do |
|---|---|
| Administrator | Everything, including users, roles and global settings |
| Editor | Create, edit, publish and delete all content; media, menus, SEO, submissions. No users or settings |
| Author | Write and edit drafts of projects and articles, upload media. Cannot publish or delete |
| Viewer | Read-only access |

Administrators can change what each role may do under **Users & roles → Roles**. Permissions are enforced on the server, so hiding a button is never the only protection.

## Drafts, publishing and preview

Every page, project, service and article has a **draft** (what you edit) and a **published** version (what visitors see).

- Edits, including adding, hiding, reordering or deleting sections, change only the draft. The editor shows **Unpublished changes** until you publish.
- **Publish** makes the draft live. **Publish changes** appears once something has been published and you've edited it since. **Unpublish** takes it offline (visitors get a 404) without deleting it.
- **Preview draft** opens the draft on the real site in a new tab, with a preview bar at the top. Preview links work only for signed-in users and expire after 15 minutes. Previews are never indexed by search engines.
- **Revision history** keeps the last 30 saved versions. **Restore** copies an old version into the draft. Nothing goes live until you publish again.

## Pages and the page builder

**Pages** lists every CMS page: home, studio, work, case studies index, expertise index, newsroom index, contact, legal and privacy, plus any page you add. *System* pages (home and the index pages) can be edited but not deleted, because the site depends on them.

**New page** asks for a title and a path (for example `about` or `services/branding`). Paths must be unique, and paths used by the site itself (such as `admin`, `api`, `media`) are refused.

Inside a page:

1. **Add section** opens the section library, grouped into Hero, Story, Portfolio, Lists, Forms and Text, with a search box. **Saved templates** lists sections you saved earlier.
2. Each section row can be **edited**, **hidden** (kept but not shown), **duplicated**, **saved as a template**, or **deleted**.
3. Drag the handle to reorder, or focus the handle and use **Space**, then the arrow keys, then **Space** again.
4. Section forms are generated from the section's definition: text fields, a rich-text editor, media pickers, link fields, lists you can add to and reorder, and pickers for projects, services or articles.

If a section's content is invalid (for example a required image was deleted), the public page skips that section instead of breaking, and the preview shows a notice explaining which section was skipped.

## Projects

A project can appear in two places:

- On the **Work** wall, when *Show on the work wall* is on. *Wall aspect* sets the tile shape (4:5, 3:2, 1:1, 16:9). Categories, deliverables and industries drive the wall's three filters.
- As a **case study** with its own page at `/case-studies/<slug>`, when *Has a case-study page* is on. Case studies have their own section builder (chapters, image rows, full-bleed media, insights) and their own SEO.

*Featured* case studies fill the home page case reel whenever no projects are picked in that section.

## Services (expertise)

Each service has a page at `/expertise/<slug>` built from sections, a cover image, an optional feature video, a tagline and a list of offerings. Published services also feed the contact brief's "What do you need?" step, the footer's expertise menu (if you link them there) and the discipline scenes.

## Newsroom

Articles have a title, excerpt, cover image, publication date, author, related services and a rich-text body (headings, lists, quotes, links, images). An article dated in the future stays hidden until that date.

## Categories

**Categories** manages the three taxonomies used to filter the Work wall: project categories, deliverables and industries. Renaming one updates every project that uses it. Deleting one removes it from those projects (the projects themselves stay).

## Media library

- **Upload** by dragging files onto the library or using the upload button. Accepted: JPEG, PNG, WebP, AVIF, GIF, SVG (images, up to 25 MB) and MP4, WebM, MOV (videos, up to 200 MB). The real file type is checked, not just the extension.
- Select a file to edit its **alt text** (required for meaningful images: it is read aloud by screen readers and used by search engines), title and description, to move it to a folder, or to see **where it is used**.
- **Replace** swaps the file but keeps every reference, so pages update without being edited.
- Videos can have a poster image. With `ffmpeg` installed on the server, a poster is generated automatically on upload.
- Deleting a file that is still used somewhere asks for confirmation first and lists where it is used. Sections that lose an image are skipped on the public page until you pick a new one.

## Navigation

Menus: **Main** (the full-screen menu), **Footer sitemap**, **Footer expertise**, **Social** (your social profiles) and **Legal**. Add links, edit labels, reorder by drag or keyboard, and delete. A link can be a path (`/studio`), a full URL, `mailto:` or `tel:`. Each link can open in a new tab, and can be hidden without deleting it.

## Section templates

Any configured section can be saved as a template from the page builder. Templates appear under **Saved templates** in the section library and can be renamed or deleted here. Inserting a template copies it, so later edits to the template don't change pages that already use it.

## SEO

Every page, project, service and article has a **Search & social** panel: title, description, canonical URL, social title, social description, share image, Twitter card type, focus keyword, index/follow switches and *Include in sitemap.xml*. Empty fields fall back to the content's own title, excerpt and cover image, then to the global defaults.

The **SEO** screen has three parts:

- **Checks** list errors and warnings on every page, service, case study and article (titles or descriptions missing or the wrong length, duplicate titles, noindex pages still in the sitemap, focus keywords missing from the title) and the images that have no alt text. Each item links to the editor where it can be fixed.
- **Site-wide defaults**: title template (`%s` is replaced by the page title), default description, default share image and X/Twitter handle.
- **Redirects** send an old path to a new one, permanently (308) or temporarily (307), and count hits. Add one whenever you change a slug that may already be linked from elsewhere.

See `SEO_GUIDE.md` for recommendations.

## Submissions

Contact briefs arrive in **Submissions** (and by email when SMTP is configured). Open one to read every answer, mark it read, archive it or flag it as spam. Select several to change their status in bulk. **Export CSV** downloads the current filter as a spreadsheet-safe CSV.

## Settings

- **Identity**: site name, tagline, header logo, logo mark (the small square in the footer) and favicon.
- **Brand style**: accent colour (plus its hover and pressed shades), dark and light background colours, and the typeface (self-hosted fonts). Changes apply to the whole site on the next page load.
- **Contact**: studio email (new briefs are sent here unless `CONTACT_NOTIFY_EMAIL` is set), phone and address.
- **Behaviour & footer**: intro loader, custom cursor and smooth scrolling switches (cursor and smooth scrolling only ever run on desktop with a mouse), footer headline, copyright line, cookie banner text, and the Google Analytics 4 ID (loaded only after a visitor accepts analytics cookies).

Social profiles are links in the **Social** menu under Navigation; global SEO defaults are on the **SEO** screen.

## Users and your profile

**Users & roles → Invite user** creates an account with a role and an initial password to share with the person securely. Accounts can be disabled without being deleted. Under **Profile**, everyone can change their name and password and sign out their other sessions.

If you are locked out, someone with server access can reset a password with:

```bash
npm run admin:create -- --email you@studio.com --reset
```
