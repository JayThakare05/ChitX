/**
 * Face Verification Service — Mock Implementation
 * 
 * Interface designed for easy swap to real providers:
 * - AWS Rekognition: CompareFaces API
 * - FaceX: https://facex.io
 * - Microsoft Azure Face API
 * - HyperVerge: https://hyperverge.co
 * 
 * Real providers compare selfie image against Aadhaar photo.
 */

/**
 * Perform face match + liveness detection
 * @param {string} selfieBase64 - Base64 encoded selfie image
 * @param {string} referencePhotoUrl - Aadhaar photo URL or base64
 * @returns {{ success: boolean, data?: object, error?: string }}
 */
async function verifyFace(selfieBase64, referencePhotoUrl) {
    // Validate inputs
    if (!selfieBase64) {
        return { success: false, error: 'Selfie image is required.' };
    }

    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    console.log(`🤳 [FACE SERVICE MOCK] Running face match + liveness detection`);

    // ── MOCK: Always pass with high similarity ──
    const mockSimilarity = 92.5 + (Math.random() * 5); // 92.5 - 97.5%
    const mockLiveness = true;

    // ── PRODUCTION: AWS Rekognition example ──
    // const rekognition = new AWS.Rekognition();
    // const result = await rekognition.compareFaces({
    //     SourceImage: { Bytes: Buffer.from(selfieBase64, 'base64') },
    //     TargetImage: { Bytes: Buffer.from(referencePhotoBase64, 'base64') },
    //     SimilarityThreshold: 80
    // }).promise();
    // const similarity = result.FaceMatches[0]?.Similarity || 0;
    // const liveness = await checkLiveness(selfieBase64); // custom liveness check

    return {
        success: true,
        data: {
            faceSimilarity: parseFloat(mockSimilarity.toFixed(1)),
            livenessPassed: mockLiveness,
            blinkDetected: true,
            headMovementDetected: true,
            faceMatchPassed: mockSimilarity >= 80,
            confidence: parseFloat(mockSimilarity.toFixed(1))
        }
    };
}

/**
 * Minimum threshold for face similarity to pass
 */
const FACE_SIMILARITY_THRESHOLD = 80.0;

module.exports = { verifyFace, FACE_SIMILARITY_THRESHOLD };
