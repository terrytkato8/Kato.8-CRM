create extension if not exists pgcrypto;

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  company text not null default '',
  contact text not null default '',
  email text not null default '',
  stage text not null default 'Lead' check (stage in ('Lead','Qualified','Proposal','Negotiation','Won','Lost')),
  value numeric not null default 0,
  next_date date,
  next_action text not null default '',
  scope text not null default '',
  notes text not null default '',
  owner_id uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.clients enable row level security;
create policy "Authenticated users can read clients" on public.clients for select to authenticated using (true);
create policy "Authenticated users can create clients" on public.clients for insert to authenticated with check (owner_id = auth.uid());
create policy "Authenticated users can update clients" on public.clients for update to authenticated using (true) with check (true);
create policy "Authenticated users can delete clients" on public.clients for delete to authenticated using (true);

create or replace function public.touch_clients_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists clients_updated_at on public.clients;
create trigger clients_updated_at before update on public.clients
for each row execute procedure public.touch_clients_updated_at();
