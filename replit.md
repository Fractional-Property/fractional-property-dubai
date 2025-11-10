# FOPD - Fractional Off-Plan Dubai Real Estate Platform

## Overview

FOPD is a fractional real estate investment platform that enables investors to purchase fractional ownership (10% shares) of off-plan properties in Dubai. The platform facilitates DLD-compliant co-ownership through a structured investment process including investor registration, KYC verification, payment processing via Tap Payments, and escrow management. The pilot property is a 1-bedroom apartment in Jumeirah Village Circle (JVC) priced at AED 900,000, with each fraction priced at AED 90,000.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React 18 with TypeScript, using Vite as the build tool and development server. The application follows a component-based architecture with client-side routing via Wouter.

**UI Component System**: Implements shadcn/ui component library (New York style variant) built on Radix UI primitives. All components utilize Tailwind CSS with a custom design system featuring:
- Custom color tokens for light/dark mode theming
- Responsive breakpoints and spacing primitives
- Typography system using Inter (primary) and Playfair Display (secondary/serif) fonts
- Elevation and shadow utilities for depth hierarchy

**State Management**: TanStack Query (React Query) for server state management with optimistic updates and cache invalidation. Session storage is used for investor authentication state persistence.

**Design Philosophy**: Premium fintech/proptech aesthetic drawing inspiration from Stripe, Revolut, Airbnb, and Sotheby's Real Estate. Emphasizes trust, professionalism, and exclusivity through careful typography, spacing, and visual hierarchy.

### Backend Architecture

**Server Framework**: Express.js running on Node.js with TypeScript. The server handles both API routes and serves the built frontend in production.

**API Structure**: RESTful API design with route organization:
- `/api/auth/*` - OTP-based authentication (send-otp, verify-otp)
- `/api/investors/*` - Investor CRUD operations and profile management
- `/api/properties/*` - Property listings and pilot property retrieval
- `/api/payments/*` - Payment processing and status updates
- `/api/admin/*` - Admin authentication, investor management, and KYC approval

**Authentication Strategy**: Passwordless OTP authentication for investors via email. OTPs are stored in-memory with expiration (10 minutes). Admin access uses basic email/password authentication with hardcoded credentials (admin@fopd.ae / admin123).

**Session Management**: Express sessions with connect-pg-simple for PostgreSQL-backed session storage, ensuring session persistence across server restarts.

### Data Storage

**Database**: PostgreSQL accessed via Neon serverless driver with WebSocket support.

**ORM**: Drizzle ORM for type-safe database queries and schema management. Schema includes:
- `investors` - Investor profiles with KYC and payment status tracking
- `properties` - Real estate listings with fractional ownership configuration
- `fractions` - Individual fraction ownership records linking investors to properties
- `payments` - Payment transaction records with Tap Payments integration
- `adminUsers` - Admin user accounts

**Schema Design**: All tables use UUID primary keys with automatic generation. Decimal types with precision controls are used for monetary values (12,2 precision). Status fields use text enums for KYC status (pending/approved/rejected) and payment status tracking.

**Migrations**: Schema changes managed via Drizzle Kit with migration files in the `/migrations` directory. Database schema is defined in `shared/schema.ts` and shared between client and server via path aliases.

### External Dependencies

**Payment Gateway**: Tap Payments (goSellJSLib v2.0.0) for card payment processing. Integration uses client-side payment form embedding with server-side charge creation and webhook handling for payment status updates.

**Email Service**: OTP delivery system (implementation details not in current codebase - appears to use console logging for development).

**Asset Hosting**: Images stored in `/attached_assets` directory including property photos (hero images, building exteriors, interior shots) generated via AI for the pilot property.

**Font Provider**: Google Fonts CDN for Inter and Playfair Display typefaces.

**Build Tools**: 
- esbuild for server-side bundling
- Vite for client-side bundling with React Fast Refresh
- PostCSS with Tailwind CSS and Autoprefixer

**Development Tools**:
- Replit-specific plugins (runtime error overlay, cartographer, dev banner) for enhanced development experience
- TypeScript compiler for type checking without emission
- Drizzle Kit for database migrations and schema management

**Authentication Flow**: Investors receive OTPs via email, verify the code, and gain access to their dashboard. Admin users authenticate with static credentials to access investor management and KYC approval workflows.