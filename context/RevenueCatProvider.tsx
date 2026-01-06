import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import Purchases, { CustomerInfo, PurchasesPackage } from 'react-native-purchases';
import { REVENUECAT_API_KEY } from '../constants/Config';

interface RevenueCatContextType {
    isPro: boolean;
    currentOffering: PurchasesPackage | null;
    customerInfo: CustomerInfo | null;
    purchasePackage: (pkg: PurchasesPackage) => Promise<void>;
    restorePermissions: () => Promise<CustomerInfo>;
}

const RevenueCatContext = createContext<RevenueCatContextType | undefined>(undefined);

export const RevenueCatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isPro, setIsPro] = useState(false);
    const [currentOffering, setCurrentOffering] = useState<PurchasesPackage | null>(null);
    const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);

    useEffect(() => {
        const init = async () => {
            try {
                if (Platform.OS === 'android') {
                    await Purchases.configure({ apiKey: REVENUECAT_API_KEY });
                } else if (Platform.OS === 'ios') {
                    await Purchases.configure({ apiKey: REVENUECAT_API_KEY });
                }

                const info = await Purchases.getCustomerInfo();
                setCustomerInfo(info);
                checkProStatus(info);

                const offerings = await Purchases.getOfferings();
                if (offerings.current && offerings.current.availablePackages.length > 0) {
                    setCurrentOffering(offerings.current.availablePackages[0]);
                }
            } catch (e) {
                console.error('RevenueCat init error:', e);
            }
        };

        init();
    }, []);

    const checkProStatus = (info: CustomerInfo) => {
        // Modify 'pro' to match your distinct entitlement identifier in RevenueCat
        const isProActive = typeof info.entitlements.active['animedex_premium_monthly'] !== "undefined";
        setIsPro(isProActive);
    };

    const purchasePackage = async (pkg: PurchasesPackage) => {
        try {
            const { customerInfo } = await Purchases.purchasePackage(pkg);
            setCustomerInfo(customerInfo);
            checkProStatus(customerInfo);
        } catch (e: any) {
            if (!e.userCancelled) {
                console.error('Purchase error:', e);
                throw e;
            }
        }
    };

    const restorePermissions = async () => {
        try {
            const info = await Purchases.restorePurchases();
            setCustomerInfo(info);
            checkProStatus(info);
            return info;
        } catch (e) {
            console.error('Restore error:', e);
            throw e;
        }
    };

    return (
        <RevenueCatContext.Provider
            value={{
                isPro,
                currentOffering,
                customerInfo,
                purchasePackage,
                restorePermissions,
            }}
        >
            {children}
        </RevenueCatContext.Provider>
    );
};

export const useRevenueCat = () => {
    const context = useContext(RevenueCatContext);
    if (!context) {
        throw new Error('useRevenueCat must be used within a RevenueCatProvider');
    }
    return context;
};
