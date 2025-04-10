import { Document, RAGRequest, RAGResponse } from './interfaces';
import { DocumentProcessor } from './documentProcessor';
import { VectorStore } from './vectorStore';
import { RAGGenerator } from './ragGenerator';

interface Env {
	AI: Ai;
	DOCUMENTS_INDEX: VectorizeIndex;
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		// Initialize our components
		const documentProcessor = new DocumentProcessor(env.AI);
		const vectorStore = new VectorStore(env.DOCUMENTS_INDEX, env.AI);
		const ragGenerator = new RAGGenerator(env.AI);

		// Handle different routes
		const url = new URL(request.url);
		const path = url.pathname;

		// CORS headers
		const corsHeaders = {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type',
		};

		// Handle CORS preflight requests
		if (request.method === 'OPTIONS') {
			return new Response(null, {
				headers: corsHeaders,
			});
		}

		try {
			// Route for ingesting documents
			if (path === '/api/ingest' && request.method === 'POST') {
				const data = (await request.json()) as Document[];

				// Process each document: chunk and embed
				for (const document of data) {
					// Step 1: Chunk the document
					const chunks = documentProcessor.chunkDocument(document);

					// Step 2: Generate embeddings
					const embeddedChunks = await documentProcessor.generateEmbeddings(chunks);

					// Step 3: Store in vector database
					await vectorStore.storeChunks(embeddedChunks);
				}

				return new Response(
					JSON.stringify({
						success: true,
						message: `Processed ${data.length} documents`,
					}),
					{
						headers: {
							'Content-Type': 'application/json',
							...corsHeaders,
						},
					}
				);
			}

			// Route for RAG queries
			if (path === '/api/query' && request.method === 'POST') {
				const { query, topK = 3 } = (await request.json()) as RAGRequest;

				// Step 1: Retrieve relevant chunks
				const retrievedChunks = await vectorStore.queryChunks(query, topK);

				// Step 2: Generate response
				const answer = await ragGenerator.generateResponse(query, retrievedChunks);

				// Prepare and return response
				const response: RAGResponse = {
					query,
					answer,
					sourceChunks: retrievedChunks,
				};

				return new Response(JSON.stringify(response), {
					headers: {
						'Content-Type': 'application/json',
						...corsHeaders,
					},
				});
			}

			// Default route - show simple HTML interface
			return new Response(
				`
        <!DOCTYPE html>
        <html>
          <head>
            <title>RAG System</title>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { font-family: sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
              .panel { border: 1px solid #ddd; padding: 20px; margin-bottom: 20px; border-radius: 5px; }
              textarea, input, button { width: 100%; padding: 10px; margin-bottom: 10px; box-sizing: border-box; }
              button { background: #0070f3; color: white; border: none; border-radius: 5px; cursor: pointer; }
              pre { background: #f5f5f5; padding: 10px; border-radius: 5px; overflow-x: auto; }
            </style>
          </head>
          <body>
            <h1>RAG System Demo</h1>
            
            <div class="panel">
              <h2>Ingest Documents</h2>
              <textarea id="documents" rows="10" placeholder='[{"id": "doc1", "title": "Example", "content": "This is an example document."}]'></textarea>
              <button id="ingestBtn">Ingest Documents</button>
              <pre id="ingestResult"></pre>
            </div>
            
            <div class="panel">
              <h2>Query</h2>
              <input id="query" type="text" placeholder="Enter your question here...">
              <button id="queryBtn">Ask Question</button>
              <div id="answer"></div>
              <h3>Sources:</h3>
              <div id="sources"></div>
            </div>
            
            <script>
              document.getElementById('ingestBtn').addEventListener('click', async () => {
			  console.log('Ingesting documents...', {document: document.getElementById('documents').value});
                const documents = JSON.parse(document.getElementById('documents').value);
                const response = await fetch('/api/ingest', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(documents)
                });
                const result = await response.json();
                document.getElementById('ingestResult').textContent = JSON.stringify(result, null, 2);
              });
              
              document.getElementById('queryBtn').addEventListener('click', async () => {
                const query = document.getElementById('query').value;
                const response = await fetch('/api/query', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ query })
                });
                const result = await response.json();
                document.getElementById('answer').innerHTML = '<p><strong>Answer:</strong></p><p>' + result.answer + '</p>';
                
                const sourcesHtml = result.sourceChunks.map((source, i) => 
                  \`<div style="margin-bottom: 10px; padding: 10px; background: #f9f9f9; border-radius: 5px;">
                    <p><strong>Source \${i+1}</strong> (Score: \${source.score.toFixed(2)})</p>
                    <p>\${source.chunk.metadata.title}</p>
                    <p>\${source.chunk.content}</p>
                  </div>\`
                ).join('');
                document.getElementById('sources').innerHTML = sourcesHtml;
              });
            </script>
          </body>
        </html>
      `,
				{
					headers: {
						'Content-Type': 'text/html',
						...corsHeaders,
					},
				}
			);
		} catch (error: any) {
			return new Response(
				JSON.stringify({
					success: false,
					error: error.message,
				}),
				{
					status: 500,
					headers: {
						'Content-Type': 'application/json',
						...corsHeaders,
					},
				}
			);
		}
	},
};
