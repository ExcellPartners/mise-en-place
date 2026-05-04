
/**
 * MISE EN PLACE - AUTOMATED LEDGER PUSH
 * Copy this script to Extensions > Apps Script in your linked Google Sheet.
 * 
 * Be sure to:
 * 1. Update your FIREBASE_SERVER_KEY (or Push Service Key)
 * 2. Set up an Installable Trigger for 'onEdit'
 */

const PUSH_ENDPOINT = 'https://fcm.googleapis.com/fcm/send'; // Or your custom Push Relay
const FIREBASE_SERVER_KEY = 'YOUR_SERVER_KEY'; 

function onEdit(e) {
  const sheet = e.source.getActiveSheet();
  const range = e.range;
  
  // Monitoring the 'Ingredients' tab
  if (sheet.getName() === 'Ingredients' && range.getColumn() === 4) { // Assumes Column 4 is Stock Level
    const newValue = e.value;
    const oldValue = e.oldValue;
    const ingredientName = sheet.getRange(range.getRow(), 1).getValue();
    
    // Logic: If stock drops below 1 unit, trigger alert
    if (newValue < 1 && oldValue >= 1) {
      sendNotificationToAllDevices(
        'Low Stock Alert: ' + ingredientName,
        'Your ' + ingredientName + ' level has dropped below the ledger threshold.'
      );
    }
  }
}

function sendNotificationToAllDevices(title, body) {
  const userSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Users');
  if (!userSheet) return;
  
  const data = userSheet.getDataRange().getValues();
  // Skip headers
  for (let i = 1; i < data.length; i++) {
    const token = data[i][1]; // Column B is the JSON PushSubscription
    if (token) {
      triggerPush(token, title, body);
    }
  }
}

function triggerPush(subscriptionJson, title, body) {
  // Parsing the subscription object stored by the App
  const sub = JSON.parse(subscriptionJson);
  
  const payload = {
    notification: {
      title: title,
      body: body,
      click_action: 'https://mise-en-place.local/'
    },
    to: sub.endpoint // Simplified for generic push; FCM uses tokens directly
  };
  
  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'Authorization': 'key=' + FIREBASE_SERVER_KEY
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  
  try {
    UrlFetchApp.fetch(PUSH_ENDPOINT, options);
    console.log('Notification dispatched to device.');
  } catch (err) {
    console.error('Push Dispatch Failed:', err);
  }
}
