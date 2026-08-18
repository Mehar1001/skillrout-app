// app/employeeShift.tsx
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, deleteDoc, doc, getDocs, setDoc, Timestamp, updateDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
} from 'react-native';
import { auth, db, storage } from '../firebaseConfig';

interface IconTextInputProps extends TextInputProps {
  iconName: keyof typeof Ionicons.glyphMap;
}
const IconTextInput: React.FC<IconTextInputProps> = ({ iconName, ...props }) => (
  <View style={styles.inputContainer}>
    <Ionicons name={iconName} size={22} color="#FFD700" style={styles.inputIcon} />
    <TextInput style={styles.input} {...props} placeholderTextColor="#888" />
  </View>
);

interface MachineEntry {
  prevIn?: number;
  prevOut?: number;
  newIn?: number;
  newOut?: number;
  images?: string[];
}
interface ShiftData {
  endTime?: string;
  machines?: { [key: string]: MachineEntry };
}

// FIX: Added a specific type for the machine data state
type MachineDataState = {
    [key: string]: {
      prevIn: number;
      prevOut: number;
      newIn: string;
      newOut: string;
      images: string[];
    }
};

export default function EmployeeShift() {
  const router = useRouter();
  const [employeeName, setEmployeeName] = useState('');
  const [machineData, setMachineData] = useState<MachineDataState>({});
  const [isShiftStarted, setIsShiftStarted] = useState(false);
  const [isShiftEnding, setIsShiftEnding] = useState(false);
  const [shiftId, setShiftId] = useState('');
  const [startTime, setStartTime] = useState<string | null>(null);
  const [newMachine, setNewMachine] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [shiftNotes, setShiftNotes] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [initialPrevIn, setInitialPrevIn] = useState('');
  const [initialPrevOut, setInitialPrevOut] = useState('');

  const handleTakeSnapshot = async (machineKey: string) => {
    if (machineData[machineKey]?.images.length >= 1) {
      Alert.alert('Snapshot Exists', `Only one snapshot is allowed for Machine ${machineKey}.`);
      return;
    }

    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (permissionResult.status !== 'granted') {
      Alert.alert('Permission Required', 'Camera access is required to take a snapshot.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.7,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      try {
        const asset = result.assets[0];
        const response = await fetch(asset.uri);
        const blob = await response.blob();

        const filename = `machineSnapshots/${auth.currentUser?.uid}/${machineKey}_${Date.now()}.jpg`;
        const imageRef = ref(storage, filename);

        await uploadBytes(imageRef, blob);
        const downloadURL = await getDownloadURL(imageRef);

        setMachineData((prev) => {
          const updated = { ...prev };
          const current = updated[machineKey] || { prevIn: 0, prevOut: 0, newIn: '', newOut: '', images: [] };
          const newImages = [...(current.images || []), downloadURL];
          updated[machineKey] = {
            ...current,
            images: newImages,
          };

          const storageKey = getStorageKey();
          if (storageKey) {
            AsyncStorage.getItem(storageKey).then((savedShiftStr) => {
              const savedShift = savedShiftStr ? JSON.parse(savedShiftStr) : {};
              savedShift.machineData = updated;
              AsyncStorage.setItem(storageKey, JSON.stringify(savedShift));
            });
          }

          return updated;
        });
      } catch (err) {
        console.error('Image Upload Error:', err);
        Alert.alert('Upload Error', 'Failed to upload image. Please try again.');
      }
    }
  };

  const getStorageKey = () => {
    const user = auth.currentUser;
    return user ? `ongoingShift_${user.uid}` : null;
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

  useEffect(() => {
    if (!isReady) return;

    const restoreShiftState = async () => {
      const storageKey = getStorageKey();
      if (!storageKey) return;

      const savedShift = await AsyncStorage.getItem(storageKey);
      if (savedShift) {
        const parsed = JSON.parse(savedShift);
        setEmployeeName(parsed.employeeName);
        setShiftId(parsed.shiftId);
        setStartTime(parsed.startTime);
        setIsShiftStarted(true);
        setIsShiftEnding(parsed.isShiftEnding || false);

        const restoredMachineData = parsed.machineData || {};
        Object.keys(restoredMachineData).forEach(key => {
            if (!restoredMachineData[key].images || !Array.isArray(restoredMachineData[key].images)) {
                restoredMachineData[key].images = [];
            }
            if (typeof restoredMachineData[key].prevIn !== 'number') restoredMachineData[key].prevIn = 0;
            if (typeof restoredMachineData[key].prevOut !== 'number') restoredMachineData[key].prevOut = 0;
            if (typeof restoredMachineData[key].newIn !== 'string') restoredMachineData[key].newIn = '';
            if (typeof restoredMachineData[key].newOut !== 'string') restoredMachineData[key].newOut = '';
        });
        setMachineData(restoredMachineData);
        setShiftNotes(parsed.shiftNotes || '');
      }
    };
    restoreShiftState();
  }, [isReady]);

  const addMachine = async () => {
    if (!newMachine.trim()) return;
    const machineKey = newMachine.trim();
    if (machineData[machineKey]) {
      Alert.alert('Duplicate Machine', `Machine ${machineKey} has already been added.`);
      return;
    }

    try {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated.');
      const ownerId = user.uid;

      const shiftsSnapshot = await getDocs(collection(db, `owners/${ownerId}/shifts`));
      let latestShift: ShiftData = { endTime: '', machines: {} };
      shiftsSnapshot.forEach(doc => {
        const data = doc.data();
        if (!latestShift.endTime || new Date(data.endTime) > new Date(latestShift.endTime ?? 0)) {
          latestShift = data;
        }
      });

      const machineEntry = latestShift.machines?.[machineKey];
      if (machineEntry && typeof machineEntry.newIn === 'number' && typeof machineEntry.newOut === 'number') {
        setMachineData(prev => {
          const updated = {
            ...prev,
            [machineKey]: {
              prevIn: machineEntry.newIn ?? 0,
              prevOut: machineEntry.newOut ?? 0,
              newIn: '',
              newOut: '',
              images: []
            }
          };
          const storageKey = getStorageKey();
          if (storageKey) {
            AsyncStorage.mergeItem(storageKey, JSON.stringify({ machineData: updated }));
          }
          return updated;
        });
        setNewMachine('');
      } else {
        setShowAddModal(true);
      }
    } catch (error) {
      console.error('Error checking machine history:', error);
      setShowAddModal(true);
    }
  };

  const handleConfirmAddMachine = () => {
    const machineKey = newMachine.trim();
    const prevInNum = parseFloat(initialPrevIn) || 0;
    const prevOutNum = parseFloat(initialPrevOut) || 0;

    setMachineData((prev) => {
      const updated = {
        ...prev,
        [machineKey]: {
          prevIn: prevInNum,
          prevOut: prevOutNum,
          newIn: '',
          newOut: '',
          images: []
        }
      };
      const storageKey = getStorageKey();
      if (storageKey) {
        AsyncStorage.mergeItem(storageKey, JSON.stringify({ machineData: updated }));
      }
      return updated;
    });

    setNewMachine('');
    setInitialPrevIn('');
    setInitialPrevOut('');
    setShowAddModal(false);
  };

  const handleDeleteMachine = (machineToDelete: string) => {
    Alert.alert(
      "Confirm Deletion",
      `Are you sure you want to remove Machine ${machineToDelete}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            const storageKey = getStorageKey();
            if (!storageKey) return;
            setMachineData((prev) => {
              const updatedData = { ...prev };
              delete updatedData[machineToDelete];
              AsyncStorage.mergeItem(storageKey, JSON.stringify({ machineData: updatedData }));
              return updatedData;
            });
          },
        },
      ]
    );
  };

  const handleStartShift = async () => {
    if (!employeeName.trim()) {
        Alert.alert('Please enter employee name');
        return;
    }

    const user = auth.currentUser;
    if (!user) {
        Alert.alert("Error", "Could not start shift. User not identified.");
        return;
    }

    if (isShiftStarted) {
        Alert.alert("Shift Active", "A shift is already in progress. Please end the current shift before starting a new one.");
        return;
    }

    setIsSubmitting(true);

    const storageKey = getStorageKey();
    if (!storageKey) {
        setIsSubmitting(false);
        return;
    }
    
    const newShiftId = `${employeeName.trim().replace(/\s+/g, '_')}_${Date.now()}`;
    const newStartTime = new Date();

    // FIX: Typed the carriedMachineData object to avoid implicit 'any'
    let carriedMachineData: MachineDataState = {};
    try {
        const ownerId = user.uid;
        const shiftsSnapshot = await getDocs(collection(db, `owners/${ownerId}/shifts`));
        let latestShift: { endTime?: Timestamp, machines?: any } = {};
        let latestEndTime: Date | null = null;

        shiftsSnapshot.forEach(doc => {
            const data = doc.data();
            const endTime = data.endTime?.toDate();
            if (!latestEndTime || (endTime && endTime > latestEndTime)) {
                latestEndTime = endTime;
                latestShift = data;
            }
        });

        if (latestShift.machines) {
            Object.entries(latestShift.machines as Record<string, MachineEntry>).forEach(([machineKey, machineData]) => {
                carriedMachineData[machineKey] = {
                    prevIn: machineData.newIn || 0,
                    prevOut: machineData.newOut || 0,
                    newIn: '',
                    newOut: '',
                    images: []
                };
            });
        }
    } catch (error) {
        console.error('Error loading last shift data:', error);
    }

    const shiftDataForFirebase = {
        employeeName: employeeName.trim(),
        startTime: Timestamp.fromDate(newStartTime),
        endTime: null,
        active: true,
        machines: carriedMachineData,
        notes: ''
    };
    
    const shiftDataForLocal = {
        employeeName: employeeName.trim(),
        employeeId: user.uid,
        shiftId: newShiftId,
        startTime: newStartTime.toISOString(),
        isShiftEnding: false,
        machineData: carriedMachineData,
        shiftNotes: ''
    };

    try {
        await setDoc(doc(db, `owners/${user.uid}/shifts`, newShiftId), shiftDataForFirebase);
        await AsyncStorage.setItem(storageKey, JSON.stringify(shiftDataForLocal));

        setShiftId(newShiftId);
        setStartTime(newStartTime.toISOString());
        setMachineData(carriedMachineData);
        setShiftNotes('');
        setIsShiftStarted(true);

        Alert.alert('Shift Started', `Shift for ${employeeName} has begun.`);

    } catch (error) {
        console.error("Failed to save shift start data:", error);
        Alert.alert("Error", "There was a problem starting the shift. Please try again.");
    } finally {
        setIsSubmitting(false);
    }
  };

  // FIX: Re-created the handleEndShift function
  const handleEndShift = async () => {
    setIsShiftEnding(true);
    const storageKey = getStorageKey();
    if (!storageKey) return;
    try {
        const current = await AsyncStorage.getItem(storageKey);
        if (current) {
            const parsed = JSON.parse(current);
            parsed.isShiftEnding = true;
            await AsyncStorage.setItem(storageKey, JSON.stringify(parsed));
        }
    } catch (error) {
        console.error("Error setting shift to ending state:", error);
    }
  };

  // FIX: Re-created the handleNotesInput function
  const handleNotesInput = (text: string) => {
    setShiftNotes(text);
    const storageKey = getStorageKey();
    if (!storageKey) return;
    // Use mergeItem to avoid overwriting other shift data
    AsyncStorage.mergeItem(storageKey, JSON.stringify({ shiftNotes: text }));
  };

  const handleMachineInput = (machine: string, type: 'newIn' | 'newOut', value: string) => {
    const storageKey = getStorageKey();
    if (!storageKey) return;
    setMachineData((prev) => {
      const updated = {
        ...prev,
        [machine]: {
          ...prev[machine],
          [type]: value,
          images: prev[machine]?.images || []
        }
      };
      AsyncStorage.mergeItem(storageKey, JSON.stringify({ machineData: updated }));
      return updated;
    });
  };

  const handleDiscardShift = async () => {
    Alert.alert(
      "Discard Shift",
      "Are you sure you want to discard this entire shift? All entered data will be lost.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Discard",
          style: "destructive",
          onPress: async () => {
            const user = auth.currentUser;
            if (user && shiftId) {
                // Also delete from Firestore
                await deleteDoc(doc(db, `owners/${user.uid}/shifts`, shiftId));
            }
            const storageKey = getStorageKey();
            if (storageKey) {
              await AsyncStorage.removeItem(storageKey);
            }
            setIsShiftStarted(false);
            setIsShiftEnding(false);
            setEmployeeName('');
            setMachineData({});
            setShiftId('');
            setStartTime(null);
            setShiftNotes('');
          }
        }
      ]
    );
  };

  const handleSaveShift = async () => {
    setIsSubmitting(true);
    try {
      const hasMachineInput = Object.values(machineData).some(
        ({ newIn, newOut }) => (newIn && parseFloat(newIn) > 0) || (newOut && parseFloat(newOut) > 0)
      );
      if (!hasMachineInput) {
        Alert.alert('Missing Data', 'Please enter amounts for at least one machine.');
        setIsSubmitting(false);
        return;
      }
      const machinesMissingSnapshots = Object.entries(machineData).filter(([_, data]) => {
        const hasIn = data?.newIn && parseFloat(data.newIn) > 0;
        const hasOut = data?.newOut && parseFloat(data.newOut) > 0;
        const hasImages = Array.isArray(data?.images) && data.images.length > 0;
        return (hasIn || hasOut) && !hasImages;
      });
      if (machinesMissingSnapshots.length > 0) {
        const missing = machinesMissingSnapshots.map(([name]) => name).join(', ');
        Alert.alert('Snapshots Required', `Please upload at least one snapshot for: ${missing}.`);
        setIsSubmitting(false);
        return;
      }
      const user = auth.currentUser;
      if (!user) throw new Error('Owner not logged in. Please restart the app.');
      const ownerId = user.uid;
      const endTime = new Date();

      const machines: { [key: string]: any } = {};
      Object.entries(machineData).forEach(([machine, data]) => {
        const newInNum = parseFloat(data.newIn) || 0;
        const newOutNum = parseFloat(data.newOut) || 0;
        const prevInNum = data.prevIn || 0;
        const prevOutNum = data.prevOut || 0;
        const deltaIn = newInNum - prevInNum;
        const deltaOut = newOutNum - prevOutNum;
        machines[machine] = {
          prevIn: prevInNum,
          prevOut: prevOutNum,
          newIn: newInNum,
          newOut: newOutNum,
          currentIn: deltaIn,
          currentOut: deltaOut,
          images: data.images || []
        };
      });

      // Use updateDoc instead of setDoc to avoid overwriting the initial document
      const shiftDocRef = doc(db, `owners/${ownerId}/shifts`, shiftId);
      await updateDoc(shiftDocRef, {
        endTime: Timestamp.fromDate(endTime),
        active: false, // Set shift to inactive
        machines,
        notes: shiftNotes.trim(),
      });

      const storageKey = getStorageKey();
      if (storageKey) await AsyncStorage.removeItem(storageKey);

      Alert.alert('Shift Saved!', 'The shift data has been successfully recorded.');
      setIsShiftStarted(false);
      setIsShiftEnding(false);
      setEmployeeName('');
      setMachineData({});
      setShiftId('');
      setStartTime(null);
      setShiftNotes('');
    } catch (error: any) {
      Alert.alert('Error Saving Shift', error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isReady) {
    return (
        <View style={styles.centered}>
            <ActivityIndicator size="large" color="#FFD700" />
        </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
    >
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.header}>Shift Control</Text>
        <TouchableOpacity onPress={() => router.push('/')}>
          <Ionicons name="home-outline" size={28} color="#FFD700" />
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        {!isShiftStarted ? (
          <>
            <Text style={styles.cardTitle}>Start New Shift</Text>
            <IconTextInput iconName="person-circle-outline" placeholder="Enter Employee Name" value={employeeName} onChangeText={setEmployeeName} />
            <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={handleStartShift}>
              <Ionicons name="play-circle-outline" size={24} color="#000" />
              <Text style={styles.buttonText}>Start Shift</Text>
            </TouchableOpacity>
          </>
        ) : !isShiftEnding ? (
          <>
            <Text style={styles.cardTitle}>Shift Active</Text>
            <View style={styles.activeShiftInfo}>
              <Ionicons name="time-outline" size={40} color="#FFD700" />
              <View style={{marginLeft: 15}}>
                <Text style={styles.activeShiftText}>Employee: <Text style={styles.activeShiftValue}>{employeeName}</Text></Text>
                <Text style={styles.activeShiftText}>Started at: <Text style={styles.activeShiftValue}>{startTime ? new Date(startTime).toLocaleTimeString() : ''}</Text></Text>
              </View>
            </View>
            <TouchableOpacity style={[styles.button, styles.warningButton]} onPress={handleEndShift}>
              <Ionicons name="stop-circle-outline" size={24} color="#000" />
              <Text style={styles.buttonText}>End & Finalize Shift</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.dangerButton]} onPress={handleDiscardShift}>
              <Ionicons name="trash-bin-outline" size={20} color="#FFF" />
              <Text style={[styles.buttonText, { color: '#FFF' }]}>Discard Shift</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.cardTitle}>Finalize Shift for {employeeName}</Text>
            <Text style={styles.subHeader}>Enter Machine Data</Text>
            <View style={styles.addMachineRow}>
              <View style={{flex: 1}}>
                <IconTextInput iconName="add-circle-outline" placeholder="Machine #" value={newMachine} onChangeText={setNewMachine} onSubmitEditing={addMachine} keyboardType="number-pad" />
              </View>
              <TouchableOpacity onPress={addMachine} style={styles.addButton}>
                <Text style={styles.addButtonText}>Add</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.machineListContainer}>
              {Object.keys(machineData).map((machine) => (
                <View key={machine} style={styles.machineCard}>
                  <View style={styles.machineCardHeader}>
                    <Text style={styles.machineCardTitle}>Machine {machine}</Text>
                    <TouchableOpacity onPress={() => handleDeleteMachine(machine)}>
                      <Ionicons name="trash-outline" size={24} color="#FF6347" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.machineCardBody}>
                    <View style={styles.valueColumn}>
                      <Text style={styles.columnTitle}>Previous</Text>
                      <View style={styles.valueRow}>
                        <Text style={styles.valueLabel}>IN:</Text>
                        <Text style={styles.valueText}>$ {machineData[machine]?.prevIn?.toLocaleString() ?? '0'}</Text>
                      </View>
                      <View style={styles.valueRow}>
                        <Text style={styles.valueLabel}>OUT:</Text>
                        <Text style={styles.valueText}>$ {machineData[machine]?.prevOut?.toLocaleString() ?? '0'}</Text>
                      </View>
                    </View>

                    <View style={styles.inputColumn}>
                      <Text style={styles.columnTitle}>New Amount</Text>
                      <View style={styles.inputWrapper}>
                        <Text style={styles.inputLabel}>IN</Text>
                        <TextInput
                          style={styles.newAmountInput}
                          placeholder="$ 0"
                          placeholderTextColor="#555"
                          keyboardType="numeric"
                          value={machineData[machine]?.newIn || ''}
                          onChangeText={(text) => handleMachineInput(machine, 'newIn', text)}
                        />
                      </View>
                       <View style={styles.inputWrapper}>
                        <Text style={styles.inputLabel}>OUT</Text>
                        <TextInput
                          style={styles.newAmountInput}
                          placeholder="$ 0"
                          placeholderTextColor="#555"
                          keyboardType="numeric"
                          value={machineData[machine]?.newOut || ''}
                          onChangeText={(text) => handleMachineInput(machine, 'newOut', text)}
                        />
                      </View>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[styles.snapshotButton, machineData[machine]?.images.length > 0 && styles.snapshotTaken]}
                    onPress={() => handleTakeSnapshot(machine)}
                    disabled={machineData[machine]?.images.length >= 1}
                  >
                    <Ionicons name={machineData[machine]?.images.length > 0 ? "checkmark-circle" : "camera-outline"} size={22} color="#000" />
                    <Text style={styles.snapshotButtonText}>
                      {machineData[machine]?.images.length > 0 ? 'Snapshot Saved' : 'Take Snapshot'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            <View style={styles.notesContainer}>
              <Text style={styles.subHeader}>Shift Notes (Optional)</Text>
              <TextInput
                style={styles.notesInput}
                placeholder="e.g., Machine 5 was reset at 3 PM..."
                multiline
                value={shiftNotes}
                onChangeText={handleNotesInput}
                placeholderTextColor="#888"
              />
            </View>

            <TouchableOpacity style={[styles.button, styles.successButton]} onPress={handleSaveShift} disabled={isSubmitting}>
              {isSubmitting ? (
                <ActivityIndicator color="#FFF"/>
              ) : (
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                  <Ionicons name="save-outline" size={24} color="#FFF" />
                  <Text style={[styles.buttonText, { color: '#FFF' }]}>Save Shift</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.dangerButton]} onPress={handleDiscardShift}>
              <Ionicons name="close-circle-outline" size={22} color="#FFF" />
              <Text style={[styles.buttonText, { color: '#FFF' }]}>Cancel & Discard</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
      {showAddModal && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#000000CC', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#1C1C1E', padding: 20, borderRadius: 12, width: '80%' }}>
            <Text style={{ color: '#FFD700', fontSize: 18, marginBottom: 15 }}>Set Initial Balances for Machine {newMachine}</Text>
            <TextInput
              placeholder="Enter Initial IN"
              keyboardType="numeric"
              value={initialPrevIn}
              onChangeText={setInitialPrevIn}
              style={styles.modalInput}
              placeholderTextColor="#555"
            />
            <TextInput
              placeholder="Enter Initial OUT"
              keyboardType="numeric"
              value={initialPrevOut}
              onChangeText={setInitialPrevOut}
              style={styles.modalInput}
              placeholderTextColor="#555"
            />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
              <TouchableOpacity onPress={() => setShowAddModal(false)} style={[styles.button, styles.dangerButton, { flex: 1, marginRight: 5 }]}>
                <Text style={[styles.buttonText, {color: '#FFF'}]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleConfirmAddMachine} style={[styles.button, styles.successButton, { flex: 1, marginLeft: 5 }]}>
                <Text style={[styles.buttonText, {color: '#FFF'}]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 10,
    backgroundColor: '#121212',
    flexGrow: 1
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingBottom: 10,
    marginTop: 40
  },
  header: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FFD700'
  },
  card: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 20,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#2D2D2E',
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#FFD700',
    textAlign: 'center',
    marginBottom: 24
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderWidth: 1,
    borderColor: '#444',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 15,
  },
  inputIcon: {
    marginRight: 10
  },
  input: {
    flex: 1,
    height: 55,
    fontSize: 16,
    color: '#FFFFFF'
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 15,
    marginTop: 10,
  },
  buttonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10
  },
  primaryButton: {
    backgroundColor: '#FFD700'
  },
  warningButton: {
    backgroundColor: '#FFD700'
  },
  successButton: {
    backgroundColor: '#4CAF50'
  },
  dangerButton: {
    backgroundColor: '#D9534F'
  },
  activeShiftInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  activeShiftText: {
    fontSize: 16,
    color: '#CCCCCC'
  },
  activeShiftValue: {
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  subHeader: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFD700',
    marginBottom: 15
  },
  addMachineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  addButton: {
    marginLeft: 10,
    backgroundColor: '#FFD700',
    paddingHorizontal: 20,
    height: 55,
    justifyContent: 'center',
    borderRadius: 12,
  },
  addButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16
  },
  notesContainer: {
    marginVertical: 20,
  },
  notesInput: {
    backgroundColor: '#2A2A2A',
    borderWidth: 1,
    borderColor: '#444',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    textAlignVertical: 'top',
    height: 100,
    color: '#FFFFFF',
  },
  modalInput: {
      marginBottom: 15,
      backgroundColor: '#2A2A2A',
      color: '#FFF',
      padding: 15,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#444',
      fontSize: 16,
  },
  machineListContainer: {
    marginBottom: 20,
  },
  machineCard: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#3A3A3A',
  },
  machineCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  machineCardTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  machineCardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  valueColumn: {
    flex: 1,
    paddingRight: 10,
  },
  inputColumn: {
    flex: 1,
    paddingLeft: 10,
  },
  columnTitle: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 5,
  },
  valueLabel: {
    color: '#AAA',
    fontSize: 14,
    width: 40,
  },
  valueText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  inputLabel: {
    color: '#AAA',
    fontSize: 14,
    width: 40,
  },
  newAmountInput: {
    flex: 1,
    backgroundColor: '#1C1C1E',
    color: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#444',
  },
  snapshotButton: {
    backgroundColor: '#FFD700',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  snapshotTaken: {
    backgroundColor: '#4CAF50',
  },
  snapshotButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});
