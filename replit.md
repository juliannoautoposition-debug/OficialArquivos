# Real-Time Sales Application

## Overview

This is a real-time sales and inventory management application built with React, Express, and PostgreSQL. The application enables multiple users to manage product inventory, process sales, and view transaction history with real-time synchronization across all connected clients. It features a three-tab interface (Vendas/Estoque/Histórico) with password-protected inventory management and WhatsApp notification integration.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript and Vite as the build tool

**UI Component Library**: shadcn/ui components built on top of Radix UI primitives, styled with Tailwind CSS using a custom theme configuration

**State Management**: 
- TanStack Query (React Query) for server state management with aggressive caching (staleTime: Infinity)
- Local React state for UI-specific concerns (cart, modals, form inputs)
- WebSocket connection for real-time updates that invalidate React Query cache

**Routing**: Wouter for lightweight client-side routing (though currently single-page with tab navigation)

**Design System**:
- Custom CSS variables for theming (defined in index.css)
- Bootstrap Icons for iconography
- Bootstrap 5 CSS framework for base styles and grid system
- Tailwind CSS for utility-first styling with custom configuration

**Key Design Constraint**: The application must maintain 100% visual fidelity to the existing design. All changes are backend/infrastructure only - no visual modifications are permitted. This includes preserving colors (navbar: #3f1e00), layouts, animations, hover effects, and all existing UI patterns.

### Backend Architecture

**Runtime**: Node.js with Express.js web framework

**Language**: TypeScript with ES modules

**API Design**: RESTful API with the following endpoints:
- GET /api/produtos - Fetch all products
- POST /api/produtos - Create new product
- PATCH /api/produtos/:id - Update existing product
- DELETE /api/produtos/:id - Delete product
- GET /api/vendas - Fetch sales history
- POST /api/vendas - Record new sale
- GET /api/config - Fetch configuration (WhatsApp, password)
- PATCH /api/config - Update configuration

**Real-Time Communication**: WebSocket server (ws library) for broadcasting inventory and sales updates to all connected clients. The WebSocket connection uses path '/ws' and broadcasts messages with type/data structure.

**Validation**: Zod schemas for request validation, derived from Drizzle ORM table definitions

**Storage Abstraction**: IStorage interface allows swapping between in-memory (MemStorage) and database implementations without changing route handlers

### Data Storage

**ORM**: Drizzle ORM with PostgreSQL dialect

**Database Provider**: Neon serverless PostgreSQL (@neondatabase/serverless)

**Schema Design**:
- `produtos` table: id (PK), nome, quantidade, preco, imagemURL
- `vendas` table: id (PK), data, total, itens (JSON string), timestamp
- `configuracoes` table: id (PK), whatsappGestor, senhaGestor

**Migration Strategy**: Drizzle Kit for schema management with migrations stored in ./migrations directory

**Initial Data**: Sample products seeded in MemStorage (Camiseta, Boné, Chinelo) - this data should be migrated to the database

### Authentication & Authorization

**Inventory Access Control**: Password-based authentication for accessing the Estoque (inventory) tab
- Default password stored in configuration table: "sucesso2026"
- Password verified client-side (should be moved to server-side for production)
- Session state managed locally (not persisted)

**Security Considerations**: 
- Current implementation has client-side password validation which is insecure
- No user authentication system - single shared password
- No session management or JWT tokens
- Recommend implementing proper authentication before production deployment

### External Dependencies

**Database Service**: 
- Neon serverless PostgreSQL (via DATABASE_URL environment variable)
- Connection pooling via @neondatabase/serverless

**WhatsApp Integration**:
- Configuration for WhatsApp manager number stored in database
- Integration appears to be notification-based (configuration stored but implementation not visible in provided code)

**Development Tools**:
- Replit-specific plugins for development environment (@replit/vite-plugin-runtime-error-modal, @replit/vite-plugin-cartographer, @replit/vite-plugin-dev-banner)

**Session Storage**: 
- connect-pg-simple for PostgreSQL-backed session storage (dependency present but implementation not shown in provided code)

**Build & Deployment**:
- esbuild for backend bundling
- Vite for frontend bundling
- Scripts: dev (development with tsx), build (production build), start (production server), db:push (schema migration)