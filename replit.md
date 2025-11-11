# FOPD - Fractional Off-Plan Dubai Real Estate Platform

## Overview

FOPD is a fractional real estate investment platform for off-plan properties in Dubai, enabling DLD-compliant co-ownership. It manages investor registration, KYC, payments via Tap Payments, and escrow. The platform focuses on selling 25% shares of properties, with a pilot 1-bedroom apartment in JVC priced at AED 900,000, where each fraction costs AED 225,000.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

The frontend uses React 18 with TypeScript and Vite, following a component-based architecture with Wouter for client-side routing. It features shadcn/ui (New York style) built on Radix UI and Tailwind CSS, with a custom design system including color tokens, responsive breakpoints, and Inter/Playfair Display fonts. TanStack Query manages server state with optimistic updates, while session storage handles authentication. The design emphasizes a premium fintech/proptech aesthetic inspired by Stripe and Airbnb.

### Backend Architecture

The backend is built with Express.js on Node.js with TypeScript, serving both API routes and the frontend. It uses a RESTful API structure for authentication (OTP-based for investors, basic for admin), investor/property management, payments, and digital signatures. Session management uses Express sessions with PostgreSQL for persistence.

### Data Storage

PostgreSQL is the primary database, accessed via the Neon serverless driver. Drizzle ORM provides type-safe queries. The schema includes tables for investors, properties, fractions, payments, admin users, agreement templates, signature sessions, and a comprehensive co-ownership reservation system. All tables use UUID primary keys, and monetary values use decimal types. Drizzle Kit manages schema migrations.

### Digital Signing System

A DLD-compliant digital signing system secures legal documents with encryption, audit trails, and tamper detection. It supports a multi-party signing workflow for up to four co-owners, generating signed PDFs with embedded signatures. Bilingual support (English/Arabic) is integrated for all legal documents, including proper Arabic shaping and bidirectional text handling. An automated DLD filing export generates consolidated PDFs and CSVs for submission.

### Co-Ownership Reservation System

The platform includes a flexible co-ownership workflow for 1-4 co-owners with dynamic share allocation. This system manages the full reservation lifecycle from expressing interest and inviting co-owners to multi-party signing and payment processing. Key components include a `CoOwnerGrid` for visual status, an `InvestmentCalculator` for real-time financials, and a `DocumentsStation` for tracking signing progress. The workflow is visualized through a `ProcessTimeline`.

## External Dependencies

-   **Payment Gateway**: Tap Payments (goSellJSLib v2.0.0) for card processing and webhooks.
-   **Email Service**: Used for OTP delivery (console logging in development).
-   **Asset Hosting**: `/attached_assets` directory for AI-generated property images.
-   **Font Provider**: Google Fonts CDN (Inter, Playfair Display).
-   **Build Tools**: esbuild (server), Vite (client) with React Fast Refresh, PostCSS, Tailwind CSS, Autoprefixer.
-   **Database**: Neon serverless driver for PostgreSQL.
-   **PDF Generation**: pdf-lib.
-   **Signature Capture**: signature_pad.
-   **Arabic Text Handling**: arabic-reshaper, bidi-js, Noto Sans Arabic font.
-   **Archiving**: archiver for ZIP file creation.
-   **Security**: Node.js crypto module for AES-256-GCM encryption and SHA-256 hashing.