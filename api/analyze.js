module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, category, budget, marketplace } = req.body || {};
  if (!name?.trim()) return res.status(400).json({ error: 'Введи название товара' });

  const prompt = `Ты — эксперт по аналитике маркетплейсов Wildberries, Ozon и Яндекс.Маркет.
Товар: "${name}"
Категория: ${category || 'не указана'}
Бюджет: ${budget ? budget + ' ₽' : 'не указан'}
Маркетплейс: ${marketplace}

Верни ТОЛЬКО JSON без markdown:
{
  "product": "название",
  "overall_score": 0-100,
  "scores": { "demand": 0-100, "competition": 0-100, "margin": 0-60 },
  "revenue_estimate": { "monthly_min": "число", "monthly_max": "число", "payback": "срок" },
  "pros": ["5 пунктов"],
  "cons": ["4 пункта"],
  "tips": ["3 совета"],
  "conclusion": "2-3 предложения"
}
Реалистично, на русском. Если товар бессмысленный — поставь overall_score ниже 20 и напиши об этом в conclusion.`;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: 'ANTHROPIC_API_KEY не настроен. Добавь ключ в Vercel → Settings → Environment Variables и сделай Redeploy.'
    });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1200,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    const text = data.content?.map(b => b.text || '').join('') || '';
    const clean = text.replace(/```json|```/g, '').trim();
    const result = JSON.parse(clean);
    return res.status(200).json(result);
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Ошибка AI' });
  }
};
