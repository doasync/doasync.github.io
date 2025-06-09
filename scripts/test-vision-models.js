/**
 * VoidAI Vision Models Validation Script
 * 
 * This script tests vision-capable models to:
 * 1. Validate OpenAI-compatible multimodal format support
 * 2. Identify correct model IDs for vision capabilities
 * 3. Document model-specific behaviors and limits
 */

// Vision models to test based on VoidAI documentation
const VISION_MODELS = [
  'gpt-4-1106-vision-preview',
  'gpt-4o',
  'gpt-4o-2024-08-06',
  'gpt-4o-2024-11-20',
  'chatgpt-4o-latest',
  'grok-2-vision-1212',
  'pixtral-large-latest',
  'pixtral-large-2411',
  'Qwen/Qwen2.5-VL-72B-Instruct',
  'gemini-2.0-flash',
  'gemini-1.5-pro',
  'claude-3-opus-20240229',
  'claude-3-sonnet-20240229',
  'claude-3-5-sonnet-20241022'
];

// Test image - simple base64 encoded red square
const TEST_IMAGE_BASE64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

class VisionModelTester {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.voidai.app/v1';
    this.results = [];
  }

  async testModel(modelId) {
    console.log(`Testing model: ${modelId}`);
    
    const payload = {
      model: modelId,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "What do you see in this image? Please describe it briefly."
            },
            {
              type: "image_url",
              image_url: {
                url: TEST_IMAGE_BASE64,
                detail: "auto"
              }
            }
          ]
        }
      ],
      max_tokens: 100,
      temperature: 0.1
    };

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
        const result = {
          model: modelId,
          status: 'success',
          supportsVision: true,
          response: data.choices?.[0]?.message?.content || 'No content',
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
    
    for (const model of VISION_MODELS) {
      const result = await this.testModel(model);
      results.push(result);
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
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
    });
    
    console.log(`\n❌ Failed Models (${failedModels.length}):`);
    failedModels.forEach(model => {
      console.log(`  - ${model.model}: ${model.error}`);
    });
    
    console.log('\n=== RECOMMENDED CONFIGURATION ===');
    if (workingModels.length > 0) {
      const recommended = workingModels[0];
      console.log(`Primary Vision Model: ${recommended.model}`);
      console.log('Add to model selector with vision capability flag');
    }
    
    return {
      workingModels: workingModels.map(m => m.model),
      failedModels: failedModels.map(m => ({ model: m.model, error: m.error })),
      totalTested: results.length
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