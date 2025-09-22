import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Image, I18nManager, } from 'react-native';
import { launchCamera } from 'react-native-image-picker';
import dishesList from './Dishes.json';
import { Alert, ActivityIndicator } from 'react-native';


const dishDictionary: string[] = dishesList as string[];

// Force RTL layout
I18nManager.forceRTL(true);
I18nManager.allowRTL(true);

interface Dish {
  name: string;
  price: number;
  selectedGuests: string[];
}

export default function App() {
  const [guestsInput, setGuestsInput] = useState('');
  const [guests, setGuests] = useState<string[]>([]);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [tipPercent, setTipPercent] = useState<number>(0);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [totals, setTotals] = useState<
    { [guest: string]: { subtotal: number; total: number } }
  >({});

  const addGuests = () => {
    const names = guestsInput.split(',').map(n => n.trim()).filter(n => n.length > 0);
    setGuests(names);
    setGuestsInput('');
  };

  const resetAll = () => {
    setGuestsInput('');
    setGuests([]);
    setDishes([]);
    setTipPercent(0);
    setImageUri(null);
    setTotals({});
  };


  const addDish = () => setDishes([...dishes, { name: '', price: 0, selectedGuests: [] }]);

  const removeDish = (index: number) => {
    const newDishes = [...dishes];
    newDishes.splice(index, 1);
    setDishes(newDishes);
  };

  const calculateTotals = () => {
    const tempTotals: { [guest: string]: { subtotal: number; total: number } } = {};
    guests.forEach(g => (tempTotals[g] = { subtotal: 0, total: 0 }));

    dishes.forEach(d => {
      if (d.selectedGuests.length === 0) return;
      const shareWithoutTip = d.price / d.selectedGuests.length;
      const shareWithTip = (d.price * (1 + tipPercent / 100)) / d.selectedGuests.length;

      d.selectedGuests.forEach(g => {
        tempTotals[g].subtotal += shareWithoutTip;
        tempTotals[g].total += shareWithTip;
      });
    });

    setTotals(tempTotals);
  };

  const toggleGuestForDish = (dishIndex: number, guest: string) => {
    const newDishes = [...dishes];
    const selected = newDishes[dishIndex].selectedGuests;
    if (selected.includes(guest)) {
      newDishes[dishIndex].selectedGuests = selected.filter(g => g !== guest);
    } else {
      newDishes[dishIndex].selectedGuests.push(guest);
    }
    setDishes(newDishes);
  };


  const captureAndSend = async () => {
    setLoading(true);
    try {
      const result = await launchCamera({ mediaType: 'photo', quality: 0.7 });
      if (!result.assets || result.assets.length === 0) return;
      const uri = result.assets[0].uri;
      setImageUri(uri ?? null);

      const formData = new FormData();
      formData.append('image', {
        uri,
        type: 'image/jpeg',
        name: 'receipt.jpg',
      });

      const response = await fetch('https://splitbill-40v0.onrender.com/upload', {
        method: 'POST',
        body: formData,
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const data = await response.json();


      const allLines: string[] = data.text.split('\n').map((line: string) => line.trim()).filter((line: string) => line.length > 0);

      console.log("ALL LINES:", allLines);

      setDishes(parseReceiptDishes(allLines, dishDictionary));

    } catch (err) {
      console.error(err);
      Alert.alert('Something went wrong with OCR!');
    } finally {
      setLoading(false);
    }
  };

  const parseReceiptDishes = (lines: string[], dishesJson: string[]): Dish[] => {
    const dishes: Dish[] = [];

    for (let line of lines) {
      const foundDish = dishesJson.find(dish => line.includes(dish));
      if (foundDish) {

        let price = 0;
        const matches = line.match(/\d+/g);
        if (matches && matches.length > 0) {
          price = Math.max(...matches.map(n => parseInt(n, 10)));
        }

        dishes.push({
          name: foundDish,
          price,
          selectedGuests: []
        });
      }
    }

    console.log(dishes);
    return dishes;
  };




  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.title}>SplitBill 🍽️</Text>

      {/* Guests */}
      <Text style={styles.label}>הכנס שמות סועדים (מופרדים בפסיקים):</Text>
      <TextInput
        value={guestsInput}
        onChangeText={setGuestsInput}
        placeholder="לדוגמה: איתי, דני, מיכל"
        style={styles.input}
        textAlignVertical="top"
      />
      <TouchableOpacity style={styles.primaryBtn} onPress={addGuests}>
        <Text style={styles.btnText}>הוסף סועדים</Text>
      </TouchableOpacity>

      {guests.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.label}>סועדים:</Text>
          <Text style={styles.rtlText}>{guests.join(', ')}</Text>
        </View>
      )}

      {/* Capture Receipt */}
      <TouchableOpacity style={styles.secondaryBtn} onPress={captureAndSend} >
        <Text style={styles.btnText}>📸 צלם חשבונית</Text>
      </TouchableOpacity>
      {imageUri && <Image source={{ uri: imageUri }} style={styles.imagePreview} />}


      {/* Tip */}
      <Text style={styles.label}>טיפ (%):</Text>
      <TextInput
        keyboardType="numeric"
        value={tipPercent.toString()}
        onChangeText={text => setTipPercent(Number(text))}
        style={styles.input}
      />
      {loading && (
        <View style={{ alignItems: 'center', marginVertical: 10 }}>
          <ActivityIndicator size="large" color="#0000ff" />
          <Text style={{ marginTop: 10, color: '#555', fontStyle: 'italic', textAlign: 'center' }}>
            יכול לקחת זמן... אנא המתינו בסבלנות 🙏
            הכל פה בחינם אז מתקמצנים על משאבים 😅
          </Text>
        </View>
      )}

      {/* Dishes */}
      <Text style={[styles.label, { marginTop: 15 }]}>מנות:</Text>
      {dishes.map((dish, index) => (
        <View key={index} style={styles.dishContainer}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontWeight: '600', color: '#333' }}>
              מנה {index + 1}
            </Text>
            <TouchableOpacity onPress={() => removeDish(index)}>
              <Text style={{ color: 'red', fontWeight: 'bold' }}>❌ הסר</Text>
            </TouchableOpacity>
          </View>
     
          <TextInput
            placeholder="שם מנה"
            value={dish.name}
            onChangeText={(text) => {
              const newDishes = [...dishes];
              newDishes[index].name = text;
              setDishes(newDishes);
            }}
            style={styles.input}
          />
          <TextInput
            placeholder="מחיר"
            keyboardType="numeric"
            value={dish.price != null ? dish.price.toString() : ''}
            onChangeText={(text) => {
              const newDishes = [...dishes];
              newDishes[index].price = text ? Number(text) : 0;
              setDishes(newDishes);
            }}
            style={styles.input}
          />
          

          <Text style={styles.label}>מי אכל את המנה?</Text>
          <View style={styles.guestsRow}>
            {guests.map((g) => (
              <TouchableOpacity
                key={g}
                style={[
                  styles.guestBtn,
                  dish.selectedGuests.includes(g) && { backgroundColor: '#4caf50' },
                ]}
                onPress={() => toggleGuestForDish(index, g)}
              >
                <Text
                  style={{
                    color: dish.selectedGuests.includes(g) ? 'white' : 'black',
                    writingDirection: 'rtl',
                  }}
                >
                  {g}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
      ))}

           {dishes.length > 0 && (
            <Text style={{
              color: '#888',
              fontSize: 13,
              fontStyle: 'italic',
              textAlign: 'center',
              marginVertical: 5
            }}>
              📌 שים לב: הזיהוי לא תמיד מדויק ב־100%.
              אפשר לתקן או להשלים ידנית אם משהו חסר או לא נכון.
            </Text>
          )}

      <TouchableOpacity style={styles.floatingBtn} onPress={addDish}>
        <Text style={styles.btnText}>➕ הוסף מנה</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.primaryBtn, { marginTop: 20 }]} onPress={calculateTotals}>
        <Text style={styles.btnText}>חשב תשלום לכל סועד</Text>
      </TouchableOpacity>

      {/* Totals */}
      {Object.keys(totals).length > 0 && (
        <View style={[styles.section, { marginTop: 20 }]}>
          <Text style={[styles.label, { fontSize: 20, textAlign: 'center', marginBottom: 10 }]}>
            💰 סיכום החשבון
          </Text>

          {Object.entries(totals).map(([g, { subtotal, total }]) => (
            <View key={g} style={styles.totalCard}>
              <Text style={styles.totalName}>{g}</Text>
              <Text style={styles.totalLine}>לפני טיפ: ₪{subtotal.toFixed(2)}</Text>
              <Text style={styles.totalLine}>אחרי טיפ: ₪{total.toFixed(2)}</Text>
            </View>
          ))}

          {/* סיכום כללי */}
          <View style={[styles.totalCard, { backgroundColor: '#e3f2fd', marginTop: 15 }]}>
            <Text style={[styles.totalName, { color: '#0d47a1' }]}>סה״כ ארוחה</Text>
            <Text style={styles.totalLine}>
              לפני טיפ: ₪
              {Object.values(totals)
                .reduce((sum, t) => sum + t.subtotal, 0)
                .toFixed(2)}
            </Text>
            <Text style={styles.totalLine}>
              אחרי טיפ: ₪
              {Object.values(totals)
                .reduce((sum, t) => sum + t.total, 0)
                .toFixed(2)}
            </Text>
          </View>
        </View>
      )}
      <TouchableOpacity style={styles.resetBtn} onPress={resetAll}>
        <Text style={styles.btnText}>🔄 אפס הכל</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: '#fdfdfd', direction: 'rtl' },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 15, textAlign: 'center', color: '#333' },
  label: { fontWeight: '600', marginVertical: 5, color: '#555', writingDirection: 'rtl' },
  rtlText: { writingDirection: 'rtl', textAlign: 'right' },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginVertical: 5,
    borderRadius: 8,
    backgroundColor: '#fff',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  primaryBtn: {
    backgroundColor: '#2196f3',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 5,
  },
  secondaryBtn: {
    backgroundColor: '#ff9800',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 5,
  },
  btnText: { color: 'white', fontWeight: 'bold', writingDirection: 'rtl' },
  section: { paddingVertical: 10, borderBottomWidth: 1, borderColor: '#eee' },
  dishContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    direction: 'rtl',
  },
  guestsRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 5 },
  guestBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#888',
    borderRadius: 20,
    margin: 3,
  },
  floatingBtn: {
    backgroundColor: '#4caf50',
    padding: 15,
    borderRadius: 50,
    alignItems: 'center',
    marginVertical: 15,
    alignSelf: 'center',
    minWidth: 150,
  },
  totalText: { fontSize: 16, marginVertical: 2, color: '#333', writingDirection: 'rtl' },
  imagePreview: { width: '100%', height: 200, marginVertical: 10, borderRadius: 10 },
  totalCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  totalName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
    writingDirection: 'rtl',
  },
  totalLine: {
    fontSize: 14,
    color: '#555',
    marginBottom: 2,
    writingDirection: 'rtl',
  },
  resetBtn: {
    backgroundColor: '#9e9e9e',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 5,
  },
});
