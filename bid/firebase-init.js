/* ============================================================
   Firebase 初始化（所有竞标页面共用）
   使用 compat SDK，不需要打包工具，直接用 <script> 载入即可。
   ============================================================ */
(function () {
  if (!window.firebase) {
    console.error('Firebase SDK 未载入，请检查 index.html 内的 <script> 顺序。');
    return;
  }
  if (!window.FIREBASE_CONFIG || window.FIREBASE_CONFIG.apiKey === 'YOUR_API_KEY') {
    document.addEventListener('DOMContentLoaded', function () {
      var el = document.createElement('div');
      el.style.cssText =
        'position:fixed;inset:0;z-index:99999;background:#0c0b0a;color:#f4efe6;' +
        'display:flex;align-items:center;justify-content:center;text-align:center;' +
        'font-family:sans-serif;padding:40px;line-height:1.8;';
      el.innerHTML =
        '<div><p style="font-size:1.3rem;margin-bottom:12px;color:#e2cc9b;">⚠ 尚未设置 Firebase</p>' +
        '<p>请打开 <code>bid/firebase-config.js</code>，填入你的 Firebase 项目设置。</p></div>';
      document.body.appendChild(el);
    });
    return;
  }

  firebase.initializeApp(window.FIREBASE_CONFIG);
  window.db = firebase.firestore();

  // 匿名登录：让 Firestore 的安全规则可以用 request.auth != null 做基本防护
  window.authReady = new Promise(function (resolve, reject) {
    firebase.auth().onAuthStateChanged(function (user) {
      if (user) resolve(user);
    });
    firebase.auth().signInAnonymously().catch(function (err) {
      console.error('匿名登录失败', err);
      reject(err);
    });
  });
})();
