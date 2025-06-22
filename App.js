import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Keyboard, Alert, FlatList } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

function AddScreen() {
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);

  const saveWisdom = async () => {
    if (!text.trim()) {
      Alert.alert('Please enter some wisdom.');
      return;
    }
    setSaving(true);
    try {
      const existing = await AsyncStorage.getItem('wisdoms');
      const wisdoms = existing ? JSON.parse(existing) : [];
      const newWisdoms = [text.trim(), ...wisdoms];
      await AsyncStorage.setItem('wisdoms', JSON.stringify(newWisdoms));
      setText('');
      Keyboard.dismiss();
      Alert.alert('Saved!', 'Your wisdom has been added to the vault.');
    } catch (e) {
      Alert.alert('Error', 'Could not save wisdom.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add Wisdom</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter wisdom, advice, or a quote..."
        placeholderTextColor="#A7C7C5"
        value={text}
        onChangeText={setText}
        multiline
        editable={!saving}
      />
      <TouchableOpacity
        style={[styles.button, saving && { opacity: 0.6 }]}
        onPress={saveWisdom}
        disabled={saving}
      >
        <Text style={styles.buttonText}>{saving ? 'Saving...' : 'Save'}</Text>
      </TouchableOpacity>
    </View>
  );
}

function VaultScreen() {
  const [wisdoms, setWisdoms] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadWisdoms = async () => {
    setLoading(true);
    try {
      const stored = await AsyncStorage.getItem('wisdoms');
      setWisdoms(stored ? JSON.parse(stored) : []);
    } catch (e) {
      setWisdoms([]);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadWisdoms();
    }, [])
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Vault</Text>
      {loading ? (
        <Text style={styles.subtle}>Loading...</Text>
      ) : wisdoms.length === 0 ? (
        <Text style={styles.subtle}>No wisdom saved yet.</Text>
      ) : (
        <FlatList
          data={wisdoms}
          keyExtractor={(item, idx) => idx.toString()}
          renderItem={({ item }) => (
            <View style={styles.wisdomItem}>
              <Text style={styles.wisdomText}>{item}</Text>
            </View>
          )}
          style={{ width: '100%' }}
          contentContainerStyle={{ paddingBottom: 32 }}
        />
      )}
    </View>
  );
}

function SurpriseScreen() {
  const [wisdoms, setWisdoms] = useState([]);
  const [current, setCurrent] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadWisdoms = async () => {
    setLoading(true);
    try {
      const stored = await AsyncStorage.getItem('wisdoms');
      const arr = stored ? JSON.parse(stored) : [];
      setWisdoms(arr);
      if (arr.length > 0) {
        setCurrent(arr[Math.floor(Math.random() * arr.length)]);
      } else {
        setCurrent(null);
      }
    } catch (e) {
      setWisdoms([]);
      setCurrent(null);
    } finally {
      setLoading(false);
    }
  };

  const showAnother = () => {
    if (wisdoms.length > 1) {
      let next;
      do {
        next = wisdoms[Math.floor(Math.random() * wisdoms.length)];
      } while (next === current && wisdoms.length > 1);
      setCurrent(next);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadWisdoms();
    }, [])
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Surprise Me</Text>
      {loading ? (
        <Text style={styles.subtle}>Loading...</Text>
      ) : !current ? (
        <Text style={styles.subtle}>No wisdom saved yet.</Text>
      ) : (
        <>
          <View style={styles.surpriseBox}>
            <Text style={styles.surpriseText}>{current}</Text>
          </View>
          <TouchableOpacity style={styles.button} onPress={showAnother}>
            <Text style={styles.buttonText}>Surprise Me Again</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const Tab = createBottomTabNavigator();

async function scheduleDailyWisdomNotification() {
  // Cancel previous notifications
  await Notifications.cancelAllScheduledNotificationsAsync();
  // Get wisdoms
  const stored = await AsyncStorage.getItem('wisdoms');
  const wisdoms = stored ? JSON.parse(stored) : [];
  if (!wisdoms.length) return;
  // Pick a random wisdom
  const randomWisdom = wisdoms[Math.floor(Math.random() * wisdoms.length)];
  // Schedule notification for next 9am
  let trigger = new Date();
  trigger.setHours(9);
  trigger.setMinutes(0);
  trigger.setSeconds(0);
  if (trigger < new Date()) {
    trigger.setDate(trigger.getDate() + 1);
  }
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Daily Wisdom',
      body: randomWisdom,
      sound: true,
    },
    trigger: {
      hour: 9,
      minute: 0,
      repeats: true,
    },
  });
}

export default function App() {
  React.useEffect(() => {
    (async () => {
      if (Constants.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus === 'granted') {
          await scheduleDailyWisdomNotification();
        }
      }
    })();
  }, []);

  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#4F8A8B',
          tabBarInactiveTintColor: '#A7C7C5',
          tabBarStyle: { backgroundColor: '#F6F6F6', borderTopWidth: 0 },
        }}
      >
        <Tab.Screen name="Add" component={AddScreen} />
        <Tab.Screen name="Vault" component={VaultScreen} />
        <Tab.Screen name="Surprise Me" component={SurpriseScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F6F6',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: '#4F8A8B',
    marginBottom: 12,
  },
  input: {
    width: '100%',
    minHeight: 80,
    borderColor: '#A7C7C5',
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    fontSize: 18,
    backgroundColor: '#fff',
    color: '#333',
    marginBottom: 18,
  },
  button: {
    backgroundColor: '#4F8A8B',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 10,
    alignItems: 'center',
    width: '100%',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 1,
  },
  subtle: {
    color: '#A7C7C5',
    fontSize: 16,
    marginTop: 12,
  },
  wisdomItem: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  wisdomText: {
    fontSize: 18,
    color: '#333',
    lineHeight: 26,
  },
  surpriseBox: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 28,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    minWidth: '90%',
    minHeight: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  surpriseText: {
    fontSize: 22,
    color: '#4F8A8B',
    textAlign: 'center',
    lineHeight: 32,
    fontStyle: 'italic',
  },
});
