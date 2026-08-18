import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { EmailAuthProvider, onAuthStateChanged, reauthenticateWithCredential } from 'firebase/auth';
import { arrayUnion, collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, setDoc, Timestamp, where } from 'firebase/firestore';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { auth, db } from '../firebaseConfig';


// Interfaces
interface DailyReport {
  date: string;
  shiftProfitLoss: number;
  totalMatchedAmount: number;
  totalExpenses: number;
  expenseNotes: string[];
  netProfit: number;
}

interface ExpenseItem {
    id: string;
    amount: number;
    notes: string;
    date: string;
    timestamp?: Timestamp;
}

interface BankHistoryItem {
  id: string;
  amount: number;
  newBalance: number;
  timestamp: Timestamp;
  type: 'set' | 'add' | 'expense' | 'deleteExpense' | 'shift_profit_loss' | 'expenseEdit';
  notes?: string;
}

// SummaryRow Component
const SummaryRow: React.FC<{ label: string; value: string; valueColor?: string; isBold?: boolean; isTappable?: boolean }> = ({ label, value, valueColor = '#FFFFFF', isBold = false, isTappable = false }) => (
  <View style={styles.row}>
    <Text style={[styles.label, isBold && { fontWeight: 'bold' }]}>{label}</Text>
    <View style={{flexDirection: 'row', alignItems: 'center'}}>
        <Text style={[styles.value, { color: valueColor }, isBold && { fontWeight: 'bold' }]}>{value}</Text>
        {isTappable && <Ionicons name="chevron-forward-outline" size={20} color="#888" style={{marginLeft: 5}}/>}
    </View>
  </View>
);

const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{4,}$/;

export default function ProfitLossScreen() {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  const [hasReportingPass, setHasReportingPass] = useState<boolean | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [bankBalance, setBankBalance] = useState(0);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [isCalendarVisible, setCalendarVisible] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const [isExpenseModalVisible, setExpenseModalVisible] = useState(false);
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseNotes, setExpenseNotes] = useState('');
  const [expenseDate, setExpenseDate] = useState('');
  const [isSubmittingExpense, setIsSubmittingExpense] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editingExpenseOldAmount, setEditingExpenseOldAmount] = useState<number>(0);
  const [isDailyExpensesListModalVisible, setDailyExpensesListModalVisible] = useState(false);
  const [currentDayExpenses, setCurrentDayExpenses] = useState<ExpenseItem[]>([]);
  const [selectedDayForExpenses, setSelectedDayForExpenses] = useState('');
  const [isBankModalVisible, setBankModalVisible] = useState(false);
  const [bankInput, setBankInput] = useState('');
  const [isBankHistoryModalVisible, setBankHistoryModalVisible] = useState(false);
  const [bankHistory, setBankHistory] = useState<BankHistoryItem[]>([]);
  const [loadingBankHistory, setLoadingBankHistory] = useState(false);

  // Reusable function to update bank balance and create a history record
  const updateBankBalance = async (amount: number, type: BankHistoryItem['type'], notes: string) => {
    try {
        const user = auth.currentUser;
        if (!user || amount === 0) return; // Do nothing if user is not logged in or amount is zero

        const ownerId = user.uid;
        const bankDocRef = doc(db, `owners/${ownerId}/bankBalance`, ownerId);
        const bankDoc = await getDoc(bankDocRef);
        const currentBalance = bankDoc.exists() ? bankDoc.data().balance : 0;
        const newBalance = currentBalance + amount;

        await setDoc(bankDocRef, { balance: newBalance });
        setBankBalance(newBalance);

        const historyRef = doc(collection(db, `owners/${ownerId}/bankBalanceHistory`));
        await setDoc(historyRef, {
            id: historyRef.id,
            amount: amount,
            newBalance: newBalance,
            timestamp: Timestamp.now(),
            type: type,
            notes: notes
        });
    } catch (error) {
        console.error("Error updating bank balance:", error);
        Alert.alert("Error", "Could not update bank balance.");
    }
  };

  const handleSetBankBalance = async () => {
    const amountToAdjust = parseFloat(bankInput);
    if (isNaN(amountToAdjust)) {
      Alert.alert("Invalid Input", "Enter a valid number.");
      return;
    }
    await updateBankBalance(amountToAdjust, amountToAdjust >= 0 ? 'add' : 'set', `Manual adjustment: ${amountToAdjust > 0 ? '+' : ''}${amountToAdjust.toFixed(2)}`);
    setBankModalVisible(false);
    setBankInput('');
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace('/owner');
        return;
      }
      setIsReady(true);
      setAuthLoading(true);
      try {
        const docSnap = await getDoc(doc(db, `owners/${user.uid}/settings`, 'main'));
        setHasReportingPass(docSnap.exists() && !!docSnap.data().reportingPassword);
      } catch (error) {
        setHasReportingPass(false);
      } finally {
        setAuthLoading(false);
      }
    });
    return () => unsubscribe();
  }, [router]);
  
  const fetchAndProcessData = useCallback(async (month: Date) => {
    if (!isAuthorized) return;
    setLoading(true);
    try {
        const user = auth.currentUser;
        if (!user) throw new Error("User not logged in");
        const ownerId = user.uid;
        
        // --- Fetch all necessary data ---
        const startOfMonth = dayjs(month).startOf('month').toDate();
        const endOfMonth = dayjs(month).endOf('month').toDate();
        
        const settingsDocRef = doc(db, `owners/${ownerId}/settings`, 'main');
        const settingsDoc = await getDoc(settingsDocRef);
        const processedDates = settingsDoc.exists() ? settingsDoc.data().processedProfitDates || [] : [];

        const dailyData = new Map<string, Omit<DailyReport, 'netProfit'>>();
        const shiftsQuery = query(collection(db, `owners/${ownerId}/shifts`), where('timestamp', '>=', startOfMonth), where('timestamp', '<=', endOfMonth));
        const shiftsSnapshot = await getDocs(shiftsQuery);
        shiftsSnapshot.forEach(d => {
            const shift = d.data();
            const dateStr = dayjs(shift.endTime?.toDate ? shift.endTime.toDate() : shift.endTime).format('YYYY-MM-DD');
            const prev = dailyData.get(dateStr) || { date: dateStr, shiftProfitLoss: 0, totalExpenses: 0, expenseNotes: [] as string[], totalMatchedAmount: 0 };
            prev.shiftProfitLoss += shift.profitOrLoss || 0;
            dailyData.set(dateStr, prev);
        });

        const expensesQuery = query(collection(db, `owners/${ownerId}/dailyExpenses`), where('date', '>=', dayjs(startOfMonth).format('YYYY-MM-DD')), where('date', '<=', dayjs(endOfMonth).format('YYYY-MM-DD')));
        const expensesSnapshot = await getDocs(expensesQuery);
        expensesSnapshot.forEach(d => {
            const expense = d.data();
            const dateStr = expense.date;
            const prev = dailyData.get(dateStr) || { date: dateStr, shiftProfitLoss: 0, totalExpenses: 0, expenseNotes: [] as string[], totalMatchedAmount: 0 };
            prev.totalExpenses += expense.amount || 0;
            if (expense.notes) prev.expenseNotes.push(`$${(expense.amount || 0).toFixed(2)}: ${expense.notes}`);
            dailyData.set(dateStr, prev);
        });

        const finalReports = Array.from(dailyData.values()).map(day => ({ ...day, netProfit: day.shiftProfitLoss - day.totalExpenses })).sort((a, b) => b.date.localeCompare(a.date));
        setReports(finalReports);

        // --- NEW LOGIC: Apply unprocessed profits to bank balance ---
        let totalNewProfitToApply = 0;
        const newDatesToMarkProcessed: string[] = [];
        
        for (const report of finalReports) {
            if (!processedDates.includes(report.date)) {
                totalNewProfitToApply += report.netProfit;
                newDatesToMarkProcessed.push(report.date);
            }
        }
        
        if (totalNewProfitToApply !== 0) {
            await updateBankBalance(totalNewProfitToApply, 'shift_profit_loss', `Net profit/loss from ${newDatesToMarkProcessed.length} day(s).`);
            // Mark these dates as processed in Firestore
            await setDoc(settingsDocRef, { processedProfitDates: arrayUnion(...newDatesToMarkProcessed) }, { merge: true });
        } else {
          // If no new profits, just load the current balance
          await loadBankBalance();
        }

    } catch (error) {
        console.error("Error fetching report data:", error);
    } finally {
        setLoading(false);
    }
  }, [isAuthorized]);

  const loadBankBalance = useCallback(async () => {
    try {
        const user = auth.currentUser;
        if (!user) return;
        const bankDoc = await getDoc(doc(db, `owners/${user.uid}/bankBalance`, user.uid));
        setBankBalance(bankDoc.exists() ? bankDoc.data().balance : 0);
    } catch (error) {
        console.error("Error loading bank balance:", error);
    }
  }, []);

  useEffect(() => {
    if (isAuthorized) {
        fetchAndProcessData(selectedMonth);
    }
  }, [selectedMonth, isAuthorized, fetchAndProcessData]);

  const fetchBankHistory = useCallback(async () => {
    setLoadingBankHistory(true);
    try {
        const user = auth.currentUser;
        if (!user) throw new Error("User not logged in");
        const q = query(collection(db, `owners/${user.uid}/bankBalanceHistory`), orderBy('timestamp', 'desc'));
        const snapshot = await getDocs(q);
        const history: BankHistoryItem[] = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as BankHistoryItem));
        setBankHistory(history);
    } catch (error) {
        console.error("Error fetching bank history:", error);
    } finally {
        setLoadingBankHistory(false);
    }
  }, []);

  const handleOpenBankHistory = () => {
    fetchBankHistory();
    setBankHistoryModalVisible(true);
  };
  
  // All other handler functions (password, expenses, etc.) are included here...
  // Omitted for final response brevity.
    const handleCreatePassword = async () => {
    if (!passwordRegex.test(newPassword)) {
      Alert.alert('Weak Password', 'Password must be at least 4 characters and contain a letter, a number, and a special character.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      Alert.alert('Passwords Do Not Match');
      return;
    }
    setAuthLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("User not logged in");
      await setDoc(doc(db, `owners/${user.uid}/settings`, 'main'), { reportingPassword: newPassword.trim() }, { merge: true });
      setHasReportingPass(true);
      setIsAuthorized(true);
    } catch (e) {
      Alert.alert("Error", "Could not save password.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleUnlock = async () => {
    if (!passwordInput) {
      Alert.alert("Input Required", "Please enter your reporting password.");
      return;
    }
    setAuthLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("User not logged in");
      const docSnap = await getDoc(doc(db, `owners/${user.uid}/settings`, 'main'));
      if (docSnap.exists() && passwordInput === docSnap.data().reportingPassword) {
        setIsAuthorized(true);
      } else {
        Alert.alert("Access Denied", "Incorrect password.");
      }
    } catch (e) {
      Alert.alert("Error", "Could not verify credentials.");
    } finally {
      setAuthLoading(false);
      setPasswordInput('');
    }
  };

  const handleForgotPassword = () => {
    const user = auth.currentUser;
    if (!user || !user.email) {
      Alert.alert("Error", "No logged-in user found.");
      return;
    }
    Alert.prompt("Admin Verification", `Enter login password for ${user.email}.`,
      [{ text: "Cancel", style: "cancel" }, {
        text: "Verify & Reset",
        onPress: async (loginPassword) => {
          if (!loginPassword) return;
          setAuthLoading(true);
          try {
            const credential = EmailAuthProvider.credential(user.email!, loginPassword);
            await reauthenticateWithCredential(user, credential);
            await setDoc(doc(db, `owners/${user.uid}/settings`, 'main'), { reportingPassword: "" }, { merge: true });
            setHasReportingPass(false);
            Alert.alert("Success!", "Reporting password reset.");
          } catch (error) {
            Alert.alert("Verification Failed", "Incorrect login password.");
          } finally {
            setAuthLoading(false);
          }
        },
      }],
      'secure-text'
    );
  };
  
  const openExpenseModal = (date: string, expenseToEdit?: ExpenseItem) => {
    if (expenseToEdit) {
      setEditingExpenseId(expenseToEdit.id);
      setEditingExpenseOldAmount(expenseToEdit.amount);
      setExpenseAmount(expenseToEdit.amount.toFixed(2));
      setExpenseNotes(expenseToEdit.notes);
      setExpenseDate(expenseToEdit.date);
    } else {
      setEditingExpenseId(null);
      setEditingExpenseOldAmount(0);
      setExpenseAmount('');
      setExpenseNotes('');
      setExpenseDate(date);
    }
    setExpenseModalVisible(true);
  };
  
  const handleSaveExpense = async () => {
    const amount = parseFloat(expenseAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert("Invalid Amount");
      return;
    }
    setIsSubmittingExpense(true);
    try {
      await updateBankBalance(-amount, 'expense', `Expense: ${expenseNotes.trim()}`);
      const user = auth.currentUser!;
      const newExpenseRef = doc(collection(db, `owners/${user.uid}/dailyExpenses`));
      await setDoc(newExpenseRef, { id: newExpenseRef.id, amount, notes: expenseNotes.trim(), date: expenseDate, timestamp: Timestamp.now() });
      setExpenseModalVisible(false);
      fetchAndProcessData(selectedMonth);
    } catch (error) {
      console.error("Error saving expense:", error);
    } finally {
      setIsSubmittingExpense(false);
    }
  };
  
  const handleEditExpense = async () => {
    const newAmount = parseFloat(expenseAmount);
    if (isNaN(newAmount) || newAmount <= 0 || !editingExpenseId) return;
    setIsSubmittingExpense(true);
    try {
      const balanceAdjustment = editingExpenseOldAmount - newAmount;
      await updateBankBalance(balanceAdjustment, 'expenseEdit', `Edited expense from $${editingExpenseOldAmount.toFixed(2)} to $${newAmount.toFixed(2)}`);
      const user = auth.currentUser!;
      const expenseRef = doc(db, `owners/${user.uid}/dailyExpenses`, editingExpenseId);
      await setDoc(expenseRef, { amount: newAmount, notes: expenseNotes.trim() }, { merge: true });
      setExpenseModalVisible(false);
      setDailyExpensesListModalVisible(false);
      fetchAndProcessData(selectedMonth);
    } catch (error) {
      console.error("Error updating expense:", error);
    } finally {
      setIsSubmittingExpense(false);
    }
  };

  const openDayExpensesListModal = async (date: string) => {
    setSelectedDayForExpenses(date);
    const user = auth.currentUser;
    if (!user) return;
    setLoading(true);
    try {
        const expensesQuery = query(collection(db, `owners/${user.uid}/dailyExpenses`), where('date', '==', date));
        const expensesSnapshot = await getDocs(expensesQuery);
        const expenses: ExpenseItem[] = expensesSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as ExpenseItem));
        setCurrentDayExpenses(expenses.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)));
        setDailyExpensesListModalVisible(true);
    } catch (error) {
        console.error("Error fetching daily expenses:", error);
    } finally {
        setLoading(false);
    }
  };
  
  const handleDeleteExpense = async (expenseToDelete: ExpenseItem) => {
    Alert.alert("Delete Expense", `Are you sure you want to delete this expense? This cannot be undone.`,
      [{ text: "Cancel", style: "cancel" }, {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await updateBankBalance(expenseToDelete.amount, 'deleteExpense', `Deleted expense: ${expenseToDelete.notes}`);
            const user = auth.currentUser!;
            await deleteDoc(doc(db, `owners/${user.uid}/dailyExpenses`, expenseToDelete.id));
            setDailyExpensesListModalVisible(false);
            fetchAndProcessData(selectedMonth);
          } catch (error) {
            console.error("Error deleting expense:", error);
          }
        },
      }]
    );
  };
    
  const handleDayPress = (day: DateData) => {
    const index = reports.findIndex(report => report.date === day.dateString);
    if (index !== -1) flatListRef.current?.scrollToIndex({ animated: true, index });
    setCalendarVisible(false);
  };

  const changeMonth = (amount: number) => setSelectedMonth(prev => dayjs(prev).add(amount, 'month').toDate());
  
  const markedDates = useMemo(() => {
    return reports.reduce((acc, report) => {
        acc[report.date] = { marked: true, dotColor: report.netProfit >= 0 ? '#4CAF50' : '#FF6347' };
        return acc;
    }, {} as { [key: string]: { marked: boolean, dotColor: string } });
  }, [reports]);

  const monthlyTotals = useMemo(() => reports.reduce((acc, report) => {
    acc.netProfit += report.netProfit;
    return acc;
  }, { netProfit: 0 }), [reports]);

  const handlePrint = async (reportType: 'month' | 'day', data: DailyReport | null) => {
    // This function remains the same as the previous correct version...
    let htmlContent = '';
    const reportDate = reportType === 'month' ? dayjs(selectedMonth).format('MMMM YYYY') : dayjs(data!.date).format('MMMM D, YYYY');
    
    const css = `
      <style>
        body { font-family: Arial, sans-serif; color: #000000; }
        h1 { color: #000000; border-bottom: 1px solid #cccccc; padding-bottom: 5px; }
        h3 { color: #000000; margin-top: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; }
        th, td { border: 1px solid #cccccc; padding: 6px; text-align: left; }
        th { background-color: #f2f2f2; font-weight: bold; }
        .total-row { font-weight: bold; background-color: #f2f2f2; }
        ul { padding-left: 20px; }
      </style>
    `;

    if (reportType === 'month') {
        const totals = reports.reduce((acc, r) => {
            acc.shiftProfitLoss += r.shiftProfitLoss;
            acc.totalExpenses += r.totalExpenses;
            acc.netProfit += r.netProfit;
            return acc;
        }, { shiftProfitLoss: 0, totalExpenses: 0, netProfit: 0 });

        htmlContent = `
            <html><head>${css}</head><body>
            <h1>Profit & Loss Report - ${reportDate}</h1>
            <table>
                <thead><tr><th>Date</th><th>Shift P/L</th><th>Expenses</th><th>Net Profit</th></tr></thead>
                <tbody>
                ${reports.map(r => `
                    <tr>
                    <td>${dayjs(r.date).format('MM/DD/YYYY')}</td>
                    <td>$${r.shiftProfitLoss.toFixed(2)}</td>
                    <td>$${r.totalExpenses.toFixed(2)}</td>
                    <td>$${r.netProfit.toFixed(2)}</td>
                    </tr>`).join("")}
                <tr class="total-row">
                    <td>Total</td>
                    <td>$${totals.shiftProfitLoss.toFixed(2)}</td>
                    <td>$${totals.totalExpenses.toFixed(2)}</td>
                    <td>$${totals.netProfit.toFixed(2)}</td>
                </tr>
                </tbody>
            </table>
            </body></html>`;
    } else if (data) {
        htmlContent = `
            <html><head>${css}</head><body>
            <h1>Daily Report - ${reportDate}</h1>
            <table>
                <tr><th>Shift Profit/Loss</th><td>$${data.shiftProfitLoss.toFixed(2)}</td></tr>
                <tr><th>Expenses</th><td>$${data.totalExpenses.toFixed(2)}</td></tr>
                <tr class="total-row"><th>Net Profit</th><td>$${data.netProfit.toFixed(2)}</td></tr>
            </table>
            ${data.expenseNotes.length > 0 ? `<h3>Expense Notes:</h3><ul>${data.expenseNotes.map(n => `<li>${n}</li>`).join('')}</ul>` : ''}
            </body></html>`;
    }

    if (htmlContent) {
        await Print.printAsync({ html: htmlContent });
    }
  };

  const handleExportToCSV = async () => {
    // This function remains the same...
    if (!reports.length) return;
    const header = "Date,Shift Profit/Loss,Expenses,Net Profit\n";
    const csvRows = reports.map(r =>
      `${r.date},${r.shiftProfitLoss.toFixed(2)},${r.totalExpenses.toFixed(2)},${r.netProfit.toFixed(2)}`
    ).join("\n");
    const fileUri = FileSystem.cacheDirectory + `ProfitLoss-${dayjs(selectedMonth).format('MM-YYYY')}.csv`;
    await FileSystem.writeAsStringAsync(fileUri, header + csvRows);
    if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(fileUri);
  };
    
  const renderReportCard = ({ item }: { item: DailyReport }) => (
    <View style={styles.card}>
      <Text style={styles.cardDate}>{dayjs(item.date).format('dddd, MMMM D, YYYY')}</Text>
      <View style={styles.divider} />
      <SummaryRow label="Shift Profit / Loss:" value={`$${item.shiftProfitLoss.toFixed(2)}`} valueColor={item.shiftProfitLoss >= 0 ? '#4CAF50' : '#FF6347'} />
      <TouchableOpacity activeOpacity={0.7} onPress={() => openDayExpensesListModal(item.date)}>
        <SummaryRow label="(-) Expenses:" value={`$${item.totalExpenses.toFixed(2)}`} isTappable={true} />
      </TouchableOpacity>
      <View style={styles.divider} />
      <SummaryRow label="Day's Net Total:" value={`$${item.netProfit.toFixed(2)}`} valueColor={item.netProfit >= 0 ? '#4CAF50' : '#FF6347'} isBold={true} />
      {item.expenseNotes.length > 0 && (
        <View style={styles.notesSection}>
          <Text style={styles.notesTitle}>Expense Notes:</Text>
          {item.expenseNotes.map((note, index) => <Text key={index} style={styles.noteText}>• {note}</Text>)}
        </View>
      )}
      <View style={styles.cardActionsContainer}>
          <TouchableOpacity style={styles.cardActionButton} onPress={() => openExpenseModal(item.date)}>
              <Ionicons name="add-circle-outline" size={22} color="#FFD700"/>
              <Text style={styles.cardActionButtonText}>Add Expense</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cardActionButton} onPress={() => handlePrint('day', item)}>
              <Ionicons name="print-outline" size={22} color="#FFD700"/>
              <Text style={styles.cardActionButtonText}>Print Day</Text>
          </TouchableOpacity>
      </View>
    </View>
  );

  // --- MAIN RETURN ---
  // Unchanged from previous correct version...
  
  if (!isReady || authLoading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#FFD700" /></View>;
  }

  if (!isAuthorized) {
    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={styles.authContainer}>
                {hasReportingPass ? (
                    <View style={styles.authCard}>
                        <Ionicons name="lock-closed-outline" size={40} color="#FFD700" style={{ alignSelf: 'center', marginBottom: 10 }}/>
                        <Text style={styles.authHeader}>Report Access</Text>
                        <TextInput style={styles.authInput} placeholder="Reporting Password" placeholderTextColor="#888" secureTextEntry value={passwordInput} onChangeText={setPasswordInput} onSubmitEditing={handleUnlock} />
                        <TouchableOpacity style={styles.authButton} onPress={handleUnlock} disabled={authLoading}>
                            {authLoading ? <ActivityIndicator color="#000"/> : <Text style={styles.authButtonText}>Unlock</Text>}
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleForgotPassword}><Text style={styles.forgotButtonText}>Forgot Password?</Text></TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.authCard}>
                        <Ionicons name="shield-outline" size={40} color="#FFD700" style={{ alignSelf: 'center', marginBottom: 10 }}/>
                        <Text style={styles.authHeader}>Set Up Reporting Password</Text>
                        <TextInput style={styles.authInput} placeholder="Create Password" placeholderTextColor="#888" secureTextEntry value={newPassword} onChangeText={setNewPassword} />
                        <TextInput style={styles.authInput} placeholder="Confirm Password" placeholderTextColor="#888" secureTextEntry value={confirmNewPassword} onChangeText={setConfirmNewPassword} onSubmitEditing={handleCreatePassword} />
                        <TouchableOpacity style={styles.authButton} onPress={handleCreatePassword} disabled={authLoading}>
                            {authLoading ? <ActivityIndicator color="#000"/> : <Text style={styles.authButtonText}>Create and Continue</Text>}
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        </KeyboardAvoidingView>
    );
  }

  return (
    <View style={styles.container}>
        <View style={styles.headerContainer}>
          <Text style={styles.header}>Profit & Loss</Text>
          <TouchableOpacity onPress={() => router.push('/')}><Ionicons name="home-outline" size={28} color="#FFD700" /></TouchableOpacity>
        </View>
        <View style={styles.monthSelector}>
            <TouchableOpacity onPress={() => changeMonth(-1)}><Ionicons name="chevron-back-outline" size={28} color="#FFD700" /></TouchableOpacity>
            <TouchableOpacity onPress={() => setCalendarVisible(true)}><Text style={styles.monthText}>{dayjs(selectedMonth).format('MMMM YYYY')}</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => changeMonth(1)}><Ionicons name="chevron-forward-outline" size={28} color="#FFD700" /></TouchableOpacity>
        </View>
        <View style={styles.summarySection}>
            <View style={styles.summaryCardCompact}>
                <Text style={styles.summaryTitleCompact}>Net Profit ({dayjs(selectedMonth).format('MMM')})</Text>
                <Text style={[styles.summaryTotalCompact, {color: monthlyTotals.netProfit >= 0 ? '#4CAF50' : '#FF6347'}]}>${monthlyTotals.netProfit.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryCardCompact}>
                <Text style={styles.summaryTitleCompact}>Bank Balance</Text>
                <Text style={[styles.summaryTotalCompact, {color: bankBalance >= 0 ? '#FFD700' : '#FF6347'}]}>${bankBalance.toFixed(2)}</Text>
            </View>
        </View>
        <View style={styles.buttonGroup}>
            <TouchableOpacity onPress={() => setBankModalVisible(true)} style={styles.mainActionButton}><Ionicons name="wallet-outline" size={18} color="#000" /><Text style={styles.mainActionButtonText}>Adjust Balance</Text></TouchableOpacity>
            <TouchableOpacity onPress={handleOpenBankHistory} style={styles.mainActionButton}><Ionicons name="receipt-outline" size={18} color="#000" /><Text style={styles.mainActionButtonText}>Bank History</Text></TouchableOpacity>
        </View>
        <View style={styles.buttonGroup}>
            <TouchableOpacity onPress={handleExportToCSV} style={styles.mainActionButton}><Ionicons name="share-outline" size={18} color="#000" /><Text style={styles.mainActionButtonText}>Export CSV</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => handlePrint('month', null)} style={styles.mainActionButton}><Ionicons name="print-outline" size={18} color="#000" /><Text style={styles.mainActionButtonText}>Print Month</Text></TouchableOpacity>
        </View>
        {loading ? <ActivityIndicator size="large" color="#FFD700" style={{marginTop: 50}}/> :
         reports.length === 0 ? <Text style={styles.noDataText}>No data for {dayjs(selectedMonth).format('MMMM YYYY')}.</Text> :
         <FlatList ref={flatListRef} data={reports} keyExtractor={(item) => item.date} renderItem={renderReportCard} contentContainerStyle={{paddingBottom: 20}}/>}
        
        <Modal animationType="slide" transparent={true} visible={isCalendarVisible} onRequestClose={() => setCalendarVisible(false)}>
            <Pressable style={styles.modalOverlay} onPress={() => setCalendarVisible(false)}>
                <View style={styles.calendarModalContent}>
                    <Calendar onDayPress={handleDayPress} markedDates={markedDates} current={selectedMonth.toISOString()} theme={{ backgroundColor: '#1C1C1C', calendarBackground: '#1C1C1C', textSectionTitleColor: '#FFD700', selectedDayBackgroundColor: '#FFD700', selectedDayTextColor: '#000000', todayTextColor: '#FFD700', dayTextColor: '#FFFFFF', textDisabledColor: '#444444', arrowColor: '#FFD700', monthTextColor: '#FFD700' }}/>
                    <TouchableOpacity style={styles.modalCloseButton} onPress={() => setCalendarVisible(false)}><Text style={styles.modalCloseButtonText}>Close</Text></TouchableOpacity>
                </View>
            </Pressable>
        </Modal>
        <Modal animationType="slide" transparent={true} visible={isExpenseModalVisible} onRequestClose={() => setExpenseModalVisible(false)}>
            <Pressable style={styles.modalOverlay} onPress={() => setExpenseModalVisible(false)}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>{editingExpenseId ? "Edit Expense" : "Add New Expense"}</Text>
                    <TextInput style={styles.modalInput} placeholder="Amount" placeholderTextColor="#888" keyboardType="numeric" value={expenseAmount} onChangeText={setExpenseAmount} />
                    <TextInput style={[styles.modalInput, { height: 80 }]} placeholder="Notes (optional)" placeholderTextColor="#888" multiline value={expenseNotes} onChangeText={setExpenseNotes} />
                    <TouchableOpacity style={styles.modalPrimaryButton} onPress={editingExpenseId ? handleEditExpense : handleSaveExpense} disabled={isSubmittingExpense}>
                        {isSubmittingExpense ? <ActivityIndicator color="#000"/> : <Text style={styles.modalPrimaryButtonText}>{editingExpenseId ? "Update" : "Save"}</Text>}
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.modalSecondaryButton} onPress={() => setExpenseModalVisible(false)}><Text style={styles.modalSecondaryButtonText}>Cancel</Text></TouchableOpacity>
                </View>
            </Pressable>
        </Modal>
        <Modal animationType="slide" transparent={true} visible={isDailyExpensesListModalVisible} onRequestClose={() => setDailyExpensesListModalVisible(false)}>
            <Pressable style={styles.modalOverlay} onPress={() => setDailyExpensesListModalVisible(false)}>
                <View style={[styles.modalContent, {maxHeight: '90%'}]}>
                    <Text style={styles.modalTitle}>Expenses for {dayjs(selectedDayForExpenses).format('MMMM D')}</Text>
                    {loading ? <ActivityIndicator size="large" color="#FFD700" /> :
                     currentDayExpenses.length === 0 ? <Text style={styles.noDataText}>No expenses for this day.</Text> :
                    <FlatList data={currentDayExpenses} keyExtractor={(item) => item.id} renderItem={({ item }) => (
                        <View style={styles.expenseListItem}>
                            <Text style={styles.expenseListItemText}>${item.amount.toFixed(2)} - {item.notes}</Text>
                            <View style={styles.expenseListItemActions}>
                                <TouchableOpacity onPress={() => openExpenseModal(item.date, item)}><Ionicons name="create-outline" size={24} color="#FFD700" /></TouchableOpacity>
                                <TouchableOpacity onPress={() => handleDeleteExpense(item)}><Ionicons name="trash-outline" size={24} color="#FF6347" style={{ marginLeft: 15 }} /></TouchableOpacity>
                            </View>
                        </View>
                    )}/>}
                    <TouchableOpacity style={styles.modalSecondaryButton} onPress={() => setDailyExpensesListModalVisible(false)}><Text style={styles.modalSecondaryButtonText}>Close</Text></TouchableOpacity>
                </View>
            </Pressable>
        </Modal>
        <Modal animationType="slide" transparent={true} visible={isBankModalVisible} onRequestClose={() => setBankModalVisible(false)}>
            <Pressable style={styles.modalOverlay} onPress={() => setBankModalVisible(false)}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Adjust Bank Balance</Text>
                    <TextInput style={styles.modalInput} placeholder="Amount to add/subtract" placeholderTextColor="#888" keyboardType="numeric" value={bankInput} onChangeText={setBankInput} />
                    <TouchableOpacity style={styles.modalPrimaryButton} onPress={handleSetBankBalance}><Text style={styles.modalPrimaryButtonText}>Update Balance</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.modalSecondaryButton} onPress={() => setBankModalVisible(false)}><Text style={styles.modalSecondaryButtonText}>Cancel</Text></TouchableOpacity>
                </View>
            </Pressable>
        </Modal>
        <Modal animationType="slide" transparent={true} visible={isBankHistoryModalVisible} onRequestClose={() => setBankHistoryModalVisible(false)}>
            <Pressable style={styles.modalOverlay} onPress={() => setBankHistoryModalVisible(false)}>
                <View style={[styles.modalContent, {maxHeight: '90%'}]}>
                    <Text style={styles.modalTitle}>Bank Balance History</Text>
                    {loadingBankHistory ? <ActivityIndicator size="large" color="#FFD700" /> :
                     bankHistory.length === 0 ? <Text style={styles.noDataText}>No bank history available.</Text> :
                     <FlatList data={bankHistory} keyExtractor={(item) => item.id} renderItem={({ item }) => (
                         <View style={styles.historyListItem}>
                             <Text style={styles.historyListItemDate}>{dayjs(item.timestamp.toDate()).format('MM/DD/YYYY h:mm A')}</Text>
                             <Text style={styles.historyListItemText}>Change: <Text style={{ color: item.amount >= 0 ? '#4CAF50' : '#FF6347' }}>${item.amount.toFixed(2)}</Text></Text>
                             <Text style={styles.historyListItemText}>New Balance: <Text style={{ color: '#FFD700' }}>${item.newBalance.toFixed(2)}</Text></Text>
                             {item.notes && <Text style={styles.historyListItemNotes}>Notes: {item.notes}</Text>}
                         </View>
                     )}/>}
                    <TouchableOpacity style={styles.modalSecondaryButton} onPress={() => setBankHistoryModalVisible(false)}><Text style={styles.modalSecondaryButtonText}>Close</Text></TouchableOpacity>
                </View>
            </Pressable>
        </Modal>
    </View>
  );
}

// --- FULL STYLESHEET ---
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#121212', paddingTop: 30 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#121212' },
    headerContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingHorizontal: 20 },
    header: { fontSize: 28, fontWeight: 'bold', color: '#FFD700' },
    monthSelector: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, backgroundColor: '#1C1C1C', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 20, marginHorizontal: 20 },
    monthText: { fontSize: 20, fontWeight: 'bold', color: '#FFD700' },
    summarySection: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15, marginHorizontal: 15 },
    summaryCardCompact: { flex: 1, backgroundColor: '#1C1C1C', borderRadius: 10, padding: 15, marginHorizontal: 5, alignItems: 'center', borderWidth: 1, borderColor: '#333333' },
    summaryTitleCompact: { fontSize: 14, color: '#CCCCCC', marginBottom: 5, fontWeight: '600' },
    summaryTotalCompact: { fontSize: 22, fontWeight: 'bold' },
    buttonGroup: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 15, marginHorizontal: 20 },
    mainActionButton: { backgroundColor: '#FFD700', paddingVertical: 12, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: 5, flex: 1 },
    mainActionButtonText: { color: '#000000', fontSize: 14, fontWeight: 'bold', marginLeft: 5 },
    card: { backgroundColor: '#1C1C1C', borderRadius: 10, padding: 20, marginBottom: 15, borderWidth: 1, borderColor: '#333333', marginHorizontal: 20 },
    cardDate: { fontSize: 18, fontWeight: 'bold', color: '#FFD700', marginBottom: 10 },
    divider: { borderBottomColor: '#444444', borderBottomWidth: 1, marginVertical: 10 },
    row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5, alignItems: 'center' },
    label: { fontSize: 16, color: '#CCCCCC' },
    value: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
    notesSection: { marginTop: 10, paddingLeft: 10, borderLeftWidth: 2, borderLeftColor: '#FFD700' },
    notesTitle: { fontSize: 15, fontWeight: 'bold', color: '#FFD700', marginBottom: 5 },
    noteText: { fontSize: 14, color: '#AAAAAA' },
    cardActionsContainer: { flexDirection: 'row', justifyContent: 'space-evenly', marginTop: 15, borderTopWidth: 1, borderTopColor: '#444', paddingTop: 15 },
    cardActionButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#333333', paddingVertical: 10, paddingHorizontal: 15, borderRadius: 8 },
    cardActionButtonText: { color: '#FFD700', fontSize: 14, fontWeight: 'bold', marginLeft: 8 },
    noDataText: { color: '#CCCCCC', textAlign: 'center', marginTop: 40, fontSize: 16 },
    modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.7)' },
    modalContent: { backgroundColor: '#1C1C1C', borderRadius: 15, padding: 25, width: '90%', maxHeight: '80%', alignItems: 'center', borderWidth: 1, borderColor: '#FFD700' },
    calendarModalContent: { backgroundColor: '#1C1C1C', borderRadius: 15, padding: 10, width: '95%', borderWidth: 1, borderColor: '#FFD700' },
    modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, color: '#FFD700', textAlign: 'center' },
    modalInput: { width: '100%', backgroundColor: '#333333', borderRadius: 8, padding: 15, marginBottom: 15, color: '#FFFFFF', fontSize: 16 },
    modalPrimaryButton: { backgroundColor: '#FFD700', width: '100%', padding: 15, borderRadius: 8, alignItems: 'center', marginBottom: 10 },
    modalPrimaryButtonText: { color: '#000000', fontSize: 18, fontWeight: 'bold' },
    modalSecondaryButton: { backgroundColor: 'transparent', width: '100%', padding: 15, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#FFD700', marginTop: 5 },
    modalSecondaryButtonText: { color: '#FFD700', fontSize: 18, fontWeight: 'bold' },
    modalCloseButton: { backgroundColor: '#333333', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 },
    modalCloseButtonText: { color: '#FFD700', fontSize: 18, fontWeight: 'bold' },
    expenseListItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#2A2A2A', borderRadius: 8, padding: 15, marginBottom: 10, width: '100%' },
    expenseListItemText: { fontSize: 16, color: '#FFFFFF', flex: 1, paddingRight: 10 },
    expenseListItemActions: { flexDirection: 'row' },
    historyListItem: { backgroundColor: '#2A2A2A', borderRadius: 8, padding: 15, marginBottom: 10, width: '100%' },
    historyListItemDate: { fontSize: 14, color: '#AAAAAA', marginBottom: 5 },
    historyListItemText: { fontSize: 16, color: '#FFFFFF', marginBottom: 3 },
    historyListItemNotes: { fontSize: 14, fontStyle: 'italic', color: '#CCCCCC', marginTop: 5, borderTopWidth: 1, paddingTop: 5, borderTopColor: '#444' },
    authContainer: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#121212', padding: 20 },
    authCard: { backgroundColor: '#1C1C1C', borderRadius: 15, padding: 30, width: '90%', maxWidth: 400, alignItems: 'center', borderWidth: 1, borderColor: '#FFD700' },
    authHeader: { fontSize: 24, fontWeight: 'bold', color: '#FFD700', marginBottom: 10, textAlign: 'center' },
    authInput: { width: '100%', backgroundColor: '#333333', borderRadius: 8, padding: 15, marginBottom: 15, color: '#FFFFFF', fontSize: 16 },
    authButton: { backgroundColor: '#FFD700', width: '100%', padding: 15, borderRadius: 8, alignItems: 'center', marginBottom: 10 },
    authButtonText: { color: '#000000', fontSize: 18, fontWeight: 'bold' },
    forgotButtonText: { color: '#FFD700', fontSize: 14, textDecorationLine: 'underline', marginTop: 5 },
});