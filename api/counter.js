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

  if (req.method === 'GET') {
    // 获取真实 IP（Vercel serverless 用 x-vercel-forwarded-for）
    const vercelIp = req.headers['x-vercel-forwarded-for'];
    const ip = vercelIp
      ? vercelIp.split(',')[0].trim()
      : (
          req.headers['x-forwarded-for'] ||
          req.headers['x-real-ip'] ||
          req.socket?.remoteAddress ||
          '127.0.0.1'
        ).split(',')[0].trim();

    try {
      // 先尝试查询 counter 表
      let count = 0;
      const getRes = await fetch(`${SUPABASE_URL}/rest/v1/counter?id=eq.1&select=count`, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
        },
      });
      if (getRes.ok) {
        const data = await getRes.json();
        if (data && data[0] && data[0].count !== undefined) {
          count = parseInt(data[0].count, 10) || 0;
        }
      }

      // 检查此 IP 是否已记录（查 visitor_ips 表）
      const ipCheckRes = await fetch(
        `${SUPABASE_URL}/rest/v1/visitor_ips?ip=eq.${encodeURIComponent(ip)}&select=ip`,
        {
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      let alreadyCounted = false;
      if (ipCheckRes.ok) {
        const ipData = await ipCheckRes.json();
        alreadyCounted = ipData && ipData.length > 0;
      }

      // 如果是新 IP，累加并记录
      if (!alreadyCounted) {
        // 插入 IP 记录
        await fetch(`${SUPABASE_URL}/rest/v1/visitor_ips`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({ ip }),
        });

        // 更新计数器（upsert）
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

        count = newCount;
      }

      return res.status(200).json({ count, alreadyCounted });
    } catch (e) {
      return res.status(200).json({ count: 0, alreadyCounted: false, error: e.message });
    }
  }

  if (req.method === 'POST') {
    // 重置计数器（仅管理员用，URL 带 ?reset=1883）
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
      // 清空IP记录
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
  }

  return res.status(405).json({ error: '不支持的请求方法' });
};
