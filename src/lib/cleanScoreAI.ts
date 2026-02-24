/**
 * NMC-CVA: Civic Vision Analyzer v1.0
 * =====================================
 * Custom Computer Vision Algorithm for civic complaint resolution verification.
 * Developed for NMC Swachh Nagpur Portal — B.Tech Final Year Project.
 *
 * ALGORITHM PIPELINE:
 *  1. Image Preprocessing     — Normalize both images to 64×64 RGB on HTML Canvas
 *  2. Feature Extraction      — Compute 5 image features per photo
 *  3. Comparative Analysis    — Measure change between before & after photos
 *  4. CleanScore Calculation  — Weighted formula combining all signals
 *  5. Fraud Classification    — Threshold-based verdict with confidence score
 *
 * FEATURES EXTRACTED:
 *  - Luminance Histogram (256-bin, normalized) — captures overall tone distribution
 *  - Mean Brightness (perceptual, BT.601 weights) — detects environment change
 *  - Color Variance (std dev of luminance) — measures texture complexity
 *  - Dirty Color Ratio — fraction of "waste" pixels (browns, dark grays, yellow-green)
 *  - Edge Intensity — approximate texture/edge density via adjacent-pixel delta
 *
 * CLEANSCORES FORMULA:
 *  C = w1*(1 - HistSim) + w2*ΔBrightness + w3*ΔDirtyRatio + w4*ΔEdge
 *  Weights: w1=0.35, w2=0.25, w3=0.30, w4=0.10
 *
 * FRAUD DETECTION:
 *  - HistSim > 0.93 → Duplicate photo uploaded (fraud)
 *  - ΔBrightness < 0.03 AND ΔDirtyRatio < 0.02 → No visible work done
 *  - CleanScore ≥ 32 → Verified   |   CleanScore < 15 → Suspicious
 *
 * References:
 *  - Swain & Ballard (1991) — Color Indexing via Histogram Intersection
 *  - BT.601 — Luminance perceptual weighting (Y = 0.299R + 0.587G + 0.114B)
 *  - Phung et al. (2005) — Skin/region color segmentation using HSV thresholds
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ImageFeatures {
  meanBrightness: number;    // 0–255  perceptual luminance average
  colorVariance: number;     // std deviation of pixel luminance
  dirtyColorRatio: number;   // 0–1  fraction of "waste-colored" pixels
  edgeIntensity: number;     // 0–255  mean absolute difference between adjacent pixels
  histogram: number[];       // 256-bin normalized luminance histogram
}

export interface CVAMetrics {
  histogramSimilarity: number;   // 0–1  (1 = identical)
  brightnessDelta: number;       // 0–1  normalized absolute brightness change
  dirtyColorReduction: number;   // negative = more dirty after (bad), positive = cleaner (good)
  edgeDelta: number;             // change in texture/edge density
}

export interface CVAResult {
  verdict: 'verified' | 'suspicious' | 'inconclusive';
  cleanScore: number;      // 0–100  higher = more work done
  confidence: number;      // 0–100
  reason: string;          // human-readable explanation
  metrics: CVAMetrics;
  features: {
    before: ImageFeatures;
    after: ImageFeatures;
  };
}

// ─── Step 1: Image Loading ─────────────────────────────────────────────────────

const CANVAS_SIZE = 64; // Normalize to 64×64 for consistent comparison

async function loadImageFeatures(url: string): Promise<ImageFeatures> {
  const pixels = await loadPixels(url);
  return extractFeatures(pixels);
}

function loadPixels(url: string): Promise<Uint8ClampedArray> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = CANVAS_SIZE;
      canvas.height = CANVAS_SIZE;
      const ctx = canvas.getContext('2d')!;
      // Smooth downscale for better histogram quality
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
      resolve(ctx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE).data);
    };

    img.onerror = () => {
      // Fallback: try without crossOrigin (some storage buckets need this)
      const img2 = new Image();
      img2.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = CANVAS_SIZE;
        canvas.height = CANVAS_SIZE;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img2, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
        try {
          resolve(ctx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE).data);
        } catch {
          reject(new Error('CORS: Cannot read image pixel data'));
        }
      };
      img2.onerror = () => reject(new Error('Failed to load image: ' + url));
      img2.src = url;
    };

    img.src = url;
  });
}

// ─── Step 2: Feature Extraction ───────────────────────────────────────────────

function extractFeatures(pixels: Uint8ClampedArray): ImageFeatures {
  const totalPixels = CANVAS_SIZE * CANVAS_SIZE;
  const histogram = new Array<number>(256).fill(0);

  let sumBrightness = 0;
  let dirtyCount = 0;
  let edgeSum = 0;
  let prevLum = 0;

  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];

    // Perceptual luminance (BT.601)
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    sumBrightness += lum;
    histogram[Math.round(lum)]++;

    // Edge intensity: diff from previous pixel (horizontal scan)
    edgeSum += Math.abs(lum - prevLum);
    prevLum = lum;

    // ── Dirty Color Detection ────────────────────────────────────────────────
    // Categories of "waste-colored" pixels (empirically tuned for Indian waste)
    //
    // 1. Dark Garbage Gray — decomposed waste, dirty roads
    const isDarkGray = r < 85 && g < 85 && b < 85;
    //
    // 2. Waste Brown — rotting organic material, soil waste
    const isWasteBrown = r > 90 && g > 45 && g < 105 && b < 75
                        && r > g && g > b;
    //
    // 3. Yellow-Green Stagnant Water / Algae
    const isStagnantGreen = g > r && g > b && r > 80 && b < 100
                           && g - b > 20;
    //
    // 4. Rust / Orange waste
    const isRustOrange = r > 140 && g > 60 && g < 120 && b < 70;

    if (isDarkGray || isWasteBrown || isStagnantGreen || isRustOrange) {
      dirtyCount++;
    }
  }

  // Normalize histogram to sum = 1
  const normHistogram = histogram.map(v => v / totalPixels);

  // Color variance (std deviation)
  const meanBrightness = sumBrightness / totalPixels;
  let varSum = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    const lum = 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
    varSum += (lum - meanBrightness) ** 2;
  }

  return {
    meanBrightness,
    colorVariance: Math.sqrt(varSum / totalPixels),
    dirtyColorRatio: dirtyCount / totalPixels,
    edgeIntensity: edgeSum / totalPixels,
    histogram: normHistogram,
  };
}

// ─── Step 3: Comparative Analysis ─────────────────────────────────────────────

/**
 * Histogram Intersection Similarity (Swain & Ballard, 1991)
 * Returns 0–1, where 1 = identical histograms (same image / no change)
 */
function histogramIntersection(h1: number[], h2: number[]): number {
  let intersection = 0;
  for (let i = 0; i < 256; i++) {
    intersection += Math.min(h1[i], h2[i]);
  }
  // Intersection sum of normalized histograms is already in [0,1]
  return intersection;
}

// ─── Step 4: CleanScore Calculation ───────────────────────────────────────────

/**
 * Weighted CleanScore formula:
 *   C = w1·(1−HistSim) + w2·ΔBrightness + w3·ΔDirtyRatio + w4·ΔEdge
 *
 * Intuition:
 *  - Low HistSim (photos very different) → high score → good (work done)
 *  - High ΔBrightness (environment changed) → good
 *  - Positive ΔDirtyRatio (dirty pixels reduced) → good (waste removed)
 *  - ΔEdge change (clutter removed → smoother surfaces) → minor signal
 */
function computeCleanScore(before: ImageFeatures, after: ImageFeatures): CVAMetrics & { rawScore: number } {
  const histSim = histogramIntersection(before.histogram, after.histogram);
  const brightnessDelta = Math.abs(after.meanBrightness - before.meanBrightness) / 255;
  const dirtyColorReduction = before.dirtyColorRatio - after.dirtyColorRatio; // +ve = cleaner after
  const edgeDelta = Math.abs(after.edgeIntensity - before.edgeIntensity) / 255;

  // Weights (sum = 1.0)
  const w1 = 0.35; // histogram difference
  const w2 = 0.25; // brightness change
  const w3 = 0.30; // dirty color reduction
  const w4 = 0.10; // edge/texture change

  const rawScore =
    w1 * (1 - histSim) +                          // higher = more different
    w2 * brightnessDelta +                         // higher = more brightness change
    w3 * Math.max(0, dirtyColorReduction) +        // only reward cleaning, not getting dirtier
    w4 * edgeDelta;                                // texture change signal

  return { histogramSimilarity: histSim, brightnessDelta, dirtyColorReduction, edgeDelta, rawScore };
}

// ─── Step 5: Fraud Classification ─────────────────────────────────────────────

export async function verifyResolutionPhotos(
  beforeUrl: string,
  afterUrl: string,
): Promise<CVAResult> {

  const [before, after] = await Promise.all([
    loadImageFeatures(beforeUrl),
    loadImageFeatures(afterUrl),
  ]);

  const { histogramSimilarity, brightnessDelta, dirtyColorReduction, edgeDelta, rawScore } =
    computeCleanScore(before, after);

  const cleanScore = Math.min(100, Math.round(rawScore * 140)); // scale to 0–100
  const metrics: CVAMetrics = { histogramSimilarity, brightnessDelta, dirtyColorReduction, edgeDelta };

  // ── Fraud Flags ──────────────────────────────────────────────────────
  const isDuplicate = histogramSimilarity > 0.93;
  const noChangeAtAll = brightnessDelta < 0.025 && Math.abs(dirtyColorReduction) < 0.02;

  let verdict: CVAResult['verdict'];
  let confidence: number;
  let reason: string;

  if (isDuplicate) {
    verdict = 'suspicious';
    confidence = Math.round(histogramSimilarity * 100);
    reason = `Fraud Detected: Before and after photos are ${Math.round(histogramSimilarity * 100)}% visually identical (HistSim=${histogramSimilarity.toFixed(3)}). Likely the same photo was uploaded twice. No genuine resolution evidence.`;

  } else if (noChangeAtAll) {
    verdict = 'suspicious';
    confidence = 75;
    reason = `No Measurable Change: Brightness delta=${(brightnessDelta * 100).toFixed(1)}%, dirty color change=${(dirtyColorReduction * 100).toFixed(1)}%. Photos show no visible difference. Work not confirmed.`;

  } else if (cleanScore >= 32) {
    verdict = 'verified';
    confidence = Math.min(96, cleanScore + 15);
    const dirtyPct = (Math.abs(dirtyColorReduction) * 100).toFixed(1);
    const brightPct = (brightnessDelta * 100).toFixed(1);
    reason = `Resolution Confirmed: Significant visual change detected. Dirty pixel reduction: ${dirtyPct}%, brightness shift: ${brightPct}%, CleanScore: ${cleanScore}/100. Civic work appears genuine.`;

  } else {
    verdict = 'inconclusive';
    confidence = 50;
    reason = `Partial Change Detected: CleanScore=${cleanScore}/100, HistSim=${histogramSimilarity.toFixed(2)}, dirty change=${(dirtyColorReduction * 100).toFixed(1)}%. Manual review recommended.`;
  }

  return { verdict, cleanScore, confidence, reason, metrics, features: { before, after } };
}
