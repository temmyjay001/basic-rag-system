import { Hono } from 'hono';
import { RAGService } from '../services/ragService';
import { RAGRequest } from '../interfaces';

// Define environment bindings
interface Env {
	AI: Ai;
	DOCUMENTS_INDEX: VectorizeIndex;
}

// Create API router
export const apiRouter = new Hono<{ Bindings: Env }>();

// PDF ingestion endpoint
apiRouter.post('/ingest-pdf', async (c) => {
	try {
		// Parse the form data
		const formData = await c.req.formData();
		const file = formData.get('file') as File | null;

		if (!file) {
			return c.json({ success: false, error: 'No file uploaded' }, 400);
		}

		// Check if it's a PDF
		if (!file.name.toLowerCase().endsWith('.pdf')) {
			return c.json({ success: false, error: 'Only PDF files are supported' }, 400);
		}

		// Read the file data
		const fileArrayBuffer = await file.arrayBuffer();

		// Initialize RAG service
		const ragService = new RAGService(c.env.AI, c.env.DOCUMENTS_INDEX);

		// Process the PDF
		const result = await ragService.processPDF(fileArrayBuffer, file.name);

		// Return success response
		return c.json({
			success: true,
			message: `Processed PDF: ${file.name}`,
			documentId: result.documentId,
			chunkCount: result.chunkCount,
		});
	} catch (error: any) {
		console.error('Error processing PDF:', error);
		return c.json(
			{
				success: false,
				error: error.message || 'An error occurred while processing the PDF',
			},
			500
		);
	}
});

// Query endpoint
apiRouter.post('/query', async (c) => {
	try {
		// Parse the request body
		const { query, topK = 3 } = await c.req.json<RAGRequest>();

		if (!query || typeof query !== 'string') {
			return c.json({ success: false, error: 'Query is required' }, 400);
		}

		// Initialize RAG service
		const ragService = new RAGService(c.env.AI, c.env.DOCUMENTS_INDEX);

		// Process the query
		const response = await ragService.generateResponse(query, topK);

		// Return the response
		return c.json(response);
	} catch (error: any) {
		console.error('Error processing query:', error);
		return c.json(
			{
				success: false,
				error: error.message || 'An error occurred while processing the query',
			},
			500
		);
	}
});

// Get document statistics
apiRouter.get('/stats', async (c) => {
	try {
		// Initialize RAG service
		const ragService = new RAGService(c.env.AI, c.env.DOCUMENTS_INDEX);

		// Get stats
		const stats = await ragService.getStats();

		return c.json(stats);
	} catch (error: any) {
		console.error('Error getting stats:', error);
		return c.json(
			{
				success: false,
				error: error.message || 'An error occurred while getting stats',
			},
			500
		);
	}
});
