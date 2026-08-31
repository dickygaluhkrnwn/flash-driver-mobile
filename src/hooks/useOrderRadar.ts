import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { OrderDetail, LocationDetail } from "@/types/order";

const getSafeMillis = (ts: unknown): number => {
  if (!ts) return 0;
  if (typeof ts === 'string' || typeof ts === 'number') return new Date(ts).getTime();
  
  if (typeof ts === 'object' && ts !== null) {
    const obj = ts as Record<string, unknown>;
    if (typeof obj.toMillis === 'function') return obj.toMillis();
    if (typeof obj.seconds === 'number') return obj.seconds * 1000;
    if (typeof obj.toDate === 'function') {
      const dateObj = obj.toDate() as Date;
      return dateObj.getTime();
    }
  }
  return new Date(String(ts)).getTime();
};

export function useOrderRadar(partnerType: string, driverCity?: string) {
  const [orders, setOrders] = useState<OrderDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!partnerType) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const q = query(
      collection(db, "orders"),
      where("status", "==", "Menunggu Kurir")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const rawData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OrderDetail));

      const filtered = rawData.filter(order => {
        const isPaid = order.paymentStatus === "Lunas";
        const isTempoB2B = order.isB2BApplied === true;
        
        if (!isPaid && !isTempoB2B) return false;

        let orderOriginCity = "";
        const originObj = typeof order.origin === 'object' && order.origin !== null ? (order.origin as LocationDetail) : null;
        
        if (originObj?.city) {
          orderOriginCity = String(originObj.city).toLowerCase();
        } else if (originObj?.address) {
          orderOriginCity = String(originObj.address).toLowerCase();
        } else if (order.origin) {
          orderOriginCity = String(order.origin).toLowerCase();
        }

        if (driverCity) {
          const safeDriverCity = String(driverCity).toLowerCase();
          if (!orderOriginCity.includes(safeDriverCity)) {
             return false;
          }
        }

        const vehicle = String(order.vehicle || order.vehicleName || "").toLowerCase();
        
        const isHeavyCargo = 
          vehicle.includes("truk") || 
          vehicle.includes("cde") || 
          vehicle.includes("cdd") || 
          vehicle.includes("fuso") || 
          vehicle.includes("tronton") || 
          vehicle.includes("wingbox");

        if (partnerType === "Individual") {
          return !isHeavyCargo;
        } else if (partnerType === "Vendor") {
          return isHeavyCargo;
        }

        return false;
      });

      filtered.sort((a, b) => {
        return getSafeMillis(b.createdAt) - getSafeMillis(a.createdAt);
      });

      setOrders(filtered);
      setIsLoading(false);
      setError(null);
    }, (err) => {
      console.error("Error Radar Bidding:", err);
      setError("Radar gagal terhubung ke satelit. Periksa koneksi Anda.");
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [partnerType, driverCity]);

  return { orders, isLoading, error };
}
