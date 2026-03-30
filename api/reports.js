// @ts-nocheck
// 获取用户历史报告 API
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: '只支持 GET' });

  const { user_id } = req.query;
  if (!user_id) return res.status(400).json({ error: 'user_id 不能为空' });

  try {
    const { data: analyses, error } = await supabase
      .from('analyses')
      .select('id, company, position, city, salary, result, created_at')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    return res.status(200).json({ success: true, data: analyses || [] });
  } catch (e) {
    console.error('reports error:', e);
    return res.status(500).json({ error: e.message || '获取失败' });
  }
};
