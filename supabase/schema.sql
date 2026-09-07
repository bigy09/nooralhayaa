-- Noor Al Hayaa - Supabase/PostgreSQL foundation.
-- Apply this file in Supabase SQL Editor before switching the backend adapter.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text not null default '',
  preferred_location text not null default '',
  password_hash text not null,
  role text not null default 'user' check (role in ('user', 'admin')),
  refresh_sessions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text,
  image text,
  parent_id uuid references public.categories(id) on delete set null,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price numeric(12, 2) not null default 0,
  compare_price numeric(12, 2),
  sku text,
  weight numeric(12, 3),
  dimensions jsonb,
  inventory integer not null default 0,
  is_visible boolean not null default true,
  is_out_of_stock boolean not null default false,
  images jsonb not null default '[]'::jsonb,
  category_slug text not null default '',
  category_ids uuid[] not null default '{}',
  variants jsonb not null default '[]'::jsonb,
  swatches jsonb not null default '[]'::jsonb,
  sizes jsonb not null default '[]'::jsonb,
  featured boolean not null default false,
  rating numeric(2, 1) not null default 0,
  reviews jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.banners (
  id uuid primary key default gen_random_uuid(),
  title text,
  subtitle text,
  image text not null,
  cta jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  session_id text,
  user_id uuid not null references public.users(id) on delete restrict,
  customer jsonb not null default '{}'::jsonb,
  items jsonb not null default '[]'::jsonb,
  subtotal numeric(12, 2) not null default 0,
  shipping numeric(12, 2) not null default 0,
  delivery_zone text not null default '',
  total numeric(12, 2) not null default 0,
  payment_amount numeric(12, 2) not null default 0,
  payment_choice text not null default 'full' check (payment_choice in ('full', 'deposit')),
  payment_method text not null check (payment_method in ('wave', 'moov', 'mtn', 'orange')),
  remaining_at_delivery numeric(12, 2) not null default 0,
  paid_amount numeric(12, 2) not null default 0,
  transaction_reference text,
  inventory_reserved boolean not null default false,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.carts (
  id uuid primary key default gen_random_uuid(),
  session_id text not null unique,
  items jsonb not null default '[]'::jsonb,
  total numeric(12, 2) not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.wishlists (
  id uuid primary key default gen_random_uuid(),
  session_id text not null unique,
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.users(id) on delete set null,
  actor_email text,
  actor_role text,
  action text not null,
  target_type text,
  target_id text,
  metadata jsonb not null default '{}'::jsonb,
  ip text,
  user_agent text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.page_views (
  id uuid primary key default gen_random_uuid(),
  view_date date not null,
  path text not null,
  count integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (view_date, path)
);

create index if not exists orders_user_id_idx on public.orders(user_id);
create index if not exists orders_status_idx on public.orders(status);
create index if not exists orders_created_at_idx on public.orders(created_at desc);
create index if not exists products_visible_idx on public.products(is_visible);
create index if not exists products_category_slug_idx on public.products(category_slug);
create index if not exists page_views_date_idx on public.page_views(view_date);

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at before update on public.users for each row execute function public.set_updated_at();
drop trigger if exists categories_set_updated_at on public.categories;
create trigger categories_set_updated_at before update on public.categories for each row execute function public.set_updated_at();
drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at before update on public.products for each row execute function public.set_updated_at();
drop trigger if exists banners_set_updated_at on public.banners;
create trigger banners_set_updated_at before update on public.banners for each row execute function public.set_updated_at();
drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at before update on public.orders for each row execute function public.set_updated_at();
drop trigger if exists carts_set_updated_at on public.carts;
create trigger carts_set_updated_at before update on public.carts for each row execute function public.set_updated_at();
drop trigger if exists wishlists_set_updated_at on public.wishlists;
create trigger wishlists_set_updated_at before update on public.wishlists for each row execute function public.set_updated_at();
drop trigger if exists page_views_set_updated_at on public.page_views;
create trigger page_views_set_updated_at before update on public.page_views for each row execute function public.set_updated_at();