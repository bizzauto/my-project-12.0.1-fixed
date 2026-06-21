# Phase: Ava AI Executive Assistant

## Overview
Upgrade existing JimiAssistant to "Ava" - a professional AI Executive Assistant with business intelligence, daily briefings, and N8N workflow integration.

## Objectives
1. Transform Jimi from "friendly helper" to "professional executive assistant"
2. Add business intelligence capabilities (revenue, sales, pipeline insights)
3. Integrate N8N for workflow automation
4. Maintain voice + text interaction with NeerjaNeural voice
5. Support both admin (owner) and user levels

## Architecture

### Current State
- `JimiAssistant.tsx` - Floating widget (641 lines)
- `jimi.service.ts` - Voice agent with 40+ commands (912 lines)
- `ai.service.ts` - Nvidia NIM + OpenRouter fallback
- `jimi-tts.ts` - Backend chat + TTS endpoints
- N8N workflows.json - WhatsApp auto-reply

### Target State
- `AvaExecutiveAssistant.tsx` - Upgraded widget with business context
- `ava.service.ts` - Enhanced service with BI capabilities
- `ava-intelligence.service.ts` - New backend service for business analytics
- `n8n-ava-integration.ts` - N8N webhook integration for commands

## Implementation Steps

### Step 1: Backend - Ava Intelligence Service
Create `src/server/services/ava-intelligence.service.ts`:
```typescript
// Functions:
- getDailyBriefing(businessId) → Revenue, leads, pipeline, tickets
- getSalesPerformance(businessId) → Today/week/month stats
- getPipelineStatus(businessId) → Deal stages, stuck deals
- getLeadInsights(businessId) → Hot leads, stalled, follow-ups
- getRecommendations(businessId) → AI-powered suggestions
```

### Step 2: Backend - Ava API Routes
Create `src/server/routes/ava.ts`:
```typescript
// Endpoints:
POST /api/ava/chat - Enhanced chat with business context
GET /api/ava/briefing - Daily executive briefing
GET /api/ava/insights - Business intelligence insights
POST /api/ava/command - Execute business commands
GET /api/ava/context - Get business context for AI
```

### Step 3: Frontend - Upgrade JimiAssistant to Ava
Modify `src/components/JimiAssistant.tsx`:
- Change branding from "Jimi" to "Ava"
- Update personality to "professional executive assistant"
- Add briefing display component
- Add business metrics cards
- Update voice to NeerjaNeural

### Step 4: Frontend - Enhanced Service
Modify `src/services/jimi.service.ts` → `ava.service.ts`:
- Add business context fetching
- Add briefing commands
- Add intelligence queries
- Update system prompts for executive assistant persona

### Step 5: N8N Integration
Create N8N workflow for Ava:
- Webhook trigger for voice commands
- Business data fetch from database
- AI processing with context
- Return structured responses

### Step 6: Voice Updates
Update voice configuration:
- Default voice: NeerjaNeural (Indian English)
- Personality: Professional, calm, efficient
- Speaking style: Executive assistant tone

## Technical Details

### AI Model Usage
- Primary: Nvidia NIM (FREE) - `meta/llama-3.3-70b-instruct`
- Fallback: OpenRouter (FREE) - `google/gemma-2-9b-it:free`
- Business context injected into system prompt

### Database Queries Needed
```sql
-- Daily Briefing Data
SELECT 
  COUNT(*) as new_leads,
  SUM(CASE WHEN status = 'won' THEN amount ELSE 0) as revenue_today,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_tickets
FROM deals, contacts, tickets
WHERE business_id = ? AND created_at >= CURDATE()
```

### N8N Workflow Structure
```
Webhook Trigger → 
  Fetch Business Data → 
  Format Context → 
  Call AI (Nvidia NIM) → 
  Parse Response → 
  Execute Actions (if needed) → 
  Return to Ava
```

## UI Changes

### Current Widget
- Floating bubble (bottom-right)
- Chat interface
- Voice toggle
- Language selector

### Upgraded Widget
- Floating bubble with "Ava" branding
- Chat interface with business metrics
- Briefing panel (collapsible)
- Quick action buttons
- Voice toggle with Neerja voice
- Admin vs User view

### New Components
1. `BriefingCard` - Shows daily summary
2. `MetricCard` - Revenue, leads, pipeline
3. `ActionButton` - Quick business actions
4. `ContextPanel` - Business context display

## Commands Enhancement

### Current Commands (40+)
- Navigation: "open dashboard", "go to leads"
- Actions: "send whatsapp", "call customer"

### New Executive Commands
- "Good morning" → Daily briefing
- "Revenue update" → Sales performance
- "Hot leads" → Priority leads
- "Pipeline status" → Deal overview
- "Recommendations" → AI suggestions
- "Stuck deals" → Problem deals
- "Follow up reminders" → Pending follow-ups
- "Team performance" → Staff metrics

## Security Considerations
- Business data isolation (multi-tenant)
- Role-based access (admin sees more than user)
- Sensitive data masking in responses
- API rate limiting on intelligence endpoints

## Testing Strategy
1. Unit tests for intelligence service
2. API endpoint tests
3. Voice command tests
4. N8N webhook tests
5. UI component tests

## Rollback Plan
- Keep JimiAssistant as backup
- Feature flag for Ava vs Jimi
- Gradual rollout per business

## Success Metrics
- Response time < 2 seconds
- Voice recognition accuracy > 90%
- Daily briefing generation < 5 seconds
- User satisfaction score > 4/5

## Timeline
- Day 1-2: Backend intelligence service
- Day 3-4: API routes + N8N integration
- Day 5-6: Frontend upgrade
- Day 7: Testing + polish
