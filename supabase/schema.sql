-- ---------------------------------------------------------
-- Patungin — Supabase schema
-- Run this whole file once in your Supabase project's SQL editor
-- (Dashboard -> SQL Editor -> New query -> paste -> Run).
-- ---------------------------------------------------------

create extension if not exists pgcrypto;

-- One row per split session. Its id is what shows up in the
-- shareable URL: patungin.app/r/<receipts.id>
create table if not exists receipts (
  id uuid primary key default gen_random_uuid(),
  tax_percent numeric not null default 0,
  service_percent numeric not null default 0,
  discount_amount numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Items are given their id by the client (crypto.randomUUID())
-- rather than the database, so a full-state save can insert items
-- and their assignments in the same request without a round trip
-- to look up generated ids first.
create table if not exists receipt_items (
  id uuid primary key,
  receipt_id uuid not null references receipts(id) on delete cascade,
  name text not null,
  price numeric not null check (price > 0),
  position integer not null default 0
);

create table if not exists participants (
  id uuid primary key,
  receipt_id uuid not null references receipts(id) on delete cascade,
  name text not null,
  position integer not null default 0
);

-- Many-to-many: which participants an item is assigned to.
create table if not exists item_assignments (
  item_id uuid not null references receipt_items(id) on delete cascade,
  participant_id uuid not null references participants(id) on delete cascade,
  primary key (item_id, participant_id)
);

create index if not exists receipt_items_receipt_id_idx on receipt_items(receipt_id);
create index if not exists participants_receipt_id_idx on participants(receipt_id);

-- ---------------------------------------------------------
-- Row Level Security
--
-- There is no authentication yet in this MVP, so access control is
-- simply "anyone holding the receipt's URL can read and edit it" —
-- the same trust model as a Google Docs link with edit access.
-- That is an intentional simplification for a portfolio project,
-- NOT something to ship to real users as-is. Before that, add
-- Supabase Auth and scope these policies to auth.uid() instead of
-- `using (true)`.
-- ---------------------------------------------------------

alter table receipts enable row level security;
alter table receipt_items enable row level security;
alter table participants enable row level security;
alter table item_assignments enable row level security;

create policy "public read receipts" on receipts for select using (true);
create policy "public insert receipts" on receipts for insert with check (true);
create policy "public update receipts" on receipts for update using (true);

create policy "public read receipt_items" on receipt_items for select using (true);
create policy "public write receipt_items" on receipt_items for all using (true) with check (true);

create policy "public read participants" on participants for select using (true);
create policy "public write participants" on participants for all using (true) with check (true);

create policy "public read item_assignments" on item_assignments for select using (true);
create policy "public write item_assignments" on item_assignments for all using (true) with check (true);
