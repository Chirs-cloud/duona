-- =============================================
-- 多拿点 · Supabase 数据库 Schema
-- 运行方式：Supabase 后台 → SQL Editor → 运行此脚本
-- =============================================

-- 用户表（由 Supabase Auth 自动管理，可选扩展）
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 分析记录表
create table if not exists public.analyses (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete set null,
  company text not null,
  position text not null,
  city text not null,
  salary integer not null,
  result jsonb,
  is_paid boolean default false,
  created_at timestamptz default now()
);

-- 支付记录表
create table if not exists public.payments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete set null,
  amount integer not null default 1990,  -- 单位：分，¥19.9
  status text default 'pending',           -- pending / paid / refunded
  trade_no text,                           -- 微信支付交易号
  paid_at timestamptz,
  created_at timestamptz default now()
);

-- 启用 Row Level Security
alter table public.profiles enable row level security;
alter table public.analyses enable row level security;
alter table public.payments enable row level security;

-- RLS 策略：用户只能看自己的数据
create policy "用户只能看自己的分析记录"
  on public.analyses for select
  using (auth.uid() = user_id);

create policy "用户只能看自己的支付记录"
  on public.payments for select
  using (auth.uid() = user_id);

create policy "已登录用户只能更新自己的profile"
  on public.profiles for update
  using (auth.uid() = id);

-- 自动创建 profile（注册时触发）
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 索引优化
create index if not exists idx_analyses_user_id on public.analyses(user_id);
create index if not exists idx_analyses_created_at on public.analyses(created_at desc);
create index if not exists idx_payments_user_id on public.payments(user_id);
