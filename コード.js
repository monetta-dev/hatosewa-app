const props = PropertiesService.getScriptProperties();
const ACCESS_TOKEN = props.getProperty('LINE_ACCESS_TOKEN');
const CALENDAR_ID = props.getProperty('CALENDAR_ID');
const SPREADSHEET = SpreadsheetApp.getActiveSpreadsheet();

/**
 * LINEからのイベントを受け取る (Webhook)
 */
function doPost(e) {
  const event = JSON.parse(e.postData.contents).events[0];
  const userId = event.source.userId;
  const replyToken = event.replyToken;
  const sheet = SPREADSHEET.getSheetByName('名簿');

  // 1. 友達追加時
  if (event.type === 'follow') {
    handleFollow(userId, replyToken, sheet);
  } 
  
  // 2. メッセージ受信時
  else if (event.type === 'message' && event.message.type === 'text') {
    handleMessage(event, userId, replyToken, sheet);
  }
}

// 友達追加時の処理
function handleFollow(userId, replyToken, sheet) {
  const url = `https://api.line.me/v2/bot/profile/${userId}`;
  const profile = JSON.parse(UrlFetchApp.fetch(url, {
    headers: { 'Authorization': `Bearer ${ACCESS_TOKEN}` }
  }));

  // 重複チェックして名簿に追加
  const data = sheet.getDataRange().getValues();
  const exists = data.some(row => row[2] === userId);
  if (!exists) {
    sheet.appendRow(["(未登録)", profile.displayName, userId]);
  }

  const msg = "友達登録ありがとうございます！🕊️\n下のメニューの「名前登録」ボタンを押して、あなたのマジシャンズネームを送信してください。";
  replyMessage(replyToken, msg);
}

// メッセージ受信時の処理
function handleMessage(event, userId, replyToken, sheet) {
  const userMsg = event.message.text;
  const data = sheet.getDataRange().getValues();
  const rowIndex = data.findIndex(row => row[2] === userId);

  // リッチメニューのボタン（テキスト: 名前登録）が押された直後の処理
  if (userMsg === "名前登録") {
    replyMessage(replyToken, "マジシャンズネームを入力して送信してください。");
  } else {
    // 直前のメッセージが「名前登録」だった場合や、未登録状態なら登録処理を行う
    // ここではシンプルに「未登録」の場合に上書きするロジックにしています
    if (rowIndex !== -1 && (data[rowIndex][0] === "(未登録)" || data[rowIndex][0] === "")) {
      sheet.getRange(rowIndex + 1, 1).setValue(userMsg);
      replyMessage(replyToken, `「${userMsg}」さんで登録完了しました！\n当番の日はお昼にお知らせします。`);
    }
  }
}

/**
 * カレンダー一括登録 (スプレッドシートのボタンから実行)
 */
function syncToCalendar() {
  const sheet = SPREADSHEET.getSheetByName('当番表');
  const data = sheet.getDataRange().getValues();
  const calendar = CalendarApp.getCalendarById(CALENDAR_ID);

  for (let i = 1; i < data.length; i++) {
    const [date, name] = data[i];
    if (!date || !name) continue;
    calendar.createAllDayEvent(`鳩当番：${name}`, new Date(date));
  }
  Browser.msgBox("カレンダーへの登録が完了しました！");
}

/**
 * 当番通知バッチ (毎日12時に実行されるようトリガー設定)
 */
function sendDailyReminder() {
  const today = new Date();
  const calendar = CalendarApp.getCalendarById(CALENDAR_ID);
  const events = calendar.getEventsForDay(today);
  
  const event = events.find(e => e.getTitle().startsWith("鳩当番："));
  if (!event) return;

  const magicianName = event.getTitle().split('：')[1];
  const meiboData = SPREADSHEET.getSheetByName('名簿').getDataRange().getValues();
  const target = meiboData.find(row => row[0] === magicianName);

  if (target) {
    pushMessage(target[2], `【鳩世話】本日の当番は ${magicianName} さんです。よろしくお願いします！🕊️`);
  }
}

// 送信補助関数
function replyMessage(token, text) {
  UrlFetchApp.fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'post',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ACCESS_TOKEN}` },
    payload: JSON.stringify({ replyToken: token, messages: [{ type: 'text', text: text }] })
  });
}

function pushMessage(userId, text) {
  UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', {
    method: 'post',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ACCESS_TOKEN}` },
    payload: JSON.stringify({ to: userId, messages: [{ type: 'text', text: text }] })
  });
}

/**
 * スプレッドシートの初期設定（見出し作成とプルダウン設定）を行う関数
 */
function setupSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. 名簿シートの作成と見出し
  let meiboSheet = ss.getSheetByName('名簿');
  if (!meiboSheet) meiboSheet = ss.insertSheet('名簿');
  meiboSheet.getRange("A1:C1").setValues([["マジシャンズネーム", "LINE表示名", "LINEユーザーID"]]);
  meiboSheet.setFrozenRows(1); // 1行目を固定

  // 2. 当番表シートの作成と見出し
  let dutySheet = ss.getSheetByName('当番表');
  if (!dutySheet) dutySheet = ss.insertSheet('当番表');
  dutySheet.getRange("A1:B1").setValues([["日付", "当番名"]]);
  dutySheet.setFrozenRows(1);

  // 3. プルダウン（入力規則）の設定
  // 名簿シートのA2:A100を範囲にする
  const nameRange = meiboSheet.getRange("A2:A1000");
  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInRange(nameRange)
    .build();
  
  // 当番表シートのB2:B100に適用
  dutySheet.getRange("B2:B1000").setDataValidation(rule);

  Browser.msgBox("初期設定が完了しました！");
}