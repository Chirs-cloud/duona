# 多拿点 Supabase 后端 · 快速启动指南

## 🚀 当前状态

✅ Vercel 前端 + API 已部署：https://duoduo-dian.vercel.app
✅ 后台管理页已上线：https://duoduo-dian.vercel.app/admin
✅ 4 个 Vercel API 接口已就位
⏳ **待完成**：初始化 Supabase 数据库

---

## 📋 需要立即完成的 3 步

### 1️⃣ 初始化 Supabase 数据库

1. 登录 Supabase 控制台：https://app.supabase.com
2. 找到项目 `fouzvhufiasmcynadwtm`
3. 打开 **SQL Editor**（左侧菜单）
4. 新建 Query，复制下方的 SQL 脚本并执行：

```sql
-- =============================================
-- 多拿点 · Supabase 数据库 Schema v2
-- 手机号登录体系（不依赖 Supabase Auth）
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

-- 禁用 RLS（使用 service_role key 从 API 访问，无需 RLS）
alter table public.users disable row level security;
alter table public.analyses disable row level security;
alter table public.payments disable row level security;

-- 索引优化
create index if not exists idx_users_phone on public.users(phone);
create index if not exists idx_analyses_user_id on public.analyses(user_id);
create index if not exists idx_analyses_phone on public.analyses(phone);
create index if not exists idx_analyses_created_at on public.analyses(created_at desc);
create index if not exists idx_payments_user_id on public.payments(user_id);
create index if not exists idx_payments_created_at on public.payments(created_at desc);
```

5. ✅ 执行完成后应该看到绿色提示

---

### 2️⃣ 获取 service_role key（重要！）

1. 打开 Supabase Settings → **API** 标签
2. 找到 **service_role key**（长字符串，以 `eyJ...` 开头，**不是** anon key）
3. 复制这个 key
4. 更新 Vercel 环境变量：

```bash
cd duoduo-dian
echo "你复制的service_role_key" | npx vercel env add SUPABASE_SERVICE_KEY production --yes
npx vercel --prod --yes
```

5. ✅ 等待部署完成（2-3 分钟）

---

### 3️⃣ 测试系统

#### 测试前端登录 + 报告保存：
1. 打开 https://duoduo-dian.vercel.app
2. 点 👤 登录
3. 输入手机号（如 13800138000）
4. 图形验证码（点 🔄 看一遍，就会显示）
5. 点"获取验证码"
6. 输入验证码：**666666**（演示模式）
7. 点"验证并登录"
8. ✅ 应该登录成功，头像显示手机号后两位

#### 测试报告生成：
1. 填写表单（公司/岗位/城市/薪资等）
2. 点"生成谈判方案"
3. 等待 AI 生成报告（约 10-15 秒）
4. ✅ 看到报告和话术脚本
5. 点👤 进入个人中心，查看"历史报告"
6. ✅ 应该能看到刚生成的报告在列表里
7. 点击历史报告，应该能重新加载

#### 测试后台管理：
1. 打开 https://duoduo-dian.vercel.app/admin
2. 输入密码：**duoduo2026**
3. ✅ 应该能看到：
   - 📊 数据总览（用户数、报告数、付费用户）
   - 👥 用户列表（显示你刚才登录的手机号）
   - 📋 报告列表（显示你生成的报告）

---

## 🔑 关键凭证（保管好）

| 项目 | 值 | 备注 |
|------|-----|------|
| Supabase URL | https://fouzvhufiasmcynadwtm.supabase.co | 已配置 Vercel 环境变量 |
| Supabase anon key | eyJhbGciOiJIUzI1NiI... | 当前方案（前端可见） |
| Supabase service_role key | （需要从 Supabase 获取） | ⚠️ 需要立即更新到 Vercel |
| 后台管理密码 | duoduo2026 | 已配置 Vercel 环境变量，可在 admin.html 登录 |
| DeepSeek API Key | (已配置到 Vercel) | 用于 AI 分析报告 |

---

## 📊 架构图

```
┌─────────────────────────────────────────────────────────┐
│                     客户端浏览器                          │
│  https://duoduo-dian.vercel.app (index.html + admin.html) │
└──────────────────┬──────────────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
  ┌─────▼─────┐       ┌──────▼──────┐
  │  Vercel   │       │ Supabase    │
  │   API     │       │  Database   │
  │ /api/*    │◄─────►│  (PostgreSQL)│
  └───────────┘       └─────────────┘
        │                     
  /api/login              ┌─ users 表
  /api/save-report    ──►─┼─ analyses 表
  /api/reports            └─ payments 表
  /api/admin
        │
  ┌─────▼─────┐
  │ DeepSeek  │
  │   API     │
  └───────────┘
```

---

## 🐛 常见问题

### Q1: 登录后按 F12 报错 "Cannot read property 'id' of null"
**A**：说明登录没有完全成功，检查：
- 验证码是否正确？
- 查看 Supabase Table Editor 的 `users` 表，看有没有新记录

### Q2: 生成报告后，历史报告还是 0
**A**：检查：
1. 登录状态是否保持？（刷新后头像消失？）
2. Supabase `analyses` 表有没有新记录？
3. 浏览器控制台有没有错误？

### Q3: 后台管理页打不开
**A**：
- 确认 URL 是 `/admin` 而不是其他
- 如果 vercel.json 没配置 `/admin` 路由，可能需要重新部署
- 当前 vercel.json 已配置好了

### Q4: 后台管理密码忘了
**A**：
- 默认密码：`duoduo2026`
- 可以在 Vercel Settings → Environment Variables 中看到（需要管理员权限）

---

## 🚀 下一步优化

1. **支付集成**：接入微信支付/支付宝（目前只有演示升级提示）
2. **数据导出**：后台支持导出用户/报告数据为 CSV
3. **邮件通知**：用户升级后发送邮件确认
4. **SEO 优化**：配置 robots.txt、sitemap 等
5. **监控告警**：接入 Sentry，监控 API 错误

---

## 📞 支持

遇到问题？检查：
1. 浏览器控制台 (F12) 的错误信息
2. Vercel Logs：https://vercel.com/chirs/duoduo-dian/logs
3. Supabase SQL Editor 检查表是否创建成功

**版本更新时间**：2026-03-30
