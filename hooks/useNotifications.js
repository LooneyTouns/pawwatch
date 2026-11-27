import { useState, useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';

const IS_WEB = Platform.OS === 'web';

// Native uniquement : afficher la notif même si l'app est au premier plan
if (!IS_WEB) {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList:   true,
        shouldPlaySound:  true,
        shouldSetBadge:   true,
      }),
    });
  } catch {}
}

export function useNotifications(userId) {
  const [expoPushToken, setExpoPushToken] = useState(null);
  const notificationListener = useRef();
  const responseListener     = useRef();

  useEffect(() => {
    if (IS_WEB) return; // expo-notifications non supporté sur web

    registerForPushNotificationsAsync(userId)
      .then(token => { if (token) setExpoPushToken(token); })
      .catch(() => {});

    try {
      notificationListener.current = Notifications.addNotificationReceivedListener(() => {});
      responseListener.current     = Notifications.addNotificationResponseReceivedListener(() => {});
    } catch {}

    return () => {
      try { notificationListener.current?.remove(); } catch {}
      try { responseListener.current?.remove();     } catch {}
    };
  }, [userId]);

  return { expoPushToken };
}

async function registerForPushNotificationsAsync(userId) {
  if (!Device.isDevice) return null;

  let finalStatus = 'undetermined';
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    finalStatus = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
  } catch { return null; }

  if (finalStatus !== 'granted') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('pawwatch', {
      name: 'PawWatch',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#C1714A',
    });
  }

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync();
    if (userId && token) {
      await supabase.from('users').update({ push_token: token }).eq('id', userId);
    }
    return token;
  } catch { return null; }
}

// ─── Notification locale immédiate ───────────────────────────────
export async function sendLocalNotification({ title, body }) {
  if (IS_WEB) {
    // Fallback : API Notification du navigateur
    if (typeof Notification === 'undefined') return;
    if (Notification.permission === 'default') {
      await Notification.requestPermission().catch(() => {});
    }
    if (Notification.permission === 'granted') {
      try { new Notification(title, { body, icon: '/assets/logo.a556ee6608e4a92b8c5e983ad71eecf2.png' }); } catch {}
    }
    return;
  }
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: true },
      trigger: null,
    });
  } catch {}
}

// ─── Rappel quotidien à 20h (natif uniquement) ───────────────────
export async function scheduleJournalReminder(gardienName) {
  if (IS_WEB) return; // Notifications planifiées impossibles sans Service Worker sur web
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🐾 Journal non rempli',
        body:  `${gardienName}, le journal de ce soir n'a pas encore été envoyé.`,
        data:  { screen: 'JournalForm' },
      },
      trigger: {
        type:   Notifications.SchedulableTriggerInputTypes.DAILY,
        hour:   20,
        minute: 0,
      },
    });
  } catch {}
}
