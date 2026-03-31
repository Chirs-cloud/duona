// @ts-nocheck
module.exports = async function handler(req, res) {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: '未配置 Supabase' });
  }

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET：只读展示，不累加
  if (req.method === 'GET') {
    try {
      const getRes = await fetch(`${SUPABASE_URL}/rest/v1/counter?id=eq.1&select=count`, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
        },
      });
      let count = 1883; // 默认兜底
      if (getRes.ok) {
        const data = await getRes.json();
        if (data && data[0] && data[0].count !== undefined) {
          count = parseInt(data[0].count, 10) || 1883;
        }
      }
      return res.status(200).json({ count });
    } catch (e) {
      return res.status(200).json({ count: 1883, error: e.message });
    }
  }

  // POST：累加计数器（只生成报告时调用）
  if (req.method === 'POST') {
    // 重置功能
    const resetVal = req.query.reset;
    if (resetVal) {
      const newCount = parseInt(resetVal, 10);
      await fetch(`${SUPABASE_URL}/rest/v1/counter?id=eq.1`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({ count: newCount }),
      });
      await fetch(`${SUPABASE_URL}/rest/v1/visitor_ips`, {
        method: 'DELETE',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
        },
      });
      return res.status(200).json({ ok: true, count: newCount });
    }

    // 累加 +1
    try {
      const getRes = await fetch(`${SUPABASE_URL}/rest/v1/counter?id=eq.1&select=count`, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
        },
      });
      let count = 1883;
      if (getRes.ok) {
        const data = await getRes.json();
        if (data && data[0] && data[0].count !== undefined) {
          count = parseInt(data[0].count, 10) || 1883;
        }
      }
      const newCount = count + 1;
      await fetch(`${SUPABASE_URL}/rest/v1/counter?id=eq.1`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({ count: newCount }),
      });
      return res.status(200).json({ count: newCount });
    } catch (e) {
      return res.status(200).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: '不支持的请求方法' });
};
