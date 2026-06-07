export default async function handler(req, res) {
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
Реалистично, на русском.`;

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    const h = name.length;
    const base = 40 + (h % 35);
    return res.status(200).json({
      demo: true,
      product: name,
      overall_score: base + 15,
      scores: { demand: base + 20, competition: 70 - (h % 25), margin: 18 + (h % 20) },
      revenue_estimate: {
        monthly_min: String(15000 + h * 800),
        monthly_max: String(60000 + h * 2000),
        payback: budget ? '2-4 месяца' : '3-5 месяцев'
      },
      pros: [
        'Стабильный спрос в категории на WB и Ozon',
        'Возможность выделиться за счёт упаковки и карточки',
        'Хороший потенциал для внутренней рекламы',
        'Сезонные пики дают рост продаж',
        'Низкий порог входа для тестовой партии'
      ],
      cons: [
        'Высокая конкуренция по цене',
        'Комиссии маркетплейса съедают маржу',
        'Риск возвратов при слабом качестве',
        'Нужны инвестиции в отзывы и контент'
      ],
      tips: [
        'Протестируй 2-3 SKU с минимальной партией',
        'Сделай A/B тест главного фото и заголовка',
        'Заложи 15-20% бюджета на внутреннюю рекламу'
      ],
      conclusion: `«${name}» — перспективная ниша при грамотной карточке и контроле юнит-экономики. Начни с тестовой партии и отслеживай CTR и конверсию первые 2 недели.`
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
}
