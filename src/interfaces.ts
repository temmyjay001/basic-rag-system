export interface Document {
	id: string;
	title: string;
	content: string;
	url?: string;
	source?: string;
	timestamp?: number;
}

export interface DocumentChunk {
	id: string;
	documentId: string;
	content: string;
	metadata: {
		title: string;
		source?: string;
		url?: string;
		position?: number;
	};
}

export interface EmbeddedChunk extends DocumentChunk {
	embedding: number[];
}

export interface RetrievedChunk {
	chunk: DocumentChunk;
	score: number;
}

export interface RAGRequest {
	query: string;
	topK?: number;
}

export interface RAGResponse {
	query: string;
	answer: string;
	sourceChunks: RetrievedChunk[];
}
