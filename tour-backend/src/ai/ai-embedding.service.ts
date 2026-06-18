import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import OpenAI from 'openai';
import { PrismaService } from '../prisma/prisma.service';

// Cosine distance threshold: 0 = identical, 2 = opposite. < 0.65 ≈ similarity > 0.675.
const SIMILARITY_THRESHOLD = 0.65;
const EMBEDDING_MODEL_DEFAULT = 'text-embedding-3-small';
const BATCH_DELAY_MS = 120; // Delay giữa các batch để tránh rate-limit OpenAI Embeddings tier.

type TourForEmbed = {
  id: number;
  name: string;
  tourType: string;
  description: string;
  departurePoint: string | null;
  destination: { name: string; region: string | null } | null;
  highlights: { content: string }[];
};

type SemanticTourRow = {
  id: number;
  name: string;
  price: number;
  duration: string;
  startDate: Date;
  availableSeats: number;
  imageUrl: string | null;
  averageRating: number;
  tourType: string;
  departurePoint: string | null;
  destinationName: string | null;
  region: string | null;
};

@Injectable()
export class AiEmbeddingService {
  private readonly logger = new Logger(AiEmbeddingService.name);
  private readonly client: OpenAI;
  private readonly model: string;

  private readonly enabled: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    // Embeddings dùng API key riêng biệt với chat (thường là direct OpenAI).
    // EMBEDDING_API_KEY → fallback AI_API_KEY; EMBEDDING_BASE_URL → OpenAI default.
    const apiKey =
      this.configService.get<string>('EMBEDDING_API_KEY') ||
      this.configService.get<string>('AI_API_KEY') ||
      '';
    const baseURL = this.configService.get<string>('EMBEDDING_BASE_URL') || undefined;
    this.model =
      this.configService.get<string>('EMBEDDING_MODEL') || EMBEDDING_MODEL_DEFAULT;

    if (!apiKey) {
      this.enabled = false;
      this.client = null as unknown as OpenAI;
      this.logger.warn('[Embedding] Disabled — set EMBEDDING_API_KEY to enable semantic search.');
      return;
    }

    this.enabled = true;
    this.client = new OpenAI({ apiKey, ...(baseURL && { baseURL }) });
    this.logger.log(`[Embedding] model=${this.model} baseURL=${baseURL || 'openai-default'}`);
  }

  buildEmbeddingText(tour: TourForEmbed): string {
    return [
      tour.name,
      `Loại tour: ${tour.tourType}`,
      tour.destination ? `Điểm đến: ${tour.destination.name}` : null,
      tour.destination?.region ? `Khu vực: ${tour.destination.region}` : null,
      tour.departurePoint ? `Khởi hành từ: ${tour.departurePoint}` : null,
      tour.description.substring(0, 500),
      tour.highlights.length > 0
        ? `Điểm nổi bật: ${tour.highlights.map((h) => h.content).join('. ')}`
        : null,
    ]
      .filter(Boolean)
      .join('. ');
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    const response = await this.client.embeddings.create({
      model: this.model,
      input: text,
    });
    return response.data[0].embedding;
  }

  async embedTour(tourId: number): Promise<void> {
    if (!this.enabled) return;
    const tour = await this.prisma.tour.findFirst({
      where: { id: tourId, deletedAt: null },
      select: {
        id: true,
        name: true,
        tourType: true,
        description: true,
        departurePoint: true,
        destination: { select: { name: true, region: true } },
        highlights: { select: { content: true }, orderBy: { sortOrder: 'asc' }, take: 5 },
      },
    });
    if (!tour) return;

    const text = this.buildEmbeddingText(tour);
    const vector = await this.generateEmbedding(text);
    const vectorLiteral = Prisma.raw(`'[${vector.join(',')}]'::vector`);

    await this.prisma.$executeRaw(
      Prisma.sql`UPDATE "Tour" SET embedding = ${vectorLiteral} WHERE id = ${tourId}`,
    );
    this.logger.log(`[Embedding] Embedded tour id=${tourId}`);
  }

  // Fire-and-forget: không block caller, lỗi chỉ được log.
  embedTourAsync(tourId: number): void {
    void this.embedTour(tourId).catch((err: unknown) => {
      this.logger.error(
        `[Embedding] Failed to embed tour id=${tourId}: ${err instanceof Error ? err.message : String(err)}`,
      );
    });
  }

  async backfillPublished(): Promise<{ total: number; done: number; failed: number }> {
    if (!this.enabled) return { total: 0, done: 0, failed: 0 };
    const tours = await this.prisma.$queryRaw<{ id: number }[]>(Prisma.sql`
      SELECT id FROM "Tour"
      WHERE status = 'PUBLISHED'
        AND "deletedAt" IS NULL
        AND embedding IS NULL
      ORDER BY id
    `);

    let done = 0;
    let failed = 0;
    for (const { id } of tours) {
      try {
        await this.embedTour(id);
        done++;
        if (done % 10 === 0) {
          await new Promise((r) => setTimeout(r, BATCH_DELAY_MS * 10));
        } else {
          await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
        }
      } catch (err: unknown) {
        failed++;
        this.logger.error(
          `[Embedding] Backfill failed tour id=${id}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    this.logger.log(`[Embedding] Backfill done: total=${tours.length} done=${done} failed=${failed}`);
    return { total: tours.length, done, failed };
  }

  async semanticSearch(
    query: string,
    minSeats: number = 1,
  ): Promise<SemanticTourRow[]> {
    if (!this.enabled) return [];
    let queryVector: number[];
    try {
      queryVector = await this.generateEmbedding(query);
    } catch (err: unknown) {
      this.logger.warn(
        `[Embedding] Semantic search skipped — embedding generation failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return [];
    }

    const vectorLiteral = Prisma.raw(`'[${queryVector.join(',')}]'::vector`);
    const minSeatsParam = minSeats > 0 ? minSeats : 1;

    const rows = await this.prisma.$queryRaw<SemanticTourRow[]>(Prisma.sql`
      SELECT
        t.id,
        t.name,
        t.price,
        t.duration,
        t."startDate",
        t."availableSeats",
        t."imageUrl",
        t."averageRating",
        t."tourType",
        t."departurePoint",
        d.name AS "destinationName",
        d.region
      FROM "Tour" t
      LEFT JOIN "Destination" d ON t."destinationId" = d.id
      WHERE t."deletedAt" IS NULL
        AND t.status = 'PUBLISHED'
        AND t."availableSeats" >= ${minSeatsParam}
        AND t.embedding IS NOT NULL
        AND t.embedding <=> ${vectorLiteral} < ${SIMILARITY_THRESHOLD}
      ORDER BY t.embedding <=> ${vectorLiteral}
      LIMIT 5
    `);

    this.logger.log(`[Embedding] Semantic search query="${query.substring(0, 60)}" results=${rows.length}`);
    return rows;
  }
}
