# MovieMatch — JavaScript Demo

Semantic movie search and similar-movie recommendations built on vector embeddings.
This is a standalone Node.js port of the Spring Boot `springDemo`: it has **no Java,
no Maven and no Spring dependencies**, and the project no longer reads anything from
`springDemo`.

Embeddings come from the **Google Gemini Embeddings API** through the official
[`@google/genai`](https://www.npmjs.com/package/@google/genai) SDK.

## How it works

1. `src/resources/movies.json` holds the demo catalog (title + description).
2. On startup every description is turned into a vector with
   `gemini-embedding-001` (**3072 dimensions**).
3. A natural-language query is embedded with the same model.
4. Every vector is compared against every movie vector with **cosine similarity**,
   the matches are sorted by score and the **top 3** are returned.
5. "Similar movies" compares the selected movie's stored vector against the rest —
   no extra API call is needed for that endpoint.

Movie embeddings are cached in memory and, on first run, persisted to
`src/resources/movie-embeddings.json`. Restarting the server reuses that file
instead of regenerating all 30 vectors (startup drops from roughly a minute to
well under a second). Delete the file to force a rebuild.

The cache is stamped with the provider and model name. If you switch provider or
model, the old vectors are **discarded automatically** rather than being compared
against vectors of a different size.

## Requirements

- Node.js **20.12 or newer** (uses the built-in `fetch` and `process.loadEnvFile`)
- A Google Gemini API key

## Configuration

Copy the template and fill in your key:

```bash
cd jsDemo/src
copy .env.example .env      # Windows
# cp .env.example .env      # macOS / Linux
```

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `Gemini_API_KEY` | yes | – | Gemini API key, read **server side only** |
| `GEMINI_EMBEDDING_MODEL` | no | `gemini-embedding-001` | Embedding model |
| `PORT` | no | `8080` | HTTP port |
| `EMBEDDING_CACHE_FILE` | no | `src/resources/movie-embeddings.json` | Embedding cache location |

The key is loaded from `src/.env` at startup and is **never** sent to the browser.

> If you change `GEMINI_EMBEDDING_MODEL`, delete
> `src/resources/movie-embeddings.json` (or just restart — the mismatch is
> detected and the vectors are regenerated for you).

## Run it

```bash
cd jsDemo
npm install
npm start
```

Then open <http://localhost:8080>.

## HTTP API

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/` | The single-page frontend |
| `GET` | `/movies/search?query=...` | Top 3 movies by meaning |
| `GET` | `/movies/{title}/similar` | Top 3 movies closest to `{title}` |

Both endpoints return:

```json
[
  {
    "title": "The Martian",
    "description": "An astronaut stranded on Mars uses science and ingenuity to survive until rescue.",
    "match": 0.8238796408713406
  }
]
```

`match` is the cosine similarity (higher is a better match). A missing movie title
returns `404`; a missing `query` returns `400`.

## Layout

```
jsDemo/
├── package.json
├── package-lock.json
├── .gitignore
└── src/
    ├── .env                  # local secrets, git-ignored
    ├── .env.example
    ├── server.js             # HTTP server + static file serving
    ├── DemoApplication.js    # wires the embedding model into the service
    ├── MovieController.js
    ├── MovieService.js       # cosine similarity, ranking, top-K
    ├── model/
    │   ├── Movie.js
    │   ├── MovieData.js
    │   ├── MovieMatch.js
    │   └── GeminiEmbeddingModel.js
    ├── resources/
    │   ├── movies.json
    │   └── movie-embeddings.json   # generated cache, git-ignored
    └── public/
        └── index.html
```