// hooks/useNotifications.js — Notifications push avec Expo
import { useState, useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';

// Configuration globale : afficher la notif même si l'app est ouverte
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
} catch (e) {
  console.warn('setNotificationHandler non disponible:', e.message);
}

export function useNotifications(userId) {
  const [expoPushToken, setExpoPushToken] = useState(null);
  const [notification, setNotification] = useState(null);
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    registerForPushNotificationsAsync(userId)
      .then(token => { if (token) setExpoPushToken(token); })
      .catch(e => console.warn('Push token error:', e.message));

    try {
      notificationListener.current = Notifications.addNotificationReceivedListener(notif => {
        setNotification(notif);
      });
      responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
        console.log('Notif cliquée:', response);
      });
    } catch (e) {
      console.warn('Notification listeners non disponibles:', e.message);
    }

    return () => {
      try {
        if (notificationListener.current)
          Notifications.removeNotificationSubscription(notificationListener.current);
        if (responseListener.current)
          Notifications.removeNotificationSubscription(responseListener.current);
      } catch (e) {}
    };
  }, [userId]);

  return { expoPushToken, notification };
}

async function registerForPushNotificationsAsync(userId) {
  if (!Device.isDevice) {
    console.warn('Les notifs push nécessitent un vrai appareil.');
    return null;
  }

  let finalStatus = 'undetermined';
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
  } catch (e) {
    console.warn('Permissions notifs non disponibles:', e.message);
    return null;
  }

  if (finalStatus !== 'granted') {
    console.warn('Permission notifs refusée.');
    return null;
  }

  // Canal Android obligatoire
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
  } catch (e) {
    console.warn('Push token non disponible:', e.message);
    return null;
  }
}

// ─── Envoyer une notif locale (test, rappels) ────────────────────
export async function sendLocalNotification({ title, body, data = {} }) {
  await Notifications.scheduleNotificationAsync({
    content: { title, body, data, sound: true },
    trigger: null, // immédiat
  });
}

// ─── Planifier un rappel quotidien à 20h ─────────────────────────
export async function scheduleJournalReminder(gardienName) {
  await Notifications.cancelAllScheduledNotificationsAsync();

  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🐾 Journal non rempli',
      body: `${gardienName}, le journal de ce soir n'a pas encore été envoyé.`,
      data: { screen: 'JournalForm' },
    },
    trigger: {
      hour: 20,
      minute: 0,
      repeats: true,
    },
  });
}
