import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { db } from './firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useAuthStore } from '@/store/useAuthStore';

const LOCATION_TASK_NAME = 'background-location-task';

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error("Background Location Error:", error);
    return;
  }
  
  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };
    if (locations && locations.length > 0) {
      const { latitude, longitude } = locations[0].coords;
      
      const user = useAuthStore.getState().user;
      
      if (user?.uid) {
        // Option 1: Update in wallet document to track current driver pos
        try {
          const walletRef = doc(db, 'driver_wallets', user.uid);
          await updateDoc(walletRef, {
            currentLocation: { lat: latitude, lng: longitude },
            lastLocationUpdate: new Date().toISOString()
          });
          console.log("Updated background location for driver", user.uid);
        } catch (e) {
          console.log("Failed to update background location", e);
        }
      }
    }
  }
});

export const startBackgroundLocationTracking = async () => {
  const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
  if (foregroundStatus !== 'granted') return false;
  
  const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
  if (backgroundStatus !== 'granted') {
    console.log("Background location denied");
    return false;
  }

  const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
  if (!isRegistered) {
    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 15000, // Update every 15 secs
      distanceInterval: 50, // Or every 50 meters
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: "Flash Global Kurir Aktif",
        notificationBody: "Melacak posisi untuk pengiriman...",
        notificationColor: "#10b981",
      },
    });
  }
  return true;
};

export const stopBackgroundLocationTracking = async () => {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
  if (isRegistered) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
  }
};
