import { IsArray, IsIn, IsInt, IsOptional } from 'class-validator';
import { ARTICLE_CATEGORIES } from './create-article.dto';

export type ArticleBulkAction =
  | 'publish'
  | 'draft'
  | 'trash'
  | 'feature'
  | 'unfeature'
  | 'category'
  | 'submit';

export class BulkActionDto {
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  ids?: number[];

  @IsIn(['publish', 'draft', 'trash', 'feature', 'unfeature', 'category', 'submit'])
  action!: ArticleBulkAction;

  @IsOptional()
  @IsIn(ARTICLE_CATEGORIES)
  category?: string;
}
