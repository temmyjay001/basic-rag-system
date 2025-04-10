import { DocumentChunk, EmbeddedChunk, RetrievedChunk } from './interfaces';

export class VectorStore {
	private readonly vectorize: VectorizeIndex;
	private readonly ai: Ai;

	constructor(vectorize: VectorizeIndex, ai: Ai) {
		this.vectorize = vectorize;
		this.ai = ai;
	}

	/**
	 * Store documents and their embeddings in Vectorize
	 */
	public async storeChunks(embeddedChunks: EmbeddedChunk[]): Promise<void> {
		// Insert chunks in batches
		const batchSize = 100;
		for (let i = 0; i < embeddedChunks.length; i += batchSize) {
			const batch = embeddedChunks.slice(i, i + batchSize);

			await this.vectorize.upsert(
				batch.map((chunk) => ({
					id: chunk.id,
					values: chunk.embedding,
					metadata: {
						documentId: chunk.documentId,
						content: chunk.content,
						title: chunk.metadata.title,
						source: chunk.metadata.source || '',
						url: chunk.metadata.url || '',
						position: chunk.metadata.position || 0,
					},
				}))
			);
		}
	}

	/**
	 * Retrieve relevant chunks based on query similarity
	 */
	public async queryChunks(query: string, topK: number = 3): Promise<RetrievedChunk[]> {
		// Generate embedding for the query
		const embedding = await this.ai.run('@cf/baai/bge-base-en-v1.5', {
			text: [query],
		});

		// Search for similar vectors
		const results = await this.vectorize.query(embedding.data[0], {
			topK: topK,
			returnMetadata: true,
		});

		// Convert results to RetrievedChunk format
		return results.matches.map((match) => ({
			chunk: {
				id: match.id,
				documentId: (match.metadata?.documentId as string) ?? '',
				content: (match.metadata?.content as string) ?? '',
				metadata: {
					title: (match.metadata?.title as string) ?? '',
					source: (match.metadata?.source as string) ?? '',
					url: (match.metadata?.url as string) ?? '',
					position: (match.metadata?.position as number) ?? 0,
				},
			},
			score: match.score,
		}));
	}
}
