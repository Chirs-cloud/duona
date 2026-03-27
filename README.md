# 多拿点 Duoduo Dian · 薪资谈判 AI 助手

> 别让 Offer 少拿几千块，就因为不敢开口。

![多拿点](https://img.shields.io/badge/多拿点-v1.0-8B5CF6)
![AI](https://img.shields.io/badge/AI-DeepSeek-7C3AED)
![部署](https://img.shields.io/badge/部署-Vercel-black)

---

## 🚀 快速部署（3分钟完成）

### 第一步：部署前端到 Vercel（2分钟）

1. **Fork 此项目** 到你的 GitHub
2. 打开 [vercel.com](https://vercel.com)，用 GitHub 登录
3. 点击 **Import Project**，选择你的 Fork
4. 点击 **Deploy**，完成！

> 免费版 Vercel 支持自定义域名（需自行购买，推荐阿里云/腾讯云）

### 第二步：配置 Supabase 后端（5分钟）

1. 注册 [Supabase](https://supabase.com)（免费账号够用）
2. 创建新项目，记下：
   - **Project URL**（设置 → API）
   - **anon public key**（设置 → API → Project API keys）
   - **service_role key**（同上，慎用，仅后端用）

3. 运行数据库 Schema：
   - Supabase 后台 → **SQL Editor**
   - 复制 `supabase/schema.sql` 内容，粘贴运行

4. 部署 Edge Function：
   ```bash
   # 安装 Supabase CLI
   npm install -g supabase

   # 登录
   supabase login

   # 初始化（首次）
   supabase init

   # 关联项目
   supabase link --project-ref <你的project-ref>

   # 部署 Edge Function
   supabase functions deploy analyze
   ```

5. 设置环境变量（Supabase → Project Settings → Edge Functions）：
   ```
   DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxx
   ```

### 第三步：更新前端配置

在 `index.html` 中找到以下配置，填入你的信息：

```javascript
// 约第 850 行附近
const CONFIG = {
  SUPABASE_URL: 'https://<your-project>.supabase.co',
  SUPABASE_ANON_KEY: '<your-anon-key>',
  EDGE_FUNCTION_URL: 'https://<your-project>.supabase.co/functions/v1/analyze'
};
```

### 第四步：配置支付

支付采用**微信赞赏码**模式（0成本，实时到账）：

1. 打开微信 → 我 → 服务 → 钱包 → 收付款 → 赞赏码
2. 保存赞赏码图片，上传到图床（推荐 imgurl.org）
3. 把图片 URL 填入 `index.html` 的 `WECHAT_QR_URL` 配置

---

## 📁 项目结构

```
duoduo-dian/
├── index.html              # 主页面（H5单文件）
├── vercel.json             # Vercel 部署配置
├── README.md               # 本文件
└── supabase/
    ├── schema.sql          # 数据库 Schema
    └── functions/
        └── analyze/
            └── index.ts   # Edge Function（AI分析API）
```

---

## 🔧 技术栈

| 层级 | 技术 | 成本 |
|------|------|------|
| 前端 | HTML + CSS + JS（原生） | ¥0 |
| 部署 | Vercel | 免费 |
| 后端 | Supabase Edge Functions | 免费（50万次/月） |
| 数据库 | Supabase PostgreSQL | 免费（500MB） |
| AI | DeepSeek API | ¥0（注册送额度） |
| 支付 | 微信赞赏码 | ¥0 |

---

## 💰 变现方案

### 当前：微信赞赏码（¥0门槛）
- 用户解锁完整版时显示赞赏码
- 用户扫码支付 ¥19.9
- 人工发送完整版链接（或自动邮件）

### 进阶：微信小商店
- 无需申请商户号，用个人微信即可
- 商品挂载「完整版解锁码」
- 自动发货（发送产品链接）

### 进阶：微信支付 Native
- 需要申请商户号（约¥0-300）
- 用户可直接在H5内支付
- 自动解锁功能

---

## 🎯 功能 Roadmap

- [x] v1.0 MVP：演示模式 + API Key 模式
- [x] v2.0：调研驱动 UI 重做
- [ ] v3.0：接入真实后端 + 支付
- [ ] v4.0：薪资数据库对比
- [ ] v5.0：微信小程序版本
- [ ] v6.0：多语言 / 英文版

---

## 📣 运营建议

### 小红书内容方向
1. 「我用这个工具谈薪资，多拿了3000块」—— 真实案例
2. 「HR说不能谈薪资？试试这三句话」—— 干货
3. 「薪资谈判话术模板，直接复制发给HR」—— 工具教程
4. 「谈薪资最蠢的4句话」—— 避坑内容

### 话题标签
`#薪资谈判` `#offer` `#求职` `#春招` `#秋招` `#职场干货` `#多拿点`

---

## ⚠️ 注意事项

1. **API Key 安全**：DeepSeek Key 必须放在 Supabase Edge Function 环境变量中，绝不要暴露在前端
2. **用户隐私**：收集用户数据前建议添加隐私政策页面
3. **内容合规**：AI生成内容仅供参考，不构成职业建议

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

**多拿点 Duoduo Dian · 帮你多拿点**
