import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: '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',
  baseURL: 'https://integrate.api.nvidia.com/v1',
})

 
async function main() {
  const completion = await openai.chat.completions.create({
    model: "nvidia/nemotron-3-super-120b-a12b",
    messages: [{"role":"user","content":""}],
    temperature: 1,
    top_p: 0.95,
    max_tokens: 16384,
    reasoning_budget: 16384,
    chat_template_kwargs: {"enable_thinking":true},
    stream: true
  })
   
  for await (const chunk of completion) {
        const reasoning = chunk.choices[0]?.delta?.reasoning_content;
    if (reasoning) process.stdout.write(reasoning);
        process.stdout.write(chunk.choices[0]?.delta?.content || '')
    
  }
  
}

main();