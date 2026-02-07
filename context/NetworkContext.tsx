import React, { createContext, useContext, useEffect, useState } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

type NetworkContextType = {
    isConnected: boolean | null;
    isInternetReachable: boolean | null;
    type: string;
};

const NetworkContext = createContext<NetworkContextType>({
    isConnected: true,
    isInternetReachable: true,
    type: 'unknown',
});

export const useNetwork = () => useContext(NetworkContext);

export const NetworkProvider = ({ children }: { children: React.ReactNode }) => {
    const [state, setState] = useState<{ isConnected: boolean | null; isInternetReachable: boolean | null; type: string }>({
        isConnected: true, // Optimistic default
        isInternetReachable: null, // Unknown initially
        type: 'unknown',
    });

    useEffect(() => {
        // Subscribe to network state updates
        const unsubscribe = NetInfo.addEventListener((netState) => {
            setState({
                isConnected: netState.isConnected,
                isInternetReachable: netState.isInternetReachable,
                type: netState.type,
            });
        });

        return () => {
            unsubscribe();
        };
    }, []);

    return (
        <NetworkContext.Provider value={state}>
            {children}
        </NetworkContext.Provider>
    );
};
