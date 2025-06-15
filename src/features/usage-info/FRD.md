# Feature Requirements Document: Usage Info

**Version:** 1.1  
**Date:** 2025-06-15  
**Status:** Implemented  
**Implementation Status:** ⚠️ PARTIALLY IMPLEMENTED (80%)

## Implementation Summary

### ✅ Fully Implemented Features
- Real-time token counting
- Cost calculation with model pricing
- Context window usage tracking
- Storage quota monitoring
- Visual progress indicators
- Session statistics display
- Integration with chat messages
- Responsive dialog interface

### ⚠️ Missing Features
- Export functionality for usage data
- Historical analytics beyond current session
- Cost optimization recommendations

### 🎯 Implementation Quality
- **Completeness**: 80% of requirements met
- **Code Quality**: Clean token counting logic
- **User Experience**: Clear usage visualization
- **Performance**: Efficient real-time updates

## 1. Feature Overview

The **usage-info** feature provides comprehensive token usage tracking and cost estimation for chat conversations. It displays real-time token counts, cost calculations, and usage statistics through a dedicated dialog interface, helping users monitor their API usage and associated costs.

### Purpose
- Track token usage per message and conversation
- Calculate costs based on model pricing
- Display usage statistics and breakdowns
- Provide session and historical analytics
- Help users optimize token consumption

### Key Capabilities
- Real-time token counting
- Cost calculation with model pricing
- Input/output token breakdown
- Visual usage indicators
- Session statistics
- Cost optimization suggestions

## 2. Functional Requirements

### 2.1 Token Tracking
- Count tokens for each message
- Separate input/output tokens
- Track system prompt tokens
- Monitor total conversation tokens
- Update counts in real-time

### 2.2 Cost Calculation
- Model-specific pricing rates
- Separate input/output costs
- Total cost per conversation
- Session cost tracking
- Currency formatting (USD)

### 2.3 Usage Display
- Token count badges
- Cost breakdown tables
- Progress indicators
- Usage trends (future)
- Comparison charts (future)

### 2.4 Statistics
- Current chat statistics
- Session totals
- Model usage breakdown
- Average tokens per message
- Cost per conversation

## 3. Technical Implementation

### 3.1 State Management (Effector)

#### Stores
- `$currentUsageInfo`: Active chat usage
- `$sessionUsageInfo`: Session totals
- `$usageHistory`: Historical data
- `$isUsageDialogOpen`: Dialog visibility
- `$selectedUsageView`: View mode

#### Events
- `openUsageDialog`: Show usage info
- `closeUsageDialog`: Hide dialog
- `updateTokenUsage`: Update counts
- `resetSessionUsage`: Clear session
- `setUsageView`: Change view mode

#### Effects
- `calculateTokensFx`: Count tokens
- `loadUsageHistoryFx`: Load historical data
- `exportUsageDataFx`: Export statistics

### 3.2 Component Structure
```
usage-info/
├── components/
│   ├── usage-info-dialog.tsx    # Main dialog UI
│   └── usage-info-content.tsx   # Usage display
├── model.ts                      # State management
├── utils.ts                      # Token counting utilities
└── index.ts                      # Public exports
```

### 3.3 Token Counting
Uses tiktoken-compatible algorithm:
```typescript
interface TokenCount {
  text: string;
  tokens: number;
  model: string;
}
```

### 3.4 Pricing Structure
```typescript
interface ModelPricing {
  input: number;   // $ per 1K tokens
  output: number;  // $ per 1K tokens
}
```

## 4. Usage Calculation

### 4.1 Token Counting Methods
- Approximate counting for real-time
- Accurate counting from API response
- Model-specific tokenizers
- Special token handling
- Whitespace normalization

### 4.2 Cost Formula
```
Input Cost = (input_tokens / 1000) * input_price
Output Cost = (output_tokens / 1000) * output_price
Total Cost = Input Cost + Output Cost
```

### 4.3 Usage Metrics
- **Tokens per Message**: Average token count
- **Cost per Turn**: Average cost per exchange
- **Efficiency Rate**: Output/Input ratio
- **Context Usage**: % of model limit used

## 5. User Interface

### 5.1 Dialog Design
- Tab interface for different views
- Current Chat tab
- Session Summary tab
- Settings/Help tab
- Export options

### 5.2 Current Chat View
- Message-by-message breakdown
- Token counts per message
- Running totals
- Cost accumulation
- Visual indicators

### 5.3 Session Summary
- Total tokens used
- Total cost incurred
- Model breakdown
- Time-based statistics
- Efficiency metrics

### 5.4 Visual Elements
- Progress bars for context usage
- Pie charts for cost breakdown
- Line graphs for trends
- Color-coded indicators
- Tooltips with details

## 6. Integration Points

### 6.1 Dependencies
- **chat**: Message content and tokens
- **models-select**: Model pricing info
- **chat-history**: Historical usage

### 6.2 Data Sources
- API response token counts
- Local token estimation
- Model configuration
- Pricing database

## 7. Data Management

### 7.1 Storage
- Session data in memory
- Historical data in IndexedDB
- Aggregated statistics
- Export functionality

### 7.2 Data Structure
```typescript
interface UsageRecord {
  messageId: string;
  timestamp: number;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  inputCost: number;
  outputCost: number;
  totalCost: number;
}
```

## 8. Performance Considerations

### 8.1 Optimization
- Debounced token counting
- Cached calculations
- Lazy loading for history
- Efficient data aggregation

### 8.2 Limitations
- Real-time estimation accuracy
- Large conversation handling
- Memory usage for history
- Calculation performance

## 9. Accuracy and Limitations

### 9.1 Token Counting
- Estimation vs actual variance (~5%)
- Model-specific differences
- Special character handling
- Multilingual considerations

### 9.2 Cost Calculation
- Pricing update delays
- Rounding precision
- Currency conversion (future)
- Bulk discount handling (future)

## 10. User Experience

### 10.1 Information Design
- Clear data hierarchy
- Progressive disclosure
- Contextual help
- Actionable insights

### 10.2 Optimization Tips
- Token reduction suggestions
- Efficient prompting guides
- Model selection advice
- Cost-saving strategies

## 11. Testing Strategy

### 11.1 Unit Tests
- Token counting accuracy
- Cost calculations
- Data aggregation
- Utils functions

### 11.2 Integration Tests
- API response handling
- State updates
- UI synchronization
- Export functionality

### 11.3 Accuracy Tests
- Compare with API counts
- Verify calculations
- Test edge cases
- Multilingual content

## 12. Accessibility

- Keyboard navigation
- Screen reader support
- High contrast mode
- Number formatting
- Alternative visualizations

## 13. Future Enhancements

### 13.1 Planned Features
- Usage predictions
- Budget alerts
- Detailed analytics
- Team usage tracking
- API key quotas

### 13.2 Advanced Analytics
- ML-based optimization
- Conversation efficiency scoring
- Comparative analysis
- Trend predictions
- Anomaly detection

### 13.3 Export and Integration
- CSV/JSON export
- API integration
- Dashboard widgets
- Billing integration
- Reporting tools