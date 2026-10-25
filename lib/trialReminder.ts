// Web / fallback: local notifications are native-only (see trialReminder.native.ts).
import type { PurchasesEntitlementInfo } from 'react-native-purchases';

export const syncTrialReminder = async (_entitlement: PurchasesEntitlementInfo | null | undefined) => {};
