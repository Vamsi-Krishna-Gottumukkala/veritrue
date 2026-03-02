/**
 * BERTScore utility using Hugging Face Inference API
 *
 * Uses sentence-transformers to compute semantic similarity between
 * claims and reference facts. This provides a numerical confidence
 * score for how semantically similar/contradictory claims are.
 */

const HF_API_URL =
  "https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2";

interface BERTScoreResult {
  claim: string;
  reference: string;
  similarity: number; // 0-1 cosine similarity
  interpretation: "supports" | "contradicts" | "unrelated";
}

/**
 * Get embeddings from Hugging Face for a list of texts
 */
async function getEmbeddings(texts: string[]): Promise<number[][]> {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  if (!apiKey) {
    throw new Error("HUGGINGFACE_API_KEY not configured");
  }

  const response = await fetch(HF_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputs: texts,
      options: { wait_for_model: true },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HuggingFace API error: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

/**
 * Compute cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Compute BERTScore for claim-reference pairs
 *
 * Each claim is compared to a reference (the counter-statement or
 * known fact) to determine semantic similarity.
 */
export async function computeBERTScore(
  pairs: Array<{ claim: string; reference: string }>,
): Promise<BERTScoreResult[]> {
  if (pairs.length === 0) return [];

  // Collect all texts for batch embedding
  const allTexts = pairs.flatMap((p) => [p.claim, p.reference]);

  try {
    const embeddings = await getEmbeddings(allTexts);

    return pairs.map((pair, i) => {
      const claimEmb = embeddings[i * 2];
      const refEmb = embeddings[i * 2 + 1];

      const similarity = cosineSimilarity(claimEmb, refEmb);

      // Interpret the similarity score
      let interpretation: BERTScoreResult["interpretation"];
      if (similarity > 0.75) {
        interpretation = "supports"; // very similar = claim matches reference
      } else if (similarity > 0.4) {
        interpretation = "contradicts"; // moderately similar = same topic but different
      } else {
        interpretation = "unrelated"; // low similarity = different topics
      }

      return {
        claim: pair.claim,
        reference: pair.reference,
        similarity: Math.round(similarity * 1000) / 1000,
        interpretation,
      };
    });
  } catch (error) {
    console.error("BERTScore computation failed:", error);
    throw error;
  }
}

/**
 * Check if HuggingFace API is configured
 */
export function isBERTScoreAvailable(): boolean {
  return !!process.env.HUGGINGFACE_API_KEY;
}
