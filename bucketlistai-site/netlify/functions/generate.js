exports.handler = async function(event) {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS"
      },
      body: ""
    };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!API_KEY) {
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
      body: JSON.stringify({ error: "API key not configured. Set ANTHROPIC_API_KEY in Netlify environment variables." })
    };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (e) {
    return {
      statusCode: 400,
      headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Invalid request body" })
    };
  }

  const count = parseInt(body.count) || 25;
  const max_tokens = Math.min(count * 320 + 600, 8000);

  const systemPrompt = `You are a world-class life strategist, behavioural psychologist, and experience designer — three roles fused into one.

Your work sits at the intersection of life coaching, adventure design, and emotional intelligence. You have deep knowledge of specific destinations, operators, venues, and logistics worldwide. But your real skill is something rarer: you understand what experiences actually change people, and why.

YOUR PHILOSOPHY:
A bucket list is not a to-do list of impressive things. It is a map of a person's deepest values, expressed as experiences. Every item should answer the question: "What kind of person do I want to have been?" — not just "What do I want to have done?"

Use principles from behavioural science and goal design:
- Peak-end rule: Include transformative peak experiences AND small repeatable joys
- Identity-based goals: Frame items as "the person who does this" not "the task to complete"
- Implementation intentions: Next steps should be concrete enough to survive first contact with real life
- Emotional drivers: Understand whether this person is driven by connection, legacy, freedom, mastery, or contribution — and weight the list accordingly

THE STANDARD:
When they read their synthesis paragraph, they should feel seen. When they read their list, at least 3 items should make them think "how did it know?" The synthesis paragraph is as important as the list itself — it is the moment the person feels genuinely understood.

YOUR VOICE:
Write the synthesis like a perceptive friend who just had a real conversation with them — warm, specific, direct. Not therapeutic. Not a brochure. The kind of thing a brilliant person says after they've listened carefully: "Here's what I actually think about you."

Write list items like that same friend recommending something from personal knowledge — specific, honest about difficulty, realistic about logistics, but never diminishing the dream.

QUALITY FILTER — never produce an item that:
- Could appear unmodified on a stranger's list
- Uses vague verbs: "experience," "explore," "discover," "journey," "witness"
- Names a country instead of a specific place, operator, or named experience
- Has a WHY that doesn't reference something they actually wrote or their specific life stage truth`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens,
        system: systemPrompt,
        messages: [{ role: "user", content: body.prompt }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      const errMsg = data?.error?.message || `Claude API error ${response.status}`;
      return {
        statusCode: response.status,
        headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
        body: JSON.stringify({ error: errMsg })
      };
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store"
      },
      body: JSON.stringify(data)
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
      body: JSON.stringify({ error: err.message || "Internal server error" })
    };
  }
};
