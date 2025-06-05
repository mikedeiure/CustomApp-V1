# Product Requirements Document: Google Ads Data Insights Page

**Version:** 1.0  
**Date:** January 2025  
**Author:** Development Team  
**Project:** BTA Campaign Performance Dashboard

## 1. Introduction

The Data Insights page serves as an AI-powered analysis workspace for Google Ads campaign optimization. Users can explore their advertising data across campaign, ad group, and keyword levels, apply intelligent filters, and leverage Large Language Models (LLMs) to generate actionable optimization recommendations based on performance metrics. This feature transforms raw campaign data into strategic insights that drive better advertising decisions at every level of the Google Ads hierarchy.

## 2. Goals

* **AI-Powered Analysis:** Generate intelligent recommendations for Google Ads optimization using LLM analysis of campaign, ad group, and keyword performance data
* **Multi-Level Data Exploration:** Enable users to easily explore Daily performance metrics and Search Terms data across campaign, ad group, and keyword levels
* **Hierarchical Performance Insights:** Provide contextual analysis of key metrics like CTR, CPC, ROAS, CPA, and conversion rates at campaign, ad group, and keyword levels
* **Granular Recommendations:** Deliver specific, implementable suggestions for campaign structure, ad group optimization, and keyword performance enhancement
* **Cost Optimization:** Identify opportunities to reduce costs while maintaining or improving performance across all levels
* **ROI Enhancement:** Suggest strategies to improve Return on Ad Spend (ROAS) and overall campaign profitability through hierarchical optimization

## 3. Target Users

* **PPC Managers:** Campaign managers seeking data-driven optimization strategies
* **Marketing Professionals:** Marketers needing intelligent insights for campaign performance improvement
* **Account Strategists:** Users who require AI-assisted analysis for client reporting and strategic planning
* **Business Owners:** Advertisers looking for clear, actionable recommendations to improve their Google Ads ROI

## 4. Key Features & Functional Requirements

### 4.1. Data Source Integration

* **FR4.1.1:** Integrate with existing data store (`useSettings` context) to access Daily and Search Terms data
* **FR4.1.2:** Support multi-level data source selection:
  * **Campaign Level:** Daily Performance Metrics (campaign-level daily aggregated data)
  * **Ad Group Level:** Ad Group Performance (ad group-level metrics within campaigns)
  * **Keyword Level:** Search Terms Performance (keyword-level search query data)
* **FR4.1.3:** Automatically derive column definitions from selected data source with hierarchical context:
  * **Campaign Data:** `campaign`, `campaignId`, `date`, `impr`, `clicks`, `cost`, `conv`, `value`, plus calculated metrics (`CTR`, `CPC`, `CvR`, `CPA`, `ROAS`)
  * **Ad Group Data:** `campaign`, `ad_group`, `adGroupId`, `date`, `impr`, `clicks`, `cost`, `conv`, `value`, plus calculated metrics
  * **Keyword Data:** `search_term`, `campaign`, `ad_group`, `keyword`, `match_type`, `impr`, `clicks`, `cost`, `conv`, `value`
* **FR4.1.4:** Default to Campaign Performance data when page loads if available
* **FR4.1.5:** Maintain hierarchical relationships and enable drill-down capabilities from campaign → ad group → keyword level

### 4.2. Multi-Level Campaign-Aware Filtering System

* **FR4.2.1:** Inherit campaign selection from global app state (`selectedCampaign` from settings)
* **FR4.2.2:** Support hierarchical filtering with Google Ads structure awareness:
  * **Campaign Level Filters:** Campaign name, campaign type, budget, status
  * **Ad Group Level Filters:** Ad group name, ad group status, target CPA, bid strategy
  * **Keyword Level Filters:** Search term, match type, keyword status, quality score
* **FR4.2.3:** Support advanced filtering with Google Ads specific operators:
  * **Text/Dimension fields:** Contains, Equals, Starts with, Ends with (case-insensitive)
  * **Numeric/Metric fields:** Greater than, Less than, Between, Top N performers, Bottom N performers
  * **Date fields:** Date range selection, Last N days, Custom date ranges
* **FR4.2.4:** Pre-configured smart filters for common optimization scenarios across all levels:
  * **Campaign Level:** "High Budget, Low ROAS", "Underperforming Campaigns"
  * **Ad Group Level:** "High Cost, Low Performance Ad Groups", "Ad Groups with High CPA"
  * **Keyword Level:** "Wasted Spend Keywords", "High Volume, Low Quality Keywords", "Top Performing Keywords"
* **FR4.2.5:** Filter validation to prevent nonsensical combinations and maintain hierarchical integrity

### 4.3. Multi-Level Google Ads Metrics Summary

* **FR4.3.1:** Display performance summary of filtered data with hierarchical breakdown:
  * **Campaign Level Metrics:** 
    * Volume: Total Campaigns, Total Impressions, Total Clicks, Total Conversions
    * Cost: Total Spend, Average Campaign CPC, Average Campaign CPA
    * Performance: Average Campaign CTR, Average Campaign Conversion Rate, Average Campaign ROAS
  * **Ad Group Level Metrics:**
    * Volume: Total Ad Groups, Ad Group Impressions, Ad Group Clicks
    * Performance: Best/Worst performing ad groups, Ad Group CTR distribution
  * **Keyword Level Metrics:**
    * Volume: Total Keywords, Keyword Impressions, Keyword Clicks
    * Performance: Top/Bottom performing keywords, Match type performance breakdown
* **FR4.3.2:** Hierarchical benchmark comparisons:
  * Campaign performance vs. account average
  * Ad group performance vs. campaign average
  * Keyword performance vs. ad group average
* **FR4.3.3:** Cross-level performance indicators showing optimization opportunities between levels

### 4.4. AI-Powered Multi-Level Optimization Insights

* **FR4.4.1:** LLM Integration supporting multiple providers:
  * Google Gemini Pro (primary for Google Ads alignment)
  * OpenAI GPT-4 (alternative)
  * Anthropic Claude 3 Sonnet (alternative)
* **FR4.4.2:** Context-aware prompt generation including hierarchical structure:
  * **Campaign Context:** Account structure, campaign types, budget allocation, business goals
  * **Ad Group Context:** Ad group structure, targeting settings, bid strategies
  * **Keyword Context:** Search term performance, match types, negative keyword opportunities
  * **Performance Data:** Multi-level filtered dataset with key metrics
  * **Hierarchical Relationships:** Campaign → Ad Group → Keyword performance correlations
* **FR4.4.3:** Pre-built optimization prompt templates for each level:
  * **Campaign Level:**
    * "Campaign Budget Optimization"
    * "Campaign Structure Analysis"
    * "Cross-Campaign Performance Comparison"
  * **Ad Group Level:**
    * "Ad Group Restructuring Opportunities"
    * "Ad Group Bid Strategy Optimization"
    * "Ad Group Targeting Refinement"
  * **Keyword Level:**
    * "Keyword Expansion Opportunities"
    * "Negative Keyword Recommendations"
    * "Match Type Optimization"
    * "Search Query Analysis"
  * **Cross-Level Analysis:**
    * "Account Structure Optimization"
    * "Budget Reallocation Across Levels"
    * "Custom Multi-Level Analysis"
* **FR4.4.4:** Generated insights must include level-specific recommendations:
  * **Executive Summary:** Overview of findings across campaign, ad group, and keyword levels
  * **Campaign Recommendations:** Budget, structure, and strategy improvements
  * **Ad Group Recommendations:** Targeting, bidding, and organization improvements
  * **Keyword Recommendations:** Expansion, negative keywords, and match type optimization
  * **Priority Ranking:** High/Medium/Low impact recommendations with level indicators
  * **Expected Impact:** Estimated improvement potential at each level
  * **Implementation Notes:** Step-by-step Google Ads implementation guidance for each level

### 4.5. Data Visualization and Export

* **FR4.5.1:** Enhanced data preview table with Google Ads specific formatting:
  * Proper currency formatting using account settings
  * Percentage formatting for rates (CTR, CvR)
  * Color coding for performance thresholds
* **FR4.5.2:** Export capabilities for insights and data:
  * PDF report generation for client presentation
  * CSV export of filtered data
  * Formatted insight reports for easy sharing

## 5. Technical Implementation

### 5.1. Architecture Integration

* **FR5.1.1:** Create new route at `/data-insights` using Next.js App Router
* **FR5.1.2:** Leverage existing type system from `src/lib/types.ts`:
  * Extend `AdMetric` and `SearchTermMetric` interfaces as needed
  * Create new `InsightRequest` and `InsightResponse` types
* **FR5.1.3:** Integrate with existing data flow through `useSettings` context
* **FR5.1.4:** Follow established naming conventions for Google Ads metrics

### 5.2. State Management

* **FR5.2.1:** Create `useDataInsights` hook managing:
  * Selected data source and filters
  * AI prompt configuration and LLM selection
  * Generated insights and analysis state
  * Loading states and error handling
* **FR5.2.2:** Maintain consistency with existing patterns in codebase
* **FR5.2.3:** Implement proper memoization for performance optimization

### 5.3. API Development

* **FR5.3.1:** Create AI insights API endpoint at `/api/insights`
* **FR5.3.2:** Support multiple LLM providers with failover logic
* **FR5.3.3:** Implement rate limiting and usage tracking
* **FR5.3.4:** Handle large datasets by sampling when necessary (max 1000 rows for AI analysis)

### 5.4. UI Components

* **FR5.4.1:** Reuse existing UI components from `src/components/ui/`
* **FR5.4.2:** Create specialized components:
  * `<InsightsGenerator />` - AI prompt interface
  * `<OptimizationRecommendations />` - Formatted insights display
  * `<SmartFilters />` - Google Ads specific filter presets
  * `<PerformanceSummary />` - Campaign metrics overview

## 6. Business Value & Success Metrics

### 6.1. Key Performance Indicators

* **Usage Metrics:**
  * Number of insights generated per user per week
  * Most popular filter combinations and prompt templates
  * Time spent on insights page vs. other sections
* **Business Impact:**
  * Improvement in ROAS after implementing recommendations
  * Reduction in wasted ad spend
  * User-reported satisfaction with recommendations
* **Technical Metrics:**
  * API response times for insight generation
  * Success rate of LLM API calls
  * User retention and feature adoption

### 6.2. Success Criteria

* Users generate at least 5 meaningful insights per week
* 80%+ of generated recommendations are rated as "actionable" by users
* Average insight generation time under 30 seconds
* 90%+ uptime for AI service integrations

## 7. Google Ads Specific Considerations

### 7.1. Metric Interpretation

* **FR7.1.1:** AI analysis should understand Google Ads context:
  * Industry benchmarks for CTR, CvR by campaign type
  * Seasonal patterns in advertising performance
  * Relationship between impression share and performance metrics
* **FR7.1.2:** Recommendations should align with Google Ads best practices:
  * Bid strategy optimization suggestions
  * Ad copy testing recommendations
  * Keyword match type optimization
  * Negative keyword suggestions

### 7.2. Currency and Localization

* **FR7.2.1:** Respect account currency settings from global configuration
* **FR7.2.2:** Format all cost-related insights with proper currency symbols
* **FR7.2.3:** Consider regional advertising patterns and best practices

## 8. Security and Privacy

* **FR8.1:** Ensure no sensitive campaign data is logged or stored permanently
* **FR8.2:** Implement proper API key management for LLM services
* **FR8.3:** Respect data privacy regulations for advertising data
* **FR8.4:** Provide option to exclude sensitive campaign data from AI analysis

## 9. Future Enhancements (Out of Scope v1.0)

* Automated A/B testing recommendations
* Integration with Google Ads API for direct campaign modifications
* Historical trend analysis and forecasting
* Competitive analysis integration
* Multi-account analysis and benchmarking
* Custom insight templates and saved configurations

## 10. Implementation Timeline

**Phase 1 (MVP):** Basic data exploration, filtering, and simple AI insights (4-6 weeks)
**Phase 2:** Advanced filtering, multiple LLM support, formatted recommendations (2-3 weeks)
**Phase 3:** Export capabilities, performance optimization, polish (1-2 weeks)

This PRD provides a comprehensive roadmap for creating a valuable AI-powered optimization tool specifically designed for Google Ads campaign management within the existing BTA Dashboard application. 