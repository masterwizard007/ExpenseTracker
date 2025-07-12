import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import {
  isSMSAvailable,
  readSMS,
  readSMSFromPeriod
} from '../utils/smsReader'; // Move your SMS functions to utils folder

interface TransactionData {
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

// This is your main screen component that Expo Router expects
export default function HomeScreen() {
  const [smsData, setSmsData] = useState<TransactionData[]>([]);
  const [loading, setLoading] = useState(false);

  // Save data to storage (implement your preferred storage method)
  const saveToStorage = async (data: TransactionData[]) => {
    try {
      // You can use AsyncStorage, SecureStore, or any other storage method
      console.log('Saving data to storage:', data.length);
      // await AsyncStorage.setItem('smsData', JSON.stringify(data));
    } catch (error) {
      console.error('Error saving to storage:', error);
    }
  };

  const handleReadSMS = async () => {
    await readSMS(setSmsData, setLoading, saveToStorage);
  };

  const handleReadRecentSMS = async () => {
    await readSMSFromPeriod(30, setSmsData, setLoading, saveToStorage);
  };

  const renderTransactionItem = ({ item }: { item: TransactionData }) => (
    <View style={styles.transactionItem}>
      <View style={styles.transactionHeader}>
        <Text style={[styles.amount, { color: item.type === 'Credit' ? '#4CAF50' : '#F44336' }]}>
          {item.type === 'Credit' ? '+' : '-'}₹{item.amount}
        </Text>
        <Text style={styles.date}>{item.date}</Text>
      </View>
      <Text style={styles.description}>{item.description}</Text>
      <Text style={styles.sender}>{item.sender}</Text>
      <Text style={styles.message} numberOfLines={2}>{item.message}</Text>
    </View>
  );

  useEffect(() => {
    // Check SMS availability on component mount
    if (!isSMSAvailable()) {
      Alert.alert(
        'SMS Reader Not Available',
        'Please make sure react-native-sms-retriever is properly installed'
      );
    }
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>SMS Transaction Reader</Text>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.button} 
          onPress={handleReadSMS}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Read All SMS</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.button} 
          onPress={handleReadRecentSMS}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Read Recent (30 days)</Text>
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Reading SMS...</Text>
        </View>
      )}

      {smsData.length > 0 && (
        <View style={styles.listContainer}>
          <Text style={styles.listTitle}>
            Found {smsData.length} transactions
          </Text>
          <FlatList
            data={smsData}
            renderItem={renderTransactionItem}
            keyExtractor={(item) => item.id}
            style={styles.list}
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}

      {!loading && smsData.length === 0 && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No transaction SMS found</Text>
          <Text style={styles.emptySubtext}>
            Tap "Read SMS" to scan your messages
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  button: {
    flex: 1,
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  listContainer: {
    flex: 1,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  list: {
    flex: 1,
  },
  transactionItem: {
    backgroundColor: 'white',
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  amount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  date: {
    fontSize: 12,
    color: '#666',
  },
  description: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 5,
    color: '#333',
  },
  sender: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  message: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
});