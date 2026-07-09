import { Platform } from 'react-native';

// Web Push用の公開VAPIDキー（仮のキー。本番環境ではサーバーで生成したものを環境変数から取得します）
const PUBLIC_VAPID_KEY = 'BA_xxxx_dummy_key_for_web_push';

/**
 * VAPIDキーをUint8Arrayに変換するユーティリティ
 */
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Service Workerの登録とWeb Pushの購読処理
 */
export async function registerWebPush() {
  if (Platform.OS !== 'web') return null;

  if ('serviceWorker' in navigator && 'PushManager' in window) {
    try {
      // Service Workerの登録
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered successfully');

      // 通知権限の確認とリクエスト
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.warn('Notification permission not granted');
        return null;
      }

      // 既存の購読を確認
      let subscription = await registration.pushManager.getSubscription();
      
      // 未購読の場合は新規購読
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY)
        });
        console.log('New Web Push subscription created:', subscription);
        
        // TODO: ここで subscription オブジェクトをバックエンド（API）に送信し、DBに保存する
        // await api.notifications.saveSubscription(subscription);
      } else {
        console.log('Already subscribed to Web Push:', subscription);
      }

      return subscription;
    } catch (error) {
      console.error('Error during Web Push registration:', error);
      return null;
    }
  }

  console.warn('Web Push is not supported in this browser');
  return null;
}
