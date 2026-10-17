# MovieMatch — JavaScript Demo

A simple Movie Recommendation System built to understand **Vector Embeddings, Semantic Search, and Cosine Similarity** using the Google Gemini API.

Instead of asking an LLM to recommend movies, this project converts movie descriptions into vector embeddings, compares them mathematically using cosine similarity, and ranks the results to find relevant movies.

## Features

- **Semantic Movie Search:** Search for movies using natural-language queries like *"I want a survival movie set in space"*, even when the exact words do not appear in the movie description.
- **Similar Movie Recommendations:** Select a movie like *Interstellar* and discover other movies with similar meanings based on their embeddings.

## How It Works

1. Movie descriptions are loaded from a JSON file containing dummy movie data.
2. The Google Gemini Embeddings API converts movie descriptions into numerical vectors.
3. A natural-language search query is converted into a vector using the same embedding model.
4. Cosine similarity measures how closely the vectors match.
5. Results are ranked by similarity, and the most relevant movies are returned.

```text
Movie Descriptions
        ↓
Gemini Embeddings
        ↓
Cosine Similarity
        ↓
Ranking
        ↓
Movie Recommendations
```

## Tech Stack

- **Backend:** Node.js
- **Frontend:** HTML, CSS, JavaScript
- **Embedding Model:** Google Gemini API
- **Data Storage:** JSON file containing dummy movie data

**No database is used.** This project uses a JSON file for learning purposes.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/)
- A [Google Gemini API key](https://aistudio.google.com/apikey)

### 1. Clone the Repository

### 2. Navigate to the Project Directory

### 3. Install Dependencies

```bash
npm install
```

### 4. Configure Environment Variables

Create a `.env` file inside the `src` directory and add your Gemini API key:

```env
Gemini_API_KEY=your_gemini_api_key
```

Replace `your_gemini_api_key` with your actual API key.

**Keep your API key private. Never commit your `.env` file to GitHub.**

### 5. Run the Application

```bash
npm start
```

Open the application in your browser:

[http://localhost:8080](http://localhost:8080)

## Learning Objective

This project demonstrates how vector embeddings can power semantic search and recommendation systems without requiring an LLM for every recommendation request.

The same concepts can be applied to product recommendations, document search, course discovery, job search, and Retrieval-Augmented Generation (RAG).