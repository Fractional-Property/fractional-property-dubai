# FOPD Fractional Real Estate Platform - Design Guidelines

## Design Approach
**Reference-Based Strategy**: Drawing from premium fintech (Stripe, Revolut) and proptech (Airbnb, Sotheby's Real Estate) to convey trust, professionalism, and exclusivity. This is a high-stakes investment platform requiring sophisticated design that balances approachability with financial credibility.

## Typography System

**Primary Font**: Inter or DM Sans via Google Fonts (professional, modern, excellent legibility for financial data)
**Secondary Font**: Playfair Display or Lora (for headlines only - adds sophistication)

**Hierarchy**:
- Hero Headlines: 4xl to 6xl, font-bold, secondary font
- Section Headers: 3xl to 4xl, font-semibold, primary font
- Subsections: xl to 2xl, font-medium
- Body Text: base to lg, font-normal, leading-relaxed
- Financial Data/Numbers: 2xl to 3xl, font-bold, tabular-nums
- Legal/Fine Print: sm, font-normal, leading-snug

## Layout System
**Spacing Primitives**: Use Tailwind units of 4, 6, 8, 12, 16, 20, 24 for consistent rhythm
- Section padding: py-16 md:py-24 lg:py-32
- Component spacing: space-y-8 to space-y-12
- Container max-width: max-w-7xl
- Content max-width: max-w-4xl (for text-heavy sections)

**Grid System**:
- Landing page features: 3-column grid (lg:grid-cols-3)
- Dashboard cards: 2-column responsive (md:grid-cols-2)
- Admin table: Full-width with horizontal scroll on mobile

## Component Library

### Navigation
**Landing Page Header**: Full-width, sticky, backdrop-blur with subtle border, height h-20
- Logo left, navigation center (Features, How It Works, Legal), CTA button right
- Mobile: Hamburger menu with slide-in drawer

**Dashboard Navigation**: Sidebar layout (w-64) on desktop, collapsible on mobile
- User profile at top with avatar/initials
- Menu items with icons: Dashboard, My Fractions, Documents, Payments, Settings
- Logout at bottom

### Hero Section (Landing Page)
**Layout**: Full viewport height (min-h-screen), split-screen design
- Left 50%: Content (headline, subheadline, dual CTAs, trust badges row)
- Right 50%: Large hero image with gradient overlay
- Mobile: Stack vertically, image at top with reduced height (h-64)

**Content Structure**:
- Headline: "Own 25% of a Dubai Apartment for AED 225,000"
- Subheadline: Brief explanation of fractional ownership benefit
- Primary CTA: "Reserve Your Share" (prominent, lg size)
- Secondary CTA: "View Pilot Unit" (outline style)
- Trust badges row: 3 badges (DLD Compliant icon, Escrow Protected icon, No DFSA Required icon) with icons and short labels

### Cards & Data Display

**Property Card (Pilot Unit)**:
- Image at top with aspect ratio 16:9, rounded-lg
- Content area with padding p-6
- Title, location, price breakdown table
- Escrow progress bar (visual indicator showing 3/4 funded)
- Action button at bottom

**Dashboard Stats Cards**:
- Grid of 3-4 cards showing: Fraction Owned, Total Investment, Escrow Status, Next Payment
- Each card: Background with subtle border, p-6, icon at top, large number display, descriptive label below

**Document Cards**:
- List layout with icon left, document name and description, download button right
- Hover state: subtle elevation increase

### Forms

**Reservation Modal**:
- Centered modal (max-w-2xl), backdrop blur
- Multi-step form: Step 1 (Personal Info), Step 2 (KYC Upload), Step 3 (Payment)
- Progress indicator at top showing current step
- Input fields: Full-width, p-4, rounded-lg, border, focus ring
- Labels above inputs, error messages below in red

**Login Form**:
- Centered card (max-w-md), minimal design
- Email input + "Send OTP" button
- OTP verification code inputs (6 boxes, large, centered)
- Auto-focus and auto-advance between OTP boxes

### Payment Interface
**Payment Summary Card**:
- Breakdown table: Fraction price, Processing fee, Total
- Large total amount display
- Escrow account IBAN shown in monospace font, copy button
- Payment provider logos (Stripe) for trust
- "Proceed to Payment" button full-width, prominent

### Admin Panel

**Data Table**:
- Sortable columns: Name, Email, Fraction, Payment Status, KYC Status
- Action dropdowns per row: View Details, Mark KYC Complete, Send Reminder
- Batch actions: Select checkboxes, Export to CSV button
- Pagination at bottom
- Filter/search bar at top

**Admin Controls Section**:
- Card with warning style for critical actions
- "Trigger Fully Funded Notification" button with confirmation dialog

### Legal & Compliance Elements

**Disclaimer Banners**:
- Sticky banner at page bottom or prominent section on landing
- "This is direct real estate co-ownership. Not a security. Not regulated by DFSA."
- Readable font size (text-sm minimum), clear language

**PDF Preview**:
- Embedded viewer showing first page of document
- Download and print buttons below

## Animations
**Minimal, purposeful animations only**:
- Fade-in on scroll for landing page sections (0.3s duration)
- Smooth page transitions (0.2s)
- Button hover: subtle scale transform (scale-105)
- No complex scroll-triggered effects or parallax

## Images

### Required Images

**Hero Image** (Landing Page - Right 50% of split screen):
- High-quality photograph of modern Dubai apartment interior or JVC development exterior
- Professional real estate photography with warm, inviting lighting
- Resolution: 1920x1080 minimum
- Subtle gradient overlay (dark at bottom for text legibility if needed)

**Property/Pilot Unit Images**:
- Main property card: Exterior or interior shot of 1BR JVC unit
- Gallery of 3-4 additional images: Living room, bedroom, kitchen, building facade
- Resolution: 1200x800 minimum

**Trust Building Images**:
- Optional: Small headshots for testimonials/investor success stories (circular crops, 80x80)
- DLD logo for compliance badge
- Escrow/security icon graphics

**Dashboard Placeholders**:
- Default avatar for user profile (if no photo uploaded)
- Document type icons (PDF, legal document symbols)

### Image Placement Strategy
- Hero: Dominant right-side placement on landing page
- Property showcase: Full-width section below hero with large image and details side-by-side
- Features section: Icon illustrations rather than photos
- Footer: No images, text-based with trust badges/logos only

## Responsive Behavior
- Desktop (lg): Full sidebar navigation, multi-column grids, split hero
- Tablet (md): Collapsible sidebar, 2-column grids, stacked hero with reduced image
- Mobile (base): Bottom navigation bar, single column, simplified tables with horizontal scroll, modals become full-screen

## Trust & Professionalism Elements
- Consistent use of financial-grade typography and spacing
- Subtle shadows and borders (never harsh)
- Professional photography only (no stock photos of generic buildings)
- Clear visual hierarchy for legal disclaimers
- Progress indicators for all multi-step processes
- Real-time validation feedback in forms
- Success/error states with appropriate visual feedback (green/red accents)

This design system creates a sophisticated, trustworthy platform that balances the approachability of consumer apps with the credibility required for real estate investment.