import { useState } from 'react';

// Hook for connecting to a smart-speaker via Web Bluetooth
export function useSmartSpeaker() {
  const [device, setDevice] = useState<BluetoothDevice | null>(null);

  const connect = async () => {
    if (!navigator.bluetooth) {
      throw new Error('Web Bluetooth not supported');
    }
    try {
      const dev = await navigator.bluetooth.requestDevice({ acceptAllDevices: true });
      setDevice(dev);
      return dev;
    } catch (error) {
      console.error('Smart speaker connection failed:', error);
      throw error;
    }
  };

  const playAudio = (url: string) => {
    const audio = new Audio(url);
    audio.play().catch(err => console.error('Playback failed:', err));
  };

  return { device, connect, playAudio };
}

// Hook for basic AR display integration using WebXR
export function useARDisplay() {
  const [session, setSession] = useState<XRSession | null>(null);

  const startSession = async () => {
    if (!navigator.xr) {
      throw new Error('WebXR not supported');
    }
    try {
      const xrSession = await navigator.xr.requestSession('immersive-ar');
      setSession(xrSession);
      return xrSession;
    } catch (error) {
      console.error('AR session failed:', error);
      throw error;
    }
  };

  const endSession = () => {
    session?.end();
    setSession(null);
  };

  return { session, startSession, endSession };
}
