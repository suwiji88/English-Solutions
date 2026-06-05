exports.handler = async (event) => {
  try {
    const { prompt, category } = JSON.parse(event.body);

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: category },
          { role: "user", content: prompt }
        ],
      }),
    });

    const data = await response.json();

    // If Groq returned an error (bad key, bad model, etc.), surface it clearly
    if (!response.ok || !data.choices) {
      return {
        statusCode: 502,
        body: JSON.stringify({ error: data.error?.message || "Groq request failed" })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ result: data.choices[0].message.content })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
