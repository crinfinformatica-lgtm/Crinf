import { Location } from '../types';

// Campo Largo Center (Fallback)
const CAMPO_LARGO_CENTER = { lat: -25.4594, lng: -49.5292 };

export const getUserLocation = (): Promise<Location> => {
  return new Promise((resolve, reject) => {
    // Check if geolocation is supported by the browser
    if (!navigator.geolocation) {
      const msg = "Seu navegador não suporta geolocalização. Usando localização padrão.";
      alert(msg);
      // Resolve with fallback so the app continues to work
      resolve(CAMPO_LARGO_CENTER);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      },
      (error) => {
        let errorMsg = "Erro desconhecido ao obter localização.";
        
        // Determine specific error message
        switch(error.code) {
            case error.PERMISSION_DENIED:
                errorMsg = "Permissão de localização negada pelo usuário.";
                break;
            case error.POSITION_UNAVAILABLE:
                errorMsg = "Informações de localização indisponíveis (GPS desligado ou sem sinal).";
                break;
            case error.TIMEOUT:
                errorMsg = "O tempo para obter a localização esgotou.";
                break;
        }
        
        console.warn(`GPS Error: ${errorMsg}. Usando fallback (Centro de Campo Largo).`, error);
        
        // Fallback to Campo Largo center if permission denied or error
        resolve(CAMPO_LARGO_CENTER);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
};

// Haversine formula to calculate distance in km
export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
};

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}