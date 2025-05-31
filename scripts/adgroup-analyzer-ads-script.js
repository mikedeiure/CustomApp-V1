const SHEET_URL = '';                     // add your sheet url here
const AD_GROUP_TAB = 'AdGroupDaily';

// Function to get date range for last 12 months
function getDateRange() {
  const today = new Date();
  const endDate = Utilities.formatDate(today, "GMT", "yyyy-MM-dd");
  
  // Calculate 12 months ago
  const startDate = new Date(today);
  startDate.setMonth(startDate.getMonth() - 12);
  const formattedStartDate = Utilities.formatDate(startDate, "GMT", "yyyy-MM-dd");
  
  return {
    startDate: formattedStartDate,
    endDate: endDate
  };
}

// GAQL query for ad group daily data - dynamically uses last 12 months
function getAdGroupQuery() {
  const dateRange = getDateRange();
  
  return `
SELECT
  ad_group.name,
  campaign.name,
  metrics.cost_micros,
  metrics.conversions,
  metrics.impressions,
  metrics.clicks,
  segments.date,
  campaign.bidding_strategy_type,
  campaign.target_cpa.target_cpa_micros,
  ad_group.target_cpa_micros
FROM ad_group
WHERE segments.date BETWEEN '${dateRange.startDate}' AND '${dateRange.endDate}'
  AND campaign.advertising_channel_type = "SEARCH"
ORDER BY segments.date DESC, metrics.cost_micros DESC
`;
}

function main() {
  try {
    Logger.log("🚀 Starting Ad Group Analysis...");
    
    // Log the date range being used
    const dateRange = getDateRange();
    Logger.log(`📅 Analyzing data from ${dateRange.startDate} to ${dateRange.endDate} (last 12 months)`);
    
    // Access the Google Sheet
    let ss;
    if (!SHEET_URL) {
      ss = SpreadsheetApp.create("Ad Group Analysis Report");
      let url = ss.getUrl();
      Logger.log("No SHEET_URL found, so this sheet was created: " + url);
    } else {
      ss = SpreadsheetApp.openByUrl(SHEET_URL);
    }

    // Process Ad Group tab - Simplified headers matching the pattern
    processTab(
      ss,
      AD_GROUP_TAB,
      // Headers: simplified for easy consumption
      ["ad_group", "campaign", "date", "cost", "conv", "cost_per_conv", "impr", "clicks", "adgroup_target_cpa"],
      getAdGroupQuery(),
      processAdGroupData
    );

    Logger.log("🎉 Ad Group analysis completed successfully!");

  } catch (e) {
    Logger.log("❌ Error in main function: " + e);
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
      Logger.log("✅ Successfully wrote " + data.length + " rows to the " + tabName + " sheet.");
      
      // Format currency columns
      formatSheet(sheet, data.length);
      
    } else {
      Logger.log("⚠️ No data found for " + tabName + ".");
    }
  } catch (e) {
    Logger.log("❌ Error in processTab function for " + tabName + ": " + e);
  }
}

function processAdGroupData(rows) {
  const data = [];
  while (rows.hasNext()) {
    const row = rows.next();
    
    // Extract data according to the simplified headers
    const adGroup = String(row['ad_group.name'] || '');
    const campaign = String(row['campaign.name'] || '');
    const date = String(row['segments.date'] || '');
    const costMicros = Number(row['metrics.cost_micros'] || 0);
    const cost = costMicros / 1000000;  // Convert micros to actual currency
    const conv = Number(row['metrics.conversions'] || 0);
    const impr = Number(row['metrics.impressions'] || 0);
    const clicks = Number(row['metrics.clicks'] || 0);
    
    // Calculate cost per conversion
    const costPerConv = conv > 0 ? cost / conv : 0;
    
    // Handle ad group target CPA value - simplified to number or 0
    const adGroupTargetCpaMicros = row['ad_group.target_cpa_micros'];
    const adGroupTargetCpa = adGroupTargetCpaMicros ? Number(adGroupTargetCpaMicros) / 1000000 : 0;

    // Create a new row matching the simplified headers
    const newRow = [adGroup, campaign, date, cost, conv, costPerConv, impr, clicks, adGroupTargetCpa];

    // Push new row to the data array
    data.push(newRow);
  }
  return data;
}

function formatSheet(sheet, dataLength) {
  if (dataLength > 1) {
    // Format currency columns (cost, cost_per_conv, adgroup target CPA)
    const costColumn = sheet.getRange(2, 4, dataLength - 1, 1);        // cost
    const costPerConvColumn = sheet.getRange(2, 6, dataLength - 1, 1); // cost_per_conv
    const adGroupTargetCpaColumn = sheet.getRange(2, 9, dataLength - 1, 1);  // adgroup_target_cpa
    
    costColumn.setNumberFormat("$#,##0.00");
    costPerConvColumn.setNumberFormat("$#,##0.00");
    adGroupTargetCpaColumn.setNumberFormat("$#,##0.00");
    
    // Format number columns
    const convColumn = sheet.getRange(2, 5, dataLength - 1, 1);        // conv
    const imprColumn = sheet.getRange(2, 7, dataLength - 1, 1);        // impr
    const clicksColumn = sheet.getRange(2, 8, dataLength - 1, 1);      // clicks
    
    convColumn.setNumberFormat("#,##0.00");
    imprColumn.setNumberFormat("#,##0");
    clicksColumn.setNumberFormat("#,##0");
  }
  
  // Auto-resize columns
  sheet.autoResizeColumns(1, 9);
} 