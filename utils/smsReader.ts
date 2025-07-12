import { Alert, PermissionsAndroid, Platform } from 'react-native';

// Alternative: Use react-native-get-sms-android if react-native-sms-retriever doesn't work
// import SmsAndroid from 'react-native-get-sms-android';

let SmsRetriever: any = null;

// Try to import SmsRetriever safely
try {
  SmsRetriever = require('react-native-sms-retriever').default;
} catch (error) {
  console.warn('SmsRetriever not available:', error);
}

interface SMSMessage {
  id?: string;
  body?: string;
  message?: string;
  text?: string;
  address?: string;
  sender?: string;
  from?: string;
  date?: string | number;
  timestamp?: string | number;
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
      console.warn(err);
      return false;
    }
  }
  return true;
};

// Check if SMS reading is available
export const isSMSAvailable = (): boolean => {
  return SmsRetriever !== null && typeof SmsRetriever.getMessages === 'function';
};

// Enhanced SMS processing for react-native-sms-retriever format
export const processSMS = (smsArray: SMSMessage[]): TransactionData[] => {
  const processedData: TransactionData[] = [];
  
  // Common bank/payment service patterns
  const bankPatterns = [
    'HDFC', 'ICICI', 'SBI', 'AXIS', 'KOTAK', 'CANARA', 'BOB', 'PNB',
    'PAYTM', 'GPAY', 'PHONEPE', 'BHIM', 'AMAZONPAY', 'FREECHARGE',
    'MOBIKWIK', 'BANK', 'CREDIT', 'DEBIT', 'TRANSACTION', 'PAYMENT',
    'UPI', 'NEFT', 'RTGS', 'IMPS', 'WALLET', 'CRED', 'RAZORPAY'
  ];
  
  smsArray.forEach((sms, index) => {
    try {
      // Handle different SMS formats
      const smsBody = sms.body || sms.message || sms.text || '';
      const smsAddress = sms.address || sms.sender || sms.from || '';
      const smsDate = sms.date || sms.timestamp || Date.now();
      
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
        smsBody.toLowerCase().includes('net banking');

      if (isTransactionSMS && hasTransactionKeywords) {
        // Multiple patterns to catch different amount formats
        const amountPatterns = [
          /Rs\.?\s*(\d+(?:,\d+)*(?:\.\d+)?)/i,
          /INR\s*(\d+(?:,\d+)*(?:\.\d+)?)/i,
          /₹\s*(\d+(?:,\d+)*(?:\.\d+)?)/i,
          /\b(\d+(?:,\d+)*(?:\.\d+)?)\s*Rs/i,
          /amount\s*(?:of\s*)?(?:Rs\.?|₹|INR)?\s*(\d+(?:,\d+)*(?:\.\d+)?)/i,
          /(?:paid|sent|received|debited|credited)\s*(?:Rs\.?|₹|INR)?\s*(\d+(?:,\d+)*(?:\.\d+)?)/i
        ];
        
        let amount = 'Unknown';
        for (const pattern of amountPatterns) {
          const match = smsBody.match(pattern);
          if (match) {
            amount = match[1];
            break;
          }
        }
        
        // Determine transaction type
        let type = 'Unknown';
        if (smsBody.toLowerCase().includes('debited') || 
            smsBody.toLowerCase().includes('withdrawn') ||
            smsBody.toLowerCase().includes('sent') ||
            smsBody.toLowerCase().includes('paid') ||
            smsBody.toLowerCase().includes('spent')) {
          type = 'Debit';
        } else if (smsBody.toLowerCase().includes('credited') || 
                   smsBody.toLowerCase().includes('deposited') ||
                   smsBody.toLowerCase().includes('received') ||
                   smsBody.toLowerCase().includes('refund')) {
          type = 'Credit';
        }
        
        // Extract merchant/description
        let description = 'Transaction';
        const merchantPatterns = [
          /(?:at|to|from)\s+([A-Z][A-Z0-9\s]+?)(?:\s+on|\s+\d|\s*$)/i,
          /(?:paid to|sent to|received from)\s+([A-Z][A-Z0-9\s]+?)(?:\s+on|\s+\d|\s*$)/i,
          /UPI-([A-Z0-9\s]+?)(?:\s+\d|\s*$)/i,
          /merchant\s+([A-Z][A-Z0-9\s]+?)(?:\s+on|\s+\d|\s*$)/i
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
          dateObj = new Date(typeof smsDate === 'string' ? parseInt(smsDate) : smsDate);
          if (isNaN(dateObj.getTime())) {
            dateObj = new Date();
          }
        } catch (error) {
          dateObj = new Date();
        }
        
        processedData.push({
          id: sms.id || `${Date.now()}_${index}`,
          sender: smsAddress,
          amount: amount,
          type: type,
          date: dateObj.toLocaleDateString(),
          time: dateObj.toLocaleTimeString(),
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

// Read SMS using react-native-sms-retriever with enhanced error handling
export const readSMS = async (
  setSmsData: (data: TransactionData[]) => void,
  setLoading: (loading: boolean) => void,
  saveToStorage?: (data: TransactionData[]) => Promise<void>
): Promise<void> => {
  if (!isSMSAvailable()) {
    Alert.alert(
      'SMS Reader Not Available', 
      'Please make sure react-native-sms-retriever is properly installed and linked'
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
    // Get all SMS messages with error handling
    const messages = await SmsRetriever.getMessages();
    
    if (!Array.isArray(messages)) {
      throw new Error('Invalid messages format received');
    }
    
    console.log(`Total SMS count: ${messages.length}`);
    
    // Process the messages
    const processedData = processSMS(messages);
    setSmsData(processedData);
    
    if (saveToStorage) {
      await saveToStorage(processedData);
    }
    
    setLoading(false);
    
    Alert.alert(
      'Success!', 
      `Found ${processedData.length} transaction SMS out of ${messages.length} total messages`
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
      'Please make sure react-native-sms-retriever is properly installed and linked'
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
    // Get all messages
    const messages = await SmsRetriever.getMessages();
    
    if (!Array.isArray(messages)) {
      throw new Error('Invalid messages format received');
    }
    
    // Filter messages from the last X days
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);
    
    const recentMessages = messages.filter(sms => {
      try {
        const smsDate = new Date(typeof sms.date === 'string' ? parseInt(sms.date) : sms.date);
        return smsDate >= cutoffDate;
      } catch (error) {
        return false;
      }
    });
    
    console.log(`Total SMS count: ${messages.length}, Recent: ${recentMessages.length}`);
    
    const processedData = processSMS(recentMessages);
    setSmsData(processedData);
    
    if (saveToStorage) {
      await saveToStorage(processedData);
    }
    
    setLoading(false);
    
    Alert.alert(
      'Success!', 
      `Found ${processedData.length} transaction SMS from last ${daysBack} days`
    );
  } catch (error) {
    console.error('Error reading SMS:', error);
    Alert.alert('Error', 'Failed to read SMS: ' + (error as Error).message);
    setLoading(false);
  }
};

// Optional: Listen for new SMS in real-time with error handling
export const startSMSListener = (
  setSmsData: (updater: (prev: TransactionData[]) => TransactionData[]) => void,
  smsData: TransactionData[],
  saveToStorage?: (data: TransactionData[]) => Promise<void>
): void => {
  if (!isSMSAvailable()) {
    console.warn('SMS Retriever not available for listening');
    return;
  }

  try {
    SmsRetriever.startSmsRetriever((message: SMSMessage) => {
      console.log('New SMS received:', message);
      try {
        // Process new SMS and add to existing data
        const newSmsData = processSMS([message]);
        if (newSmsData.length > 0) {
          // Add to existing SMS data
          setSmsData(prevData => [newSmsData[0], ...prevData]);
          if (saveToStorage) {
            saveToStorage([newSmsData[0], ...smsData]);
          }
        }
      } catch (error) {
        console.error('Error processing new SMS:', error);
      }
    });
  } catch (error) {
    console.error('Failed to start SMS listener:', error);
  }
};

// Stop SMS listener
export const stopSMSListener = (): void => {
  if (!isSMSAvailable()) {
    return;
  }

  try {
    SmsRetriever.removeSmsRetriever();
  } catch (error) {
    console.error('Failed to stop SMS listener:', error);
  }
};