const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function handleDice(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const url = new URL(request.url);
  const path = url.pathname.toLowerCase();

  if (path === '/api/dice') {
    const params = url.searchParams;
    let sides = parseInt(params.get('sides'), 10) || 6;
    let count = parseInt(params.get('count'), 10) || 1;
    const mode = (params.get('mode') || '').toLowerCase();

    sides = Math.min(Math.max(sides, 2), 1000);
    count = Math.min(Math.max(count, 1), 1000);

    const rolls = [];
    for (let i = 0; i < count; i++) rolls.push(rollDice(sides));

    const total = rolls.reduce((a, b) => a + b, 0);
    const emojis = toDiceEmojis(rolls, sides);

    return jsonResponse({
      sides,
      count,
      rolls,
      total,
      ...(mode === 'stats' ? { mode: 'stats' } : {}),
      stats: buildStats(rolls, sides),
      message: `${sides}面のサイコロを${count}個振って、結果は ${rolls.join(', ')}、合計は ${total} だよ！`,
      ...(emojis ? { emoji: emojis } : {}),
    });
  }

  if (path === '/help/api/dice') {
    return jsonResponse({
      name: 'サイコロAPI',
      endpoint: '/api/dice',
      description: '指定された面数と個数でサイコロを振り、その結果をJSONで返します。',
      parameters: {
        sides: '2〜1000：サイコロの面数（省略時は6）',
        count: '1〜1000：振る個数（省略時は1）',
        mode: 'stats：統計情報を見やすく表示（省略可）',
      },
      example: '/api/dice?sides=12&count=2',
      note: '面数や個数が範囲外の場合、自動的に調整されます。',
    });
  }

  return jsonResponse(
    {
      error: '❌ このAPIエンドポイントは存在しません。',
      help: '/help/api/dice',
      message: '利用可能なエンドポイントは /api/dice または /help/api/dice を確認してください。',
    },
    404,
  );
}

function rollDice(sides) {
  const buffer = new Uint32Array(1);
  crypto.getRandomValues(buffer);
  return (buffer[0] % sides) + 1;
}

function toDiceEmoji(value, sides) {
  if (sides <= 6 && value >= 1 && value <= 6) return ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'][value - 1];
  return '';
}

function toDiceEmojis(rolls, sides) {
  if (sides > 6) return '';
  return rolls.map((value) => toDiceEmoji(value, sides)).filter(Boolean).join(',');
}

function buildStats(rolls, sides) {
  const total = rolls.reduce((a, b) => a + b, 0);
  const average = total / rolls.length;
  const min = Math.min(...rolls);
  const max = Math.max(...rolls);
  const variance = rolls.reduce((sum, value) => sum + (value - average) ** 2, 0) / rolls.length;
  const standardDeviation = Math.sqrt(variance);
  const counts = {};
  const rates = {};

  for (let face = 1; face <= sides; face++) counts[face] = 0;
  for (const value of rolls) counts[value] += 1;
  for (let face = 1; face <= sides; face++) rates[face] = Number(((counts[face] / rolls.length) * 100).toFixed(2));

  return {
    average: Number(average.toFixed(4)),
    min,
    max,
    variance: Number(variance.toFixed(6)),
    standard_deviation: Number(standardDeviation.toFixed(6)),
    counts,
    rates_percent: rates,
  };
}

function jsonResponse(data, status = 200) {
  const now = new Date();
  return new Response(
    JSON.stringify(
      {
        ...data,
        timestamp_utc: now.toISOString(),
        timestamp_jst: now.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
        timestamp_unix: now.getTime(),
      },
      null,
      2,
    ),
    {
      status,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        ...CORS_HEADERS,
      },
    },
  );
}
