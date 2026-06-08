module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, category, budget, marketplace } = req.body || {};

  if (!name?.trim()) {
    return res.status(400).json({ error: 'Введи название товара' });
  }

  const prompt = `Ты — эксперт по аналитике маркетплейсов.

Товар: "${name}"
Категория: ${category || 'не указана'}
Бюджет: ${budget ? budget + ' ₽' : 'не указан'}
Маркетплейс: ${marketplace || 'не указан'}

Верни ТОЛЬКО JSON:

{
  "product": "название",
  "overall_score": 0,
  "scores": {
    "demand": 0,
    "competition": 0,
    "margin": 0
  },
  "revenue_estimate": {
    "monthly_min": "0",
    "monthly_max": "0",
    "payback": "0"
  },
  "pros": [],
  "cons": [],
  "tips": [],
  "conclusion": ""
}`;

  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return res.status(503).json({
      error: 'GROQ_API_KEY не настроен'
    });
  }

  try {
    const response = await fetch(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    const text = data.choices?.[0]?.message?.content || '';

    const clean = text
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();

    const result = JSON.parse(clean);

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
};
