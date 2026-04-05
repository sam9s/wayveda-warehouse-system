# User Access Control

## Objective

Define the identity, role, and access-control model for the WayVeda Warehouse System so the current inventory application can grow into a broader ERP foundation without reworking authentication later.

## Security Principle

Credentials must not be stored in the application-owned `public.users` table.

The correct split is:

- `auth.users` in Supabase Auth stores login identity and password hashes
- `public.users` in the application schema stores the app profile, role, status, and metadata
- `audit_log` stores user-management and business-change history

This is the approved foundation because it separates authentication from authorization cleanly and scales into future ERP modules.

## Current Identity Model

### Supabase Auth: `auth.users`

Supabase Auth is the source of truth for:

- email / login identifier
- password hash
- email-confirmation state
- provider identity if social or SSO is added later

The application must never copy raw passwords into PostgreSQL tables, docs, seed files, or `.env` files.

### Application Access Table: `public.users`

The application-owned `users` table stores:

- `id`
  - foreign key to `auth.users.id`
- `display_name`
  - the warehouse-visible human name
- `role`
  - `system_admin`, `admin`, `operator`, or `viewer`
- `is_active`
  - soft-access switch for disabling a user without deleting their auth record
- `metadata`
  - JSONB extension field for future ERP use
- `created_at`, `updated_at`

This table is the access-control layer for the WayVeda application.

### Audit Table: `audit_log`

User lifecycle and privileged changes must be auditable. `audit_log` is already part of the base schema and must remain active for:

- user creation
- role changes
- deactivation / reactivation
- future settings changes
- privileged product or inventory adjustments

## Role Model

### `system_admin`

Purpose:

- platform-level owner access
- reserved for you and any future internal technical owner explicitly approved by you

Permissions:

- full read and write access across the application
- can create any user role, including another `system_admin`
- can manage WayVeda admins, operators, and viewers
- can access admin-only screens and all warehouse operations
- intended to remain separate from normal WayVeda business users

Notes:

- this role is above normal business admin
- WayVeda admins must not be able to create or promote `system_admin` accounts

### `admin`

Purpose:

- WayVeda business administrator

Permissions:

- full warehouse operations access
- product management
- settings access
- user management for business roles
- audit-log visibility
- can create `admin`, `operator`, and `viewer`
- cannot create `system_admin`

### `operator`

Purpose:

- warehouse execution user

Permissions:

- log in
- view dashboard, ledger, and analysis screens
- create `stock_in`, `dispatch`, and `rto` entries
- no product-management or admin-user-management access

### `viewer`

Purpose:

- read-only business visibility

Permissions:

- log in
- view dashboard, ledger, and analysis screens
- no movement entry
- no product management
- no user management

## Current Permission Matrix

| Area | system_admin | admin | operator | viewer |
|---|---|---|---|---|
| Login | Yes | Yes | Yes | Yes |
| Dashboard | Yes | Yes | Yes | Yes |
| Inventory Ledger | Yes | Yes | Yes | Yes |
| Analysis Screens | Yes | Yes | Yes | Yes |
| Stock In Entry | Yes | Yes | Yes | No |
| Dispatch Entry | Yes | Yes | Yes | No |
| RTO Entry | Yes | Yes | Yes | No |
| Product Management | Yes | Yes | No | No |
| Settings | Yes | Yes | No | No |
| List Users | Yes | Yes | No | No |
| Create `viewer` | Yes | Yes | No | No |
| Create `operator` | Yes | Yes | No | No |
| Create `admin` | Yes | Yes | No | No |
| Create `system_admin` | Yes | No | No | No |
| View Audit Log | Yes | Yes | No | No |

## Email Policy

### WayVeda Business Users

WayVeda-owned accounts should use official WayVeda email addresses wherever possible.

Examples:

- business admin
- operations manager
- warehouse operator
- reporting viewer

This keeps the ERP identity model clean and makes ownership obvious later.

### System Admin Users

Your system-admin account does not need to use a personal email address. It may use a dedicated internal operational login that exists only for this system.

That is acceptable because:

- it is a controlled bootstrap credential
- it is not a business-user identity
- it is for platform ownership, not staff operations

## User Lifecycle

### 1. Bootstrap

The first permanent privileged account should be created through the bootstrap script, not by relying on the implicit first-login behavior.

Reason:

- first-login auto-promotion is acceptable as a fallback only
- explicit bootstrap is safer and more intentional
- it prevents the wrong first authenticated user from becoming the top-level owner

### 2. Normal User Creation

After bootstrap:

- `system_admin` and `admin` can create normal business users
- only `system_admin` can create another `system_admin`

Creation flow:

1. Create auth identity in Supabase Auth
2. Create or upsert row in `public.users`
3. Assign role
4. Mark `is_active = true`
5. Record audit-log entry

### 3. Deactivation

Preferred deactivation model:

- keep auth identity
- set `public.users.is_active = false`
- deny login to the app
- retain audit history

This is better than hard deletion for ERP-grade traceability.

### 4. Password Rotation

Passwords should be rotated through Supabase Auth administrative flows.

They must not be rotated by editing database records directly.

Supported paths now are:

- first-login self-service password change from `/change-password`
- account recovery via `Forgot password?` on the login screen
- controlled admin reset through the CLI for bootstrap/support cases

### 5. Deletion

Hard deletion should be rare and reserved for:

- mistaken bootstrap accounts
- test users
- explicit cleanup scenarios

In normal business use, deactivation is safer than deletion.

## Current Implementation Status

Implemented now:

- app-level role table already exists
- audit logging already exists
- role set now includes `system_admin`
- authorization middleware now gives `system_admin` full access
- admin creation logic now blocks non-system-admin users from creating `system_admin`
- frontend route and navigation logic now recognizes `system_admin`
- bootstrap CLI exists for creating the first permanent user:
  - `npm run user:create -- --email <email> --password <password> --display-name <name> --role <role>`
- password-reset CLI exists for controlled temporary-password resets:
  - `npm run user:set-password -- --email <email> --password <password>`

Still pending in future work:

- update-user endpoint
- deactivate / reactivate endpoint
- password-reset admin flow
- dedicated frontend user-management screen
- optional invitation-based onboarding

## Recommended Operating Model For This Project

Use this structure:

1. One permanent `system_admin` account for you
2. One or more WayVeda `admin` accounts using official WayVeda email IDs
3. WayVeda `operator` accounts for warehouse staff
4. `viewer` accounts only where read-only access is necessary

This keeps technical ownership separate from business ownership without limiting future ERP expansion.

## Immediate Next Step

Create the first permanent `system_admin` bootstrap account now, then use that account to validate login and later create WayVeda-admin accounts.
