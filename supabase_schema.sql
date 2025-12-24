-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create profiles table (linked to auth.users)
create table profiles (
  id uuid references auth.users not null primary key,
  email text,
  full_name text,
  avatar_url text,
  updated_at timestamp with time zone
);

-- Create transactions table
create table transactions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  type text check (type in ('income', 'expense')),
  amount numeric not null,
  category text,
  description text,
  date timestamp with time zone default now(),
  created_at timestamp with time zone default now()
);

-- Create clients table
create table clients (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  phone text,
  email text,
  address text,
  created_at timestamp with time zone default now()
);

-- Create measurements table
create table measurements (
  id uuid default uuid_generate_v4() primary key,
  client_id uuid references clients(id) on delete cascade not null,
  name text not null,
  unit text check (unit in ('inches', 'cm')),
  values jsonb not null,
  photo_url text,
  notes text,
  created_at timestamp with time zone default now()
);

-- Create orders table
create table orders (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  client_id uuid references clients(id) on delete cascade not null,
  description text,
  status text check (status in ('pending', 'in_progress', 'ready_for_fitting', 'completed', 'delivered')),
  deadline timestamp with time zone,
  fabric_source text check (fabric_source in ('client', 'babake')),
  fabric_cost numeric default 0,
  fabric_images text[], -- Array of URLs
  total_amount numeric default 0,
  paid_amount numeric default 0,
  payments jsonb default '[]'::jsonb, -- Store payment records as JSONB for simplicity, or create a separate table
  created_at timestamp with time zone default now()
);

-- Create notes table
create table notes (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  title text,
  content text,
  category text,
  date timestamp with time zone default now(),
  created_at timestamp with time zone default now()
);

-- Create measurement_templates table
create table measurement_templates (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  fields text[] not null,
  created_at timestamp with time zone default now()
);

-- Set up Row Level Security (RLS)
alter table profiles enable row level security;
alter table transactions enable row level security;
alter table clients enable row level security;
alter table measurements enable row level security;
alter table orders enable row level security;
alter table notes enable row level security;
alter table measurement_templates enable row level security;

-- Create policies
create policy "Users can view their own profiles" on profiles for select using (auth.uid() = id);
create policy "Users can update their own profiles" on profiles for update using (auth.uid() = id);

create policy "Users can crud their own transactions" on transactions for all using (auth.uid() = user_id);
create policy "Users can crud their own clients" on clients for all using (auth.uid() = user_id);
create policy "Users can crud their own measurements" on measurements for all using (client_id in (select id from clients where user_id = auth.uid()));
create policy "Users can crud their own orders" on orders for all using (auth.uid() = user_id);
create policy "Users can crud their own notes" on notes for all using (auth.uid() = user_id);
create policy "Users can crud their own templates" on measurement_templates for all using (auth.uid() = user_id);
