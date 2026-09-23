# Anna's Dog & More Design System

## Overview

The public shop is image-led and warm, while transactional and administrative surfaces use the same tokens with denser, familiar controls. The visual reference is a quiet Zurich interiors shop rather than a conventional pet retailer.

## Design dials

- Design variance: 7/10 on homepage and collection storytelling, 4/10 in commerce flows.
- Motion intensity: 4/10, limited to hierarchy, feedback, drawers, and state changes.
- Visual density: 4/10 in storefront, 6/10 in admin.

## Color

The user's specified cream is a committed brand requirement. It is balanced with true white product surfaces and a darker cocoa-plum action colour so the site does not collapse into the generic beige-and-brass aesthetic.

```css
:root {
  --background: oklch(0.963 0.018 78); /* #F8F3EC */
  --surface: oklch(1 0 0);             /* #FFFFFF */
  --ink: oklch(0.235 0.008 70);        /* #1E1E1E */
  --muted: oklch(0.49 0.021 62);        /* #6F675F */
  --border: oklch(0.86 0.025 67);       /* #DDD3C8 */
  --accent: oklch(0.44 0.071 26);       /* deep cocoa-plum */
  --accent-soft: oklch(0.89 0.042 62);  /* #E9DED2 family */
  --success: oklch(0.47 0.10 151);
  --warning: oklch(0.57 0.13 75);
  --danger: oklch(0.48 0.16 27);
}
```

Primary text reaches WCAG AA on cream and white. The muted token is reserved for secondary copy at normal sizes only after contrast verification.

## Typography

- Display: Bodoni Moda, used only for expressive storefront headings and never for controls.
- UI and body: Manrope, used for navigation, product information, forms, checkout, account, and admin.
- Display tracking never tighter than -0.035em. Body copy is capped at 70 characters.
- Product data, prices, and buttons use lining numerals in the UI family.

## Shape and elevation

- Cards and image frames: 14px maximum radius.
- Inputs and compact controls: 8px radius.
- Primary and secondary buttons: pill shape, always single-line.
- Borders communicate grouping. Shadows are reserved for overlays and never paired with decorative wide blur on bordered cards.

## Layout

- Content width: 1440px maximum with fluid gutters.
- Homepage hero: asymmetric split with one decisive product/lifestyle image.
- Product listing: 4 columns desktop, 3 laptop, 2 tablet, 1-2 mobile depending on width.
- Product page: image gallery and sticky purchasing column on desktop; strict single column on mobile.
- Checkout: form and sticky order summary desktop; summary disclosure and single-column form mobile.

## Components

Every interactive component includes default, hover, focus-visible, active, disabled, loading, and error states. Drawers and dialogs trap focus, close on Escape, restore focus, and expose an accessible name. Skeletons mirror the final layout. Empty states teach the next action.

## Motion

Motion lasts 160-240ms with an ease-out curve. It communicates drawer state, form feedback, selection, or hierarchy. `prefers-reduced-motion: reduce` removes transforms and non-essential transitions. No scroll listeners or decorative infinite animation.

## Imagery

Use verified LABONI assets or assets supplied in the project. Preserve natural material texture and neutral daylight. Product imagery uses meaningful bilingual alt text. Never fabricate a product colour, configuration, or feature through generated imagery.
