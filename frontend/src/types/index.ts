export type GenerationType = 'image' | 'video';

export type ImageStyle = 'realistic' | 'artistic' | 'anime' | 'photographic' | '3d-render';

export interface GenerationRequest {
  prompt: string;
  type: GenerationType;
  style: ImageStyle;
  negativePrompt?: string;
}

export interface GenerationResult {
  id: string;
  prompt: string;
  type: GenerationType;
  style: ImageStyle;
  url: string;
  thumbnailUrl?: string;
  createdAt: string;
  status: 'generating' | 'completed' | 'failed';
  error?: string;
}
