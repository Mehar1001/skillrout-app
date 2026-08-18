// @ts-nocheck
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import dayjs from 'dayjs';
import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ConfirmationResult, onAuthStateChanged, signInWithPhoneNumber } from 'firebase/auth';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import { collection, doc, getDoc, getDocs, query, setDoc, Timestamp, where } from 'firebase/firestore';
import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TextInputProps,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from 'react-native';
import { auth, db, firebaseConfig } from '../firebaseConfig';
// Initialize Firebase app if not already initialized
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// LionLogo image import
const LionLogo = require('../assets/images/Logo1.png');

// Enhanced Casino-themed colors with premium textures
const CasinoColors = {
    background: 'rgb(55, 51, 51)',
    cardBackground: '#1A1A1A',
    primaryText: '#FFFFFF',
    secondaryText: '#B8B8B8',
    accentGold: '#D4AF37',
    accentGoldLight: '#F4E481',
    accentRed: '#DC143C',
    accentGreen: '#228B22',
    accentBlue: '#1E90FF',
    inputBackground: '#2A2A2A',
    inputBorder: '#666666',
    buttonPrimaryBg: '#D4AF37',
    buttonPrimaryText: '#000000',
    buttonSecondaryBg: '#333333',
    buttonSecondaryText: '#FFFFFF',
    buttonDangerBg: '#8B0000',
    buttonDangerText: '#FFFFFF',
    shadowColor: '#000000',
    divider: '#444444',
    gradientDark: ['#0A0A0A', '#1A1A1A', '#2A2A2A'] as const,
    gradientGold: ['#D4AF37', '#F4E481', '#D4AF37'] as const,
    neonGlow: '#D4AF37',
};


// --- Helper Functions ---
const uriToBlob = (uri: string): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = function () { resolve(xhr.response); };
        xhr.onerror = function (e) { reject(new Error('uriToBlob failed')); };
        xhr.responseType = 'blob';
        xhr.open('GET', uri, true);
        xhr.send(null);
    });
};

// --- Interfaces ---
interface Customer {
    phone: string;
    id: string;
    name: string;
    idImageUrl?: string;
    createdAt: Timestamp;
    // These are added dynamically in the app, not stored in Firestore directly
    dailyMatchUsed?: boolean;
    dailyCouponUsed?: boolean;
}

interface IconTextInputProps extends TextInputProps {
    iconName: keyof typeof Ionicons.glyphMap;
    containerStyle?: object;
}

interface OtpModalProps {
    visible: boolean;
    onVerify: (otp: string) => void;
    onCancel: () => void;
    onSendOtp: () => void;
    phoneNumber: string;
    isSendingOtp: boolean;
}


// --- Components ---

const IconTextInput: React.FC<IconTextInputProps> = ({ iconName, containerStyle, ...props }) => {
    return (
        <LinearGradient
            colors={['#2A2A2A', '#1A1A1A']}
            style={[styles.inputContainer, containerStyle]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
        >
            <Ionicons name={iconName} size={22} color={CasinoColors.accentGold} style={styles.inputIcon} />
            <TextInput
                style={styles.input}
                {...props}
                placeholderTextColor={CasinoColors.secondaryText}
            />
        </LinearGradient>
    );
};

const OtpModal: React.FC<OtpModalProps> = ({ visible, onVerify, onCancel, onSendOtp, phoneNumber, isSendingOtp }) => {
    const [otp, setOtp] = useState('');
    const [otpSent, setOtpSent] = useState(false);

    const handleSendOtp = () => {
        onSendOtp();
        setOtpSent(true);
    };

    const handleVerify = () => {
        if (otp.length === 6) {
            onVerify(otp);
        } else {
            Alert.alert("Invalid OTP", "Please enter the 6-digit code.");
        }
    };

    const handleCancel = () => {
        setOtp('');
        setOtpSent(false);
        onCancel();
    };

    return (
        <Modal visible={visible} transparent={true} animationType="fade">
            <View style={styles.modalBackgroundCentered}>
                <View style={styles.payoutModal}>
                    <Text style={styles.modalTitle}>Phone Verification</Text>
                    <Text style={styles.modalSubtitle}>
                        {!otpSent ? `A 6-digit code will be sent to +1${phoneNumber}.` : `Enter the code sent to +1${phoneNumber}.`}
                    </Text>

                    {!otpSent ? (
                        <TouchableOpacity style={styles.payoutModalButton} onPress={handleSendOtp} disabled={isSendingOtp}>
                            <LinearGradient colors={CasinoColors.gradientGold} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.submitButtonGradient}>
                                {isSendingOtp ? <ActivityIndicator color={CasinoColors.buttonPrimaryText} /> :
                                    <>
                                        <Ionicons name="send" size={22} color={CasinoColors.buttonPrimaryText} />
                                        <Text style={styles.payoutModalButtonText}>Send OTP</Text>
                                    </>
                                }
                            </LinearGradient>
                        </TouchableOpacity>
                    ) : (
                        <>
                            <IconTextInput
                                iconName="keypad-outline"
                                placeholder="Enter 6-Digit OTP"
                                keyboardType="number-pad"
                                value={otp}
                                onChangeText={setOtp}
                                maxLength={6}
                            />
                            <TouchableOpacity style={styles.payoutModalButton} onPress={handleVerify}>
                                <LinearGradient colors={CasinoColors.gradientGold} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.submitButtonGradient}>
                                    <Ionicons name="checkmark-circle-outline" size={24} color={CasinoColors.buttonPrimaryText} />
                                    <Text style={styles.payoutModalButtonText}>Verify</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </>
                    )}
                    <TouchableOpacity onPress={handleCancel}>
                        <Text style={styles.modalCloseText}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};


export default function Login() {
    const router = useRouter();

    // --- Firebase Recaptcha Verifier Ref ---
    const recaptchaVerifier = useRef(null);

    // --- State Management ---
    const [loading, setLoading] = useState<boolean>(true);
    const [formMode, setFormMode] = useState<'new' | 'existing' | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCheckingPhone, setIsCheckingPhone] = useState(false);

    // Customer fields
    const [phone, setPhone] = useState('');
    const [name, setName] = useState('');
    const [idImage, setIdImage] = useState<string | null>(null);
    const [lookupQuery, setLookupQuery] = useState('');
    const [isPhoneVerified, setIsPhoneVerified] = useState(false);
    const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);


    // Transaction fields
    const [transactionType, setTransactionType] = useState<'match' | 'coupon'>('match');
    const [matchAmount, setMatchAmount] = useState('');
    const [couponAmount, setCouponAmount] = useState('');
    const [machineNumber, setMachineNumber] = useState('');
    const [snapshot, setSnapshot] = useState<string | null>(null);

    // Modals and UI state
    const [message, setMessage] = useState('');
    const [menuVisible, setMenuVisible] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [foundCustomer, setFoundCustomer] = useState<Customer | null>(null);
    const [isOtpModalVisible, setIsOtpModalVisible] = useState(false);
    const [isSendingOtp, setIsSendingOtp] = useState(false);
    const [showSnapshotModal, setShowSnapshotModal] = useState(false);
    const [ownerData, setOwnerData] = useState<{ hasSmsFeature?: boolean; gameroomName?: string } | null>(null);

    // --- Effects ---
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                try {
                    const ownerRef = doc(db, 'owners', user.uid);
                    const docSnap = await getDoc(ownerRef);
                    if (docSnap.exists()) { setOwnerData(docSnap.data()); }
                } catch (error) { console.error("Could not fetch owner data:", error); }
                finally { setLoading(false); }
            } else {
                router.replace('/owner');
            }
        });
        return () => unsubscribe();
    }, [router]);

    // Removed reCAPTCHA verifier setup for React Native/Expo.


    // --- Functions ---
    const resetForm = () => {
        setFormMode(null);
        setName('');
        setPhone('');
        setIdImage(null);
        setLookupQuery('');
        setFoundCustomer(null);
        setTransactionType('match');
        setMatchAmount('');
        setCouponAmount('');
        setMachineNumber('');
        setSnapshot(null);
        setMessage('');
        setIsSubmitting(false);
        setIsPhoneVerified(false);
        setConfirmationResult(null);
    };

    const handlePhoneChange = async (text: string) => {
        const newText = text.replace(/[^0-9]/g, '');
        setPhone(newText);
        if (newText.length === 10) {
            setIsCheckingPhone(true);
            try {
                const user = auth.currentUser;
                if (!user) throw new Error("Authentication error");
                const customerRef = doc(db, `owners/${user.uid}/customers`, newText);
                const customerSnap = await getDoc(customerRef);

                if (customerSnap.exists()) {
                    Alert.alert("Phone Number Exists", `This phone number is already registered to: ${customerSnap.data().name}.`);
                } else {
                    setIsOtpModalVisible(true);
                }
            } catch (error) {
                console.error("Phone check failed:", error);
                Alert.alert("Error", "Could not check phone number.");
            } finally {
                setIsCheckingPhone(false);
            }
        }
    };

    const handleSendOtp = async () => {
        setIsSendingOtp(true);
        try {
            const fullPhoneNumber = `+1${phone}`;
            // Use recaptchaVerifier for Expo phone auth
            if (!recaptchaVerifier.current) throw new Error('reCAPTCHA not ready');
            const confirmation = await signInWithPhoneNumber(
                auth,
                fullPhoneNumber,
                recaptchaVerifier.current
            );
            setConfirmationResult(confirmation);
            Alert.alert("OTP Sent", `A verification code has been sent to ${fullPhoneNumber}.`);
        } catch (error) {
            console.error("OTP send error:", error);
            Alert.alert("Error", "Failed to send OTP. This can happen if the phone number is invalid or a network error occurred.");
            setIsOtpModalVisible(false); // Close modal on failure
        } finally {
            setIsSendingOtp(false);
        }
    };


    const handleOtpVerification = async (otp: string) => {
        if (!confirmationResult) {
            Alert.alert("Error", "Verification process not started. Please try again.");
            return;
        }
        setIsSubmitting(true);
        try {
            await confirmationResult.confirm(otp);
            setIsOtpModalVisible(false);
            setIsPhoneVerified(true);
            setMessage('✅ Phone number verified. Please fill out the remaining details and save.');
        } catch (error) {
            console.error("OTP verification error:", error);
            Alert.alert("Verification Failed", "The code you entered is incorrect. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };


    const handleCaptureId = async () => {
        const p = await ImagePicker.requestCameraPermissionsAsync();
        if (!p.granted) { Alert.alert('Camera access is required!'); return; }
        const r = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.5 });
        if (!r.canceled) {
             if (r.assets && r.assets.length > 0) {
                 setIdImage(r.assets[0].uri);
                 Alert.alert('Success', 'Photo Captured!');
            }
        }
    };

    const handleSaveNewCustomer = async () => {
        if (!name.trim()) {
            Alert.alert('Validation Error', 'Please enter a name for the new customer.');
            return;
        }
        if (!isPhoneVerified) {
            Alert.alert('Validation Error', 'Phone number must be verified first.');
            return;
        }

        setIsSubmitting(true);
        setMessage('Saving customer...');

        try {
            const user = auth.currentUser;
            if (!user) throw new Error("Not authenticated");

            const ongoingShiftKey = `ongoingShift_${user.uid}`;
            const ongoingShift = await AsyncStorage.getItem(ongoingShiftKey);
            if (!ongoingShift) {
                throw new Error('Please start an employee shift before registering a customer.');
            }
            const parsedShift = JSON.parse(ongoingShift);
            if (!parsedShift || !parsedShift.employeeId) {
                throw new Error('Invalid or expired shift. Please start a new employee shift.');
            }

            let idImageUrl: string | undefined = undefined;
            if (idImage) {
                const blob = await uriToBlob(idImage);
                const storageRef = ref(getStorage(), `owners/${user.uid}/customer_ids/${phone}_${Date.now()}.jpg`);
                await uploadBytes(storageRef, blob);
                idImageUrl = await getDownloadURL(storageRef);
            }

            let uniqueId = '';
            let isIdUnique = false;
            while (!isIdUnique) {
                uniqueId = Math.floor(1000 + Math.random() * 9000).toString();
                const q = query(collection(db, `owners/${user.uid}/customers`), where('id', '==', uniqueId));
                const querySnapshot = await getDocs(q);
                isIdUnique = querySnapshot.empty;
            }

            const newCustomer: Omit<Customer, 'dailyMatchUsed' | 'dailyCouponUsed'> = {
                phone: phone,
                id: uniqueId,
                name: name.trim(),
                idImageUrl: idImageUrl,
                createdAt: Timestamp.now(),
            };

            const customerRef = doc(db, `owners/${user.uid}/customers`, phone);
            await setDoc(customerRef, newCustomer);

            Alert.alert(
                "Registration Successful!",
                `Customer ${newCustomer.name} created.\nUnique ID: ${newCustomer.id}`
            );
            resetForm();

        } catch (error) {
            console.error("Error during new customer registration:", error);
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            setMessage(`Error: ${errorMessage}`);
            Alert.alert("Registration Failed", errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };


    const handleLookup = async () => {
        if (isSearching || !lookupQuery.trim()) return;

        setIsSearching(true);
        setFoundCustomer(null);
        setMessage('');
        const user = auth.currentUser;
        if (!user) {
            Alert.alert("Error", "Not logged in.");
            setIsSearching(false);
            return;
        }

        const customersRef = collection(db, 'owners', user.uid, 'customers');
        let q;

        if (/^\d{10}$/.test(lookupQuery)) { // Phone number lookup
            q = query(customersRef, where('phone', '==', lookupQuery));
        } else if (/^\d{4}$/.test(lookupQuery)) { // Unique ID lookup
            q = query(customersRef, where('id', '==', lookupQuery));
        } else {
            Alert.alert("Invalid Search", "Please enter a 10-digit phone number or a 4-digit unique ID.");
            setIsSearching(false);
            return;
        }

        try {
            const querySnapshot = await getDocs(q);
            if (querySnapshot.empty) {
                Alert.alert("Not Found", "No customer found with that Phone or ID.");
            } else {
                const customerDoc = querySnapshot.docs[0];
                const customerData = { id: customerDoc.id, ...customerDoc.data() } as Customer;

                // Check daily visit status
                const todayStr = dayjs().format('YYYY-MM-DD');
                const dailyVisitDocRef = doc(db, `owners/${user.uid}/customers/${customerData.phone}/visitHistory`, todayStr);
                const dailyVisitSnap = await getDoc(dailyVisitDocRef);

                customerData.dailyMatchUsed = false;
                customerData.dailyCouponUsed = false;

                if (dailyVisitSnap.exists()) {
                    const visitData = dailyVisitSnap.data();
                    if (visitData.matchAmount > 0) customerData.dailyMatchUsed = true;
                    if (visitData.couponAmount > 0) customerData.dailyCouponUsed = true;
                }

                // Set messages and default transaction type based on status
                if (customerData.dailyMatchUsed && customerData.dailyCouponUsed) {
                    setMessage(`Both Match and Coupon used today for ${customerData.name}.`);
                } else if (customerData.dailyMatchUsed) {
                    setMessage(`Match amount used for ${customerData.name}. Use coupon instead.`);
                    setTransactionType('coupon');
                } else {
                    setMessage('');
                    setTransactionType('match');
                }

                setFoundCustomer(customerData);
            }
        } catch (e) {
            console.error("Lookup failed:", e);
            Alert.alert("Error", "Customer lookup failed.");
        } finally {
            setIsSearching(false);
        }
    };

    const handleTransactionSubmit = async () => {
        if (isSubmitting || !foundCustomer) return;

        if (transactionType === 'match' && foundCustomer.dailyMatchUsed) {
            Alert.alert("Action Denied", "This customer has already used a match today.");
            return;
        }
        if (transactionType === 'coupon' && foundCustomer.dailyCouponUsed) {
            Alert.alert("Action Denied", "This customer has already used a coupon today.");
            return;
        }
        if (transactionType === 'coupon' && !foundCustomer.dailyMatchUsed) {
            Alert.alert("Action Denied", "A match must be given before a coupon.");
            return;
        }


        const user = auth.currentUser;
        if (!user) { Alert.alert("Error", "Not logged in."); return; }

        try {
            const ongoingShiftKey = `ongoingShift_${user.uid}`;
            const ongoingShift = await AsyncStorage.getItem(ongoingShiftKey);
            if (!ongoingShift) {
                throw new Error('Please start an employee shift before saving a transaction.');
            }

            const amount = transactionType === 'match' ? matchAmount : couponAmount;
            const numericAmount = Number(amount) || 0;

            if (numericAmount <= 0) {
                 Alert.alert("Invalid Amount", "Please enter an amount greater than zero.");
                 return;
            }

            if (!machineNumber.trim()) {
                Alert.alert("Machine Number Required", "Please enter the machine number.");
                return;
            }

            if (!snapshot) {
                setShowSnapshotModal(true);
                return;
            }

            setIsSubmitting(true);
            setMessage('Processing transaction...');

            const blob = await uriToBlob(snapshot);
            const storageRef = ref(getStorage(), `owners/${user.uid}/snapshots/${foundCustomer.phone}_${Date.now()}.jpg`);
            await uploadBytes(storageRef, blob);
            const snapshotUrl = await getDownloadURL(storageRef);

            const todayStr = dayjs().format('YYYY-MM-DD');
            const visitHistoryRef = collection(db, `owners/${user.uid}/customers/${foundCustomer.phone}/visitHistory`);
            const dailyVisitDocRef = doc(visitHistoryRef, todayStr);
            const employeeData = JSON.parse(ongoingShift);

            const transactionData: any = {
                timestamp: Timestamp.now(),
                employeeId: employeeData.employeeId,
            };

            if (transactionType === 'match') {
                transactionData.matchAmount = numericAmount;
                transactionData.matchMachineNumber = machineNumber.trim();
                transactionData.matchSnapshotUrl = snapshotUrl;
            }
            if (transactionType === 'coupon') {
                transactionData.couponAmount = numericAmount;
                transactionData.couponMachineNumber = machineNumber.trim();
                transactionData.couponSnapshotUrl = snapshotUrl;
            }

            await setDoc(dailyVisitDocRef, transactionData, { merge: true });
            
            // Also save to centralized visitHistory collection for easier querying
            const centralVisitRef = doc(db, `owners/${user.uid}/visitHistory`, `${todayStr}_${foundCustomer.phone}`);
            const visitData: any = {
                customerId: foundCustomer.id,
                name: foundCustomer.name,
                timestamp: Timestamp.now(),
                ...transactionData
            };
            await setDoc(centralVisitRef, visitData, { merge: true });


            setMessage(`✅ Transaction for ${foundCustomer.name} saved successfully!`);
            Alert.alert("Success", "Transaction has been recorded.");

            setTimeout(() => {
                resetForm();
            }, 2000);

        } catch (error) {
            console.error("Transaction failed:", error);
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            setMessage(`Error: ${errorMessage}`);
            Alert.alert("Transaction Failed", errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };


    const handleCaptureSnapshot = async () => {
        const p = await ImagePicker.requestCameraPermissionsAsync();
        if (!p.granted) {
            Alert.alert('Camera access is required!');
            return;
        }
        const r = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.5 });
        if (!r.canceled && r.assets && r.assets.length > 0) {
            setSnapshot(r.assets[0].uri);
            setShowSnapshotModal(false);
            Alert.alert('Success', 'Snapshot Captured! You may now submit the transaction.');
        } else {
            Alert.alert("Cancelled", "Snapshot was not taken.");
        }
    };

    const handleLogout = () => { Alert.alert("Confirm Logout", "Are you sure?", [{ text: "Cancel", style: "cancel" }, { text: "Log Out", style: "destructive", onPress: async () => { await auth.signOut(); } }]); };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={CasinoColors.accentGold} />
            </View>
        );
    }


    // --- Render Methods ---
    const renderChoiceScreen = () => (
        <>
            <Text style={styles.header}>Customer Management</Text>
            <Text style={styles.subtitle}>Register a new player or log a transaction.</Text>
            <TouchableOpacity activeOpacity={0.7} style={styles.choiceCard} onPress={() => setFormMode('new')}>
                <Ionicons name="person-add-outline" size={32} color={CasinoColors.accentGold} />
                <Text style={styles.choiceTitle}>New Customer</Text>
                <Text style={styles.choiceDescription}>Enroll a new player via phone verification.</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.7} style={styles.choiceCard} onPress={() => setFormMode('existing')}>
                <Ionicons name="search-outline" size={32} color={CasinoColors.accentGold} />
                <Text style={styles.choiceTitle}>Existing Customer</Text>
                <Text style={styles.choiceDescription}>Find a player by Phone or Unique ID.</Text>
            </TouchableOpacity>
        </>
    );

    const renderNewCustomerForm = () => (
        <View style={styles.formContainer}>
            <View style={styles.formHeader}>
                <TouchableOpacity onPress={resetForm} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={CasinoColors.secondaryText} />
                </TouchableOpacity>
                <Text style={styles.header}>Register Customer</Text>
                <View style={{ width: 40 }} />
            </View>
            <IconTextInput
                iconName="person-outline"
                placeholder="Customer Name (Required)"
                value={name}
                onChangeText={setName}
                editable={!isPhoneVerified}
            />
            <IconTextInput
                iconName="call-outline"
                placeholder="10-Digit Phone (Required)"
                keyboardType="number-pad"
                value={phone}
                onChangeText={handlePhoneChange}
                maxLength={10}
                editable={!isPhoneVerified}
            />
            {isCheckingPhone && <ActivityIndicator color={CasinoColors.accentGold} style={{ marginVertical: 10 }}/>}

            {isPhoneVerified && (
                <>
                    <TouchableOpacity style={[styles.button, styles.captureButton]} onPress={handleCaptureId}>
                        <Ionicons name={idImage ? "checkmark-circle" : "camera-outline"} size={22} color={idImage ? CasinoColors.accentGreen : CasinoColors.accentGoldLight} />
                        <Text style={[styles.captureButtonText, { color: idImage ? CasinoColors.accentGreen : CasinoColors.accentGoldLight }]}>
                            {idImage ? 'Photo Captured!' : 'Capture Photo ID (Optional)'}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.button, styles.submitButton]} onPress={handleSaveNewCustomer} disabled={isSubmitting}>
                        {isSubmitting ? <ActivityIndicator color={CasinoColors.buttonPrimaryText} /> : (
                            <LinearGradient colors={CasinoColors.gradientGold} style={styles.submitButtonGradient}>
                                <Ionicons name="save-outline" size={24} color={CasinoColors.buttonPrimaryText} />
                                <Text style={styles.submitButtonText}>Save Customer</Text>
                            </LinearGradient>
                        )}
                    </TouchableOpacity>
                </>
            )}

            {isSubmitting && <ActivityIndicator size="large" color={CasinoColors.accentGold} style={{ marginVertical: 20 }} />}
            {message !== '' && (
                <Text style={[styles.message, { color: message.includes('Error') ? CasinoColors.accentRed : CasinoColors.accentGreen }]}>
                    {message}
                </Text>
            )}
        </View>
    );

    const renderExistingCustomerForm = () => {
        const bothUsed = foundCustomer?.dailyMatchUsed && foundCustomer?.dailyCouponUsed;
        return (
            <View style={styles.formContainer}>
                <View style={styles.formHeader}>
                    <TouchableOpacity onPress={resetForm} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={CasinoColors.secondaryText} />
                    </TouchableOpacity>
                    <Text style={styles.headerExisting}>Existing Customer</Text>
                    <View style={{ width: 40 }} />
                </View>

                {!foundCustomer ? (
                    <>
                        <IconTextInput
                            iconName="search"
                            placeholder="Search by Phone or 4-Digit ID"
                            value={lookupQuery}
                            onChangeText={setLookupQuery}
                            keyboardType="default"
                        />
                        <TouchableOpacity style={[styles.button, styles.submitButton]} onPress={handleLookup} disabled={isSearching}>
                            {isSearching ? <ActivityIndicator color={CasinoColors.buttonPrimaryText} /> : (
                                <LinearGradient colors={CasinoColors.gradientGold} style={styles.submitButtonGradient}>
                                    <Ionicons name="search" size={24} color={CasinoColors.buttonPrimaryText} />
                                    <Text style={styles.submitButtonText}>Find Customer</Text>
                                </LinearGradient>
                            )}
                        </TouchableOpacity>
                    </>
                ) : (
                    <>
                        <View style={styles.foundCustomerBox}>
                            <Ionicons name="checkmark-circle" size={30} color={CasinoColors.accentGreen} style={{ marginRight: 15 }} />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.foundCustomerName}>{foundCustomer.name}</Text>
                                <Text style={styles.foundCustomerPhone}>ID: {foundCustomer.id} | Phone: {foundCustomer.phone}</Text>
                            </View>
                            <TouchableOpacity onPress={() => { setFoundCustomer(null); setLookupQuery(''); setMessage(''); }}>
                                <Ionicons name="close-circle" size={28} color={CasinoColors.accentRed} />
                            </TouchableOpacity>
                        </View>
                        
                        {message !== '' && <Text style={[styles.message, { color: message.includes('Error') || message.includes('Match amount used') ? CasinoColors.accentRed : CasinoColors.accentGreen, padding: 10, marginVertical: 10, borderWidth: 1, borderColor: message.includes('Error') ? CasinoColors.accentRed : CasinoColors.accentGreen }]}>{message}</Text>}

                        <View style={styles.transactionTypeSelector}>
                            <TouchableOpacity
                                style={[styles.transactionTypeButton, transactionType === 'match' && styles.transactionTypeActive, foundCustomer.dailyMatchUsed && styles.transactionTypeDisabled]}
                                onPress={() => setTransactionType('match')}
                                disabled={foundCustomer.dailyMatchUsed}
                            >
                                <Text style={[styles.transactionTypeText, transactionType === 'match' && styles.transactionTypeTextActive]}>Match</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.transactionTypeButton, transactionType === 'coupon' && styles.transactionTypeActive, (!foundCustomer.dailyMatchUsed || foundCustomer.dailyCouponUsed) && styles.transactionTypeDisabled]}
                                onPress={() => setTransactionType('coupon')}
                                disabled={!foundCustomer.dailyMatchUsed || foundCustomer.dailyCouponUsed}
                            >
                                <Text style={[styles.transactionTypeText, transactionType === 'coupon' && styles.transactionTypeTextActive]}>Coupon</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.amountRow}>
                             <IconTextInput
                                iconName="cash-outline"
                                placeholder={transactionType === 'match' ? "Match Amount" : "Coupon Amount"}
                                keyboardType="numeric"
                                value={transactionType === 'match' ? matchAmount : couponAmount}
                                onChangeText={transactionType === 'match' ? setMatchAmount : setCouponAmount}
                                containerStyle={{ flex: 2 }}
                                editable={!bothUsed}
                            />
                            <IconTextInput
                                iconName="game-controller-outline"
                                placeholder="Machine #"
                                keyboardType="numeric"
                                value={machineNumber}
                                onChangeText={setMachineNumber}
                                containerStyle={{ flex: 1, marginLeft: 12 }}
                                editable={!bothUsed}
                            />
                        </View>

                        <TouchableOpacity style={[styles.button, styles.submitButton, bothUsed && {backgroundColor: '#555'}]} onPress={handleTransactionSubmit} disabled={isSubmitting || bothUsed}>
                            {isSubmitting ? <ActivityIndicator color={CasinoColors.buttonPrimaryText} /> : (
                                <LinearGradient colors={bothUsed ? ['#555', '#333'] : CasinoColors.gradientGold} style={styles.submitButtonGradient}>
                                    <Ionicons name="save-outline" size={24} color={CasinoColors.buttonPrimaryText} />
                                    <Text style={styles.submitButtonText}>Save Transaction</Text>
                                </LinearGradient>
                            )}
                        </TouchableOpacity>
                    </>
                )}
            </View>
        )
    };

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
            <TouchableWithoutFeedback onPress={() => setMenuVisible(false)}>
                <View style={styles.fullScreenGradient}>
                    {/* Firebase Phone Auth reCAPTCHA modal for Expo */}
                    <FirebaseRecaptchaVerifierModal
                        ref={recaptchaVerifier}
                        firebaseConfig={firebase.app().options}
                    />
                    <LinearGradient
                        colors={[CasinoColors.background, CasinoColors.cardBackground, CasinoColors.background]}
                        locations={[0, 0.5, 1]}
                        style={styles.fullScreenGradient}
                    >
                        <SafeAreaView style={styles.container}>
                            <TouchableOpacity style={styles.menuButton} onPress={() => setMenuVisible(prev => !prev)}>
                                <Ionicons name="reorder-three-outline" size={40} color={CasinoColors.accentGold} />
                            </TouchableOpacity>
                            {menuVisible && (
                                <TouchableOpacity activeOpacity={1} style={styles.menuOverlay} onPress={() => setMenuVisible(false)}>
                                    <View style={styles.menuContainer}>
                                        <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); router.push('/visithistory'); }}>
                                            <Ionicons name="time-outline" size={22} style={styles.menuIcon} />
                                            <Text style={styles.menuItemText}>Visit History</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); router.push('/customerinfo'); }}>
                                            <Ionicons name="people-outline" size={22} style={styles.menuIcon} />
                                            <Text style={styles.menuItemText}>Customer Info</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); router.push('/employeeshift'); }}>
                                            <Ionicons name="person-outline" size={22} style={styles.menuIcon} />
                                            <Text style={styles.menuItemText}>Employee Shift</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); router.push('/machinetracker'); }}>
                                            <Ionicons name="analytics-outline" size={22} style={styles.menuIcon} />
                                            <Text style={styles.menuItemText}>Machine Tracker</Text>
                                        </TouchableOpacity>
                                        {ownerData?.hasSmsFeature === true && (
                                            <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); router.push('/bulksms'); }}>
                                                <Ionicons name="send-outline" size={22} style={styles.menuIcon} />
                                                <Text style={styles.menuItemText}>Send Bulk Message</Text>
                                            </TouchableOpacity>
                                        )}
                                        <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); router.push('/profitloss'); }}>
                                            <Ionicons name="wallet-outline" size={22} style={styles.menuIcon} />
                                            <Text style={styles.menuItemText}>Profit & Loss</Text>
                                        </TouchableOpacity>
                                        <View style={styles.menuDivider} />
                                        <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
                                            <Ionicons name="log-out-outline" size={22} color={CasinoColors.accentRed} style={styles.menuIcon} />
                                            <Text style={[styles.menuItemText, { color: CasinoColors.accentRed }]}>Logout</Text>
                                        </TouchableOpacity>
                                    </View>
                                </TouchableOpacity>
                            )}


                            {/* Snapshot Modal */}
                            <Modal visible={showSnapshotModal} transparent animationType="fade">
                                <View style={styles.modalBackgroundCentered}>
                                    <View style={styles.payoutModal}>
                                        <Text style={styles.modalTitle}>Machine Snapshot Required</Text>
                                        <Text style={styles.modalSubtitle}>A photo of the machine is required for this transaction.</Text>
                                        <TouchableOpacity style={styles.payoutModalButton} onPress={handleCaptureSnapshot}>
                                            <LinearGradient colors={CasinoColors.gradientGold} style={styles.submitButtonGradient}>
                                                <Ionicons name="camera" size={24} color={CasinoColors.buttonPrimaryText} />
                                                <Text style={styles.payoutModalButtonText}>Take Snapshot</Text>
                                            </LinearGradient>
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={() => setShowSnapshotModal(false)}>
                                            <Text style={styles.modalCloseText}>Cancel</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </Modal>

                            {/* OTP Modal */}
                            <OtpModal
                                visible={isOtpModalVisible}
                                onVerify={handleOtpVerification}
                                onCancel={() => setIsOtpModalVisible(false)}
                                onSendOtp={handleSendOtp}
                                phoneNumber={phone}
                                isSendingOtp={isSendingOtp}
                            />

                            <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
                                <View style={styles.logoContainer}>
                                    <Image source={LionLogo} style={styles.logoImage} resizeMode="contain" />
                                </View>

                                <View style={styles.card}>
                                    {formMode === null
                                        ? renderChoiceScreen()
                                        : formMode === 'new'
                                            ? renderNewCustomerForm()
                                            : renderExistingCustomerForm()
                                    }
                                </View>
                            </ScrollView>
                        </SafeAreaView>
                    </LinearGradient>
                </View>
            </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
    );
}

// --- Stylesheet ---
const styles = StyleSheet.create({
    fullScreenGradient: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: CasinoColors.background,
    },
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    scrollContainer: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 80,
        paddingBottom: 100,
        paddingHorizontal: 20,
    },
    logoContainer: {
        marginBottom: 20,
    },
    logoImage: {
        width: 120,
        height: 120,
        alignSelf: 'center',
        borderRadius: 60,
        borderWidth: 2,
        borderColor: CasinoColors.accentGold,
        shadowColor: CasinoColors.accentGold,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.7,
        shadowRadius: 12,
        elevation: 10,
    },
    card: {
        width: '100%',
        maxWidth: 1000,
        backgroundColor: 'rgba(20, 20, 20, 0.75)',
        borderRadius: 20,
        paddingVertical: 25,
        paddingHorizontal: 20,
        alignSelf: 'center',
        shadowColor: CasinoColors.shadowColor,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 15,
        borderWidth: 1.5,
        borderColor: 'rgba(212, 175, 55, 0.5)',
    },
    header: {
        fontSize: 28,
        fontWeight: '700',
        textAlign: 'center',
        color: CasinoColors.primaryText,
        letterSpacing: 1,
        textShadowColor: CasinoColors.accentGold,
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 8,
        fontFamily: 'serif',
        marginBottom: 10,
    },
    headerExisting: {
        fontSize: 26,
        fontWeight: '700',
        textAlign: 'center',
        flex: 1,
        color: CasinoColors.primaryText,
        letterSpacing: 0.8,
        textShadowColor: CasinoColors.accentGold,
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 6,
        fontFamily: 'serif',
    },
    subtitle: {
        fontSize: 16,
        color: CasinoColors.secondaryText,
        textAlign: 'center',
        marginBottom: 25,
        fontWeight: '500',
        lineHeight: 24,
    },
    choiceCard: {
        backgroundColor: 'rgba(42, 42, 42, 0.8)',
        paddingVertical: 20,
        paddingHorizontal: 15,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: CasinoColors.inputBorder,
        alignItems: 'center',
        marginVertical: 15,
        shadowColor: CasinoColors.shadowColor,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    choiceTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: CasinoColors.accentGold,
        marginTop: 12,
        letterSpacing: 0.5,
    },
    choiceDescription: {
        fontSize: 14,
        color: CasinoColors.secondaryText,
        marginTop: 8,
        textAlign: 'center',
        fontWeight: '400',
        lineHeight: 20,
        maxWidth: '90%',
    },
    formHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: 25,
    },
    backButton: {
        padding: 8,
        backgroundColor: 'rgba(50, 50, 50, 0.5)',
        borderRadius: 20,
    },
    formContainer: {
        width: '100%'
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: CasinoColors.inputBorder,
        borderRadius: 14,
        marginBottom: 16,
        paddingHorizontal: 12,
        height: 52,
        shadowColor: CasinoColors.shadowColor,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    inputIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        height: '100%',
        fontSize: 16,
        color: CasinoColors.primaryText,
        fontWeight: '500',
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 14,
        paddingVertical: 15,
        marginTop: 10,
        shadowColor: CasinoColors.shadowColor,
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
        borderWidth: 1.5,
    },
    captureButton: {
        backgroundColor: 'transparent',
        borderColor: CasinoColors.accentGold,
    },
    captureButtonText: {
        color: CasinoColors.accentGoldLight,
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 10,
        letterSpacing: 0.5,
    },
    submitButton: {
        marginTop: 20,
        borderColor: 'rgba(0,0,0,0.3)',
        borderWidth: 1,
        shadowColor: CasinoColors.accentGold,
        shadowOpacity: 0.5,
        shadowRadius: 10,
        height: 52,
        paddingVertical: 0,
    },
    submitButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        borderRadius: 12,
    },
    submitButtonText: {
        color: CasinoColors.buttonPrimaryText,
        fontSize: 18,
        fontWeight: 'bold',
        marginLeft: 10,
        textShadowColor: 'rgba(0,0,0,0.2)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },
    amountRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 10,
    },
    message: {
        marginTop: 20,
        fontSize: 15,
        textAlign: 'center',
        paddingHorizontal: 15,
        fontWeight: '600',
        borderRadius: 12,
        paddingVertical: 12,
    },
    menuButton: {
        position: 'absolute',
        top: 60,
        left: 15,
        zIndex: 99,
        padding: 8,
    },
    modalBackgroundCentered: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.90)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    menuOverlay: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 200,
    },
    menuContainer: {
        position: 'absolute',
        top: 110, left: 15, width: 250,
        backgroundColor: '#222222',
        paddingVertical: 10,
        paddingHorizontal: 10,
        shadowColor: CasinoColors.accentGold,
        shadowOpacity: 0.6, shadowRadius: 15, elevation: 20,
        borderWidth: 1, borderColor: CasinoColors.accentGold,
        borderRadius: 16,
        zIndex: 201,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 10,
        borderRadius: 10,
    },
    menuIcon: {
        marginRight: 15,
        color: CasinoColors.secondaryText,
    },
    menuItemText: {
        fontSize: 17,
        color: '#FFFFFF',
        fontWeight: '600',
    },
    menuDivider: {
        height: 1,
        backgroundColor: CasinoColors.divider,
        marginVertical: 8,
        marginHorizontal: 10,
    },
    payoutModal: {
        width: '95%',
        maxWidth: 400,
        backgroundColor: '#1E1E1E',
        borderRadius: 20,
        padding: 30,
        alignItems: 'center',
        shadowColor: CasinoColors.accentRed,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 20,
        elevation: 25,
        borderWidth: 1.5,
        borderColor: CasinoColors.accentRed,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: CasinoColors.primaryText,
        marginBottom: 10,
        textAlign: 'center',
    },
    modalSubtitle: {
        fontSize: 16,
        color: CasinoColors.secondaryText,
        marginBottom: 25,
        textAlign: 'center',
        lineHeight: 22,
    },
    payoutModalButton: {
        height: 52,
        borderRadius: 14,
        marginTop: 10,
        width: '100%',
        shadowColor: CasinoColors.accentGold,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
        elevation: 8,
    },
    payoutModalButtonText: {
        color: CasinoColors.buttonPrimaryText,
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 10,
    },
    modalCloseText: {
        marginTop: 20,
        fontSize: 16,
        color: CasinoColors.accentRed,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    foundCustomerBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(34, 139, 34, 0.15)',
        borderWidth: 1.5,
        borderColor: CasinoColors.accentGreen,
        borderRadius: 14,
        padding: 15,
        marginBottom: 10,
    },
    foundCustomerName: {
        fontSize: 17,
        fontWeight: 'bold',
        color: CasinoColors.primaryText,
    },
    foundCustomerPhone: {
        fontSize: 14,
        color: CasinoColors.secondaryText,
        fontWeight: '500',
        marginTop: 4,
    },
    transactionTypeSelector: {
        flexDirection: 'row',
        width: '100%',
        backgroundColor: CasinoColors.inputBackground,
        borderRadius: 14,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: CasinoColors.inputBorder,
    },
    transactionTypeButton: {
        flex: 1,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
        margin: 2
    },
    transactionTypeActive: {
        backgroundColor: CasinoColors.accentGold,
    },
    transactionTypeDisabled: {
        backgroundColor: '#444',
        opacity: 0.6,
    },
    transactionTypeText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: CasinoColors.primaryText,
    },
    transactionTypeTextActive: {
        color: CasinoColors.buttonPrimaryText,
    },
});