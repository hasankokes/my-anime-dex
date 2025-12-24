import React, { createContext, useContext, useEffect, useState } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

type NetworkContextType = {
    isConnected: boolean;
    isInternetReachable: boolean;
    type: string;
};

const NetworkContext = createContext<NetworkContextType>({
    isConnected: true,
    isInternetReachable: true,
    type: 'unknown',
});

export const useNetwork = () => useContext(NetworkContext);

export const NetworkProvider = ({ children }: { children: React.ReactNode }) => {
    const [state, setState] = useState<{ isConnected: boolean; isInternetReachable: boolean; type: string }>({
        isConnected: true, // Optimistic default
        isInternetReachable: true,
        type: 'unknown',
    });

    useEffect(() => {
        // Subscribe to network state updates
        const unsubscribe = NetInfo.addEventListener((netState) => {
            setState({
                isConnected: netState.isConnected ?? false,
                isInternetReachable: netState.isInternetReachable ?? false,
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
