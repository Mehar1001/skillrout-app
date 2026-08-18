import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
// Added 'where' for the new query and removed unused imports
import { collection, doc, getDocs, orderBy, query, Timestamp, updateDoc, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ImageView from 'react-native-image-viewing';
import { auth, db } from '../firebaseConfig';

const { width, height } = Dimensions.get('window');

// Interfaces
interface Shift {
  id: string;
  employeeName: string;
  startTime?: string;
  endTime?: string;
  machines: {
    [machineNumber: string]: {
      currentIn: number;
      currentOut: number;
      images?: string[];
    };
  };
  totalIn: number;
  totalOut: number;
  totalMatchedAmount: number;
  totalCouponAmount: number;
  profitOrLoss: number;
  notes?: string;
}

interface SummaryRowProps {
  label: string;
  value: string;
  valueColor?: string;
  isBold?: boolean;
  iconName?: keyof typeof Ionicons.glyphMap;
}

const SummaryRow: React.FC<SummaryRowProps> = ({
  label,
  value,
  valueColor = '#FFFFFF',
  isBold = false,
  iconName,
}) => (
  <View style={styles.summaryRow}>
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {iconName && (
        <Ionicons
          name={iconName}
          size={22}
          color={valueColor || '#FFD700'}
          style={{ marginRight: 10, width: 24 }}
        />
      )}
      <Text
        style={[
          styles.summaryLabel,
          { color: valueColor },
          isBold && { fontWeight: 'bold', fontSize: 18 },
        ]}
      >
        {label}
      </Text>
    </View>
    <Text
      style={[
        styles.summaryValue,
        { color: valueColor },
        isBold && { fontWeight: 'bold', fontSize: 18 },
      ]}
    >
      {value}
    </Text>
  </View>
);

export default function MachineTracker() {
  const [shiftData, setShiftData] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const router = useRouter();

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedMachineImagesForViewer, setSelectedMachineImagesForViewer] = useState<{ uri: string }[]>([]);
  const [selectedMachineNumber, setSelectedMachineNumber] = useState<string>('');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const openImageModal = (images: string[], machineNumber: string, initialImageIndex: number = 0) => {
    const validImageObjects = (images || [])
      .filter(url => typeof url === 'string' && url.startsWith('https://'))
      .map(url => ({ uri: url }));

    if (validImageObjects.length > 0) {
      setSelectedMachineImagesForViewer(validImageObjects);
      setSelectedMachineNumber(machineNumber);
      setCurrentImageIndex(initialImageIndex);
      setModalVisible(true);
    } else {
      Alert.alert('No Photos', `No valid photos available for Machine ${machineNumber}.`);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsReady(true);
      } else {
        router.replace('/owner');
      }
    });
    return () => unsubscribe();
  }, [router]);

  // --- UPDATED to fetch and calculate Matched Amount automatically ---
  useEffect(() => {
    if (!isReady) return;

    const fetchShiftData = async () => {
      setLoading(true);
      try {
        const user = auth.currentUser;
        if (!user) throw new Error("User not found");
        const ownerId = user.uid;

        const shiftsQuery = query(collection(db, 'owners', ownerId, 'shifts'), orderBy('startTime', 'desc'));
        const snapshot = await getDocs(shiftsQuery);


        const data = await Promise.all(snapshot.docs.map(async (doc) => {
          const shift = doc.data();
          
          let calculatedMatchTotal = 0;
          let calculatedCouponTotal = 0;
          if (shift.startTime && shift.endTime) {
            const visitHistoryQuery = query(
              collection(db, 'owners', ownerId, 'visitHistory'),
              where('timestamp', '>=', Timestamp.fromDate(new Date(shift.startTime))),
              where('timestamp', '<=', Timestamp.fromDate(new Date(shift.endTime)))
            );
            const visitHistorySnapshot = await getDocs(visitHistoryQuery);

            visitHistorySnapshot.forEach(visitDoc => {
              const data = visitDoc.data();
              console.log("Fetched Visit:", data);
              calculatedMatchTotal += Number(data.matchAmount) || 0;
              calculatedCouponTotal += Number(data.couponAmount) || 0;
            });
            // Debug log after summing
            console.log("Match:", calculatedMatchTotal, "Coupon:", calculatedCouponTotal);
          }
  
          const machinesWithImages: { [key: string]: any } = {};
          if (shift.machines) {
            Object.keys(shift.machines).forEach(machineKey => {
              machinesWithImages[machineKey] = {
                currentIn: shift.machines[machineKey].currentIn || 0,
                currentOut: shift.machines[machineKey].currentOut || 0,
                images: (shift.machines[machineKey].images || []).filter(Boolean)
              };
            });
          }
          
          return {
            id: doc.id,
            employeeName: shift.employeeName,
            startTime: shift.startTime,
            endTime: shift.endTime,
            machines: machinesWithImages,
            totalMatchedAmount: calculatedMatchTotal,
            totalCouponAmount: calculatedCouponTotal,
            totalIn: shift.totalIn || 0,
            totalOut: shift.totalOut || 0,
            profitOrLoss: shift.profitOrLoss || 0,
            notes: shift.notes,
          } as Shift;
        }));
  
        setShiftData(data);
      } catch (error) {
        console.error('Error fetching shift data:', error);
        Alert.alert("Error", "Could not load shift history.");
      } finally {
        setLoading(false);
      }
    };
  
    fetchShiftData();
  }, [isReady]);

  // --- UPDATED to only save shift calculations, NOT bank balance ---
  useEffect(() => {
    const saveShiftCalculations = async () => {
      const user = auth.currentUser;
      if (!user || shiftData.length === 0) return;
      const ownerId = user.uid;

      for (const shift of shiftData) {
        const totalIn = Object.values(shift.machines || {}).reduce((sum, m) => sum + (m.currentIn || 0), 0);
        const totalOut = Object.values(shift.machines || {}).reduce((sum, m) => sum + (m.currentOut || 0), 0);
        const finalMatchedAmount = shift.totalMatchedAmount;
        // Update profitOrLoss calculation to subtract coupon amount
        const newProfitOrLoss = totalIn - totalOut - finalMatchedAmount - (shift.totalCouponAmount || 0);
        
        const oldProfitOrLoss = shift.profitOrLoss;

        // Only update if there is a difference to avoid unnecessary writes
        if (oldProfitOrLoss.toFixed(2) !== newProfitOrLoss.toFixed(2)) {
          try {
            const shiftDocRef = doc(db, `owners/${ownerId}/shifts`, shift.id);
            // Update Firestore document with totalCouponAmount
            await updateDoc(shiftDocRef, {
              totalIn: totalIn,
              totalOut: totalOut,
              profitOrLoss: newProfitOrLoss,
              totalMatchedAmount: finalMatchedAmount,
              totalCouponAmount: shift.totalCouponAmount || 0,
              // If you are writing to visitHistory here, update lastUsed to Timestamp.now()
              // (No visitHistory writing here, but leave this comment for context)
            });
          } catch (error) {
            console.error(`Auto-calculation save error for shift ID: ${shift.id}`, error);
          }
        }
      }
    };

    if (isReady && !loading) {
        saveShiftCalculations();
    }
  }, [shiftData, isReady, loading]);

  if (!isReady || loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#FFD700" />
        <Text style={styles.loadingText}>Loading Shift History...</Text>
      </View>
    );
  }

    const renderShiftCard = ({ item }: { item: Shift }) => {
    // Debug log to confirm UI rendering values
    console.log('Shift:', item.id, 'Match:', item.totalMatchedAmount, 'Coupon:', item.totalCouponAmount);
    const totalCurrentIn = Object.values(item.machines || {}).reduce((sum, m) => sum + (m.currentIn || 0), 0);
    const totalCurrentOut = Object.values(item.machines || {}).reduce((sum, m) => sum + (m.currentOut || 0), 0);
    const businessProfit = totalCurrentIn - totalCurrentOut - item.totalMatchedAmount - (item.totalCouponAmount || 0);
    const resultColor = businessProfit >= 0 ? '#4CAF50' : '#FF6347';
    const profitLabel = businessProfit >= 0 ? 'Profit' : 'Loss';

    return (
      <View style={styles.card}>
        {/* Debug: Show raw values for troubleshooting */}
        <Text style={{ color: '#FF0', fontSize: 12 }}>
          Debug: Match: {item.totalMatchedAmount}, Coupon: {item.totalCouponAmount}
        </Text>
        <View style={styles.cardHeader}>
          <Text style={styles.employeeName}>{item.employeeName}</Text>
          <View>
            <Text style={styles.timeText}>Start: {item.startTime ? new Date(item.startTime).toLocaleString() : 'N/A'}</Text>
            <Text style={styles.timeText}>End: {item.endTime ? new Date(item.endTime).toLocaleString() : 'N/A'}</Text>
          </View>
        </View>

        {item.notes && item.notes.trim() !== '' && (
          <View style={styles.notesSection}>
            <Text style={styles.notesTitle}>📝 Shift Notes</Text>
            <Text style={styles.notesText}>{item.notes}</Text>
          </View>
        )}

        {item.machines && Object.keys(item.machines).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Machine Details</Text>
            {Object.keys(item.machines).sort((a,b) => parseInt(a) - parseInt(b)).map((machineKey) => {
              const machine = item.machines[machineKey];
              const hasImages = machine.images && machine.images.length > 0;
              const net = (machine.currentIn || 0) - (machine.currentOut || 0);
              return (
                <View key={machineKey} style={styles.machineItem}>
                  <View style={styles.machineInfo}>
                      <Text style={styles.machineNumber}>Machine {machineKey}</Text>
                      <View style={styles.machineDataRow}>
                        <Text style={styles.machineDataText}><Text style={{color: '#AAA'}}>IN:</Text> ${(machine.currentIn || 0).toFixed(2)}</Text>
                        <Text style={styles.machineDataText}><Text style={{color: '#AAA'}}>OUT:</Text> ${(machine.currentOut || 0).toFixed(2)}</Text>
                        <Text style={styles.machineDataText}><Text style={{color: '#AAA'}}>NET:</Text> ${net.toFixed(2)}</Text>
                      </View>
                  </View>
                  <View style={styles.machineActions}>
                    {hasImages ? (
                      <TouchableOpacity
                        style={styles.viewSnapshotsButton}
                        onPress={() => openImageModal(machine.images!, machineKey)}
                      >
                        <Ionicons name="images" size={20} color="#000" />
                      </TouchableOpacity>
                    ) : (
                      <View style={[styles.viewSnapshotsButton, styles.noSnapshotsButton]}>
                        <Ionicons name="images-outline" size={20} color="#666" />
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <View style={styles.summaryContainer}>
            <SummaryRow label="Total In:" value={`$${totalCurrentIn.toFixed(2)}`} iconName="arrow-down-circle" valueColor="#4CAF50" />
            <SummaryRow label="Total Out:" value={`$${totalCurrentOut.toFixed(2)}`} iconName="arrow-up-circle" valueColor="#FF6347" />

            {/* --- UPDATED read-only display for Matched Amount --- */}
            <SummaryRow
              label="Matched Amount:"
              value={`$${item.totalMatchedAmount.toFixed(2)}`}
              iconName="swap-horizontal"
              valueColor="#FFD700"
            />
            {/* Added Coupon Amount summary row */}
            <SummaryRow
              label="Coupon Amount:"
              value={`$${(item.totalCouponAmount || 0).toFixed(2)}`}
              iconName="pricetag"
              valueColor="#00BFFF"
            />

            <View style={styles.divider} />
            <SummaryRow label={`${profitLabel}:`} value={`$${Math.abs(businessProfit).toFixed(2)}`} valueColor={resultColor} isBold={true} iconName={businessProfit >= 0 ? "trending-up" : "trending-down"} />
          </View>
        </View>

        <TouchableOpacity
          onPress={() => {
            const printContent = `
              <html>
                <head>
                  <style>
                    body { font-family: Arial, sans-serif; color: #000000; padding: 20px; }
                    h2, h3 { color: #000000; }
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                    th, td { border: 1px solid #cccccc; padding: 8px; text-align: left; }
                    th { background-color: #f2f2f2; }
                    .summary-p { margin: 5px 0; }
                  </style>
                </head>
                <body>
                  <h2>Shift Report - ${item.employeeName}</h2>
                  <p><strong>Start Time:</strong> ${item.startTime ? new Date(item.startTime).toLocaleString() : 'N/A'}</p>
                  <p><strong>End Time:</strong> ${item.endTime ? new Date(item.endTime).toLocaleString() : 'N/A'}</p>
                  ${item.notes ? `<p><strong>Notes:</strong> <i>${item.notes}</i></p>` : ''}
                  <h3>Machine Details</h3>
                  <table>
                    <thead><tr><th>Machine</th><th>In ($)</th><th>Out ($)</th><th>Snapshots</th></tr></thead>
                    <tbody>
                      ${Object.keys(item.machines || {}).sort((a, b) => parseInt(a) - parseInt(b)).map(key => {
                        const m = item.machines[key];
                        return `<tr><td>${key}</td><td>$${(m.currentIn || 0).toFixed(2)}</td><td>$${(m.currentOut || 0).toFixed(2)}</td><td>${m.images && m.images.length > 0 ? `${m.images.length} photo(s)` : 'N/A'}</td></tr>`;
                      }).join('')}
                    </tbody>
                  </table>
                  <h3>Summary</h3>
                  <p class="summary-p"><strong>Total In:</strong> $${totalCurrentIn.toFixed(2)}</p>
                  <p class="summary-p"><strong>Total Out:</strong> $${totalCurrentOut.toFixed(2)}</p>
                  <p class="summary-p"><strong>Matched Amount:</strong> $${item.totalMatchedAmount.toFixed(2)}</p>
                  <p class="summary-p"><strong>Coupon Amount:</strong> $${(item.totalCouponAmount || 0).toFixed(2)}</p>
                  <p class="summary-p"><strong>${profitLabel}:</strong> $${Math.abs(businessProfit).toFixed(2)}</p>
                </body>
              </html>`;
            import('expo-print').then(({ printAsync }) => printAsync({ html: printContent }));
          }}
          style={styles.printButton}
        >
          <Ionicons name="print" size={20} color="#000" />
          <Text style={styles.printButtonText}>Print Summary</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.headerContainer}>
        <Text style={styles.header}>Shift History</Text>
        <TouchableOpacity onPress={() => router.push('/')}>
          <Ionicons name="home-outline" size={28} color="#FFD700" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={shiftData}
        keyExtractor={(item) => item.id}
        renderItem={renderShiftCard}
        contentContainerStyle={{ paddingHorizontal: 10, paddingBottom: 20 }}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.centered}>
                <Text style={styles.noDataText}>No shift history found.</Text>
            </View>
          ) : null
        }
      />

      <ImageView
        images={selectedMachineImagesForViewer}
        imageIndex={currentImageIndex}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
        FooterComponent={({ imageIndex }) => (
          <View style={styles.footerContainer}>
            <Text style={styles.footerText}>
              Machine {selectedMachineNumber} ({imageIndex + 1}/{selectedMachineImagesForViewer.length})
            </Text>
          </View>
        )}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 40,
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 18,
    color: '#CCCCCC',
  },
  card: {
    backgroundColor: '#1C1C1E',
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2D2D2E',
  },
  cardHeader: {
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderColor: '#333',
  },
  employeeName: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#FFD700',
  },
  timeText: {
    fontSize: 13,
    color: '#AAAAAA',
  },
  divider: {
    height: 1,
    backgroundColor: '#333',
    marginVertical: 12,
  },
  section: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFD700',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  notesSection: {
    marginTop: 16,
    backgroundColor: 'rgba(255, 215, 0, 0.05)',
    padding: 12,
    borderRadius: 8,
  },
  notesTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 5,
  },
  notesText: {
    fontSize: 14,
    color: '#DDDDDD',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  machineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2A2A2A',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  machineInfo: {
    flex: 1,
    marginRight: 10,
  },
  machineNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  machineDataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  machineDataText: {
    fontSize: 14,
    color: '#FFFFFF',
    marginRight: 15,
  },
  machineActions: {
    marginLeft: 10,
  },
  viewSnapshotsButton: {
    backgroundColor: '#FFD700',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noSnapshotsButton: {
    backgroundColor: '#3A3A3A',
  },
  summaryContainer: {
    backgroundColor: '#2A2A2A',
    padding: 12,
    borderRadius: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#CCCCCC',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  printButton: {
    flexDirection: 'row',
    marginTop: 20,
    backgroundColor: '#FFD700',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  printButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  noDataText: {
    color: '#CCCCCC',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
  },
  footerContainer: {
    height: 80,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  footerText: {
    fontSize: 18,
    color: 'white',
    fontWeight: 'bold',
  }
});