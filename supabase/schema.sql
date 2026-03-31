-- =============================================
-- 多拿点 · Supabase 数据库 Schema v2
-- 手机号登录体系（不依赖 Supabase Auth）
-- 运行方式：Supabase 后台 → SQL Editor → 运行此脚本
-- =============================================

-- 用户表（手机号登录）
create table if not exists public.users (
  id uuid default gen_random_uuid() primary key,
  phone text unique not null,
  is_paid boolean default false,
  paid_at timestamptz,
  usage_count integer default 0,         -- 本月使用次数
  usage_reset_at date default current_date, -- 上次重置日期（月初重置）
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 分析记录表
create table if not exists public.analyses (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete set null,
  phone text,                            -- 冗余存储便于查询
  company text not null,
  position text not null,
  city text,
  salary integer,
  form_data jsonb,                       -- 完整表单数据
  result jsonb,                          -- AI 分析结果
  created_at timestamptz default now()
);

-- 支付记录表
create table if not exists public.payments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete set null,
  phone text,
  amount integer not null default 1990,  -- 单位：分，¥19.9
  status text default 'pending',         -- pending / paid / refunded
  trade_no text,
  paid_at timestamptz,
  created_at timestamptz default now()
);

-- 关闭 RLS（使用 service_role key 从 API 访问，无需 RLS）
alter table public.users disable row level security;
alter table public.analyses disable row level security;
alter table public.payments disable row level security;

-- 访问计数器表（全局报告数）
create table if not exists public.counter (
  id integer primary key default 1,
  count integer default 0,
  updated_at timestamptz default now()
);

-- 访问 IP 记录表（去重用）
create table if not exists public.visitor_ips (
  id bigserial primary key,
  ip text unique not null,
  visited_at timestamptz default now()
);

-- 关闭 RLS
alter table public.counter disable row level security;
alter table public.visitor_ips disable row level security;

-- 初始化计数器
insert into public.counter (id, count) values (1, 0) on conflict (id) do nothing;

-- 索引优化
create index if not exists idx_users_phone on public.users(phone);
create index if not exists idx_analyses_user_id on public.analyses(user_id);
create index if not exists idx_analyses_phone on public.analyses(phone);
create index if not exists idx_analyses_created_at on public.analyses(created_at desc);
create index if not exists idx_payments_user_id on public.payments(user_id);
create index if not exists idx_payments_created_at on public.payments(created_at desc);
create index if not exists idx_visitor_ips_ip on public.visitor_ips(ip);
