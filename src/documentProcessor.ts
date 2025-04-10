import { Document, DocumentChunk, EmbeddedChunk } from './interfaces';

export class DocumentProcessor {
	private readonly ai: Ai;

	constructor(ai: Ai) {
		this.ai = ai;
	}

	/**
	 * Split a document into chunks of approximately equal size
	 */
	public chunkDocument(document: Document, chunkSize: number = 500, chunkOverlap: number = 100): DocumentChunk[] {
		const content = document.content;
		const chunks: DocumentChunk[] = [];

		// Simple chunking by character count
		if (content.length <= chunkSize) {
			chunks.push({
				id: `${document.id}-chunk-0`,
				documentId: document.id,
				content: content,
				metadata: {
					title: document.title,
					source: document.source,
					url: document.url,
					position: 0,
				},
			});
		} else {
			let chunkIndex = 0;
			for (let i = 0; i < content.length; i += chunkSize - chunkOverlap) {
				const chunkContent = content.slice(i, i + chunkSize);
				// Avoid tiny chunks at the end
				if (chunkContent.length >= Math.min(100, chunkSize / 5)) {
					chunks.push({
						id: `${document.id}-chunk-${chunkIndex}`,
						documentId: document.id,
						content: chunkContent,
						metadata: {
							title: document.title,
							source: document.source,
							url: document.url,
							position: chunkIndex,
						},
					});
					chunkIndex++;
				}
			}
		}

		return chunks;
	}

	/**
	 * Generate embeddings for document chunks
	 */
	public async generateEmbeddings(chunks: DocumentChunk[]): Promise<EmbeddedChunk[]> {
		const embeddedChunks: EmbeddedChunk[] = [];

		// Process chunks in batches to avoid overloading the API
		const batchSize = 10;
		for (let i = 0; i < chunks.length; i += batchSize) {
			const batch = chunks.slice(i, i + batchSize);
			const texts = batch.map((chunk) => chunk.content);

			// Generate embeddings using Cloudflare AI
			const embeddings = await this.ai.run('@cf/baai/bge-base-en-v1.5', {
				text: texts,
			});

			// Combine the chunks with their embeddings
			for (let j = 0; j < batch.length; j++) {
				embeddedChunks.push({
					...batch[j],
					embedding: embeddings.data[j],
				});
			}
		}

		return embeddedChunks;
	}
}
