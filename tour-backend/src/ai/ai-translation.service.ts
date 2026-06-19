import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

const LLMGATE_DEFAULT_BASE_URL = 'https://llmgate.app/v1';
const LLMGATE_LEGACY_BASE_URLS = new Set([
  'https://api.llmgateway.io/v1',
  'https://api.llmgate.app/v1',
]);

interface AiError { message?: string; status?: number; code?: number }

type TranslationTimelineEntry = {
  time?: string;
  activity?: string;
};

type IndexedTranslationItem = {
  index?: number;
};

export type TourTranslationRequest = {
  name?: string;
  description?: string;
  departurePoint?: string;
  duration?: string;
  packages?: (IndexedTranslationItem & {
    name?: string;
    description?: string;
    includes?: string[];
    excludes?: string[];
  })[];
  departures?: (IndexedTranslationItem & {
    note?: string;
  })[];
  highlights?: (IndexedTranslationItem & {
    content?: string;
  })[];
  faqs?: (IndexedTranslationItem & {
    question?: string;
    answer?: string;
  })[];
  itinerary?: (IndexedTranslationItem & {
    title?: string;
    description?: string;
    accommodation?: string;
    transport?: string;
    activities?: string[];
    timeline?: TranslationTimelineEntry[];
  })[];
};

export type TourTranslationResponse = {
  nameEn?: string;
  descriptionEn?: string;
  departurePointEn?: string;
  durationEn?: string;
  packages?: (IndexedTranslationItem & {
    nameEn?: string;
    descriptionEn?: string;
    includesEn?: string[];
    excludesEn?: string[];
  })[];
  departures?: (IndexedTranslationItem & {
    noteEn?: string;
  })[];
  highlights?: (IndexedTranslationItem & {
    contentEn?: string;
  })[];
  faqs?: (IndexedTranslationItem & {
    questionEn?: string;
    answerEn?: string;
  })[];
  itinerary?: (IndexedTranslationItem & {
    titleEn?: string;
    descriptionEn?: string;
    accommodationEn?: string;
    transportEn?: string;
    activitiesEn?: string[];
    timelineEn?: TranslationTimelineEntry[];
  })[];
};

export type ArticleTranslationRequest = {
  title?: string;
  excerpt?: string;
  content?: string;
};

export type ArticleTranslationResponse = {
  titleEn?: string;
  excerptEn?: string;
  contentEn?: string;
};

@Injectable()
export class AiTranslationService {
  private readonly logger = new Logger(AiTranslationService.name);
  private llmClient: OpenAI;
  private provider: string;
  private primaryModel: string;
  private fallbackModel: string;
  private baseURL?: string;

  constructor(private readonly configService: ConfigService) {
    this.provider = (
      this.configService.get<string>('AI_PROVIDER') || 'llmgate'
    ).toLowerCase();

    const llmgateApiKey = this.configService.get<string>('LLMGATE_API_KEY') || '';
    const llmgateBaseUrl = this.configService.get<string>('LLMGATE_BASE_URL');
    const llmgatePrimaryModel = this.configService.get<string>('LLMGATE_MODEL');
    const llmgateFallbackModel = this.configService.get<string>('LLMGATE_FALLBACK_MODEL');

    const genericApiKey = this.configService.get<string>('AI_API_KEY') || '';
    const apiKey =
      this.provider === 'llmgate'
        ? llmgateApiKey || genericApiKey
        : genericApiKey || llmgateApiKey;

    const configuredBaseURL =
      this.provider === 'llmgate'
        ? llmgateBaseUrl ||
          this.configService.get<string>('AI_BASE_URL') ||
          LLMGATE_DEFAULT_BASE_URL
        : this.configService.get<string>('AI_BASE_URL');

    this.baseURL =
      this.provider === 'llmgate'
        ? this.normalizeLlmgateBaseUrl(configuredBaseURL)
        : configuredBaseURL || undefined;

    this.primaryModel =
      this.provider === 'llmgate'
        ? this.normalizeLlmgateModel(
            llmgatePrimaryModel || this.configService.get<string>('AI_PRIMARY_MODEL'),
            'gpt-5.4-mini',
          )
        : this.configService.get<string>('AI_PRIMARY_MODEL') ||
          llmgatePrimaryModel ||
          'gpt-5.4-mini';

    this.fallbackModel =
      this.provider === 'llmgate'
        ? this.normalizeLlmgateModel(
            llmgateFallbackModel || this.configService.get<string>('AI_FALLBACK_MODEL'),
            'gpt-5.5',
          )
        : this.configService.get<string>('AI_FALLBACK_MODEL') ||
          llmgateFallbackModel ||
          'gpt-5.5';

    if (!apiKey) {
      throw new Error('[AI] Missing API key configuration: AI_API_KEY');
    }

    const clientOptions: { apiKey: string; baseURL?: string } = { apiKey };
    if (this.baseURL) clientOptions.baseURL = this.baseURL;
    this.llmClient = new OpenAI(clientOptions);

    this.logger.log(
      `[AiTranslation] Initialized provider=${this.provider}, primary=${this.primaryModel}, fallback=${this.fallbackModel}`,
    );
  }

  private normalizeLlmgateBaseUrl(baseURL?: string): string {
    const normalized = (baseURL || LLMGATE_DEFAULT_BASE_URL).replace(/\/+$/, '');
    if (LLMGATE_LEGACY_BASE_URLS.has(normalized)) {
      this.logger.warn(
        `[AiTranslation] Replacing deprecated LLMGate baseURL=${normalized} with ${LLMGATE_DEFAULT_BASE_URL}`,
      );
      return LLMGATE_DEFAULT_BASE_URL;
    }
    if (normalized === 'https://llmgate.app') return LLMGATE_DEFAULT_BASE_URL;
    return normalized;
  }

  private normalizeLlmgateModel(model: string | undefined, fallback: string): string {
    if (!model || model === 'gpt-5.3-codex') return fallback;
    return model;
  }

  private classifyAiError(error: unknown): string {
    const e = error as AiError;
    const message = (e.message ?? String(error)).toLowerCase();
    const status = Number(e.status ?? e.code ?? 0);
    if (
      message.includes('connection error') ||
      message.includes('network') ||
      message.includes('ssl') ||
      message.includes('tls') ||
      message.includes('trust relationship')
    )
      return 'network';
    if (status === 404 || message.includes('404') || message.includes('model not found'))
      return 'model_not_found';
    if (
      status === 401 ||
      status === 403 ||
      message.includes('unauthorized') ||
      message.includes('forbidden')
    )
      return 'auth';
    if (
      status === 429 ||
      message.includes('429') ||
      message.includes('quota') ||
      message.includes('resource_exhausted') ||
      message.includes('too many requests')
    )
      return 'rate_limit';
    return 'unknown';
  }

  private logAiErrorContext(stage: string, model: string, error: unknown) {
    const e = error as AiError;
    const type = this.classifyAiError(error);
    const status = e.status ?? e.code ?? 'unknown';
    this.logger.error(
      `[AiTranslation] ${stage} failed (type=${type}, status=${status}, provider=${this.provider}, model=${model})`,
    );
  }

  private async executeChatCompletion(
    model: string,
    payload: Omit<OpenAI.Chat.ChatCompletionCreateParamsNonStreaming, 'model'>,
  ) {
    return this.llmClient.chat.completions.create({ model, stream: false, reasoning_effort: 'medium', ...payload });
  }

  private truncateForTranslation(value: unknown, maxLength = 1200): string {
    if (typeof value !== 'string') return '';
    const trimmed = value.trim();
    return trimmed.length > maxLength ? `${trimmed.slice(0, maxLength).trim()}...` : trimmed;
  }

  private compactTranslationRequest(payload: TourTranslationRequest): TourTranslationRequest {
    const cleanList = <T extends IndexedTranslationItem>(
      items: T[] | undefined,
      mapper: (item: T, index: number) => T,
    ) => (Array.isArray(items) ? items.map(mapper) : []);

    return {
      name: this.truncateForTranslation(payload.name, 180),
      description: this.truncateForTranslation(payload.description, 1800),
      departurePoint: this.truncateForTranslation(payload.departurePoint, 180),
      duration: this.truncateForTranslation(payload.duration, 80),
      packages: cleanList(payload.packages, (pkg, index) => ({
        index: Number(pkg.index ?? index),
        name: this.truncateForTranslation(pkg.name, 120),
        description: this.truncateForTranslation(pkg.description, 400),
        includes: Array.isArray(pkg.includes)
          ? pkg.includes.map((item) => this.truncateForTranslation(item, 160)).filter(Boolean)
          : [],
        excludes: Array.isArray(pkg.excludes)
          ? pkg.excludes.map((item) => this.truncateForTranslation(item, 160)).filter(Boolean)
          : [],
      })),
      departures: cleanList(payload.departures, (departure, index) => ({
        index: Number(departure.index ?? index),
        note: this.truncateForTranslation(departure.note, 240),
      })),
      highlights: cleanList(payload.highlights, (highlight, index) => ({
        index: Number(highlight.index ?? index),
        content: this.truncateForTranslation(highlight.content, 240),
      })),
      faqs: cleanList(payload.faqs, (faq, index) => ({
        index: Number(faq.index ?? index),
        question: this.truncateForTranslation(faq.question, 240),
        answer: this.truncateForTranslation(faq.answer, 800),
      })),
      itinerary: cleanList(payload.itinerary, (day, index) => ({
        index: Number(day.index ?? index),
        title: this.truncateForTranslation(day.title, 180),
        description: this.truncateForTranslation(day.description, 1200),
        accommodation: this.truncateForTranslation(day.accommodation, 180),
        transport: this.truncateForTranslation(day.transport, 180),
        activities: Array.isArray(day.activities)
          ? day.activities.map((item) => this.truncateForTranslation(item, 180)).filter(Boolean)
          : [],
        timeline: Array.isArray(day.timeline)
          ? day.timeline.map((item) => ({
              time: this.truncateForTranslation(item.time, 40),
              activity: this.truncateForTranslation(item.activity, 240),
            }))
          : [],
      })),
    };
  }

  private parseTranslationJson(rawText: string): TourTranslationResponse {
    const fencedMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const candidate = fencedMatch?.[1] ?? rawText;
    const firstBrace = candidate.indexOf('{');
    const lastBrace = candidate.lastIndexOf('}');
    if (firstBrace < 0 || lastBrace <= firstBrace) {
      throw new Error('AI response did not contain a JSON object');
    }
    return JSON.parse(candidate.slice(firstBrace, lastBrace + 1)) as TourTranslationResponse;
  }

  private async runTourTranslation(
    model: string,
    input: TourTranslationRequest,
  ): Promise<TourTranslationResponse> {
    const response = await this.executeChatCompletion(model, {
      messages: [
        {
          role: 'system',
          content:
            'You are a senior travel copy translator. Translate Vietnamese tour draft content into natural, concise English for a travel booking website. Preserve numbers, prices, dates, hotel ratings, and place names unless they have a common English name. Return only valid JSON. Keep every array item aligned by its index.',
        },
        {
          role: 'user',
          content: JSON.stringify({
            instructions:
              'Translate the provided fields from Vietnamese to English. Omit fields that have no source text. For timeline items, keep the same time and translate only activity.',
            outputShape: {
              nameEn: 'string',
              descriptionEn: 'string',
              departurePointEn: 'string',
              durationEn: 'string',
              packages: [
                {
                  index: 0,
                  nameEn: 'string',
                  descriptionEn: 'string',
                  includesEn: ['string'],
                  excludesEn: ['string'],
                },
              ],
              departures: [{ index: 0, noteEn: 'string' }],
              highlights: [{ index: 0, contentEn: 'string' }],
              faqs: [{ index: 0, questionEn: 'string', answerEn: 'string' }],
              itinerary: [
                {
                  index: 0,
                  titleEn: 'string',
                  descriptionEn: 'string',
                  accommodationEn: 'string',
                  transportEn: 'string',
                  activitiesEn: ['string'],
                  timelineEn: [{ time: 'string', activity: 'string' }],
                },
              ],
            },
            input,
          }),
        },
      ],
      max_tokens: 2500,
      temperature: 0.2,
    });

    return this.parseTranslationJson(response.choices[0]?.message?.content || '');
  }

  private async runArticleTranslation(
    model: string,
    input: ArticleTranslationRequest,
  ): Promise<ArticleTranslationResponse> {
    const response = await this.executeChatCompletion(model, {
      messages: [
        {
          role: 'system',
          content:
            'You are a senior travel-magazine translator. Translate Vietnamese blog article content into natural, fluent English for a travel journal. The "content" field is HTML — translate only the human-readable text and keep ALL HTML tags, attributes, and structure exactly intact (do not add, remove, or reorder tags). Preserve place names, numbers, and proper nouns unless they have a common English form. Return only valid JSON.',
        },
        {
          role: 'user',
          content: JSON.stringify({
            instructions:
              'Translate title, excerpt and content from Vietnamese to English. Omit any field that has no source text. Do not change the HTML markup in content.',
            outputShape: {
              titleEn: 'string',
              excerptEn: 'string',
              contentEn: 'string (same HTML markup, English text)',
            },
            input,
          }),
        },
      ],
      max_tokens: 4000,
      temperature: 0.2,
    });

    const rawText = response.choices[0]?.message?.content || '';
    const fencedMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const candidate = fencedMatch?.[1] ?? rawText;
    const firstBrace = candidate.indexOf('{');
    const lastBrace = candidate.lastIndexOf('}');
    if (firstBrace < 0 || lastBrace <= firstBrace) {
      throw new Error('AI response did not contain a JSON object');
    }
    return JSON.parse(candidate.slice(firstBrace, lastBrace + 1)) as ArticleTranslationResponse;
  }

  async translateTourDraft(payload: TourTranslationRequest): Promise<TourTranslationResponse> {
    const compactInput = this.compactTranslationRequest(payload);
    try {
      return await this.runTourTranslation(this.primaryModel, compactInput);
    } catch (error) {
      this.logAiErrorContext('Tour translation primary model', this.primaryModel, error);
      try {
        return await this.runTourTranslation(this.fallbackModel, compactInput);
      } catch (fallbackError) {
        this.logAiErrorContext('Tour translation fallback model', this.fallbackModel, fallbackError);
        throw new ServiceUnavailableException(
          'Không thể tạo bản tiếng Anh tự động lúc này. Vui lòng thử lại sau.',
        );
      }
    }
  }

  async translateArticleDraft(
    payload: ArticleTranslationRequest,
  ): Promise<ArticleTranslationResponse> {
    const input: ArticleTranslationRequest = {
      title: this.truncateForTranslation(payload.title, 200),
      excerpt: this.truncateForTranslation(payload.excerpt, 500),
      content: this.truncateForTranslation(payload.content, 8000),
    };
    try {
      return await this.runArticleTranslation(this.primaryModel, input);
    } catch (error) {
      this.logAiErrorContext('Article translation primary model', this.primaryModel, error);
      try {
        return await this.runArticleTranslation(this.fallbackModel, input);
      } catch (fallbackError) {
        this.logAiErrorContext('Article translation fallback model', this.fallbackModel, fallbackError);
        throw new ServiceUnavailableException(
          'Không thể tạo bản tiếng Anh tự động lúc này. Vui lòng thử lại sau.',
        );
      }
    }
  }
}
