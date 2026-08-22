import { ImageAnnotatorClient } from '@google-cloud/vision';

let client: ImageAnnotatorClient | null = null;

export const extractReceiptText = async (image: Buffer) => {
  client ??= new ImageAnnotatorClient();
  const [result] = await client.documentTextDetection({ image: { content: image } });
  if (result.error?.message) throw new Error(result.error.message);
  const annotation = result.fullTextAnnotation;
  const text = annotation?.text?.trim() || '';
  const confidences = (annotation?.pages || []).flatMap(page =>
    (page.blocks || []).map(block => block.confidence).filter((value): value is number => typeof value === 'number')
  );
  const confidence = confidences.length
    ? confidences.reduce((sum, value) => sum + value, 0) / confidences.length
    : 0;
  return { text, confidence };
};
