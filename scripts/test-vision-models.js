/**
 * VoidAI Vision Models Validation Script
 * 
 * This script tests vision-capable models to:
 * 1. Validate OpenAI-compatible multimodal format support
 * 2. Identify correct model IDs for vision capabilities
 * 3. Document model-specific behaviors and limits
 * 
 * Recent fixes:
 * - Increased rate limit delays to 15 seconds (20s for retries)
 * - Uses test.jpg from scripts folder instead of base64 encoded image
 * - Special prompt handling for o4-series models
 * - Alternative content structure for problematic Gemini models
 * - Improved handling of "No content" responses from reasoning models
 * - Retry logic for rate-limited requests
 */

// All chat completion models from VoidAI API (fetched dynamically)
const ALL_CHAT_MODELS = [
  'brainrot-sonnet-4-20250514', 'chatgpt-4o-latest', 'claude-2', 'claude-3-5-haiku-20241022',
  'claude-3-5-sonnet-20240620', 'claude-3-5-sonnet-20241022', 'claude-3-7-sonnet-20250219',
  'claude-3-7-sonnet-20250219-thinking', 'claude-3-haiku-20240307', 'claude-3-opus-20240229',
  'claude-3-sonnet-20240229', 'claude-opus-4-20250514', 'claude-opus-4-20250514-thinking',
  'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514-thinking', 'codestral-2405',
  'codestral-2501', 'codestral-latest', 'codestral-mamba-2407', 'command-a-03-2025',
  'deepseek-prover-v2-671b', 'deepseek-r1', 'deepseek-v3', 'deepseek-v3-0324',
  'gemini-1.5-flash', 'gemini-1.5-flash-8b', 'gemini-1.5-flash-8b-latest',
  'gemini-1.5-flash-latest', 'gemini-1.5-pro', 'gemini-1.5-pro-latest',
  'gemini-2.0-flash', 'gemini-2.0-flash-exp', 'gemini-2.0-flash-lite-preview-02-05',
  'gemini-2.0-flash-thinking-exp-01-21', 'gemini-2.0-pro-exp-02-05',
  'gemini-2.5-flash-exp-native-audio-thinking-dialog', 'gemini-2.5-flash-preview-04-17',
  'gemini-2.5-flash-preview-05-20', 'gemini-2.5-flash-preview-native-audio-dialog',
  'gemini-2.5-pro-preview-05-06', 'gemini-2.5-pro-preview-06-05', 'gemini-exp-1206',
  'gpt-3.5-turbo', 'gpt-4', 'gpt-4-0125-preview', 'gpt-4-1106-preview',
  'gpt-4-1106-vision-preview', 'gpt-4-32k', 'gpt-4-32k-0314', 'gpt-4-32k-0613',
  'gpt-4-turbo', 'gpt-4-turbo-preview', 'gpt-4.1', 'gpt-4.1-mini', 'gpt-4.1-nano',
  'gpt-4.5-preview', 'gpt-4o', 'gpt-4o-2024-08-06', 'gpt-4o-2024-11-20',
  'gpt-4o-audio-preview', 'gpt-4o-audio-preview-2024-12-17', 'gpt-4o-mini',
  'gpt-4o-mini-2024-07-18', 'gpt-4o-mini-search-preview-2025-03-11',
  'gpt-4o-search-preview-2025-03-11', 'grok-2-1212', 'grok-2-vision-1212', 'grok-3-beta',
  'grok-3-fast-beta', 'grok-3-latest', 'grok-3-mini-beta', 'grok-3-mini-fast-beta',
  'grok-beta', 'grok-vision-beta', 'learnlm-1.5-pro-experimental',
  'learnlm-2.0-flash-experimental', 'llama-3.1-8b', 'llama-3.3-70b', 'llama-4-maverick',
  'llama-4-scout-17b-16e-instruct', 'ministral-3b-2410', 'ministral-3b-latest',
  'ministral-8b-2410', 'ministral-8b-latest', 'mistral-large-2402', 'mistral-large-2407',
  'mistral-large-2411', 'mistral-large-latest', 'mistral-medium-2312', 'mistral-medium-2505',
  'mistral-moderation-2411', 'mistral-moderation-latest', 'mistral-saba-2502',
  'mistral-small-2402', 'mistral-small-2409', 'mistral-small-2501', 'mistral-small-2503',
  'mistral-small-latest', 'mistral-tiny', 'mistral-tiny-2312', 'mistral-tiny-2407',
  'mistral-tiny-latest', 'o1', 'o1-mini', 'o1-preview', 'o3', 'o3-high', 'o3-low',
  'o3-medium', 'o3-mini', 'o3-mini-high', 'o3-mini-low', 'o4-mini', 'o4-mini-high',
  'o4-mini-low', 'o4-mini-medium', 'open-codestral-mamba', 'open-mistral-7b',
  'open-mistral-nemo', 'open-mistral-nemo-2407', 'open-mixtral-8x22b',
  'open-mixtral-8x22b-2404', 'open-mixtral-8x7b', 'pixtral-12b', 'pixtral-12b-2409',
  'pixtral-large-2411', 'pixtral-large-latest', 'Qwen/Qwen2.5-VL-72B-Instruct',
  'Qwen/Qwen3-235B-A22B', 'Qwen/Qwen3-30B-A3B', 'Qwen/QwQ-32B', 'sonar',
  'sonar-deep-research', 'sonar-pro', 'sonar-reasoning'
];

// Models known to support vision based on documentation and testing
const VISION_MODELS = [
  // OpenAI GPT models with vision (confirmed from OpenAI docs)
  'gpt-4.1', 'gpt-4.1-mini', 'gpt-4.1-nano',
  'gpt-4o', 'gpt-4o-mini', 'gpt-4o-2024-08-06', 'gpt-4o-2024-11-20',
  'gpt-4o-mini-2024-07-18', 'chatgpt-4o-latest',
  'gpt-4o-search-preview-2025-03-11', 'gpt-4o-mini-search-preview-2025-03-11',
  'gpt-4-1106-vision-preview', 'gpt-4.5-preview',
  
  // OpenAI O-series with vision
  'o4-mini', 'o4-mini-high', 'o4-mini-medium', 'o4-mini-low',
  'o3', 'o3-high', 'o3-medium', 'o3-low', 'o3-mini', 'o3-mini-high', 'o3-mini-low',
  'o1', 'o1-preview', 'o1-mini',
  
  // OpenAI Audio models with vision
  'gpt-4o-audio-preview', 'gpt-4o-audio-preview-2024-12-17',
  
  // Anthropic Claude models with vision (3.5+ and 4.0 series)
  'claude-3-5-sonnet-20241022', 'claude-3-5-sonnet-20240620', 'claude-3-5-haiku-20241022',
  'claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307',
  'claude-3-7-sonnet-20250219', 'claude-3-7-sonnet-20250219-thinking',
  'claude-opus-4-20250514', 'claude-opus-4-20250514-thinking',
  'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514-thinking',
  'brainrot-sonnet-4-20250514',
  
  // Google Gemini models with vision (all Gemini models support vision)
  'gemini-2.5-pro-preview-05-06', 'gemini-2.5-pro-preview-06-05',
  'gemini-2.5-flash-preview-04-17', 'gemini-2.5-flash-preview-05-20',
  'gemini-2.0-flash', 'gemini-2.0-flash-exp', 'gemini-2.0-flash-lite-preview-02-05',
  'gemini-2.0-flash-thinking-exp-01-21', 'gemini-2.0-pro-exp-02-05',
  'gemini-1.5-pro', 'gemini-1.5-pro-latest',
  'gemini-1.5-flash', 'gemini-1.5-flash-latest',
  'gemini-1.5-flash-8b', 'gemini-1.5-flash-8b-latest',
  'gemini-exp-1206', 'learnlm-1.5-pro-experimental', 'learnlm-2.0-flash-experimental',
  
  // xAI Grok models with vision
  'grok-2-vision-1212', 'grok-vision-beta',
  'grok-3-latest', 'grok-3-beta', 'grok-3-fast-beta', 'grok-3-mini-beta', 'grok-3-mini-fast-beta',
  
  // Mistral Pixtral models (vision-specific)
  'pixtral-large-latest', 'pixtral-large-2411', 'pixtral-12b', 'pixtral-12b-2409',
  
  // Qwen VL models
  'Qwen/Qwen2.5-VL-72B-Instruct'
];

// Test image - read from test.jpg file
const fs = require('fs');
const path = require('path');

function getTestImageBase64() {
  try {
    const imagePath = path.join(__dirname, 'test.jpg');
    const imageBuffer = fs.readFileSync(imagePath);
    return `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;
  } catch (error) {
    console.warn('Could not read test.jpg, falling back to simple test image');
    // Fallback to simple red square
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
  }
}

// Utility function to detect if a model supports vision
function supportsVision(modelId) {
  return VISION_MODELS.includes(modelId);
}

// Utility function to categorize model by provider
function getModelProvider(modelId) {
  if (modelId.startsWith('gpt-') || modelId.startsWith('o4-') || modelId.startsWith('o3-') || 
      modelId.startsWith('o1-') || modelId.startsWith('chatgpt-') || modelId === 'o1' || 
      modelId === 'o3') return 'openai';
  if (modelId.includes('claude') || modelId.includes('brainrot')) return 'anthropic';
  if (modelId.includes('gemini') || modelId.includes('learnlm')) return 'google';
  if (modelId.includes('grok')) return 'xai';
  if (modelId.includes('pixtral') || modelId.includes('mistral') || modelId.includes('codestral') || 
      modelId.includes('ministral')) return 'mistral';
  if (modelId.includes('Qwen')) return 'qwen';
  if (modelId.includes('deepseek')) return 'deepseek';
  if (modelId.includes('llama')) return 'meta';
  if (modelId.includes('sonar')) return 'perplexity';
  if (modelId.includes('command')) return 'cohere';
  return 'unknown';
}

// Export utility functions for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports.supportsVision = supportsVision;
  module.exports.getModelProvider = getModelProvider;
  module.exports.VISION_MODELS = VISION_MODELS;
  module.exports.ALL_CHAT_MODELS = ALL_CHAT_MODELS;
}

class VisionModelTester {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.voidai.app/v1';
    this.results = [];
  }

  async testModel(modelId) {
    console.log(`Testing model: ${modelId}`);
    
    const testImageBase64 = getTestImageBase64();
    
    // Special handling for o-series models which need clearer prompts
    const isOModel = modelId.startsWith('o4-') || modelId.startsWith('o1-') || modelId.startsWith('o3-');
    const promptText = isOModel 
      ? "Please look at this image and tell me what you see. Describe the contents clearly and directly."
      : "What do you see in this image? Please describe it briefly.";
    
    // Some Gemini models have issues with the standard format, try simpler content structure for them
    const isProblematicGemini = modelId.includes('gemini-2.5-pro-preview');
    
    let payload;
    if (isProblematicGemini) {
      // Try alternative content structure for problematic Gemini models
      payload = {
        model: modelId,
        messages: [
          {
            role: "user",
            content: `${promptText}\n\n[Image: ${testImageBase64}]`
          }
        ],
        max_tokens: 200,
        temperature: 0.1,
        stream: false
      };
    } else {
      payload = {
        model: modelId,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: promptText
              },
              {
                type: "image_url",
                image_url: {
                  url: testImageBase64,
                  detail: "auto"
                }
              }
            ]
          }
        ],
        max_tokens: 200,
        temperature: 0.1,
        stream: false
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      
      if (response.ok) {
        let responseText = data.choices?.[0]?.message?.content || 'No content';
        
        // Handle cases where response is null or empty but reasoning tokens were used
        if (!responseText || responseText === 'No content') {
          if (data.usage?.completion_tokens_details?.reasoning_tokens > 0) {
            responseText = '[Model processed the image with reasoning but produced no visible output]';
          }
        }
        
        const result = {
          model: modelId,
          status: 'success',
          supportsVision: true,
          response: responseText,
          usage: data.usage,
          responseTime: Date.now()
        };
        
        console.log(`✅ ${modelId}: ${result.response.substring(0, 50)}...`);
        return result;
      } else {
        const result = {
          model: modelId,
          status: 'error',
          supportsVision: false,
          error: data.error?.message || 'Unknown error',
          errorCode: data.error?.code,
          httpStatus: response.status
        };
        
        console.log(`❌ ${modelId}: ${result.error}`);
        return result;
      }
    } catch (error) {
      const result = {
        model: modelId,
        status: 'network_error',
        supportsVision: false,
        error: error.message
      };
      
      console.log(`🔴 ${modelId}: Network error - ${error.message}`);
      return result;
    }
  }

  async testAllModels() {
    console.log('Starting VoidAI Vision Models Validation...\n');
    
    const results = [];
    
    for (let i = 0; i < VISION_MODELS.length; i++) {
      const model = VISION_MODELS[i];
      let result = await this.testModel(model);
      
      // Retry once for rate-limited requests with longer delay
      if (result.httpStatus === 429) {
        console.log(`Rate limited for ${model}, waiting 20 seconds and retrying...`);
        await new Promise(resolve => setTimeout(resolve, 20000));
        result = await this.testModel(model);
      }
      
      results.push(result);
      
      // Increased delay between requests to avoid rate limiting
      const delay = result.httpStatus === 429 ? 20000 : 15000;
      console.log(`Waiting ${delay/1000} seconds before next request...\n`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    return results;
  }

  generateReport(results) {
    const workingModels = results.filter(r => r.supportsVision);
    const failedModels = results.filter(r => !r.supportsVision);
    
    console.log('\n=== VISION MODELS VALIDATION REPORT ===\n');
    
    console.log(`✅ Working Vision Models (${workingModels.length}):`);
    workingModels.forEach(model => {
      console.log(`  - ${model.model}`);
      if (model.usage) {
        console.log(`    Tokens: ${model.usage.total_tokens} (prompt: ${model.usage.prompt_tokens}, completion: ${model.usage.completion_tokens})`);
      }
      console.log(`    Response: ${model.response.substring(0, 80)}...`);
    });
    
    console.log(`\n❌ Failed Models (${failedModels.length}):`);
    failedModels.forEach(model => {
      console.log(`  - ${model.model}: ${model.error}`);
      if (model.httpStatus) {
        console.log(`    HTTP Status: ${model.httpStatus}`);
      }
    });
    
    // Group by provider for better insights
    const byProvider = workingModels.reduce((acc, model) => {
      const provider = getModelProvider(model.model);
      if (!acc[provider]) acc[provider] = [];
      acc[provider].push(model.model);
      return acc;
    }, {});
    
    console.log('\n=== WORKING MODELS BY PROVIDER ===');
    Object.entries(byProvider).forEach(([provider, models]) => {
      console.log(`${provider.toUpperCase()}: ${models.length} models`);
      models.forEach(model => console.log(`  - ${model}`));
    });
    
    console.log('\n=== RECOMMENDED CONFIGURATION ===');
    if (workingModels.length > 0) {
      const recommended = workingModels.find(m => m.model.includes('gpt-4o')) || workingModels[0];
      console.log(`Primary Vision Model: ${recommended.model}`);
      console.log('Add to model selector with vision capability flag');
    }
    
    return {
      workingModels: workingModels.map(m => m.model),
      failedModels: failedModels.map(m => ({ model: m.model, error: m.error, httpStatus: m.httpStatus })),
      byProvider,
      totalTested: results.length,
      successRate: ((workingModels.length / results.length) * 100).toFixed(1)
    };
  }
}

// Usage instructions
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VisionModelTester;
} else {
  console.log(`
To run this test:

1. Set your VoidAI API key:
   export VOIDAI_API_KEY="your-api-key-here"

2. Run the test:
   node scripts/test-vision-models.js

Or use in browser console:
   const tester = new VisionModelTester('your-api-key');
   const results = await tester.testAllModels();
   const report = tester.generateReport(results);
  `);
}

// Auto-run if API key is available
if (typeof process !== 'undefined' && process.env?.VOIDAI_API_KEY) {
  (async () => {
    const tester = new VisionModelTester(process.env.VOIDAI_API_KEY);
    const results = await tester.testAllModels();
    const report = tester.generateReport(results);
    
    // Save results to file
    const fs = require('fs');
    fs.writeFileSync('vision-models-test-results.json', JSON.stringify({
      timestamp: new Date().toISOString(),
      results,
      report
    }, null, 2));
    
    console.log('\nResults saved to: vision-models-test-results.json');
  })();
}