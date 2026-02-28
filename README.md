# Salora Core 📅

> ⚠️ **Note:** Salora Core is currently in active development (Alpha). Features, database schemas, and APIs are subject to change. Not yet recommended for production use.

An open-source, embeddable booking engine designed for salons and service-based businesses. Built with SvelteKit and optimized for Edge deployment (Cloudflare Workers).

## Features
- **Embeddable Widget:** Drop-in booking UI for existing websites (WordPress, Shopify, Wix) or custom frontends.
- **Availability Engine:** Real-time scheduling, calendar synchronization, and conflict prevention.
- **Resource Management:** Handle multi-staff scheduling, variable working hours, and service assignments.
- **Client Portal & CRM:** Centralized management for appointments, customer history, and automated status notifications.

*(Note: Advanced payment processing and white-labeling features are part of the commercial Salora SaaS offering).*

## Tech Stack
- **Framework:** [SvelteKit](https://kit.svelte.dev/)
- **Monorepo:** [Turborepo](https://turbo.build/)
- **Package Manager & Runtime:** [Bun](https://bun.sh/)
- **Deployment:** [Cloudflare Workers](https://workers.cloudflare.com/) (Edge-optimized)

## Architecture & Licensing
Salora operates on an **Open Core** model. This repository contains the fundamental booking logic, widget interfaces, and base UI components. 

This core project is licensed under the **AGPLv3 License**. This means if you modify and host this software over a network, you must publicly share your source code. For commercial use without these copyleft restrictions (e.g., white-labeling, custom payment integrations without open-sourcing your own code), a commercial license is available via the official Salora platform.

## Getting Started (Local Development)
```bash
git clone [https://github.com/salora-hq/salora-core.git](https://github.com/salora-hq/salora-core.git)
cd salora-core
bun install
bun run dev