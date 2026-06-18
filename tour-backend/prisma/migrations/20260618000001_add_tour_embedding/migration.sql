-- Kích hoạt pgvector extension và thêm cột embedding cho semantic search.
-- Yêu cầu: Docker image phải là pgvector/pgvector:pg17 (thay postgres:17-bookworm).
CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE "Tour" ADD COLUMN "embedding" vector(1536);

-- Index HNSW cho cosine similarity search — tốt hơn IVFFlat cho catalog nhỏ/vừa.
-- Chỉ tạo sau khi đã có dữ liệu embedding (chạy backfill trước).
-- Nếu muốn tạo ngay: CREATE INDEX CONCURRENTLY tour_embedding_hnsw ON "Tour" USING hnsw (embedding vector_cosine_ops);
