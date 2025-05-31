// Ad Group Web App Script - Google Apps Script
// This script serves ad group data from the Google Sheet via web app
// This should be created as a container-bound script (attached to the Google Sheet)

function doGet(e) {
  try {
    // Use the active spreadsheet (this script should be bound to the sheet)
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let tabName = e.parameter.tab || 'settings';
    
    // Handle settings tab
    if (tabName === 'settings') {
      return getSettingsData(ss);
    }
    
    // Map "daily" to "AdGroupDaily" for compatibility
    if (tabName === 'daily') {
      tabName = 'AdGroupDaily';
    }
    
    // Get the sheet by name
    const sheet = ss.getSheetByName(tabName);
    if (!sheet) {
      // Return empty array instead of error object to prevent app crashes
      return ContentService.createTextOutput(JSON.stringify([]))
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
    // Return empty array instead of error object to prevent app crashes
    return ContentService.createTextOutput(JSON.stringify([]))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getSettingsData(ss) {
  // Create basic settings data similar to campaign stats
  const settingsData = [
    {
      'Setting': 'Data Source',
      'Value': 'Google Ads API - Ad Groups'
    },
    {
      'Setting': 'Date Range', 
      'Value': 'Last 12 Months'
    },
    {
      'Setting': 'Last Updated',
      'Value': new Date().toISOString()
    },
    {
      'Setting': 'Available Tabs',
      'Value': 'AdGroupDaily'
    }
  ];

  return ContentService.createTextOutput(JSON.stringify(settingsData))
    .setMimeType(ContentService.MimeType.JSON);
}

// Helper function to test the web app
function testWebApp() {
  const testEvent = {
    parameter: {
      tab: 'AdGroupDaily'
    }
  };
  
  const result = doGet(testEvent);
  Logger.log(result.getContent());
} 