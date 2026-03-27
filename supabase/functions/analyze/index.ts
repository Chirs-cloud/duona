// Supabase Edge Function: 多拿点薪资谈判分析
// 部署到: supabase/functions/analyze

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// DeepSeek API 调用
async function callDeepSeek(userData: any): Promise<any> {
  const apiKey = Deno.env.get('DEEPSEEK_API_KEY')
  if (!apiKey) {
    throw new Error('DeepSeek API Key 未配置')
  }

  const prompt = buildPrompt(userData)

  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 2000,
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`DeepSeek API 错误: ${err}`)
  }

  const json = await response.json()
  const content = json.choices[0].message.content

  // 解析 JSON 返回
  try {
    return JSON.parse(content.replace(/```json\n?|```\n?/g, '').trim())
  } catch {
    throw new Error('AI 返回格式异常，请重试')
  }
}

// 构建分析提示词
function buildPrompt(data: any): string {
  return `你是一位专业的求职薪资谈判顾问。请根据以下信息，分析该候选人的薪资谈判空间，并给出具体建议。

用户信息：
- 目标公司：${data.company || '未填写'}
- 岗位：${data.position || '未填写'}
- 城市：${data.city || '未填写'}
- 学历：${data.edu || '本科'}
- 工作年限：${data.exp || '应届生'}
- 当前Offer月薪：¥${data.salary || 0}
- 期望薪资：¥${data.target || 0}
- 薪资结构：${(data.structure || []).join('、')}
- 个人优势：${(data.adv || []).join('、') || '无'}
- 个人顾虑：${(data.concern || []).join('、') || '无'}
- 当前进展：${data.stage || '口头Offer'}
- HR态度：${data.hrmood || '正常'}
- 补充说明：${data.note || '无'}

请用JSON格式返回，包含：
{
  "score": 谈判力评分(0-100整数),
  "scoreLevel": "high/mid/low",
  "scoreTitle": "一句话结论",
  "scoreDesc": "详细说明",
  "marketMin": 市场最低薪资(数字),
  "marketMid": 市场中位数薪资(数字),
  "marketMax": 市场最高薪资(数字),
  "suggestTarget": 建议谈判目标薪资(数字),
  "ratio": 当前Offer与市场中位数比值(小数),
  "assessmentType": "warn/ok/great",
  "assessment": 评估说明文字,
  "scripts": [
    {
      "icon": "💪",
      "name": "方案名",
      "tag": "reco/safe/res",
      "tagTxt": "标签文字",
      "body": "话术正文（纯文本，用\\n换行）"
    }
  ],
  "tips": [
    {
      "icon": "⏰",
      "title": "标题",
      "desc": "说明内容"
    }
  ]
}

只返回JSON，不要任何额外文字。`
}

Deno.serve(async (req) => {
  // CORS 预检
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { data, userId, isPaid } = await req.json()

    if (!data || !data.company || !data.position || !data.city || !data.salary) {
      return new Response(
        JSON.stringify({ error: '缺少必填字段' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 调用 DeepSeek
    const result = await callDeepSeek(data)

    // 如果有用户ID，记录到数据库
    if (userId) {
      try {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        await supabase.from('analyses').insert({
          user_id: userId,
          company: data.company,
          position: data.position,
          city: data.city,
          salary: data.salary,
          result: result,
          is_paid: isPaid || false,
        })
      } catch (e) {
        console.error('数据库记录失败:', e)
      }
    }

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('分析失败:', error)
    return new Response(
      JSON.stringify({ error: error.message || '分析失败，请重试' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
