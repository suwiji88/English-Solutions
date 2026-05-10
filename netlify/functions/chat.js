exports.handler = async (event) => {
  const { prompt, category } = JSON.parse(event.body);
  
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.VITE_GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: "llama3-8b-8192",
      messages: [
        { role: "system", content: category },
        { role: "user", content: prompt }
      ],
    }),
  });
  
  const data = await response.json();
  
  return {
    statusCode: 200,
    body: JSON.stringify({ result: data.choices[0].message.content })
  };
};
