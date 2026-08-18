// app/visithistory.tsx
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import dayjs from 'dayjs';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, doc, getDocs, orderBy, query, Timestamp, updateDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View
} from 'react-native';
import ImageView from 'react-native-image-viewing';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db, storage } from '../firebaseConfig';

const CasinoColors = {
  accentGold: '#D4AF37',
  accentGreen: '#00FF7F',
  accentRed: '#FF4C4C',
  secondaryText: '#AAAAAA',
  accentBlue: '#1E90FF',
  divider: '#333',
};

// NEW: Interface for the daily visit record
interface DailyVisit {
  id: string; // Document ID: YYYY-MM-DD_customerId
  name: string;
  customerId: string;
  timestamp: Timestamp;
  matchAmount?: number;
  matchMachineNumber?: string;
  matchSnapshotUrl?: string;
  couponAmount?: number;
  couponMachineNumber?: string;
  couponSnapshotUrl?: string;
  payoutSnapshotUrl?: string;
}

// NEW: Interface for the image viewer data
interface ImageViewerData {
  uri: string;
  title: string;
  timestamp: Date;
}

interface IconTextInputProps extends TextInputProps {
  iconName: keyof typeof Ionicons.glyphMap;
}
const IconTextInput: React.FC<IconTextInputProps> = ({ iconName, ...props }) => (
  <View style={styles.searchContainer}>
    <Ionicons name={iconName} size={20} color="#FFD700" style={styles.searchIcon} />
    <TextInput style={styles.searchInput} {...props} placeholderTextColor="#888" />
  </View>
);

const VisitHistoryScreen = () => {
  const [loading, setLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [visits, setVisits] = useState<DailyVisit[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredVisits, setFilteredVisits] = useState<DailyVisit[]>([]);
  const router = useRouter();

  // State for the new image viewer
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [imageViewerData, setImageViewerData] = useState<ImageViewerData[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const [payoutPhotoUri, setPayoutPhotoUri] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) setIsReady(true);
      else router.replace('/owner');
    });
    return () => unsubscribe();
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      if (!isReady) return;

      const fetchVisits = async () => {
        setLoading(true);
        try {
          const user = auth.currentUser;
          if (!user) throw new Error('Owner not logged in');
          
          // UPDATED: Fetch from 'visitHistory' and order by timestamp
          const q = query(
            collection(db, `owners/${user.uid}/visitHistory`),
            orderBy('timestamp', 'desc')
          );
          const snapshot = await getDocs(q);
          const data: DailyVisit[] = snapshot.docs
            .map(doc => {
              const raw = doc.data();
              if (!raw.name || !raw.customerId || !raw.timestamp) return null;

              return {
                id: doc.id,
                name: raw.name,
                customerId: raw.customerId,
                timestamp: raw.timestamp instanceof Timestamp
                  ? raw.timestamp
                  : Timestamp.fromDate(new Date(raw.timestamp)),
                matchAmount: raw.matchAmount,
                matchMachineNumber: raw.matchMachineNumber,
                matchSnapshotUrl: raw.matchSnapshotUrl,
                couponAmount: raw.couponAmount,
                couponMachineNumber: raw.couponMachineNumber,
                couponSnapshotUrl: raw.couponSnapshotUrl,
                payoutSnapshotUrl: raw.payoutSnapshotUrl,
              };
            })
            .filter(Boolean) as DailyVisit[];
          setVisits(data);
          setFilteredVisits(data);
        } catch (error) {
          console.error('Error fetching visit history:', error);
          Alert.alert("Error", "Could not fetch visit history.");
        } finally {
          setLoading(false);
        }
      };

      fetchVisits();
    }, [isReady])
  );

  useEffect(() => {
    if (searchQuery === '') {
      setFilteredVisits(visits);
    } else {
      const lowercasedQuery = searchQuery.toLowerCase();
      const filteredData = visits.filter(visit =>
        visit.name.toLowerCase().includes(lowercasedQuery) ||
        visit.customerId.includes(lowercasedQuery)
      );
      setFilteredVisits(filteredData);
    }
  }, [searchQuery, visits]);

  const handlePayoutPhotoCapture = async (visitId: string) => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.7,
    });

    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      const response = await fetch(asset.uri);
      const blob = await response.blob();

      const user = auth.currentUser;
      if (!user) return;

      const storageRef = ref(storage, `owners/${user.uid}/payoutPhotos/${visitId}.jpg`);
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);

      const docRef = doc(db, `owners/${user.uid}/visitHistory/${visitId}`);
      try {
        await updateDoc(docRef, {
          payoutSnapshotUrl: downloadURL,
        });

        setVisits(prev =>
          prev.map(v =>
            v.id === visitId ? { ...v, payoutSnapshotUrl: downloadURL } : v
          )
        );
      } catch (error) {
        Alert.alert("Upload Failed", "Could not save payout photo. Please try again.");
      }
    }
  };

  // NEW: Function to open the swipeable image viewer
  const openImageViewer = (item: DailyVisit, startingType: 'match' | 'coupon' | 'payout') => {
    const imagesToShow: ImageViewerData[] = [];
    
    if (item.matchSnapshotUrl) {
      imagesToShow.push({
        uri: item.matchSnapshotUrl,
        title: 'Match Photo',
        timestamp: item.timestamp.toDate(),
      });
    }
    if (item.couponSnapshotUrl) {
      imagesToShow.push({
        uri: item.couponSnapshotUrl,
        title: 'Coupon Photo',
        timestamp: item.timestamp.toDate(),
      });
    }
    if (item.payoutSnapshotUrl) {
      imagesToShow.push({
        uri: item.payoutSnapshotUrl,
        title: 'Payout Photo',
        timestamp: item.timestamp.toDate(),
      });
    }

    if (imagesToShow.length > 0) {
      const startIndex = imagesToShow.findIndex(img => img.title.toLowerCase().includes(startingType));
      setCurrentImageIndex(startIndex !== -1 ? startIndex : 0);
      setImageViewerData(imagesToShow);
      setImageViewerVisible(true);
    }
  };

  const renderItem = ({ item }: { item: DailyVisit }) => (
    <View style={styles.card}>
      <View style={styles.infoRow}>
        <Ionicons name="person-circle-outline" size={24} color={CasinoColors.accentGold} style={styles.icon} />
        <Text style={styles.name}>{item.name}</Text>
      </View>
      <View style={styles.infoRow}>
        <Ionicons name="calendar-outline" size={20} color={CasinoColors.secondaryText} style={styles.icon} />
        <Text style={styles.detailText}>
          {dayjs(item.timestamp.toDate()).format('MMMM D, YYYY')}
        </Text>
      </View>

      {/* Match Details */}
      {item.matchAmount && item.matchAmount > 0 && (
        <View style={styles.transactionSection}>
          <Text style={styles.sectionHeader}>Match Details</Text>
          <View style={styles.infoRow}>
            <Ionicons name="cash-outline" size={20} color={CasinoColors.accentGreen} style={styles.icon} />
            <Text style={[styles.detailText, { color: CasinoColors.accentGreen, fontWeight: '600' }]}>
              Amount: ${item.matchAmount.toFixed(2)}
            </Text>
          </View>
          {item.matchMachineNumber && (
            <View style={styles.infoRow}>
              <Ionicons name="game-controller-outline" size={20} color={CasinoColors.secondaryText} style={styles.icon} />
              <Text style={styles.detailText}>Machine: #{item.matchMachineNumber}</Text>
            </View>
          )}
          {item.matchSnapshotUrl && (
            <TouchableOpacity style={[styles.actionButton, styles.viewPhotoButton]} onPress={() => openImageViewer(item, 'match')}>
              <Ionicons name="image-outline" size={20} color="#000" />
              <Text style={styles.actionButtonText}>View Match Photo</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Coupon Details */}
      {item.couponAmount && item.couponAmount > 0 && (
        <View style={styles.transactionSection}>
          <Text style={styles.sectionHeader}>Coupon Details</Text>
          <View style={styles.infoRow}>
            <Ionicons name="ticket-outline" size={20} color={CasinoColors.accentBlue} style={styles.icon} />
            <Text style={[styles.detailText, { color: CasinoColors.accentBlue, fontWeight: '600' }]}>
              Amount: ${item.couponAmount.toFixed(2)}
            </Text>
          </View>
          {item.couponMachineNumber && (
            <View style={styles.infoRow}>
              <Ionicons name="game-controller-outline" size={20} color={CasinoColors.secondaryText} style={styles.icon} />
              <Text style={styles.detailText}>Machine: #{item.couponMachineNumber}</Text>
            </View>
          )}
          {item.couponSnapshotUrl && (
            <TouchableOpacity style={[styles.actionButton, styles.viewPhotoButton]} onPress={() => openImageViewer(item, 'coupon')}>
              <Ionicons name="image-outline" size={20} color="#000" />
              <Text style={styles.actionButtonText}>View Coupon Photo</Text>
            </TouchableOpacity>
          )}

          {/* Payout Upload/View Button */}
          {!item.payoutSnapshotUrl ? (
            <TouchableOpacity style={[styles.actionButton, styles.viewPhotoButton]} onPress={() => handlePayoutPhotoCapture(item.id)}>
              <Ionicons name="cloud-upload-outline" size={20} color="#000" />
              <Text style={styles.actionButtonText}>Upload Payout Photo</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[styles.actionButton, styles.viewPhotoButton]} onPress={() => openImageViewer(item, 'payout')}>
              <Ionicons name="image-outline" size={20} color="#000" />
              <Text style={styles.actionButtonText}>View Payout Photo</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

    </View>
  );

  if (!isReady || loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={CasinoColors.accentGold} />
        <Text style={styles.loadingText}>Loading Visit History...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.header}>Visit History</Text>
        <TouchableOpacity onPress={() => router.back()} accessibilityLabel="Go back">
          <Ionicons name="arrow-back-circle-outline" size={32} color={CasinoColors.accentGold} />
        </TouchableOpacity>
      </View>

      <View style={{ paddingHorizontal: 10, marginBottom: 10 }}>
        <IconTextInput
          iconName="search-outline"
          placeholder="Search by Name or ID..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />
      </View>

      <FlatList
        data={filteredVisits}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: 10, paddingBottom: 20 }}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={styles.loadingText}>
              {searchQuery ? 'No visits match your search.' : 'No visit history found.'}
            </Text>
          </View>
        }
      />

      <ImageView
        images={imageViewerData}
        imageIndex={currentImageIndex}
        visible={imageViewerVisible}
        onRequestClose={() => setImageViewerVisible(false)}
        FooterComponent={({ imageIndex }) => (
          <View style={styles.footerContainer}>
            <Text style={styles.footerText}>{imageViewerData[imageIndex]?.title}</Text>
            <Text style={styles.footerTimestamp}>
              {dayjs(imageViewerData[imageIndex]?.timestamp).format('MM/DD/YYYY, h:mm:ss A')}
            </Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
};

// If CasinoColors is not imported from a shared theme file, define it here:
// Remove or comment this block if CasinoColors is already imported above.
// const CasinoColors = {
//   accentGold: '#D4AF37',
//   accentGreen: '#00FF7F',
//   accentRed: '#FF4C4C',
//   secondaryText: '#AAAAAA',
//   accentBlue: '#1E90FF',
//   divider: '#333',
// };

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  headerContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 15, },
  header: { fontSize: 26, fontWeight: 'bold', color: CasinoColors.accentGold },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2A2A2A', borderWidth: 1, borderColor: '#555555', borderRadius: 12, paddingHorizontal: 15, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, height: 50, fontSize: 16, color: '#FFFFFF' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50, },
  loadingText: { marginTop: 10, fontSize: 18, color: '#CCCCCC', textAlign: 'center', },
  card: { padding: 20, backgroundColor: '#1C1C1C', borderRadius: 12, marginVertical: 8, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, borderWidth: 1, borderColor: '#333333', },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, },
  icon: { marginRight: 15, width: 24, textAlign: 'center', },
  name: { fontSize: 20, fontWeight: 'bold', color: CasinoColors.accentGold, },
  detailText: { fontSize: 16, color: '#CCCCCC', },
  transactionSection: {
    borderTopWidth: 1,
    borderColor: '#444',
    marginTop: 15,
    paddingTop: 15,
  },
  sectionHeader: { fontSize: 16, fontWeight: '600', color: '#FFFFFF', marginBottom: 10, },
  actionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 10, paddingVertical: 12, borderRadius: 8, },
  actionButtonText: { fontSize: 16, fontWeight: '600', marginLeft: 8, color: '#000', },
  viewPhotoButton: { backgroundColor: CasinoColors.accentGold },
  footerContainer: { height: 80, width: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)', },
  footerText: { fontSize: 18, color: 'white', fontWeight: 'bold' },
  footerTimestamp: { fontSize: 14, color: '#DDD', marginTop: 4 },
});

export default VisitHistoryScreen;
