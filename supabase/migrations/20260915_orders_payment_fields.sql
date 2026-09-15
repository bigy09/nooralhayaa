-- Upgrade an existing orders table created before the payment fields existed.
-- Safe to run more than once in Supabase SQL Editor.

alter table public.orders
  add column if not exists delivery_zone text not null default '',
  add column if not exists payment_amount numeric(12, 2) not null default 0,
  add column if not exists payment_choice text not null default 'full',
  add column if not exists payment_method text,
  add column if not exists remaining_at_delivery numeric(12, 2) not null default 0,
  add column if not exists paid_amount numeric(12, 2) not null default 0,
  add column if not exists transaction_reference text,
  add column if not exists inventory_reserved boolean not null default false;

update public.orders
set payment_method = 'orange'
where payment_method is null;

alter table public.orders
  alter column payment_method set default 'orange',
  alter column payment_method set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'orders_payment_method_check'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders
      add constraint orders_payment_method_check
      check (payment_method in ('wave', 'moov', 'mtn', 'orange'));
  end if;
end $$;

notify pgrst, 'reload schema';