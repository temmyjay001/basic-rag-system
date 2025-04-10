import { Document, DocumentChunk, EmbeddedChunk } from '../interfaces';
import { extractText } from 'unpdf';

export class DocumentProcessor {
	private readonly ai: Ai;

	constructor(ai: Ai) {
		this.ai = ai;
	}

	/**
	 * Extract text from a PDF file using unpdf
	 */
	public async extractTextFromPDF(pdfData: ArrayBuffer): Promise<string> {
		try {
			// Use unpdf to extract text from the PDF
			const result = await extractText(new Uint8Array(pdfData), { mergePages: true });

			// Ensure textContent is a string
			const textContent = Array.isArray(result.text) ? result.text.join(' ') : result.text;

			return textContent || '';
		} catch (error) {
			console.error('Error extracting text from PDF:', error);
			throw new Error('Failed to extract text from PDF. The document may be corrupted or password-protected.');
		}
	}

	/**
	 * Process a PDF file and create a document
	 */
	public async processPDF(pdfData: ArrayBuffer, filename: string): Promise<Document> {
		// Extract text from PDF
		const content = await this.extractTextFromPDF(pdfData);

		// Create a document ID from filename
		const id = filename.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();

		// Create a document from the extracted text
		return {
			id,
			title: filename,
			content,
			source: 'PDF Upload',
			timestamp: Date.now(),
		};
	}

	/**
	 * Split a document into chunks by paragraphs with appropriate size limits
	 */
	public chunkDocumentByParagraphs(document: Document, maxChunkSize: number = 1500): DocumentChunk[] {
		// Split content into paragraphs (handling various newline patterns)
		const paragraphs = document.content
			.split(/\n\s*\n|\r\n\s*\r\n/)
			.map((p) => p.trim())
			.filter((p) => p.length > 0);

		const chunks: DocumentChunk[] = [];
		let currentChunk = '';
		let currentChunkId = 0;

		for (const paragraph of paragraphs) {
			// If adding this paragraph would exceed the max size, create a new chunk
			if (currentChunk.length + paragraph.length > maxChunkSize && currentChunk.length > 0) {
				chunks.push({
					id: `${document.id}-chunk-${currentChunkId}`,
					documentId: document.id,
					content: currentChunk,
					metadata: {
						title: document.title,
						source: document.source,
						url: document.url,
						position: currentChunkId,
					},
				});
				currentChunkId++;
				currentChunk = '';
			}

			// Add paragraph with a separator if needed
			if (currentChunk.length > 0) {
				currentChunk += '\n\n';
			}
			currentChunk += paragraph;
		}

		// Add the last chunk if it's not empty
		if (currentChunk.length > 0) {
			chunks.push({
				id: `${document.id}-chunk-${currentChunkId}`,
				documentId: document.id,
				content: currentChunk,
				metadata: {
					title: document.title,
					source: document.source,
					url: document.url,
					position: currentChunkId,
				},
			});
		}

		return chunks;
	}

	/**
	 * Split a document into chunks by sentences with overlap
	 */
	public chunkDocumentBySentences(document: Document, maxChunkSize: number = 1000): DocumentChunk[] {
		// Split content into sentences using a regex that respects punctuation
		const sentenceRegex = /(?<=[.!?])\s+(?=[A-Z])/g;
		const sentences = document.content.split(sentenceRegex);

		const chunks: DocumentChunk[] = [];
		let currentChunk = '';
		let currentChunkId = 0;
		let sentencesInChunk: string[] = [];

		for (const sentence of sentences) {
			// Skip empty sentences
			if (!sentence.trim()) continue;

			// If adding this sentence would exceed the max size, create a new chunk
			if (currentChunk.length + sentence.length > maxChunkSize && currentChunk.length > 0) {
				chunks.push({
					id: `${document.id}-chunk-${currentChunkId}`,
					documentId: document.id,
					content: currentChunk,
					metadata: {
						title: document.title,
						source: document.source,
						url: document.url,
						position: currentChunkId,
					},
				});
				currentChunkId++;

				// Create overlap by keeping the last 2 sentences (if available)
				const overlapSize = Math.min(2, sentencesInChunk.length);
				const overlapSentences = sentencesInChunk.slice(-overlapSize);
				currentChunk = overlapSentences.join(' ');
				sentencesInChunk = [...overlapSentences];
			} else {
				// Add a space if needed
				if (currentChunk.length > 0 && !currentChunk.endsWith(' ')) {
					currentChunk += ' ';
				}
				currentChunk += sentence;
				sentencesInChunk.push(sentence);
			}
		}

		// Add the last chunk if it's not empty
		if (currentChunk.length > 0) {
			chunks.push({
				id: `${document.id}-chunk-${currentChunkId}`,
				documentId: document.id,
				content: currentChunk,
				metadata: {
					title: document.title,
					source: document.source,
					url: document.url,
					position: currentChunkId,
				},
			});
		}

		return chunks;
	}

	/**
	 * Default chunking method - uses paragraph-based chunking
	 */
	public chunkDocument(document: Document, chunkSize: number = 1500): DocumentChunk[] {
		return this.chunkDocumentByParagraphs(document, chunkSize);
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
