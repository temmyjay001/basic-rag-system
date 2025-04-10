import { RetrievedChunk } from '../interfaces';

export class RAGGenerator {
	private readonly ai: Ai;

	constructor(ai: Ai) {
		this.ai = ai;
	}

	/**
	 * Generate a response using the LLM and retrieved chunks
	 */
	public async generateResponse(query: string, retrievedChunks: RetrievedChunk[]): Promise<string> {
		// Build context from retrieved chunks
		const context = retrievedChunks.map((item) => item.chunk.content).join('\n\n');

		// Create the prompt
		const prompt = `
You are a helpful assistant that provides accurate information based on the given context.
Answer the following question based ONLY on the provided context. If the context doesn't
contain relevant information to answer the question, admit that you don't know rather than making up information.

CONTEXT:
${context}

QUESTION:
${query}

ANSWER:`;

		// Generate response using Cloudflare AI
		const response: any = await this.ai.run('@cf/meta/llama-3-8b-instruct', {
			prompt: prompt,
			max_tokens: 500,
		});

		return response.response;
	}
}
