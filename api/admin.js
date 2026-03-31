// @ts-nocheck
// 后台统计数据 API（需要管理员密码）
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const ADMIN_PASSWORD = 'duoduo2026';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: '只支持 GET' });

  // 验证管理员密码
  const auth = req.headers['authorization'] || '';
  const token = auth.replace('Bearer ', '');
  if (token !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: '无权限' });
  }

  try {
    const { type } = req.query;

    if (type === 'overview') {
      // 总览数据
      const [usersRes, analysesRes, paidRes] = await Promise.all([
        supabase.from('users').select('id', { count: 'exact', head: true }),
        supabase.from('analyses').select('id', { count: 'exact', head: true }),
        supabase.from('users').select('id', { count: 'exact', head: true }).eq('is_paid', true),
      ]);

      // 今日新增
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const [todayUsersRes, todayAnalysesRes] = await Promise.all([
        supabase.from('users').select('id', { count: 'exact', head: true }).gte('created_at', todayStart.toISOString()),
        supabase.from('analyses').select('id', { count: 'exact', head: true }).gte('created_at', todayStart.toISOString()),
      ]);

      return res.status(200).json({
        total_users: usersRes.count || 0,
        total_analyses: analysesRes.count || 0,
        paid_users: paidRes.count || 0,
        today_users: todayUsersRes.count || 0,
        today_analyses: todayAnalysesRes.count || 0,
        revenue: (paidRes.count || 0) * 19.9,
      });
    }

    if (type === 'users') {
      // 用户列表
      const page = parseInt(req.query.page) || 0;
      const { data, error } = await supabase
        .from('users')
        .select('id, phone, is_paid, usage_count, created_at, paid_at')
        .order('created_at', { ascending: false })
        .range(page * 20, page * 20 + 19);
      if (error) throw error;
      return res.status(200).json({ data: data || [] });
    }

    if (type === 'analyses') {
      // 报告列表
      const page = parseInt(req.query.page) || 0;
      const { data, error } = await supabase
        .from('analyses')
        .select('id, phone, company, position, city, salary, created_at')
        .order('created_at', { ascending: false })
        .range(page * 20, page * 20 + 19);
      if (error) throw error;
      return res.status(200).json({ data: data || [] });
    }

    if (type === 'set_paid') {
      // 设置用户为付费（手动）
      if (req.method !== 'GET') return res.status(405).end();
      const { user_id } = req.query;
      if (!user_id) return res.status(400).json({ error: 'user_id 不能为空' });
      const { error } = await supabase
        .from('users')
        .update({ is_paid: true, paid_at: new Date().toISOString() })
        .eq('id', user_id);
      if (error) throw error;
      return res.status(200).json({ success: true });
    }

    if (type === 'analysis_detail') {
      // 获取单个报告详情
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'id 不能为空' });
      const { data, error } = await supabase
        .from('analyses')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      if (!data) return res.status(404).json({ error: '报告不存在' });
      return res.status(200).json({ data });
    }

    return res.status(400).json({ error: '未知的 type 参数' });
  } catch (e) {
    console.error('admin error:', e);
    return res.status(500).json({ error: e.message || '服务器错误' });
  }
};
