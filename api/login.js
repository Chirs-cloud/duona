// @ts-nocheck
// 用户登录/注册 API（手机号 + 验证码）
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

  const { phone, code } = req.body || {};
  if (!phone || !code) return res.status(400).json({ error: '手机号和验证码不能为空' });

  // 演示模式：验证码 666666 直接通过
  if (code !== '666666') {
    return res.status(400).json({ error: '验证码错误' });
  }

  try {
    // 查找已有用户
    let { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('phone', phone)
      .single();

    if (error && error.code === 'PGRST116') {
      // 用户不存在，自动注册
      const { data: newUser, error: insertErr } = await supabase
        .from('users')
        .insert({ phone })
        .select()
        .single();
      if (insertErr) throw insertErr;
      user = newUser;
    } else if (error) {
      throw error;
    }

    // 检查月度使用次数是否需要重置
    const today = new Date().toISOString().slice(0, 10);
    const resetAt = user.usage_reset_at || '';
    const needReset = resetAt.slice(0, 7) !== today.slice(0, 7); // 不同月份则重置

    if (needReset) {
      const { data: updated } = await supabase
        .from('users')
        .update({ usage_count: 0, usage_reset_at: today, updated_at: new Date().toISOString() })
        .eq('id', user.id)
        .select()
        .single();
      if (updated) user = updated;
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        phone: user.phone,
        is_paid: user.is_paid,
        usage_count: needReset ? 0 : user.usage_count,
        free_limit: 2,
      }
    });
  } catch (e) {
    console.error('login error:', e);
    return res.status(500).json({ error: e.message || '服务器错误' });
  }
};
