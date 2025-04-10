import { DocumentProcessor } from './documentProcessor';
import { VectorStore } from './vectorStore';
import { RAGGenerator } from './ragGenerator';
import { RAGResponse } from '../interfaces';

export class RAGService {
	private readonly documentProcessor: DocumentProcessor;
	private readonly vectorStore: VectorStore;
	private readonly ragGenerator: RAGGenerator;

	constructor(ai: Ai, vectorize: VectorizeIndex) {
		this.documentProcessor = new DocumentProcessor(ai);
		this.vectorStore = new VectorStore(vectorize, ai);
		this.ragGenerator = new RAGGenerator(ai);
	}

	/**
	 * Process a PDF file - extract text, chunk, embed, and store
	 */
	public async processPDF(pdfData: ArrayBuffer, filename: string): Promise<{ documentId: string; chunkCount: number }> {
		// Process the PDF file
		const document = await this.documentProcessor.processPDF(pdfData, filename);

		// Chunk the document
		const chunks = this.documentProcessor.chunkDocument(document);

		// Generate embeddings
		const embeddedChunks = await this.documentProcessor.generateEmbeddings(chunks);

		// Store in vector database
		await this.vectorStore.storeChunks(embeddedChunks);

		return {
			documentId: document.id,
			chunkCount: chunks.length,
		};
	}

	/**
	 * Generate a response for a query
	 */
	public async generateResponse(query: string, topK: number = 3): Promise<RAGResponse> {
		// Step 1: Retrieve relevant chunks
		const retrievedChunks = await this.vectorStore.queryChunks(query, topK);

		// Step 2: Generate response
		const answer = await this.ragGenerator.generateResponse(query, retrievedChunks);

		// Prepare and return response
		return {
			query,
			answer,
			sourceChunks: retrievedChunks,
		};
	}

	/**
	 * Get statistics about the stored documents
	 */
	public async getStats(): Promise<{ vectorCount: number }> {
		const stats = await this.vectorStore.getStats();
		return stats;
	}
}
