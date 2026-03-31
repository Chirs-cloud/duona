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

  // 获取真实IP
  const getClientIP = () => {
    const forwarded = req.headers['x-vercel-forwarded-for'];
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    return req.headers['x-real-ip'] || 'unknown';
  };

  // 重置功能（POST ?reset=1883）
  if (req.method === 'POST' && req.query.reset !== undefined) {
    const newCount = parseInt(req.query.reset, 10);
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

  // GET：新IP自动累加（页面加载时调用）
  if (req.method === 'GET') {
    const ip = getClientIP();
    
    try {
      // 1. 检查IP是否已访问过
      const checkRes = await fetch(`${SUPABASE_URL}/rest/v1/visitor_ips?ip=eq.${ip}&select=ip`, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
        },
      });
      const existingIP = await checkRes.json();
      
      let count = 1883;
      
      if (!existingIP || existingIP.length === 0) {
        // 新IP：累加计数器 + 记录IP
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
            count = parseInt(data[0].count, 10) || 1883;
          }
        }
        
        const newCount = count + 1;
        
        // 更新计数器
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
        
        // 记录IP
        await fetch(`${SUPABASE_URL}/rest/v1/visitor_ips`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({ ip: ip }),
        });
        
        count = newCount;
      } else {
        // 老IP：只获取当前计数
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
            count = parseInt(data[0].count, 10) || 1883;
          }
        }
      }
      
      return res.status(200).json({ count, isNew: !existingIP || existingIP.length === 0 });
    } catch (e) {
      return res.status(200).json({ count: 1883, error: e.message });
    }
  }

  // POST：手动累加（生成报告时调用，可选）
  if (req.method === 'POST') {
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
