const SHEET_URL = '';                     // Leave empty to auto-create a new sheet
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
    Logger.log("Starting Google Ads Ad Group Analysis Script...");
    
    // Log the date range being used
    const dateRange = getDateRange();
    Logger.log(`📅 Analyzing data from ${dateRange.startDate} to ${dateRange.endDate} (last 12 months)`);
    
    // Access or create the Google Sheet
    let ss;
    if (!SHEET_URL || SHEET_URL.trim() === '') {
      Logger.log("No SHEET_URL provided, creating a new Google Sheet...");
      
      // Create a new sheet with a descriptive name including timestamp
      const timestamp = Utilities.formatDate(new Date(), "GMT", "yyyy-MM-dd_HH-mm");
      const sheetName = `Google Ads Ad Group Report - ${timestamp}`;
      
      ss = SpreadsheetApp.create(sheetName);
      const url = ss.getUrl();
      
      Logger.log("✅ New Google Sheet created successfully!");
      Logger.log("📊 Sheet Name: " + sheetName);
      Logger.log("🔗 Sheet URL: " + url);
      Logger.log("💡 Tip: Copy this URL and paste it into the SHEET_URL constant to reuse this sheet in future runs.");
      
    } else {
      Logger.log("Opening existing Google Sheet from URL...");
      try {
        ss = SpreadsheetApp.openByUrl(SHEET_URL);
        Logger.log("✅ Successfully opened existing sheet: " + ss.getName());
      } catch (e) {
        Logger.log("❌ Error opening sheet from URL: " + e);
        Logger.log("Creating a new sheet instead...");
        
        const timestamp = Utilities.formatDate(new Date(), "GMT", "yyyy-MM-dd_HH-mm");
        const sheetName = `Google Ads Ad Group Report - ${timestamp}`;
        ss = SpreadsheetApp.create(sheetName);
        Logger.log("✅ New Google Sheet created as fallback: " + ss.getUrl());
      }
    }

    // Process Ad Group tab
    Logger.log("Processing Ad Group data...");
    processTab(
      ss,
      AD_GROUP_TAB,
      ["Ad Group", "Campaign", "Date", "Cost ($)", "Conversions", "Cost per Conversion ($)", "Campaign Target CPA ($)", "Ad Group Target CPA ($)"],
      getAdGroupQuery(),
      processAdGroupData
    );

    Logger.log("🎉 Script completed successfully!");
    Logger.log("📊 You can view your report at: " + ss.getUrl());

  } catch (e) {
    Logger.log("❌ Error in main function: " + e);
    Logger.log("Stack trace: " + e.stack);
  }
}

function processTab(ss, tabName, headers, query, dataProcessor) {
  try {
    Logger.log(`Processing ${tabName} tab...`);
    
    // Get or create the tab
    let sheet = ss.getSheetByName(tabName);
    if (!sheet) {
      sheet = ss.insertSheet(tabName);
      Logger.log(`Created new tab: ${tabName}`);
    } else {
      // Clear existing data
      sheet.clearContents();
      Logger.log(`Cleared existing data in ${tabName} tab`);
    }

    // Set headers with formatting
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setValues([headers])
              .setFontWeight("bold")
              .setBackground("#4285f4")
              .setFontColor("white");

    Logger.log("Running Google Ads query...");
    
    // Run the query
    const report = AdsApp.report(query);
    const rows = report.rows();

    // Process data
    const data = dataProcessor(rows);

    // Write data to sheet (only if we have data)
    if (data.length > 0) {
      const dataRange = sheet.getRange(2, 1, data.length, data[0].length);
      dataRange.setValues(data);
      
      // Format currency columns (Cost, Cost per Conversion, and Target CPA columns)
      const costColumn = sheet.getRange(2, 4, data.length, 1);
      const cpcColumn = sheet.getRange(2, 6, data.length, 1);
      costColumn.setNumberFormat("$#,##0.00");
      cpcColumn.setNumberFormat("$#,##0.00");
      
      // Format Target CPA columns - need to handle both numbers and "Not Set" text
      const campaignTargetCpaColumn = sheet.getRange(2, 7, data.length, 1);
      const adGroupTargetCpaColumn = sheet.getRange(2, 8, data.length, 1);
      
      // Apply conditional formatting for Target CPA columns
      for (let i = 0; i < data.length; i++) {
        const rowNum = i + 2; // +2 because we start at row 2 and i is 0-indexed
        
        // Format Campaign Target CPA
        const campaignTargetCpaCell = sheet.getRange(rowNum, 7);
        if (typeof data[i][6] === 'number') {
          campaignTargetCpaCell.setNumberFormat("$#,##0.00");
        }
        
        // Format Ad Group Target CPA
        const adGroupTargetCpaCell = sheet.getRange(rowNum, 8);
        if (typeof data[i][7] === 'number') {
          adGroupTargetCpaCell.setNumberFormat("$#,##0.00");
        }
      }
      
      // Auto-resize columns
      sheet.autoResizeColumns(1, headers.length);
      
      Logger.log(`✅ Successfully wrote ${data.length} rows to the ${tabName} sheet.`);
    } else {
      Logger.log(`⚠️ No data found for ${tabName}.`);
      // Add a message in the sheet
      sheet.getRange(2, 1).setValue("No data found for the specified date range.");
    }
  } catch (e) {
    Logger.log(`❌ Error in processTab function for ${tabName}: ${e}`);
    Logger.log("Stack trace: " + e.stack);
  }
}

function processAdGroupData(rows) {
  const data = [];
  while (rows.hasNext()) {
    const row = rows.next();
    
    const adGroup = String(row['ad_group.name'] || '');
    const campaign = String(row['campaign.name'] || '');
    const date = String(row['segments.date'] || '');
    const costMicros = Number(row['metrics.cost_micros'] || 0);
    const cost = costMicros / 1000000;  // Convert micros to actual currency
    const conversions = Number(row['metrics.conversions'] || 0);
    
    // Calculate cost per conversion
    const costPerConversion = conversions > 0 ? cost / conversions : 0;
    
    // Get target CPA values
    const campaignTargetCpaMicros = Number(row['campaign.target_cpa.target_cpa_micros'] || 0);
    const adGroupTargetCpaMicros = Number(row['ad_group.target_cpa_micros'] || 0);
    
    // Convert target CPA from micros to actual currency
    const campaignTargetCpa = campaignTargetCpaMicros > 0 ? campaignTargetCpaMicros / 1000000 : null;
    const adGroupTargetCpa = adGroupTargetCpaMicros > 0 ? adGroupTargetCpaMicros / 1000000 : null;
    
    // Format target CPA values for display
    const campaignTargetCpaDisplay = campaignTargetCpa ? campaignTargetCpa : 'Not Set';
    const adGroupTargetCpaDisplay = adGroupTargetCpa ? adGroupTargetCpa : 'Not Set';

    const newRow = [
      adGroup, 
      campaign, 
      date, 
      cost, 
      conversions, 
      costPerConversion,
      campaignTargetCpaDisplay,
      adGroupTargetCpaDisplay
    ];
    data.push(newRow);
  }
  return data;
}
