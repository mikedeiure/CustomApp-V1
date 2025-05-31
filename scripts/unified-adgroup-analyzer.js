// Unified Ad Group Analyzer - Google Apps Script
// This script both collects data from Google Ads API and serves it via web app

// Configuration
const SHEET_NAME = 'AdGroupDaily';
const SPREADSHEET_ID = ''; // Leave empty to auto-create, or put your spreadsheet ID here

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

// Function to get or create spreadsheet
function getOrCreateSpreadsheet() {
  let ss;
  
  if (SPREADSHEET_ID && SPREADSHEET_ID.trim() !== '') {
    try {
      ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      Logger.log(`📊 Using existing spreadsheet: ${ss.getName()}`);
    } catch (e) {
      Logger.log(`❌ Could not open spreadsheet with ID: ${SPREADSHEET_ID}`);
      throw new Error(`Could not open spreadsheet with ID: ${SPREADSHEET_ID}`);
    }
  } else {
    // Create new spreadsheet
    ss = SpreadsheetApp.create('Ad Group Analysis - ' + Utilities.formatDate(new Date(), "GMT", "yyyy-MM-dd"));
    Logger.log(`✅ Created new spreadsheet: ${ss.getName()}`);
    Logger.log(`📋 Spreadsheet URL: ${ss.getUrl()}`);
    Logger.log(`🆔 Spreadsheet ID: ${ss.getId()}`);
  }
  
  return ss;
}

// Function to collect and store ad group data
function collectAdGroupData() {
  try {
    Logger.log("🚀 Starting Ad Group Data Collection...");
    
    const dateRange = getDateRange();
    Logger.log(`📅 Analyzing data from ${dateRange.startDate} to ${dateRange.endDate} (last 12 months)`);
    
    // Get or create spreadsheet
    const ss = getOrCreateSpreadsheet();
    
    // Get or create the ad group sheet
    let sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      Logger.log(`📄 Created new sheet: ${SHEET_NAME}`);
    } else {
      Logger.log(`📄 Using existing sheet: ${SHEET_NAME}`);
    }
    
    // GAQL query for ad group data
    const query = `
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

    Logger.log("🔍 Executing Google Ads query...");
    const report = AdsApp.report(query);
    const rows = report.rows();
    
    // Prepare data array
    const data = [];
    const headers = [
      'Ad Group Name',
      'Campaign Name', 
      'Date',
      'Cost',
      'Conversions',
      'Cost per Conversion',
      'Campaign Target CPA',
      'Ad Group Target CPA'
    ];
    
    // Add headers
    data.push(headers);
    
    let rowCount = 0;
    while (rows.hasNext()) {
      const row = rows.next();
      rowCount++;
      
      const cost = parseFloat(row['metrics.cost_micros']) / 1000000;
      const conversions = parseFloat(row['metrics.conversions']);
      const costPerConversion = conversions > 0 ? cost / conversions : 0;
      
      // Handle target CPA values
      const campaignTargetCpa = row['campaign.target_cpa.target_cpa_micros'] 
        ? parseFloat(row['campaign.target_cpa.target_cpa_micros']) / 1000000 
        : 'Not Set';
      
      const adGroupTargetCpa = row['ad_group.target_cpa_micros'] 
        ? parseFloat(row['ad_group.target_cpa_micros']) / 1000000 
        : 'Not Set';
      
      data.push([
        row['ad_group.name'],
        row['campaign.name'],
        row['segments.date'],
        cost,
        conversions,
        costPerConversion,
        campaignTargetCpa,
        adGroupTargetCpa
      ]);
    }
    
    Logger.log(`📊 Processed ${rowCount} rows of data`);
    
    // Clear existing data and write new data
    sheet.clear();
    if (data.length > 0) {
      const range = sheet.getRange(1, 1, data.length, data[0].length);
      range.setValues(data);
      
      // Format the sheet
      formatSheet(sheet, data.length);
      
      Logger.log(`✅ Successfully wrote ${data.length} rows to ${SHEET_NAME} sheet`);
    } else {
      Logger.log("⚠️ No data found for the specified date range");
    }
    
    // Add a settings sheet for the web app
    createSettingsSheet(ss);
    
    Logger.log("🎉 Ad Group data collection completed successfully!");
    return ss.getUrl();
    
  } catch (error) {
    Logger.log(`❌ Error in collectAdGroupData: ${error.toString()}`);
    throw error;
  }
}

// Function to format the sheet
function formatSheet(sheet, dataLength) {
  // Format headers
  const headerRange = sheet.getRange(1, 1, 1, 8);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#4285f4');
  headerRange.setFontColor('white');
  
  if (dataLength > 1) {
    // Format currency columns (Cost, Cost per Conversion, Target CPA columns)
    const costColumn = sheet.getRange(2, 4, dataLength - 1, 1);
    const cpcColumn = sheet.getRange(2, 6, dataLength - 1, 1);
    const campaignTargetCpaColumn = sheet.getRange(2, 7, dataLength - 1, 1);
    const adGroupTargetCpaColumn = sheet.getRange(2, 8, dataLength - 1, 1);
    
    costColumn.setNumberFormat("$#,##0.00");
    cpcColumn.setNumberFormat("$#,##0.00");
    
    // Format Target CPA columns (handle mixed data types)
    try {
      campaignTargetCpaColumn.setNumberFormat("$#,##0.00");
      adGroupTargetCpaColumn.setNumberFormat("$#,##0.00");
    } catch (e) {
      Logger.log("Note: Some Target CPA values are text ('Not Set') and cannot be formatted as currency");
    }
    
    // Format conversions column
    const conversionsColumn = sheet.getRange(2, 5, dataLength - 1, 1);
    conversionsColumn.setNumberFormat("#,##0.00");
  }
  
  // Auto-resize columns
  sheet.autoResizeColumns(1, 8);
}

// Function to create settings sheet for web app
function createSettingsSheet(ss) {
  let settingsSheet = ss.getSheetByName('settings');
  if (!settingsSheet) {
    settingsSheet = ss.insertSheet('settings');
    
    // Add some basic settings data
    const settingsData = [
      ['Setting', 'Value'],
      ['Last Updated', new Date()],
      ['Data Source', 'Google Ads API'],
      ['Date Range', 'Last 12 Months'],
      ['Sheet Name', SHEET_NAME]
    ];
    
    settingsSheet.getRange(1, 1, settingsData.length, 2).setValues(settingsData);
    
    // Format headers
    const headerRange = settingsSheet.getRange(1, 1, 1, 2);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#34a853');
    headerRange.setFontColor('white');
    
    settingsSheet.autoResizeColumns(1, 2);
    Logger.log("📋 Created settings sheet for web app");
  }
}

// Web App function - serves data via HTTP
function doGet(e) {
  try {
    const ss = getOrCreateSpreadsheet();
    const tabName = e.parameter.tab || 'settings';
    
    // Get the sheet by name
    const sheet = ss.getSheetByName(tabName);
    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({
        error: 'Sheet not found: ' + tabName
      }))
      .setMimeType(ContentService.MimeType.JSON);
    }

    // Get data from the sheet
    const data = sheet.getDataRange().getValues();
    if (data.length === 0) {
      return ContentService.createTextOutput(JSON.stringify([]))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    const headers = data.shift();
    const jsonData = data.map(function(row) {
      const obj = {};
      headers.forEach(function(header, index) {
        obj[header] = row[index];
      });
      return obj;
    });

    return ContentService.createTextOutput(JSON.stringify(jsonData))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      error: 'Server error: ' + error.toString()
    }))
    .setMimeType(ContentService.MimeType.JSON);
  }
}

// Function to manually trigger data collection (for testing)
function main() {
  collectAdGroupData();
}

// Function to set up automated data collection
function setupTrigger() {
  // Delete existing triggers
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'collectAdGroupData') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  // Create new daily trigger
  ScriptApp.newTrigger('collectAdGroupData')
    .timeBased()
    .everyDays(1)
    .atHour(8) // Run at 8 AM
    .create();
    
  Logger.log("✅ Set up daily trigger for data collection at 8 AM");
} 