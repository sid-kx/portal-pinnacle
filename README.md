# Pinnacle Realty Portal

Private agent and broker dashboard for **Pinnacle Realty, Brokerage** at **agentsso.pinnaclerealty.ca**.

This repo contains the secure internal portal used to manage agent access, agent profiles, approvals, and brokerage-controlled content.

## Live Site

**Production:** https://agentsso.pinnaclerealty.ca

## Project Overview

The Pinnacle Realty Portal is the private dashboard layer of the Pinnacle digital ecosystem.

While the main site is public and the Join site is used for recruitment inquiries, the portal is designed for approved internal users. It gives the brokerage control over who appears publicly, what profile information is shown, and what content can be published to the main site.

## Main Purpose

The portal exists to support internal brokerage operations, including:

- Agent access requests
- Broker approvals and denials
- Agent profile management
- Public agent directory syncing
- Broker-controlled new construction content
- Secure internal dashboard access
- Future brokerage tools and automation

## User Roles

### Broker / Admin

The broker/admin can:

- Review agent access requests
- Approve or deny agents
- Manage approved agent records
- Hide, delete, or deactivate agents
- Control which agents appear on the public Agents page
- Manage brokerage-controlled content
- Manage new construction projects
- Maintain data quality before anything becomes public

### Agent

Approved agents can:

- Log in to the portal
- Edit their own public profile
- Add biography information
- Add contact details
- Upload or update profile image
- Add social media links
- Submit information that can appear on the main site after approval

## Public Site Connection

The portal is connected conceptually and technically to the main Pinnacle Realty website.

Agent profiles entered or approved through the portal are intended to sync with the public Agents page on pinnaclerealty.ca.

The public Agents page should only display an agent card when the required profile information is available, especially:

- Agent name
- Biography
- Approved/active status
- Public visibility status

Deleted or inactive agents should not appear publicly.

## Key Features

- Secure login page
- Private dashboard structure
- Email and password sign-in
- Request access link
- Password help modal
- Broker-controlled approval workflow
- Agent profile editing
- Supabase authentication structure
- Supabase database integration
- Supabase storage support for profile images
- Row Level Security planning
- Broker/admin-only management sections
- Main-site sync for approved profiles
- Brokerage-controlled content management
- New construction project management
- Mobile-responsive internal UI
- Black-and-gold Pinnacle design system

## Current Login Page

The public-facing login screen includes:

- Pinnacle Realty logo
- “Agent & Broker Portal” label
- Welcome message
- Email address field
- Password field
- Sign-in button
- Forgot password help
- Request access link

The forgot password modal currently instructs users to contact Broker of Record Jag Saini for password help.

## Tech Stack

- HTML
- CSS
- JavaScript
- Supabase Auth
- Supabase Database
- Supabase Row Level Security
- Supabase Storage
- Broker/admin approval logic
- Static frontend deployment
- GitHub for version control

## Planned / Existing Database Concepts

The portal is built around tables and policies for:

- Agent profiles
- Access requests
- Approved users
- Admin/broker permissions
- Public visibility flags
- Deleted/inactive states
- New construction projects
- Project image storage
- Contact/profile data syncing

## New Construction Management

The portal is planned to allow the broker/admin to create, edit, delete, and publish new construction projects.

Each project can include:

- Project name
- Location
- Description
- Status
- Visibility toggle
- Up to 5 images
- Public display control

Only projects marked as public should appear on the main website.

## Agent Directory Management

The portal supports the long-term agent directory workflow:

1. Agent requests access
2. Broker reviews request
3. Broker approves or denies access
4. Approved agent logs in
5. Agent completes profile
6. Broker/admin can review or manage visibility
7. Public Agents page displays approved complete profiles

## Security Goals

The portal should protect internal brokerage data and prevent unauthorized access.

Important security expectations:

- No public access to private dashboards
- Supabase RLS policies for user-specific data
- Admin-only access for approvals and content management
- Agents can only edit their own profile
- Deleted/inactive profiles stay hidden from public pages
- Service role keys must never be exposed in frontend code
- Public website should only fetch safe public profile data

## Connected Pinnacle Ecosystem

| Platform | Domain | Purpose |
| --- | --- | --- |
| Main Website | pinnaclerealty.ca | Public brokerage website |
| Join Website | join.pinnaclerealty.ca | Recruitment inquiry funnel |
| Portal | agentsso.pinnaclerealty.ca | Internal agent and broker dashboard |
| Blog | blogs.pinnaclerealty.ca | Content and article platform |

## Planned / Future Features

- Full broker dashboard
- Agent dashboard
- Profile image upload
- More complete new construction CMS
- Better admin approval screens
- Email notifications for access requests
- Resend email integration
- More advanced RLS policy structure
- CRM syncing
- Agent-linked listings
- Broker analytics
- Listing management tools
- Internal announcements
- Dashboard performance improvements

## Project Goals

The portal is meant to turn Pinnacle Realty’s website from a static marketing site into a controlled brokerage platform.

Instead of manually editing public agent profiles in code, the portal creates a foundation where approved users and broker-managed content can update the public website in a safer, more scalable way.

## Brand Direction

The portal follows the same Pinnacle design language:

- Black and gold color palette
- Professional dashboard feel
- Floating cards and rounded sections
- Clean login experience
- Consistent logo placement
- Smooth responsive layout
- Premium internal brokerage interface

## Developer

Built and managed by **Sid Kamboj** as part of the Pinnacle Realty digital platform.

Sid handles frontend development, UI/UX design, Supabase integration, database planning, portal workflows, and deployment structure.
