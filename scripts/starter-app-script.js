const SHEET_URL = '';                     // add your sheet url here
const SEARCH_TERMS_TAB = 'SearchTerms';
const DAILY_TAB = 'Daily';
const KEYWORDS_TAB = 'Keywords';


// GAQL query for search terms
const SEARCH_TERMS_QUERY = `
SELECT 
  search_term_view.search_term,
  search_term_view.status,
  campaign.name,
  ad_group.name,
  metrics.impressions, 
  metrics.clicks, 
  metrics.cost_micros, 
  metrics.conversions, 
  metrics.conversions_value
FROM search_term_view
WHERE segments.date DURING LAST_30_DAYS
  AND campaign.advertising_channel_type = "SEARCH"
  AND metrics.impressions >= 30
ORDER BY metrics.cost_micros DESC
`;

// GAQL query for daily campaign data
const DAILY_QUERY = `
SELECT
  campaign.name,
  campaign.id,
  metrics.clicks,
  metrics.conversions_value,
  metrics.conversions,
  metrics.cost_micros,
  metrics.impressions,
  segments.date
FROM campaign
WHERE segments.date DURING LAST_30_DAYS
ORDER BY segments.date DESC, metrics.cost_micros DESC
`;

// GAQL query for keywords data
const KEYWORDS_QUERY = `
SELECT
  campaign.name,
  ad_group.name,
  ad_group_criterion.keyword.text,
  ad_group_criterion.keyword.match_type,
  ad_group_criterion.status,
  metrics.impressions,
  metrics.clicks,
  metrics.cost_micros,
  metrics.conversions,
  metrics.conversions_value
FROM keyword_view
WHERE segments.date DURING LAST_30_DAYS
  AND campaign.advertising_channel_type = "SEARCH"
  AND ad_group_criterion.type = "KEYWORD"
ORDER BY metrics.cost_micros DESC
`;

// GAQL query for search terms with keywords (alternative approach)
const SEARCH_TERMS_WITH_KEYWORDS_QUERY = `
SELECT 
  search_term_view.search_term,
  search_term_view.status,
  campaign.name,
  ad_group.name,
  metrics.impressions, 
  metrics.clicks, 
  metrics.cost_micros, 
  metrics.conversions, 
  metrics.conversions_value
FROM search_term_view
WHERE segments.date DURING LAST_30_DAYS
  AND campaign.advertising_channel_type = "SEARCH"
  AND metrics.impressions >= 30
ORDER BY metrics.cost_micros DESC
`;

function main() {
  try {
    // Access the Google Sheet
    let ss;
    if (!SHEET_URL) {
      ss = SpreadsheetApp.create("Google Ads Report");
      let url = ss.getUrl();
      Logger.log("No SHEET_URL found, so this sheet was created: " + url);
    } else {
      ss = SpreadsheetApp.openByUrl(SHEET_URL);
    }

    // Process Search Terms tab - Simplified headers
    processTab(
      ss,
      SEARCH_TERMS_TAB,
      // Headers: Only core metrics + identifiers
      ["search_term", "status", "campaign", "ad_group", "impr", "clicks", "cost", "conv", "value"],
      SEARCH_TERMS_QUERY,
      calculateSearchTermsMetrics // Still use this, but it will be simplified
    );

    // Process Daily tab - Simplified headers
    processTab(
      ss,
      DAILY_TAB,
      // Headers: Only core metrics + identifiers
      ["campaign", "campaignId", "impr", "clicks", "cost", "conv", "value", "date"],
      DAILY_QUERY,
      processDailyData // This function already returns data mostly in this format
    );

    // Process Keywords tab
    processTab(
      ss,
      KEYWORDS_TAB,
      // Headers: keyword info + core metrics
      ["campaign", "ad_group", "keyword", "match_type", "status", "impr", "clicks", "cost", "conv", "value"],
      KEYWORDS_QUERY,
      processKeywordsData
    );

  } catch (e) {
    Logger.log("Error in main function: " + e);
  }
}

function processTab(ss, tabName, headers, query, dataProcessor) {
  try {
    // Get or create the tab
    let sheet = ss.getSheetByName(tabName);
    if (!sheet) {
      sheet = ss.insertSheet(tabName);
    } else {
      // Clear existing data
      sheet.clearContents();
    }

    // Set headers
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight("bold");

    // Run the query
    const report = AdsApp.report(query);
    const rows = report.rows();

    // Process data
    const data = dataProcessor(rows);

    // Write data to sheet (only if we have data)
    if (data.length > 0) {
      sheet.getRange(2, 1, data.length, data[0].length).setValues(data);
      Logger.log("Successfully wrote " + data.length + " rows to the " + tabName + " sheet.");
    } else {
      Logger.log("No data found for " + tabName + ".");
    }
  } catch (e) {
    Logger.log("Error in processTab function for " + tabName + ": " + e);
  }
}

function calculateSearchTermsMetrics(rows) {
  const data = [];
  while (rows.hasNext()) {
    const row = rows.next();
    const searchTerm = row['search_term_view.search_term'];
    const status = row['search_term_view.status'];
    const campaign = row['campaign.name'];
    const adGroup = row['ad_group.name'];
    const impr = parseInt(row['metrics.impressions'], 10) || 0;
    const clicks = parseInt(row['metrics.clicks'], 10) || 0;
    const costMicros = parseInt(row['metrics.cost_micros'], 10) || 0;
    const conv = parseFloat(row['metrics.conversions']) || 0;
    const value = parseFloat(row['metrics.conversions_value']) || 0;

    const cost = costMicros / 1000000;

    const newRow = [searchTerm, status, campaign, adGroup, impr, clicks, cost, conv, value];

    data.push(newRow);
  }
  return data;
}

function processDailyData(rows) {
  const data = [];
  while (rows.hasNext()) {
    const row = rows.next();

    // Extract data according to the simplified headers
    const campaign = String(row['campaign.name'] || '');
    const campaignId = String(row['campaign.id'] || '');
    const impr = Number(row['metrics.impressions'] || 0);
    const clicks = Number(row['metrics.clicks'] || 0);
    const costMicros = Number(row['metrics.cost_micros'] || 0);
    const cost = costMicros / 1000000;  // Convert micros to actual currency
    const conv = Number(row['metrics.conversions'] || 0);
    const value = Number(row['metrics.conversions_value'] || 0);
    const date = String(row['segments.date'] || '');

    // Create a new row matching the simplified Daily headers
    const newRow = [campaign, campaignId, impr, clicks, cost, conv, value, date];

    // Push new row to the data array
    data.push(newRow);
  }
  return data;
}

function processKeywordsData(rows) {
  const data = [];
  while (rows.hasNext()) {
    const row = rows.next();
    const campaign = row['campaign.name'];
    const adGroup = row['ad_group.name'];
    const keyword = row['ad_group_criterion.keyword.text'];
    const matchType = row['ad_group_criterion.keyword.match_type'];
    const status = row['ad_group_criterion.status'];
    const impr = parseInt(row['metrics.impressions'], 10) || 0;
    const clicks = parseInt(row['metrics.clicks'], 10) || 0;
    const costMicros = parseInt(row['metrics.cost_micros'], 10) || 0;
    const conv = parseFloat(row['metrics.conversions']) || 0;
    const value = parseFloat(row['metrics.conversions_value']) || 0;

    const cost = costMicros / 1000000;

    const newRow = [campaign, adGroup, keyword, matchType, status, impr, clicks, cost, conv, value];

    data.push(newRow);
  }
  return data;
}
