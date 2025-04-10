# PDF RAG System

A production-ready Retrieval-Augmented Generation (RAG) system for PDF documents, built with Hono, Cloudflare Workers, and Vectorize.

<p align="center">
  <img src="https://img.shields.io/badge/typescript-%5E5.5.2-blue" alt="TypeScript ^5.5.2">
  <img src="https://img.shields.io/badge/hono-%5E4.2.10-blue" alt="Hono ^4.2.10">
  <img src="https://img.shields.io/badge/cloudflare-workers-orange" alt="Cloudflare Workers">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="License MIT">
</p>

## Overview

This system allows users to upload PDF documents, ask questions about their content, and receive AI-generated answers based on the most relevant sections of the documents. It leverages:

- **PDF Text Extraction**: Extract text from PDF files using unpdf
- **Advanced Chunking**: Process text with paragraph-based chunking for natural language preservation
- **Vector Embeddings**: Transform text into semantic vector representations
- **Similarity Search**: Find the most relevant chunks for user questions
- **LLM-powered Answers**: Generate concise, contextual answers using Cloudflare's LLaMA 3

## 📋 Table of Contents

- [Features](#features)
- [System Architecture](#system-architecture)
- [Setup and Deployment](#setup-and-deployment)
- [API Reference](#api-reference)
- [Web Interface](#web-interface)
- [Implementation Details](#implementation-details)
- [Chunking Strategies](#chunking-strategies)
- [Performance Optimization](#performance-optimization)
- [Troubleshooting](#troubleshooting)
- [Future Improvements](#future-improvements)
- [License](#license)

## ✨ Features

- **PDF Document Processing**: Upload and process PDF files for information retrieval
- **Intelligent Chunking**: Paragraph-based chunking preserves natural language structures
- **Vector Similarity Search**: Find the most relevant document sections using cosine similarity
- **Contextual AI Responses**: Generate answers using retrieved context
- **Modern Web Interface**: Clean, responsive UI with tabbed navigation
- **API Endpoints**: Structured API for programmatic access
- **Cloudflare Edge Deployment**: Fast, globally-distributed performance

## 🏗️ System Architecture

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│  Web Client │◄────►│ Hono Router │◄────►│  RAG Service│
└─────────────┘      └─────────────┘      └──────┬──────┘
                                                 │
                      ┌──────────────────────────┼──────────────────────────┐
                      │                          │                          │
                 ┌────▼─────┐              ┌─────▼────┐              ┌──────▼─────┐
                 │ Document │              │  Vector  │              │    RAG     │
                 │Processor │              │  Store   │              │ Generator  │
                 └──────────┘              └──────────┘              └────────────┘
                      │                          │                          │
                      │                          │                          │
                ┌─────▼─────┐             ┌──────▼─────┐            ┌──────▼─────┐
                │   unpdf   │             │ Cloudflare │            │ Cloudflare │
                │(PDF Parser)│             │ Vectorize  │            │    AI      │
                └───────────┘             └────────────┘            └────────────┘
```

The system is built using a service-oriented architecture with clear separation of concerns:

- **Hono Router**: Provides API routing, middleware support, and request handling
- **RAG Service**: Coordinates the overall RAG workflow
- **Document Processor**: Handles PDF extraction and chunking
- **Vector Store**: Manages vector operations and similarity search
- **RAG Generator**: Creates AI responses based on retrieved content

## 🚀 Setup and Deployment

### Prerequisites

- Node.js 18+ and npm
- Cloudflare account
- Wrangler CLI

### Step 1: Clone and install dependencies

```bash
# Create a new project
mkdir pdf-rag-system
cd pdf-rag-system

# Initialize npm package
npm init -y

# Install dependencies
npm install hono unpdf
npm install --save-dev @cloudflare/workers-types typescript wrangler

# Initialize TypeScript configuration
npx tsc --init

# Initialize Wrangler
npx wrangler init
```

### Step 2: Login to Cloudflare

```bash
npx wrangler login
```

### Step 3: Create the Vectorize index

```bash
# Create a vector index with cosine similarity metric
npx wrangler vectorize create pdf-documents-index \
  --dimensions=768 \
  --metric=cosine
```

### Step 4: Configure your project

Update your `wrangler.jsonc` file with the following configurations:

```jsonc
{
  "name": "pdf-rag-system",
  "main": "src/index.ts",
  "compatibility_date": "2025-03-20",
  "compatibility_flags": ["nodejs_compat"],
  "ai": {
    "binding": "AI"
  },
  "vectorize": [
    {
      "binding": "DOCUMENTS_INDEX",
      "index_name": "pdf-documents-index",
      "dimensions": 768
    }
  ]
}
```

### Step 5: Create project structure

Set up your directory structure:

```bash
mkdir -p src/services src/routes src/html
```

### Step 6: Copy source code

Copy the source code files into their respective directories:

- `src/index.ts`: Main application entry point
- `src/interfaces.ts`: TypeScript interfaces
- `src/index.html`: Web interface HTML
- `src/routes/api.ts`: API route handlers
- `src/services/ragService.ts`: Main RAG business logic
- `src/services/documentProcessor.ts`: PDF processing logic
- `src/services/vectorStore.ts`: Vector database operations
- `src/services/ragGenerator.ts`: Answer generation

### Step 7: Deploy

```bash
# Deploy to Cloudflare Workers
npx wrangler deploy
```

### Step 8: Verify deployment

Your application will be available at:

```
https://pdf-rag-system.<your-worker-subdomain>.workers.dev
```

## 📡 API Reference

### PDF Ingestion Endpoint

`POST /api/ingest-pdf`

Upload and process a PDF document.

**Request:**

- Content-Type: `multipart/form-data`
- Body: Form with a `file` field containing the PDF

**Response:**

```json
{
  "success": true,
  "message": "Processed PDF: filename.pdf",
  "documentId": "filename-pdf",
  "chunkCount": 12
}
```

**cURL Example:**

```bash
curl -X POST https://your-worker.workers.dev/api/ingest-pdf \
  -F "file=@document.pdf"
```

### Query Endpoint

`POST /api/query`

Query the system with a natural language question.

**Request:**

- Content-Type: `application/json`
- Body:

```json
{
  "query": "What is the main conclusion in the document?",
  "topK": 3
}
```

**Response:**

```json
{
  "query": "What is the main conclusion in the document?",
  "answer": "The main conclusion is that implementing proper text chunking strategies significantly improves RAG system performance...",
  "sourceChunks": [
    {
      "chunk": {
        "id": "document-id-chunk-7",
        "documentId": "document-id",
        "content": "...",
        "metadata": { ... }
      },
      "score": 0.92
    },
    ...
  ]
}
```

**cURL Example:**

```bash
curl -X POST https://your-worker.workers.dev/api/query \
  -H "Content-Type: application/json" \
  -d '{"query": "What is the main conclusion in the document?", "topK": 3}'
```

### Statistics Endpoint

`GET /api/stats`

Get system statistics.

**Response:**

```json
{
  "vectorCount": 156,
  "documentCount": 5
}
```

**cURL Example:**

```bash
curl https://your-worker.workers.dev/api/stats
```

## 🖥️ Web Interface

The system provides a modern, responsive web interface with three main sections:

1. **Upload PDF**: For document ingestion
2. **Ask Questions**: For querying the system
3. **About**: Information about the RAG system

The interface is automatically served at the root URL of your worker.

## 🔍 Implementation Details

### PDF Processing

PDF text extraction is handled using the `unpdf` library:

```typescript
public async extractTextFromPDF(pdfData: ArrayBuffer): Promise<string> {
  const result = await extractText(new Uint8Array(pdfData), { mergePages: true });
  
  // Ensure textContent is a string
  const textContent = Array.isArray(result.text)
    ? result.text.join(" ")
    : result.text;
    
  return textContent || '';
}
```

### Vector Embedding and Retrieval

We use Cloudflare AI's embedding model and Vectorize for similarity search:

```typescript
// Generate embeddings
const embeddings = await this.ai.run('@cf/baai/bge-base-en-v1.5', {
  text: texts,
});

// Query for similar vectors using cosine similarity (default in Vectorize)
const results = await this.vectorize.query(embedding.data[0], {
  topK: topK,
  returnMetadata: true,
});
```

### Answer Generation

The system generates answers using retrieved context:

```typescript
const prompt = `
You are a helpful assistant that provides accurate information based on the given context.
Answer the following question based ONLY on the provided context. If the context doesn't
contain relevant information to answer the question, admit that you don't know.

CONTEXT:
${context}

QUESTION:
${query}

ANSWER:`;

const response = await this.ai.run('@cf/meta/llama-3-8b-instruct', {
  prompt: prompt,
  max_tokens: 500,
});
```

## 📊 Chunking Strategies

The system implements advanced chunking strategies to preserve natural language structures and improve retrieval quality.

### Paragraph-Based Chunking (Default)

```typescript
public chunkDocumentByParagraphs(document: Document, maxChunkSize: number = 1500): DocumentChunk[] {
  // Split content into paragraphs
  const paragraphs = document.content
    .split(/\n\s*\n|\r\n\s*\r\n/)
    .map(p => p.trim())
    .filter(p => p.length > 0);
  
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
```

This approach:

- Respects natural paragraph boundaries
- Preserves complete words and sentences
- Maintains document structure
- Avoids cutting words in half

### Sentence-Based Chunking (Alternative)

For more granular control, especially for documents with very long paragraphs:

```typescript
public chunkDocumentBySentences(document: Document, maxChunkSize: number = 1000): DocumentChunk[] {
  // Split content into sentences
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
```

This approach:

- Preserves complete sentences
- Creates overlap between chunks for context continuity
- Works well for documents with long paragraphs

## ⚡ Performance Optimization

### Vector Index Configuration

For optimal vector search performance, configure your Vectorize index with appropriate parameters:

```bash
# Create index with performance optimizations
npx wrangler vectorize create pdf-documents-index \
  --dimensions=768 \
  --metric=cosine \
  --preset=product_quantization
```

The `--metric=cosine` parameter explicitly sets cosine similarity as the distance metric, which is ideal for text embeddings. The `--preset=product_quantization` option enables more efficient storage and retrieval for larger indices.

### Batch Processing

For processing large documents or multiple PDFs, use batch processing:

```typescript
// Process chunks in batches
const batchSize = 10;
for (let i = 0; i < chunks.length; i += batchSize) {
  const batch = chunks.slice(i, i + batchSize);
  // Process batch...
}
```

### Caching

Implement caching for query results:

```typescript
// Add to your Hono application
app.use('/api/query', cache({
  cacheName: 'query-cache',
  cacheControl: 'max-age=3600',
  vary: ['Content-Type']
}));
```

### Chunking Optimization

Adjust chunking parameters for different document types:

- **Academic Papers**: Use paragraph-based, `maxChunkSize = 1000`
- **Legal Documents**: Use sentence-based, higher overlap
- **Technical Documentation**: Use section-based chunking

## 🔧 Troubleshooting

### Common Issues

**Error: "Failed to extract text from PDF"**

- Ensure the PDF is not password-protected
- Check if the PDF contains actual text (not just scanned images)
- Try a different PDF file to verify the system works

**Error: "No vectors found for query"**

- Make sure you've uploaded at least one document
- Check that the document was processed successfully
- Try a query that's more closely related to the document content

**Deployment Issues**

- Ensure you have the correct permissions for your Cloudflare account
- Verify your wrangler.jsonc has the correct bindings and configurations
- Check that Vectorize is available in your Cloudflare region

**Memory Limitations**

- If processing large PDFs fails, try increasing the Worker memory limit or splitting the processing
- Use the `--test-scheduled` flag with Wrangler for extended CPU time during testing

### Debugging

Add diagnostic logging to your code:

```typescript
// Add to your error handler
app.onError((err, c) => {
  console.error(`[ERROR] ${err.name}: ${err.message}`);
  console.error(`Stack: ${err.stack}`);
  return c.json({ error: 'Internal server error', message: err.message, status: 500 }, 500);
});
```

View logs with Wrangler:

```bash
npx wrangler tail
```

## 🌟 Future Improvements

- **Multi-document search**: Query across all uploaded documents
- **Document management**: Delete or update documents
- **Enhanced PDF processing**: Extract images, tables, and structure
- **User authentication**: Secure access to documents
- **Custom embedding models**: Support for domain-specific embeddings
- **Advanced chunking options**: Different chunking strategies for different document types
- **Multilingual support**: Process and query documents in multiple languages
- **Caching**: Implement caching for frequently queried content
- **Monitoring**: Add telemetry for system performance and usage

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Acknowledgements

- Cloudflare for their Workers, Vectorize, and AI platforms
- Hono for the excellent web framework
- The unpdf team for PDF text extraction capabilities
