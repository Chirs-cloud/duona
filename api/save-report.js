// @ts-nocheck
// 保存分析报告 API
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: '只支持 POST' });

  const { user_id, phone, form_data, result } = req.body || {};
  if (!user_id || !phone) return res.status(400).json({ error: '用户信息不能为空' });

  try {
    // 检查使用次数（非付费用户限制 2 次/月）
    const { data: user, error: userErr } = await supabase
      .from('users')
      .select('*')
      .eq('id', user_id)
      .single();

    if (userErr || !user) return res.status(404).json({ error: '用户不存在' });

    if (!user.is_paid && user.usage_count >= 2) {
      return res.status(403).json({ error: '免费次数已用完', need_upgrade: true });
    }

    // 保存报告
    const { data: analysis, error: insertErr } = await supabase
      .from('analyses')
      .insert({
        user_id,
        phone,
        company: form_data?.company || '',
        position: form_data?.position || '',
        city: form_data?.city || '',
        salary: parseInt(form_data?.salary) || 0,
        form_data,
        result,
      })
      .select()
      .single();

    if (insertErr) throw insertErr;

    // 更新使用次数
    await supabase
      .from('users')
      .update({
        usage_count: user.usage_count + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', user_id);

    return res.status(200).json({
      success: true,
      analysis_id: analysis.id,
      usage_count: user.usage_count + 1,
    });
  } catch (e) {
    console.error('save-report error:', e);
    return res.status(500).json({ error: e.message || '保存失败' });
  }
};
