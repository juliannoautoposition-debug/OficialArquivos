# Design Guidelines: Real-Time Sales Application

## Critical Constraint
**MAINTAIN 100% OF EXISTING VISUAL DESIGN** - The user has explicitly requested NO visual changes whatsoever ("sem mexer em nada apenas nisso nao mudar visual nem nada").

## Design Preservation Requirements

### Visual Integrity
- Keep all existing colors, spacing, layouts, and components exactly as they are
- Maintain current color scheme: `--verde: #3f1e00` for navbar, existing background colors
- Preserve all existing card styles, hover effects, animations, and transitions
- Keep current typography, font sizes, and weights unchanged
- Maintain all existing icons from Bootstrap Icons library

### Layout & Structure
- Preserve three-tab navigation system (Vendas/Estoque/Histórico)
- Keep current responsive breakpoints and mobile adaptations
- Maintain existing card layouts for products, cart items, and inventory
- Preserve current modal designs (password entry, product editing)
- Keep success animation modal exactly as designed

### Component Behavior
- Maintain quantity controls with +/- buttons styling
- Keep WhatsApp configuration interface in estoque section
- Preserve product image upload and display functionality
- Maintain cart functionality with running total display
- Keep password-protected estoque access flow

## Technical Enhancement (Backend Only)
The ONLY changes should be backend infrastructure to enable:
- Real-time synchronization of product inventory across all connected users
- Real-time cart and sales updates visible to all users
- Real-time history updates when sales are completed
- Real-time stock quantity updates after sales

## User Experience Preservation
- Maintain existing user flows and interactions
- Keep success feedback mechanisms (modal animations)
- Preserve WhatsApp notification system
- Maintain current form validation behaviors

**Summary**: Transform localStorage to real-time database while keeping the interface pixel-perfect identical to the current design.