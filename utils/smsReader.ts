import { Alert, PermissionsAndroid, Platform } from 'react-native';

// Better import handling for react-native-get-sms-android
let SmsAndroid: any = null;

try {
  // Try different import methods
  const smsModule = require('react-native-get-sms-android');
  SmsAndroid = smsModule.default || smsModule;
} catch (error) {
  console.warn('react-native-get-sms-android not available:', error);
}

interface SMSMessage {
  _id?: string;
  body?: string;
  address?: string;
  date?: string | number;
  date_sent?: string | number;
  read?: string | number;
  status?: string | number;
  type?: string | number;
  service_center?: string;
}

export interface TransactionData {
  id: string;
  sender: string;
  amount: string;
  type: string;
  date: string;
  time: string;
  description: string;
  message: string;
  fullMessage: string;
}

// Request SMS permission
export const requestSMSPermission = async (): Promise<boolean> => {
  if (Platform.OS === 'android') {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_SMS,
        {
          title: 'SMS Permission',
          message: 'This app needs access to SMS to process transaction messages',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn('Permission request error:', err);
      return false;
    }
  }
  return true;
};

// Fixed SMS availability check
export const isSMSAvailable = (): boolean => {
  console.log('SmsAndroid object:', SmsAndroid);
  console.log('SmsAndroid.list type:', typeof SmsAndroid?.list);
  
  return (
    SmsAndroid !== null && 
    SmsAndroid !== undefined && 
    typeof SmsAndroid === 'object' &&
    typeof SmsAndroid.list === 'function'
  );
};

// Enhanced SMS processing (same as before)
export const processSMS = (smsArray: SMSMessage[]): TransactionData[] => {
  const processedData: TransactionData[] = [];
  
  // Common bank/payment service patterns
  const bankPatterns = [
    'HDFC', 'ICICI', 'SBI', 'AXIS', 'KOTAK', 'CANARA', 'BOB', 'PNB',
    'PAYTM', 'GPAY', 'PHONEPE', 'BHIM', 'AMAZONPAY', 'FREECHARGE',
    'MOBIKWIK', 'BANK', 'CREDIT', 'DEBIT', 'TRANSACTION', 'PAYMENT',
    'UPI', 'NEFT', 'RTGS', 'IMPS', 'WALLET', 'CRED', 'RAZORPAY',
    'YESBANK', 'INDUSIND', 'FEDERAL', 'BANDHAN', 'IDFC', 'RBL'
  ];
  
  smsArray.forEach((sms, index) => {
    try {
      // Handle different SMS formats
      const smsBody = sms.body || '';
      const smsAddress = sms.address || '';
      const smsDate = sms.date || sms.date_sent || Date.now();
      
      // Skip if essential data is missing
      if (!smsBody || !smsAddress) {
        return;
      }
      
      // Check if SMS is from bank/payment service
      const isTransactionSMS = bankPatterns.some(pattern => 
        smsAddress.toUpperCase().includes(pattern) || 
        smsBody.toUpperCase().includes(pattern)
      );
      
      // Additional check for transaction keywords
      const hasTransactionKeywords = 
        smsBody.toLowerCase().includes('debited') ||
        smsBody.toLowerCase().includes('credited') ||
        smsBody.toLowerCase().includes('transaction') ||
        smsBody.toLowerCase().includes('payment') ||
        smsBody.toLowerCase().includes('transfer') ||
        smsBody.toLowerCase().includes('withdrawn') ||
        smsBody.toLowerCase().includes('deposited') ||
        smsBody.toLowerCase().includes('spent') ||
        smsBody.toLowerCase().includes('received') ||
        smsBody.toLowerCase().includes('sent') ||
        smsBody.includes('Rs.') ||
        smsBody.includes('INR') ||
        smsBody.includes('₹') ||
        smsBody.toLowerCase().includes('upi') ||
        smsBody.toLowerCase().includes('net banking') ||
        smsBody.toLowerCase().includes('balance') ||
        smsBody.toLowerCase().includes('account');

      if (isTransactionSMS && hasTransactionKeywords) {
        // Multiple patterns to catch different amount formats
        const amountPatterns = [
          /Rs\.?\s*(\d+(?:,\d+)*(?:\.\d+)?)/i,
          /INR\s*(\d+(?:,\d+)*(?:\.\d+)?)/i,
          /₹\s*(\d+(?:,\d+)*(?:\.\d+)?)/i,
          /\b(\d+(?:,\d+)*(?:\.\d+)?)\s*Rs/i,
          /amount\s*(?:of\s*)?(?:Rs\.?|₹|INR)?\s*(\d+(?:,\d+)*(?:\.\d+)?)/i,
          /(?:paid|sent|received|debited|credited)\s*(?:Rs\.?|₹|INR)?\s*(\d+(?:,\d+)*(?:\.\d+)?)/i,
          /(?:balance|bal)\s*(?:Rs\.?|₹|INR)?\s*(\d+(?:,\d+)*(?:\.\d+)?)/i
        ];
        
        let amount = 'Unknown';
        for (const pattern of amountPatterns) {
          const match = smsBody.match(pattern);
          if (match) {
            amount = match[1].replace(/,/g, ''); // Remove commas
            break;
          }
        }
        
        // Determine transaction type
        let type = 'Unknown';
        if (smsBody.toLowerCase().includes('debited') || 
            smsBody.toLowerCase().includes('withdrawn') ||
            smsBody.toLowerCase().includes('sent') ||
            smsBody.toLowerCase().includes('paid') ||
            smsBody.toLowerCase().includes('spent') ||
            smsBody.toLowerCase().includes('purchase')) {
          type = 'Debit';
        } else if (smsBody.toLowerCase().includes('credited') || 
                   smsBody.toLowerCase().includes('deposited') ||
                   smsBody.toLowerCase().includes('received') ||
                   smsBody.toLowerCase().includes('refund') ||
                   smsBody.toLowerCase().includes('cashback')) {
          type = 'Credit';
        } else if (smsBody.toLowerCase().includes('balance') || 
                   smsBody.toLowerCase().includes('available')) {
          type = 'Balance';
        }
        
        // Extract merchant/description
        let description = 'Transaction';
        const merchantPatterns = [
          /(?:at|to|from)\s+([A-Z][A-Z0-9\s&\-\.]+?)(?:\s+on|\s+\d|\s*$)/i,
          /(?:paid to|sent to|received from)\s+([A-Z][A-Z0-9\s&\-\.]+?)(?:\s+on|\s+\d|\s*$)/i,
          /UPI-([A-Z0-9\s&\-\.]+?)(?:\s+\d|\s*$)/i,
          /merchant\s+([A-Z][A-Z0-9\s&\-\.]+?)(?:\s+on|\s+\d|\s*$)/i,
          /(?:purchase|txn)\s+at\s+([A-Z][A-Z0-9\s&\-\.]+?)(?:\s+on|\s+\d|\s*$)/i
        ];
        
        for (const pattern of merchantPatterns) {
          const match = smsBody.match(pattern);
          if (match) {
            description = match[1].trim();
            break;
          }
        }
        
        // Create date object with error handling
        let dateObj: Date;
        try {
          const dateValue = typeof smsDate === 'string' ? parseInt(smsDate) : smsDate;
          dateObj = new Date(dateValue);
          if (isNaN(dateObj.getTime())) {
            dateObj = new Date();
          }
        } catch (error) {
          dateObj = new Date();
        }
        
        processedData.push({
          id: sms._id || `${Date.now()}_${index}`,
          sender: smsAddress,
          amount: amount,
          type: type,
          date: dateObj.toLocaleDateString('en-IN'),
          time: dateObj.toLocaleTimeString('en-IN'),
          description: description,
          message: smsBody.length > 100 ? smsBody.substring(0, 100) + '...' : smsBody,
          fullMessage: smsBody
        });
      }
    } catch (error) {
      console.warn(`Error processing SMS at index ${index}:`, error);
    }
  });
  
  // Sort by date (newest first)
  return processedData.sort((a, b) => {
    try {
      const dateA = new Date(a.date + ' ' + a.time);
      const dateB = new Date(b.date + ' ' + b.time);
      return dateB.getTime() - dateA.getTime();
    } catch (error) {
      return 0;
    }
  });
};

// Read SMS using react-native-get-sms-android
export const readSMS = async (
  setSmsData: (data: TransactionData[]) => void,
  setLoading: (loading: boolean) => void,
  saveToStorage?: (data: TransactionData[]) => Promise<void>
): Promise<void> => {
  // Enhanced availability check
  if (!isSMSAvailable()) {
    console.error('SMS module not available. SmsAndroid:', SmsAndroid);
    Alert.alert(
      'SMS Reader Not Available', 
      'The SMS reading module is not properly installed or configured.\n\nPlease ensure:\n1. react-native-get-sms-android is installed\n2. The app has been rebuilt\n3. You\'re running on Android device'
    );
    return;
  }

  setLoading(true);
  
  const hasPermission = await requestSMSPermission();
  if (!hasPermission) {
    Alert.alert('Permission Required', 'SMS permission is required to read messages');
    setLoading(false);
    return;
  }

  try {
    const filter = {
      box: 'inbox',
      minDate: 0,
      maxDate: Date.now(),
      maxCount: 10000,
    };

    SmsAndroid.list(
      JSON.stringify(filter),
      (fail: any) => {
        console.error('Failed to get SMS:', fail);
        Alert.alert('Error', 'Failed to read SMS: ' + fail);
        setLoading(false);
      },
      (count: number, smsList: string) => {
        try {
          console.log(`Total SMS count: ${count}`);
          
          if (count === 0) {
            setSmsData([]);
            setLoading(false);
            Alert.alert('No SMS Found', 'No SMS messages found on this device');
            return;
          }

          const messages: SMSMessage[] = JSON.parse(smsList);
          const processedData = processSMS(messages);
          setSmsData(processedData);
          
          if (saveToStorage) {
            saveToStorage(processedData);
          }
          
          setLoading(false);
          
          Alert.alert(
            'Success!', 
            `Found ${processedData.length} transaction SMS out of ${count} total messages`
          );
        } catch (error) {
          console.error('Error parsing SMS data:', error);
          Alert.alert('Error', 'Failed to parse SMS data: ' + (error as Error).message);
          setLoading(false);
        }
      }
    );
  } catch (error) {
    console.error('Error reading SMS:', error);
    Alert.alert('Error', 'Failed to read SMS: ' + (error as Error).message);
    setLoading(false);
  }
};

// Enhanced function to get SMS from specific time period
export const readSMSFromPeriod = async (
  daysBack: number = 30,
  setSmsData: (data: TransactionData[]) => void,
  setLoading: (loading: boolean) => void,
  saveToStorage?: (data: TransactionData[]) => Promise<void>
): Promise<void> => {
  if (!isSMSAvailable()) {
    Alert.alert(
      'SMS Reader Not Available', 
      'The SMS reading module is not properly installed or configured.\n\nPlease ensure:\n1. react-native-get-sms-android is installed\n2. The app has been rebuilt\n3. You\'re running on Android device'
    );
    return;
  }

  setLoading(true);
  
  const hasPermission = await requestSMSPermission();
  if (!hasPermission) {
    Alert.alert('Permission Required', 'SMS permission is required to read messages');
    setLoading(false);
    return;
  }

  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);
    
    const filter = {
      box: 'inbox',
      minDate: cutoffDate.getTime(),
      maxDate: Date.now(),
      maxCount: 5000,
    };

    SmsAndroid.list(
      JSON.stringify(filter),
      (fail: any) => {
        console.error('Failed to get SMS:', fail);
        Alert.alert('Error', 'Failed to read SMS: ' + fail);
        setLoading(false);
      },
      (count: number, smsList: string) => {
        try {
          console.log(`Recent SMS count (${daysBack} days): ${count}`);
          
          if (count === 0) {
            setSmsData([]);
            setLoading(false);
            Alert.alert('No Recent SMS', `No SMS messages found from the last ${daysBack} days`);
            return;
          }

          const messages: SMSMessage[] = JSON.parse(smsList);
          const processedData = processSMS(messages);
          setSmsData(processedData);
          
          if (saveToStorage) {
            saveToStorage(processedData);
          }
          
          setLoading(false);
          
          Alert.alert(
            'Success!', 
            `Found ${processedData.length} transaction SMS from last ${daysBack} days`
          );
        } catch (error) {
          console.error('Error parsing SMS data:', error);
          Alert.alert('Error', 'Failed to parse SMS data: ' + (error as Error).message);
          setLoading(false);
        }
      }
    );
  } catch (error) {
    console.error('Error reading SMS:', error);
    Alert.alert('Error', 'Failed to read SMS: ' + (error as Error).message);
    setLoading(false);
  }
};

// These functions are not needed for react-native-get-sms-android
export const startSMSListener = () => {
  console.log('Real-time SMS listening not supported by react-native-get-sms-android');
};

export const stopSMSListener = () => {
  console.log('SMS listener stop not needed');
};